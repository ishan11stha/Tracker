import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import {
  Account,
  ActivityRecord,
  AppSettings,
  ItemHistoryLog,
  PersonalItem,
  ReminderItem,
  Transaction,
  appSettingsSchema,
} from '../types';
import { DEFAULT_SETTINGS } from '../constants/appSettings';

const isWeb = Platform.OS === 'web';
const WEB_STORAGE_KEY = 'vault_web_sqlite_store_v1';

interface WebVaultStore {
  settings: AppSettings;
  accounts: Account[];
  transactions: Transaction[];
  items: PersonalItem[];
  itemHistory: ItemHistoryLog[];
  activities: ActivityRecord[];
  reminders: ReminderItem[];
}

function getDefaultAccountsList(): Account[] {
  const nowStamp = new Date().toISOString();
  return [
    {
      id: 'acc_personal_bank',
      name: 'Bank',
      scope: 'Personal',
      initialBalance: 0,
      paymentMethod: 'Bank Transfer',
      color: '#1E40AF',
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      id: 'acc_personal_cash',
      name: 'Cash',
      scope: 'Personal',
      initialBalance: 0,
      paymentMethod: 'Cash',
      color: '#059669',
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      id: 'acc_family_bank',
      name: 'Bank',
      scope: 'Family',
      initialBalance: 0,
      paymentMethod: 'Bank Transfer',
      color: '#7C3AED',
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
    {
      id: 'acc_family_cash',
      name: 'Cash',
      scope: 'Family',
      initialBalance: 0,
      paymentMethod: 'Cash',
      color: '#D97706',
      createdAt: nowStamp,
      updatedAt: nowStamp,
    },
  ];
}

let memoryWebStore: WebVaultStore | null = null;

function readWebStore(): WebVaultStore {
  if (memoryWebStore) return memoryWebStore;
  const fresh: WebVaultStore = {
    settings: { ...DEFAULT_SETTINGS },
    accounts: getDefaultAccountsList(),
    transactions: [],
    items: [],
    itemHistory: [],
    activities: [],
    reminders: [],
  };
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      const raw = globalThis.localStorage.getItem(WEB_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<WebVaultStore>;
        const validatedSettings = appSettingsSchema.safeParse({
          ...DEFAULT_SETTINGS,
          ...(parsed.settings || {}),
        });
        memoryWebStore = {
          settings: validatedSettings.success
            ? validatedSettings.data
            : { ...DEFAULT_SETTINGS },
          accounts:
            Array.isArray(parsed.accounts) && parsed.accounts.length > 0
              ? parsed.accounts
              : getDefaultAccountsList(),
          transactions: Array.isArray(parsed.transactions)
            ? parsed.transactions
            : [],
          items: Array.isArray(parsed.items) ? parsed.items : [],
          itemHistory: Array.isArray(parsed.itemHistory)
            ? parsed.itemHistory
            : [],
          activities: Array.isArray(parsed.activities) ? parsed.activities : [],
          reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
        };
        return memoryWebStore;
      }
    }
  } catch {
    // Fallback to in-memory store
  }
  memoryWebStore = fresh;
  writeWebStore(fresh);
  return fresh;
}

function writeWebStore(next: WebVaultStore): void {
  memoryWebStore = next;
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      globalThis.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // Ignore storage quota errors in restricted web contexts
  }
}

let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Thread/concurrency-safe singleton database accessor.
 * Ensures concurrent callers on app startup share one initialization transaction.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }
  if (dbInitPromise) {
    return dbInitPromise;
  }
  dbInitPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('vault_app.db');
    await initializeSchema(db);
    dbInstance = db;
    return db;
  })();

  try {
    return await dbInitPromise;
  } catch (err) {
    dbInitPromise = null;
    throw err;
  }
}

