import { create } from 'zustand';
import {
  VaultBackupPayload,
  dbDeleteActivity,
  dbDeleteItem,
  dbDeleteReminder,
  dbDeleteTransaction,
  dbGetAllActivities,
  dbGetAllItems,
  dbGetAllReminders,
  dbGetAllTransactions,
  dbGetItemHistory,
  dbGetSettings,
  dbInsertActivity,
  dbInsertItem,
  dbInsertReminder,
  dbInsertTransaction,
  dbRestoreBackup,
  dbSaveSettings,
  dbUpdateActivity,
  dbUpdateItem,
  dbUpdateReminder,
  dbUpdateTransaction,
} from '../db/database';
import {
  ActivityRecord,
  AppSettings,
  ItemHistoryLog,
  PersonalItem,
  ReminderItem,
  Transaction,
} from '../types';
import {
  cancelReminderNotification,
  scheduleReminderNotification,
} from '../utils/notifications';

interface VaultState {
  isHydrated: boolean;
  isSubmitting: boolean;
  error: string | null;

  settings: AppSettings;
  transactions: Transaction[];
  items: PersonalItem[];
  itemHistory: ItemHistoryLog[];
  activities: ActivityRecord[];
  reminders: ReminderItem[];

  // Actions
  hydrateFromDB: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;