async function initializeSchema(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
      title TEXT NOT NULL,
      amount REAL NOT NULL CHECK(amount > 0),
      category TEXT NOT NULL,
      dateISO TEXT NOT NULL,
      paymentMethod TEXT NOT NULL,
      description TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(dateISO DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      purchasePrice REAL NOT NULL DEFAULT 0,
      purchaseDateISO TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      imageUri TEXT DEFAULT '',
      location TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_history (
      id TEXT PRIMARY KEY NOT NULL,
      itemId TEXT NOT NULL,
      action TEXT NOT NULL,
      previousStatus TEXT,
      newStatus TEXT NOT NULL,
      note TEXT DEFAULT '',
      timestamp TEXT NOT NULL,
      FOREIGN KEY (itemId) REFERENCES items(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_item_history_item ON item_history(itemId);

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      dateISO TEXT NOT NULL,
      timeString TEXT NOT NULL,
      numericValue REAL NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'mins',
      status TEXT NOT NULL CHECK(status IN ('completed', 'pending')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(dateISO DESC);

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      dateISO TEXT NOT NULL,
      timeString TEXT NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('Low', 'Medium', 'High')),
      category TEXT NOT NULL,
      recurrence TEXT NOT NULL DEFAULT 'none',
      isCompleted INTEGER NOT NULL DEFAULT 0,
      notificationId TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(dateISO ASC);

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      scope TEXT NOT NULL CHECK(scope IN ('Personal', 'Family')),
      initialBalance REAL NOT NULL DEFAULT 0,
      paymentMethod TEXT NOT NULL,
      color TEXT DEFAULT '#1E40AF',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Run non-destructive column migrations for existing databases
  try {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN accountId TEXT;`);
  } catch {
    // Column already exists
  }
  try {
    await db.execAsync(`ALTER TABLE transactions ADD COLUMN accountScope TEXT DEFAULT 'Personal';`);
  } catch {
    // Column already exists
  }

  // Ensure the four foundational wallets exist at zero balance.
  const existingAccounts = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM accounts`
  );
  if (!existingAccounts || existingAccounts.count === 0) {
    await seedDefaultAccounts(db);
  }

  // One-time automatic cleanup of old mock / seed data for a fresh start with user's own details
  const cleanedSeeds = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'has_fresh_cleaned_seeds'`
  );
  if (!cleanedSeeds) {
    await db.withTransactionAsync(async () => {
      await db.runAsync(`DELETE FROM item_history`);
      await db.runAsync(`DELETE FROM items`);
      await db.runAsync(`DELETE FROM transactions`);
      await db.runAsync(`DELETE FROM activities`);
      await db.runAsync(`DELETE FROM reminders`);
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('has_fresh_cleaned_seeds', 'true')`
      );
    });
  }

  // One-time automatic reset of initial balances for all 4 default wallets to 0
  const zeroedWallets = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'has_zeroed_default_wallets_v2'`
  );
  if (!zeroedWallets) {
    await db.withTransactionAsync(async () => {
      await db.runAsync(`UPDATE accounts SET initialBalance = 0;`);
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('has_zeroed_default_wallets_v2', 'true')`
      );
    });
  }

  // Check if initial seed / first-run setup has occurred
  const seeded = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'is_seeded'`
  );

  if (!seeded) {
    await seedInitialData(db);
  }
}

export async function seedDefaultAccounts(db: SQLite.SQLiteDatabase): Promise<void> {
  const defaultAccounts = getDefaultAccountsList();

  for (const acc of defaultAccounts) {
    await db.runAsync(
      `INSERT OR REPLACE INTO accounts (id, name, scope, initialBalance, paymentMethod, color, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        acc.id,
        acc.name,
        acc.scope,
        acc.initialBalance,
        acc.paymentMethod,
        acc.color || '#1E40AF',
        acc.createdAt,
        acc.updatedAt,
      ]
    );
  }
}

async function seedInitialData(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    // Check existing settings: if theme is light or not set, default to dark
    const existingSettingsRow = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM settings WHERE key = 'app_settings'`
    );
    if (existingSettingsRow?.value) {
      try {
        const parsed = JSON.parse(existingSettingsRow.value);
        if (parsed.theme === 'light') {
          parsed.theme = 'dark';
          await db.runAsync(
            `UPDATE settings SET value = ? WHERE key = 'app_settings'`,
            [JSON.stringify(parsed)]
          );
        }
      } catch {
        // ignore JSON parse error
      }
    } else {
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('app_settings', ?), ('is_seeded', 'true'), ('has_fresh_cleaned_seeds', 'true'), ('has_zeroed_default_wallets_v2', 'true')`,
        [JSON.stringify(DEFAULT_SETTINGS)]
      );
    }

    await seedDefaultAccounts(db);
  });
}

/**
 * Resets all user-entered data across all sections (transactions, items, history,
 * activities, reminders) so the user has a fresh start with their own details.
 * Re-seeds the four foundational accounts (Personal/Family Bank and Cash) at zero.
 */
export async function dbResetAllUserData(): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      settings: store.settings,
      accounts: getDefaultAccountsList(),
      transactions: [],
      items: [],
      itemHistory: [],
      activities: [],
      reminders: [],
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM item_history`);
    await db.runAsync(`DELETE FROM items`);
    await db.runAsync(`DELETE FROM transactions`);
    await db.runAsync(`DELETE FROM activities`);
    await db.runAsync(`DELETE FROM reminders`);
    await db.runAsync(`DELETE FROM accounts`);
    await seedDefaultAccounts(db);
    await db.runAsync(
      `INSERT OR REPLACE INTO settings (key, value) VALUES ('has_fresh_cleaned_seeds', 'true')`
    );
  });
}

// CRUD Operations

export async function dbGetSettings(): Promise<AppSettings> {
  if (isWeb) {
    return { ...readWebStore().settings };
  }
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = 'app_settings'`
  );
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value) as Partial<AppSettings>;
      const validated = appSettingsSchema.safeParse({
        ...DEFAULT_SETTINGS,
        ...parsed,
      });
      if (validated.success) {
        return validated.data;
      }
    } catch {
      // Corrupt or partial JSON falls back to safe defaults below.
    }
  }
  return { ...DEFAULT_SETTINGS };
}

export async function dbSaveSettings(settings: AppSettings): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({ ...store, settings });
    return;
  }
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value) VALUES ('app_settings', ?)`,
    [JSON.stringify(settings)]
  );
}

// Transactions CRUD
export async function dbGetAllTransactions(): Promise<Transaction[]> {
  if (isWeb) {
    return [...readWebStore().transactions].sort(
      (a, b) =>
        b.dateISO.localeCompare(a.dateISO) ||
        b.createdAt.localeCompare(a.createdAt)
    );
  }
  const db = await getDatabase();
  return await db.getAllAsync<Transaction>(
    `SELECT * FROM transactions ORDER BY dateISO DESC, createdAt DESC`
  );
}

export async function dbInsertTransaction(txn: Transaction): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      transactions: [txn, ...store.transactions],
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO transactions (id, type, title, amount, category, dateISO, paymentMethod, accountId, accountScope, description, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txn.id,
        txn.type,
        txn.title,
        txn.amount,
        txn.category,
        txn.dateISO,
        txn.paymentMethod,
        txn.accountId || null,
        txn.accountScope || 'Personal',
        txn.description,
        txn.createdAt,
        txn.updatedAt,
      ]
    );
  });
}

export async function dbUpdateTransaction(txn: Transaction): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      transactions: store.transactions.map((t) => (t.id === txn.id ? txn : t)),
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE transactions
       SET type = ?, title = ?, amount = ?, category = ?, dateISO = ?, paymentMethod = ?, accountId = ?, accountScope = ?, description = ?, updatedAt = ?
       WHERE id = ?`,
      [
        txn.type,
        txn.title,
        txn.amount,
        txn.category,
        txn.dateISO,
        txn.paymentMethod,
        txn.accountId || null,
        txn.accountScope || 'Personal',
        txn.description,
        txn.updatedAt,
        txn.id,
      ]
    );
  });
}

export async function dbDeleteTransaction(id: string): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      transactions: store.transactions.filter((t) => t.id !== id),
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM transactions WHERE id = ?`, [id]);
  });
}

// Accounts CRUD (Multi-wallet & Scope tracking)
export async function dbGetAllAccounts(): Promise<Account[]> {
  if (isWeb) {
    return [...readWebStore().accounts].sort(
      (a, b) =>
        a.scope.localeCompare(b.scope) || a.createdAt.localeCompare(b.createdAt)
    );
  }
  const db = await getDatabase();
  return await db.getAllAsync<Account>(
    `SELECT * FROM accounts ORDER BY scope ASC, createdAt ASC`
  );
}

export async function dbInsertAccount(account: Account): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      accounts: [...store.accounts, account],
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO accounts (id, name, scope, initialBalance, paymentMethod, color, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        account.id,
        account.name,
        account.scope,
        account.initialBalance,
        account.paymentMethod,
        account.color || '#1E40AF',
        account.createdAt,
        account.updatedAt,
      ]
    );
  });
}

export async function dbUpdateAccount(account: Account): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      accounts: store.accounts.map((a) => (a.id === account.id ? account : a)),
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE accounts
       SET name = ?, scope = ?, initialBalance = ?, paymentMethod = ?, color = ?, updatedAt = ?
       WHERE id = ?`,
      [
        account.name,
        account.scope,
        account.initialBalance,
        account.paymentMethod,
        account.color || '#1E40AF',
        account.updatedAt,
        account.id,
      ]
    );
  });
}