  // Transactions
  addTransaction: (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  editTransaction: (
    id: string,
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;

  // Items
  addItem: (
    data: Omit<PersonalItem, 'id' | 'createdAt' | 'updatedAt'>,
    note?: string
  ) => Promise<void>;
  editItem: (
    id: string,
    data: Omit<PersonalItem, 'id' | 'createdAt' | 'updatedAt'>,
    note?: string
  ) => Promise<void>;
  removeItem: (id: string) => Promise<void>;

  // Activities
  addActivity: (
    data: Omit<ActivityRecord, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  editActivity: (
    id: string,
    data: Omit<ActivityRecord, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  toggleActivityStatus: (id: string) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;

  // Reminders
  addReminder: (
    data: Omit<ReminderItem, 'id' | 'isCompleted' | 'notificationId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  editReminder: (
    id: string,
    data: Omit<ReminderItem, 'id' | 'isCompleted' | 'notificationId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  toggleReminderCompleted: (id: string) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;

  // Backup & Restore
  getFullBackupPayload: () => VaultBackupPayload;
  restoreFromBackup: (payload: VaultBackupPayload) => Promise<void>;
}

const DEFAULT_SETTINGS: AppSettings = {
  userName: 'Aarav Sharma',
  userTitle: 'Kathmandu, Nepal',
  currency: 'NPR',
  language: 'ne',
  preferredCalendar: 'BS',
  timeFormat: '12h',
  notificationsEnabled: true,
  theme: 'light',
};

export const useVaultStore = create<VaultState>((set, get) => ({
  isHydrated: false,
  isSubmitting: false,
  error: null,

  settings: DEFAULT_SETTINGS,
  transactions: [],
  items: [],
  itemHistory: [],
  activities: [],
  reminders: [],

  hydrateFromDB: async () => {
    try {
      const [settings, transactions, items, itemHistory, activities, reminders] =
        await Promise.all([
          dbGetSettings(),
          dbGetAllTransactions(),
          dbGetAllItems(),
          dbGetItemHistory(),
          dbGetAllActivities(),
          dbGetAllReminders(),
        ]);

      set({
        isHydrated: true,
        settings,
        transactions,
        items,
        itemHistory,
        activities,
        reminders,
        error: null,
      });
    } catch (err) {
      set({
        isHydrated: true,
        error: err instanceof Error ? err.message : 'Failed to load database',
      });
    }
  },

  updateSettings: async (partial) => {
    const nextSettings: AppSettings = {
      ...get().settings,
      ...partial,
    };
    set({ settings: nextSettings });
    await dbSaveSettings(nextSettings);
  },

  // Transactions
  addTransaction: async (data) => {
    if (get().isSubmitting) return;
    set({ isSubmitting: true, error: null });
    try {
      const now = new Date().toISOString();
      const newTxn: Transaction = {
        ...data,
        id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbInsertTransaction(newTxn);
      const transactions = await dbGetAllTransactions();
      set({ transactions, isSubmitting: false });
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Failed to save transaction',
      });
      throw err;
    }
  },

  editTransaction: async (id, data) => {
    if (get().isSubmitting) return;
    set({ isSubmitting: true, error: null });
    try {
      const existing = get().transactions.find((t) => t.id === id);
      if (!existing) {
        set({ isSubmitting: false });
        return;
      }
      const updated: Transaction = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await dbUpdateTransaction(updated);
      const transactions = await dbGetAllTransactions();
      set({ transactions, isSubmitting: false });
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Failed to update transaction',
      });
      throw err;
    }
  },

  removeTransaction: async (id) => {
    await dbDeleteTransaction(id);
    set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    }));
  },

  // Items
  addItem: async (data, note) => {
    if (get().isSubmitting) return;
    set({ isSubmitting: true, error: null });
    try {
      const now = new Date().toISOString();
      const newItem: PersonalItem = {
        ...data,
        id: `itm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbInsertItem(newItem, note);
      const [items, itemHistory] = await Promise.all([
        dbGetAllItems(),
        dbGetItemHistory(),
      ]);
      set({ items, itemHistory, isSubmitting: false });
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Failed to save item',
      });
      throw err;
    }
  },

  editItem: async (id, data, note) => {
    if (get().isSubmitting) return;
    set({ isSubmitting: true, error: null });
    try {
      const existing = get().items.find((i) => i.id === id);
      if (!existing) {
        set({ isSubmitting: false });
        return;
      }
      const updated: PersonalItem = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await dbUpdateItem(updated, existing.status, note);
      const [items, itemHistory] = await Promise.all([
        dbGetAllItems(),
        dbGetItemHistory(),
      ]);
      set({ items, itemHistory, isSubmitting: false });
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Failed to update item',
      });
      throw err;
    }
  },

  removeItem: async (id) => {
    await dbDeleteItem(id);
    set((state) => ({
      items: state.items.filter((i) => i.id !== id),
      itemHistory: state.itemHistory.filter((h) => h.itemId !== id),
    }));
  },

  // Activities
  addActivity: async (data) => {
    if (get().isSubmitting) return;
    set({ isSubmitting: true, error: null });
    try {
      const now = new Date().toISOString();
      const newActivity: ActivityRecord = {
        ...data,
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbInsertActivity(newActivity);
      const activities = await dbGetAllActivities();
      set({ activities, isSubmitting: false });
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Failed to save activity',
      });
      throw err;
    }
  },

  editActivity: async (id, data) => {
    if (get().isSubmitting) return;
    set({ isSubmitting: true, error: null });
    try {
      const existing = get().activities.find((a) => a.id === id);
      if (!existing) {
        set({ isSubmitting: false });
        return;
      }
      const updated: ActivityRecord = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await dbUpdateActivity(updated);
      const activities = await dbGetAllActivities();
      set({ activities, isSubmitting: false });
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Failed to update activity',
      });
      throw err;
    }
  },

  toggleActivityStatus: async (id) => {
    const existing = get().activities.find((a) => a.id === id);
    if (!existing) return;
    const updated: ActivityRecord = {
      ...existing,
      status: existing.status === 'completed' ? 'pending' : 'completed',
      updatedAt: new Date().toISOString(),
    };
    await dbUpdateActivity(updated);
    set((state) => ({
      activities: state.activities.map((a) => (a.id === id ? updated : a)),
    }));
  },

  removeActivity: async (id) => {
    await dbDeleteActivity(id);
    set((state) => ({
      activities: state.activities.filter((a) => a.id !== id),
    }));
  },

  // Reminders
  addReminder: async (data) => {
    if (get().isSubmitting) return;
    set({ isSubmitting: true, error: null });
    try {
      const now = new Date().toISOString();
      const draft: ReminderItem = {
        ...data,
        id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        isCompleted: false,
        notificationId: '',
        createdAt: now,
        updatedAt: now,
      };
      const notifId = await scheduleReminderNotification(
        draft,
        get().settings.notificationsEnabled
      );
      const finalReminder: ReminderItem = {
        ...draft,
        notificationId: notifId,
      };
      await dbInsertReminder(finalReminder);
      const reminders = await dbGetAllReminders();
      set({ reminders, isSubmitting: false });
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Failed to create reminder',
      });
      throw err;
    }
  },

  editReminder: async (id, data) => {
    if (get().isSubmitting) return;
    set({ isSubmitting: true, error: null });
    try {
      const existing = get().reminders.find((r) => r.id === id);
      if (!existing) {
        set({ isSubmitting: false });
        return;
      }
      if (existing.notificationId) {
        await cancelReminderNotification(existing.notificationId);
      }
      const draft: ReminderItem = {
        ...existing,
        ...data,
        updatedAt: new Date().toISOString(),
      };
      const notifId = await scheduleReminderNotification(
        draft,
        get().settings.notificationsEnabled
      );
      const updated: ReminderItem = {
        ...draft,
        notificationId: notifId,
      };
      await dbUpdateReminder(updated);
      const reminders = await dbGetAllReminders();
      set({ reminders, isSubmitting: false });
    } catch (err) {
      set({
        isSubmitting: false,
        error: err instanceof Error ? err.message : 'Failed to update reminder',
      });
      throw err;
    }
  },

  toggleReminderCompleted: async (id) => {
    const existing = get().reminders.find((r) => r.id === id);
    if (!existing) return;

    const nextCompleted = !existing.isCompleted;
    let notifId = existing.notificationId || '';

    if (nextCompleted && notifId) {
      await cancelReminderNotification(notifId);
      notifId = '';
    } else if (!nextCompleted) {
      notifId = await scheduleReminderNotification(
        { ...existing, isCompleted: false },
        get().settings.notificationsEnabled
      );
    }

    const updated: ReminderItem = {
      ...existing,
      isCompleted: nextCompleted,
      notificationId: notifId,
      updatedAt: new Date().toISOString(),
    };
    await dbUpdateReminder(updated);
    set((state) => ({
      reminders: state.reminders.map((r) => (r.id === id ? updated : r)),
    }));
  },

  removeReminder: async (id) => {
    const existing = get().reminders.find((r) => r.id === id);
    if (existing?.notificationId) {
      await cancelReminderNotification(existing.notificationId);
    }
    await dbDeleteReminder(id);
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
  },

  getFullBackupPayload: () => {
    const state = get();
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      transactions: state.transactions,
      items: state.items,
      itemHistory: state.itemHistory,
      activities: state.activities,
      reminders: state.reminders,
    };
  },

  restoreFromBackup: async (payload) => {
    await dbRestoreBackup(payload);
    await get().hydrateFromDB();
  },
}));

/**
 * Financial selector utility:
 * Total Balance = Total Income − Total Expenses
 */
export function calculateFinancialSummary(transactions: Transaction[]): {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
} {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const t of transactions) {
    const amt = Number(t.amount) || 0;
    if (t.type === 'income') {
      totalIncome += amt;
    } else {
      totalExpense += amt;
    }
  }

  return {
    totalIncome,
    totalExpense,
    totalBalance: totalIncome - totalExpense,
  };
}