export async function dbDeleteAccount(id: string): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      accounts: store.accounts.filter((a) => a.id !== id),
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM accounts WHERE id = ?`, [id]);
  });
}

// Items CRUD & History
export async function dbGetAllItems(): Promise<PersonalItem[]> {
  if (isWeb) {
    return [...readWebStore().items].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt)
    );
  }
  const db = await getDatabase();
  return await db.getAllAsync<PersonalItem>(
    `SELECT * FROM items ORDER BY updatedAt DESC`
  );
}

export async function dbGetItemHistory(itemId?: string): Promise<ItemHistoryLog[]> {
  if (isWeb) {
    const list = readWebStore().itemHistory;
    const filtered = itemId ? list.filter((h) => h.itemId === itemId) : list;
    return [...filtered].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }
  const db = await getDatabase();
  if (itemId) {
    return await db.getAllAsync<ItemHistoryLog>(
      `SELECT * FROM item_history WHERE itemId = ? ORDER BY timestamp DESC`,
      [itemId]
    );
  }
  return await db.getAllAsync<ItemHistoryLog>(
    `SELECT * FROM item_history ORDER BY timestamp DESC`
  );
}

export async function dbInsertItem(item: PersonalItem, note?: string): Promise<void> {
  const historyId = `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const historyEntry: ItemHistoryLog = {
    id: historyId,
    itemId: item.id,
    action: 'Added Item',
    previousStatus: undefined,
    newStatus: item.status,
    note: note || `Added ${item.name} (${item.status}) at ${item.location}`,
    timestamp: item.createdAt,
  };
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      items: [item, ...store.items],
      itemHistory: [historyEntry, ...store.itemHistory],
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO items (id, name, description, category, purchasePrice, purchaseDateISO, quantity, imageUri, location, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.name,
        item.description,
        item.category,
        item.purchasePrice,
        item.purchaseDateISO,
        item.quantity,
        item.imageUri,
        item.location,
        item.status,
        item.createdAt,
        item.updatedAt,
      ]
    );

    await db.runAsync(
      `INSERT INTO item_history (id, itemId, action, previousStatus, newStatus, note, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        historyId,
        item.id,
        'Added Item',
        null,
        item.status,
        note || `Added ${item.name} (${item.status}) at ${item.location}`,
        item.createdAt,
      ]
    );
  });
}

export async function dbUpdateItem(
  item: PersonalItem,
  previousStatus?: PersonalItem['status'],
  note?: string
): Promise<void> {
  const historyId = `hist_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const actionLabel =
    previousStatus && previousStatus !== item.status
      ? `Status: ${previousStatus} → ${item.status}`
      : 'Updated Details';
  if (isWeb) {
    const store = readWebStore();
    const historyEntry: ItemHistoryLog = {
      id: historyId,
      itemId: item.id,
      action: actionLabel,
      previousStatus: previousStatus || item.status,
      newStatus: item.status,
      note: note || `Location: ${item.location}, Qty: ${item.quantity}`,
      timestamp: item.updatedAt,
    };
    writeWebStore({
      ...store,
      items: store.items.map((i) => (i.id === item.id ? item : i)),
      itemHistory: [historyEntry, ...store.itemHistory],
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE items
       SET name = ?, description = ?, category = ?, purchasePrice = ?, purchaseDateISO = ?, quantity = ?, imageUri = ?, location = ?, status = ?, updatedAt = ?
       WHERE id = ?`,
      [
        item.name,
        item.description,
        item.category,
        item.purchasePrice,
        item.purchaseDateISO,
        item.quantity,
        item.imageUri,
        item.location,
        item.status,
        item.updatedAt,
        item.id,
      ]
    );

    await db.runAsync(
      `INSERT INTO item_history (id, itemId, action, previousStatus, newStatus, note, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        historyId,
        item.id,
        actionLabel,
        previousStatus || item.status,
        item.status,
        note || `Location: ${item.location}, Qty: ${item.quantity}`,
        item.updatedAt,
      ]
    );
  });
}

export async function dbDeleteItem(id: string): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      items: store.items.filter((i) => i.id !== id),
      itemHistory: store.itemHistory.filter((h) => h.itemId !== id),
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM item_history WHERE itemId = ?`, [id]);
    await db.runAsync(`DELETE FROM items WHERE id = ?`, [id]);
  });
}

// Activities CRUD
export async function dbGetAllActivities(): Promise<ActivityRecord[]> {
  if (isWeb) {
    return [...readWebStore().activities].sort(
      (a, b) =>
        b.dateISO.localeCompare(a.dateISO) ||
        b.timeString.localeCompare(a.timeString)
    );
  }
  const db = await getDatabase();
  return await db.getAllAsync<ActivityRecord>(
    `SELECT * FROM activities ORDER BY dateISO DESC, timeString DESC`
  );
}

export async function dbInsertActivity(activity: ActivityRecord): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      activities: [activity, ...store.activities],
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO activities (id, title, description, category, dateISO, timeString, numericValue, unit, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        activity.id,
        activity.title,
        activity.description,
        activity.category,
        activity.dateISO,
        activity.timeString,
        activity.numericValue,
        activity.unit,
        activity.status,
        activity.createdAt,
        activity.updatedAt,
      ]
    );
  });
}

export async function dbUpdateActivity(activity: ActivityRecord): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      activities: store.activities.map((a) =>
        a.id === activity.id ? activity : a
      ),
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE activities
       SET title = ?, description = ?, category = ?, dateISO = ?, timeString = ?, numericValue = ?, unit = ?, status = ?, updatedAt = ?
       WHERE id = ?`,
      [
        activity.title,
        activity.description,
        activity.category,
        activity.dateISO,
        activity.timeString,
        activity.numericValue,
        activity.unit,
        activity.status,
        activity.updatedAt,
        activity.id,
      ]
    );
  });
}

export async function dbDeleteActivity(id: string): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      activities: store.activities.filter((a) => a.id !== id),
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM activities WHERE id = ?`, [id]);
  });
}

// Reminders CRUD
interface ReminderRow extends Omit<ReminderItem, 'isCompleted'> {
  isCompleted: number;
}

export async function dbGetAllReminders(): Promise<ReminderItem[]> {
  if (isWeb) {
    return [...readWebStore().reminders].sort(
      (a, b) =>
        a.dateISO.localeCompare(b.dateISO) ||
        a.timeString.localeCompare(b.timeString)
    );
  }
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(
    `SELECT * FROM reminders ORDER BY dateISO ASC, timeString ASC`
  );
  return rows.map((r) => ({
    ...r,
    isCompleted: Boolean(r.isCompleted),
  }));
}

export async function dbInsertReminder(reminder: ReminderItem): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      reminders: [...store.reminders, reminder],
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO reminders (id, title, description, dateISO, timeString, priority, category, recurrence, isCompleted, notificationId, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reminder.id,
        reminder.title,
        reminder.description,
        reminder.dateISO,
        reminder.timeString,
        reminder.priority,
        reminder.category,
        reminder.recurrence,
        reminder.isCompleted ? 1 : 0,
        reminder.notificationId || '',
        reminder.createdAt,
        reminder.updatedAt,
      ]
    );
  });
}

export async function dbUpdateReminder(reminder: ReminderItem): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      reminders: store.reminders.map((r) =>
        r.id === reminder.id ? reminder : r
      ),
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE reminders
       SET title = ?, description = ?, dateISO = ?, timeString = ?, priority = ?, category = ?, recurrence = ?, isCompleted = ?, notificationId = ?, updatedAt = ?
       WHERE id = ?`,
      [
        reminder.title,
        reminder.description,
        reminder.dateISO,
        reminder.timeString,
        reminder.priority,
        reminder.category,
        reminder.recurrence,
        reminder.isCompleted ? 1 : 0,
        reminder.notificationId || '',
        reminder.updatedAt,
        reminder.id,
      ]
    );
  });
}

export async function dbDeleteReminder(id: string): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      ...store,
      reminders: store.reminders.filter((r) => r.id !== id),
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM reminders WHERE id = ?`, [id]);
  });
}

// Full Backup & Restore
export interface VaultBackupPayload {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  transactions: Transaction[];
  items: PersonalItem[];
  itemHistory: ItemHistoryLog[];
  activities: ActivityRecord[];
  reminders: ReminderItem[];
  accounts?: Account[];
}

export async function dbRestoreBackup(payload: VaultBackupPayload): Promise<void> {
  if (isWeb) {
    const store = readWebStore();
    writeWebStore({
      settings: payload.settings || store.settings,
      accounts:
        payload.accounts && payload.accounts.length > 0
          ? payload.accounts
          : getDefaultAccountsList(),
      transactions: payload.transactions || [],
      items: payload.items || [],
      itemHistory: payload.itemHistory || [],
      activities: payload.activities || [],
      reminders: payload.reminders || [],
    });
    return;
  }
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    if (payload.settings) {
      await db.runAsync(
        `INSERT OR REPLACE INTO settings (key, value) VALUES ('app_settings', ?)`,
        [JSON.stringify(payload.settings)]
      );
    }

    await db.runAsync(`DELETE FROM item_history`);
    await db.runAsync(`DELETE FROM items`);
    await db.runAsync(`DELETE FROM transactions`);
    await db.runAsync(`DELETE FROM activities`);
    await db.runAsync(`DELETE FROM reminders`);

    // Accounts must always mirror the restored dataset. Older backups did not
    // include accounts, so reseed the four foundational wallets in that case
    // rather than leaving stale accounts that do not match the transactions.
    await db.runAsync(`DELETE FROM accounts`);
    if (payload.accounts && payload.accounts.length > 0) {
      for (const a of payload.accounts) {
        await db.runAsync(
          `INSERT INTO accounts (id, name, scope, initialBalance, paymentMethod, color, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            a.id,
            a.name,
            a.scope,
            a.initialBalance,
            a.paymentMethod,
            a.color || '#1E40AF',
            a.createdAt,
            a.updatedAt,
          ]
        );
      }
    } else {
      await seedDefaultAccounts(db);
    }

    for (const t of payload.transactions || []) {
      await db.runAsync(
        `INSERT INTO transactions (id, type, title, amount, category, dateISO, paymentMethod, accountId, accountScope, description, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          t.id,
          t.type,
          t.title,
          t.amount,
          t.category,
          t.dateISO,
          t.paymentMethod,
          t.accountId || null,
          t.accountScope || 'Personal',
          t.description || '',
          t.createdAt,
          t.updatedAt,
        ]
      );
    }

    for (const item of payload.items || []) {
      await db.runAsync(
        `INSERT INTO items (id, name, description, category, purchasePrice, purchaseDateISO, quantity, imageUri, location, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.name,
          item.description || '',
          item.category,
          item.purchasePrice,
          item.purchaseDateISO,
          item.quantity,
          item.imageUri || '',
          item.location,
          item.status,
          item.createdAt,
          item.updatedAt,
        ]
      );
    }

    for (const h of payload.itemHistory || []) {
      await db.runAsync(
        `INSERT INTO item_history (id, itemId, action, previousStatus, newStatus, note, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          h.id,
          h.itemId,
          h.action,
          h.previousStatus || null,
          h.newStatus,
          h.note || '',
          h.timestamp,
        ]
      );
    }

    for (const act of payload.activities || []) {
      await db.runAsync(
        `INSERT INTO activities (id, title, description, category, dateISO, timeString, numericValue, unit, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          act.id,
          act.title,
          act.description || '',
          act.category,
          act.dateISO,
          act.timeString,
          act.numericValue,
          act.unit || 'mins',
          act.status,
          act.createdAt,
          act.updatedAt,
        ]
      );
    }

    for (const rem of payload.reminders || []) {
      await db.runAsync(
        `INSERT INTO reminders (id, title, description, dateISO, timeString, priority, category, recurrence, isCompleted, notificationId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rem.id,
          rem.title,
          rem.description || '',
          rem.dateISO,
          rem.timeString,
          rem.priority,
          rem.category,
          rem.recurrence || 'none',
          rem.isCompleted ? 1 : 0,
          rem.notificationId || '',
          rem.createdAt,
          rem.updatedAt,
        ]
      );
    }
  });
}
