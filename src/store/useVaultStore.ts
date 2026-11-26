import { create } from 'zustand';
import {
  VaultBackupPayload,
  dbDeleteActivity,
  dbDeleteItem,
  dbDeleteReminder,
  dbDeleteSavingsGoal,
  dbDeleteTransaction,
  dbGetAllAccounts,
  dbGetAllActivities,
  dbGetAllItems,
  dbGetAllReminders,
  dbGetAllSavingsGoals,
  dbGetAllTransactions,
  dbGetItemHistory,
  dbGetSettings,
  dbInsertActivity,
  dbInsertItem,
  dbInsertReminder,
  dbInsertSavingsGoal,
  dbInsertTransaction,
  dbResetAllUserData,
  dbRestoreBackup,
  dbSaveSettings,
  dbUpdateActivity,
  dbUpdateItem,
  dbUpdateReminder,
  dbUpdateSavingsGoal,
  dbUpdateTransaction,
} from '../db/database';
import {
  Account,
  AccountScope,
  ActivityRecord,
  AppSettings,
  ItemHistoryLog,
  ParsedQuickInput,
  PaymentMethod,
  PersonalItem,
  ReminderItem,
  SavingsGoal,
  Transaction,
  activitySchema,
  itemSchema,
  reminderSchema,
  savingsGoalSchema,
  transactionSchema,
} from '../types';
import {
  cancelReminderNotification,
  requestNotificationPermissions,
  scheduleReminderNotification,
} from '../utils/notifications';
import { parseQuickInput } from '../utils/nlpParser';
import { getNowInNPT } from '../utils/nepaliDate';
import {
  AccountSummaryGrouping,
  AccountWithBalance,
  calculateAccountBalances,
} from '../utils/accountBalances';
import { DEFAULT_SETTINGS } from '../constants/appSettings';
import { deletePersistedItemImage } from '../utils/itemImages';

export {
  AccountSummaryGrouping,
  AccountWithBalance,
  calculateAccountBalances,
};

interface VaultState {
  isHydrated: boolean;
  isSubmitting: boolean;
  error: string | null;

  settings: AppSettings;
  accounts: Account[];
  transactions: Transaction[];
  items: PersonalItem[];
  itemHistory: ItemHistoryLog[];
  activities: ActivityRecord[];
  reminders: ReminderItem[];
  savingsGoals: SavingsGoal[];

  // Actions
  hydrateFromDB: () => Promise<void>;
  clearError: () => void;
  updateSettings: (partial: Partial<AppSettings>) => Promise<boolean>;

  // Transactions
  addTransaction: (
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<Transaction | null>;
  editTransaction: (
    id: string,
    data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;

  // Items
  addItem: (
    data: Omit<PersonalItem, 'id' | 'createdAt' | 'updatedAt'>,
    note?: string
  ) => Promise<PersonalItem | null>;
  editItem: (
    id: string,
    data: Omit<PersonalItem, 'id' | 'createdAt' | 'updatedAt'>,
    note?: string
  ) => Promise<void>;
  removeItem: (id: string) => Promise<void>;

  // Activities
  addActivity: (
    data: Omit<ActivityRecord, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<ActivityRecord | null>;
  editActivity: (
    id: string,
    data: Omit<ActivityRecord, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  toggleActivityStatus: (id: string, dateISO?: string) => Promise<void>;
  removeActivity: (id: string) => Promise<void>;

  // Reminders
  addReminder: (
    data: Omit<ReminderItem, 'id' | 'isCompleted' | 'notificationId' | 'createdAt' | 'updatedAt'>
  ) => Promise<ReminderItem | null>;
  editReminder: (
    id: string,
    data: Omit<ReminderItem, 'id' | 'isCompleted' | 'notificationId' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  toggleReminderCompleted: (id: string) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;

  // Savings Goals
  addSavingsGoal: (
    data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<SavingsGoal | null>;
  editSavingsGoal: (
    id: string,
    data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  contributeToSavingsGoal: (id: string, deltaAmount: number) => Promise<void>;
  removeSavingsGoal: (id: string) => Promise<void>;

  // Intelligent Quick Message Box Command Processor
  processQuickCommand: (rawText: string) => Promise<{
    success: boolean;
    message: string;
    parsed: ParsedQuickInput;
    undoAction?: () => Promise<void>;
  }>;

  // Backup & Restore & Reset
  getFullBackupPayload: () => VaultBackupPayload;
  restoreFromBackup: (payload: VaultBackupPayload) => Promise<void>;
  resetAllData: () => Promise<void>;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isHydrated: false,
  isSubmitting: false,
  error: null,

  settings: DEFAULT_SETTINGS,
  accounts: [],
  transactions: [],
  items: [],
  itemHistory: [],
  activities: [],
  reminders: [],
  savingsGoals: [],

  hydrateFromDB: async () => {
    try {
      const [
        settings,
        accounts,
        transactions,
        items,
        itemHistory,
        activities,
        reminders,
        savingsGoals,
      ] = await Promise.all([
        dbGetSettings(),
        dbGetAllAccounts(),
        dbGetAllTransactions(),
        dbGetAllItems(),
        dbGetItemHistory(),
        dbGetAllActivities(),
        dbGetAllReminders(),
        dbGetAllSavingsGoals(),
      ]);

      set({
        isHydrated: true,
        settings,
        accounts,
        transactions,
        items,
        itemHistory,
        activities,
        reminders,
        savingsGoals,
        error: null,
      });

      // Ensure active recurring/upcoming reminders have up-to-date Android notifications queued
      if (settings.notificationsEnabled && reminders.some((r) => !r.isCompleted)) {
        const repeatCount = settings.alarmRepeatCount || 3;
        void (async () => {
          for (const rem of reminders) {
            if (!rem.isCompleted && (rem.recurrence !== 'none' || !rem.notificationId)) {
              const newNotifId = await scheduleReminderNotification(rem, true, repeatCount);
              if (newNotifId && newNotifId !== rem.notificationId) {
                const updated = { ...rem, notificationId: newNotifId };
                await dbUpdateReminder(updated);
              }
            }
          }
        })();
      }
    } catch (err) {
      set({
        isHydrated: true,
        error: err instanceof Error ? err.message : 'Failed to load database',
      });
    }
  },

  clearError: () => set({ error: null }),

  updateSettings: async (partial) => {
    const prevSettings = get().settings;
    const nextSettings: AppSettings = {
      ...prevSettings,
      ...partial,
    };
    set({ settings: nextSettings, error: null });

    try {
      await dbSaveSettings(nextSettings);
    } catch (err) {
      set({
        settings: prevSettings,
        error:
          err instanceof Error ? err.message : 'Failed to save settings',
      });
      return false;
    }

    // If notificationsEnabled or alarmRepeatCount changed, sync all pending reminder notifications.
    const notifToggled =
      partial.notificationsEnabled !== undefined &&
      partial.notificationsEnabled !== prevSettings.notificationsEnabled;
    const repeatChanged =
      partial.alarmRepeatCount !== undefined &&
      partial.alarmRepeatCount !== prevSettings.alarmRepeatCount;

    if (notifToggled || (repeatChanged && nextSettings.notificationsEnabled)) {
      try {
        const repeatCount = nextSettings.alarmRepeatCount || 3;
        if (nextSettings.notificationsEnabled) {
          await requestNotificationPermissions(repeatCount);
        }
        const currentReminders = get().reminders;
        const updatedReminders: ReminderItem[] = [];

        for (const rem of currentReminders) {
          if (rem.isCompleted) {
            updatedReminders.push(rem);
            continue;
          }
          if (!nextSettings.notificationsEnabled) {
            if (rem.notificationId) {
              await cancelReminderNotification(rem.notificationId);
            }
            const cleared = { ...rem, notificationId: '' };
            await dbUpdateReminder(cleared);
            updatedReminders.push(cleared);
          } else {
            const newNotifId = await scheduleReminderNotification(
              rem,
              true,
              repeatCount
            );
            const scheduled = { ...rem, notificationId: newNotifId };
            await dbUpdateReminder(scheduled);
            updatedReminders.push(scheduled);
          }
        }
        set({ reminders: updatedReminders });
      } catch (err) {
        set({
          error:
            err instanceof Error
              ? err.message
              : 'Could not update reminder notifications',
        });
      }
    }

    return true;
  },

  // Transactions
  addTransaction: async (data) => {
    if (get().isSubmitting) return null;
    set({ isSubmitting: true, error: null });
    try {
      const validated = transactionSchema.parse(data);
      const now = new Date().toISOString();
      const accounts = get().accounts;
      let accountId = validated.accountId;
      if (!accountId && accounts.length > 0) {
        const scope = validated.accountScope || 'Personal';
        const matched = accounts.find((a) => {
          if (a.scope !== scope) return false;
          if (validated.paymentMethod === 'Bank Transfer' && a.paymentMethod === 'Bank Transfer') return true;
          if (validated.paymentMethod === 'Cash' && a.paymentMethod === 'Cash') return true;
          return a.paymentMethod === validated.paymentMethod;
        });
        accountId = matched ? matched.id : accounts.find((a) => a.scope === scope)?.id || accounts[0]?.id;
      }

      const newTxn: Transaction = {
        ...validated,
        accountId,
        id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbInsertTransaction(newTxn);
      const transactions = await dbGetAllTransactions();
      set({ transactions, isSubmitting: false });
      return newTxn;
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

      const validated = transactionSchema.parse(data);
      const accounts = get().accounts;
      let accountId = validated.accountId || existing.accountId;
      if (accounts.length > 0) {
        const scope =
          validated.accountScope || existing.accountScope || 'Personal';
        const payment = validated.paymentMethod || existing.paymentMethod;
        const matched = accounts.find((a) => {
          if (a.scope !== scope) return false;
          if (payment === 'Bank Transfer' && a.paymentMethod === 'Bank Transfer') return true;
          if (payment === 'Cash' && a.paymentMethod === 'Cash') return true;
          return a.paymentMethod === payment;
        });
        if (matched) accountId = matched.id;
      }

      const updated: Transaction = {
        ...existing,
        ...validated,
        accountId,
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
    try {
      await dbDeleteTransaction(id);
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
        error: null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to delete transaction',
      });
    }
  },

  // Items
  addItem: async (data, note) => {
    if (get().isSubmitting) return null;
    set({ isSubmitting: true, error: null });
    try {
      const validated = itemSchema.parse(data);
      const now = new Date().toISOString();
      const newItem: PersonalItem = {
        ...validated,
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
      return newItem;
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
      const validated = itemSchema.parse(data);
      const updated: PersonalItem = {
        ...existing,
        ...validated,
        updatedAt: new Date().toISOString(),
      };
      await dbUpdateItem(updated, existing.status, note);
      if (existing.imageUri && existing.imageUri !== updated.imageUri) {
        deletePersistedItemImage(existing.imageUri);
      }
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
    const existing = get().items.find((item) => item.id === id);
    try {
      await dbDeleteItem(id);
      if (existing?.imageUri) deletePersistedItemImage(existing.imageUri);
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
        itemHistory: state.itemHistory.filter((h) => h.itemId !== id),
        error: null,
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete item',
      });
    }
  },

  // Activities
  addActivity: async (data) => {
    if (get().isSubmitting) return null;
    set({ isSubmitting: true, error: null });
    try {
      const validated = activitySchema.parse(data);
      const now = new Date().toISOString();
      const newActivity: ActivityRecord = {
        ...validated,
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbInsertActivity(newActivity);
      const activities = await dbGetAllActivities();
      set({ activities, isSubmitting: false });
      return newActivity;
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
      const validated = activitySchema.parse(data);
      const updated: ActivityRecord = {
        ...existing,
        ...validated,
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

  toggleActivityStatus: async (id, dateISO) => {
    const existing = get().activities.find((a) => a.id === id);
    if (!existing) return;
    const targetDate = dateISO || getNowInNPT().isoDate;
    const isRecurring =
      existing.repeat === 'everyday' || existing.repeat === 'weekdays';

    let updated: ActivityRecord;
    if (isRecurring) {
      const prevDates = existing.completedDates || [];
      const alreadyDone = prevDates.includes(targetDate);
      const nextDates = alreadyDone
        ? prevDates.filter((d) => d !== targetDate)
        : [...prevDates, targetDate];
      const todayISO = getNowInNPT().isoDate;
      updated = {
        ...existing,
        completedDates: nextDates,
        status: nextDates.includes(todayISO) ? 'completed' : 'pending',
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = {
        ...existing,
        status: existing.status === 'completed' ? 'pending' : 'completed',
        updatedAt: new Date().toISOString(),
      };
    }

    try {
      await dbUpdateActivity(updated);
      set((state) => ({
        activities: state.activities.map((a) => (a.id === id ? updated : a)),
        error: null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to update activity',
      });
    }
  },

  removeActivity: async (id) => {
    try {
      await dbDeleteActivity(id);
      set((state) => ({
        activities: state.activities.filter((a) => a.id !== id),
        error: null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to delete activity',
      });
    }
  },

  // Reminders
  addReminder: async (data) => {
    if (get().isSubmitting) return null;
    set({ isSubmitting: true, error: null });
    try {
      const validated = reminderSchema.parse(data);
      const now = new Date().toISOString();
      const draft: ReminderItem = {
        ...validated,
        id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        isCompleted: false,
        notificationId: '',
        createdAt: now,
        updatedAt: now,
      };
      const notifId = await scheduleReminderNotification(
        draft,
        get().settings.notificationsEnabled,
        get().settings.alarmRepeatCount || 3
      );
      const finalReminder: ReminderItem = {
        ...draft,
        notificationId: notifId,
      };
      await dbInsertReminder(finalReminder);
      const reminders = await dbGetAllReminders();
      set({ reminders, isSubmitting: false });
      return finalReminder;
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
      const validated = reminderSchema.parse(data);
      const draft: ReminderItem = {
        ...existing,
        ...validated,
        updatedAt: new Date().toISOString(),
      };
      const notifId = await scheduleReminderNotification(
        draft,
        get().settings.notificationsEnabled,
        get().settings.alarmRepeatCount || 3
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

    try {
      if (nextCompleted && notifId) {
        await cancelReminderNotification(notifId);
        notifId = '';
      } else if (!nextCompleted) {
        notifId = await scheduleReminderNotification(
          { ...existing, isCompleted: false },
          get().settings.notificationsEnabled,
          get().settings.alarmRepeatCount || 3
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
        error: null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to update reminder',
      });
    }
  },

  removeReminder: async (id) => {
    const existing = get().reminders.find((r) => r.id === id);
    try {
      if (existing?.notificationId) {
        await cancelReminderNotification(existing.notificationId);
      }
      await dbDeleteReminder(id);
      set((state) => ({
        reminders: state.reminders.filter((r) => r.id !== id),
        error: null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to delete reminder',
      });
    }
  },

  // Savings Goals
  addSavingsGoal: async (data) => {
    if (get().isSubmitting) return null;
    set({ isSubmitting: true, error: null });
    try {
      const validated = savingsGoalSchema.parse(data);
      const now = new Date().toISOString();
      const newGoal: SavingsGoal = {
        ...validated,
        id: `goal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        createdAt: now,
        updatedAt: now,
      };
      await dbInsertSavingsGoal(newGoal);
      const savingsGoals = await dbGetAllSavingsGoals();
      set({ savingsGoals, isSubmitting: false });
      return newGoal;
    } catch (err) {
      set({
        isSubmitting: false,
        error:
          err instanceof Error ? err.message : 'Failed to create savings goal',
      });
      throw err;
    }
  },

  editSavingsGoal: async (id, data) => {
    if (get().isSubmitting) return;
    set({ isSubmitting: true, error: null });
    try {
      const existing = get().savingsGoals.find((g) => g.id === id);
      if (!existing) {
        set({ isSubmitting: false });
        return;
      }
      const validated = savingsGoalSchema.parse(data);
      const updated: SavingsGoal = {
        ...existing,
        ...validated,
        updatedAt: new Date().toISOString(),
      };
      await dbUpdateSavingsGoal(updated);
      const savingsGoals = await dbGetAllSavingsGoals();
      set({ savingsGoals, isSubmitting: false });
    } catch (err) {
      set({
        isSubmitting: false,
        error:
          err instanceof Error ? err.message : 'Failed to update savings goal',
      });
      throw err;
    }
  },

  contributeToSavingsGoal: async (id, deltaAmount) => {
    const existing = get().savingsGoals.find((g) => g.id === id);
    if (!existing || !Number.isFinite(deltaAmount) || deltaAmount === 0) return;
    const nextSaved = Math.max(0, existing.savedAmount + deltaAmount);
    const updated: SavingsGoal = {
      ...existing,
      savedAmount: nextSaved,
      updatedAt: new Date().toISOString(),
    };
    try {
      await dbUpdateSavingsGoal(updated);
      set((state) => ({
        savingsGoals: state.savingsGoals.map((g) =>
          g.id === id ? updated : g
        ),
        error: null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to update savings goal',
      });
    }
  },

  removeSavingsGoal: async (id) => {
    try {
      await dbDeleteSavingsGoal(id);
      set((state) => ({
        savingsGoals: state.savingsGoals.filter((g) => g.id !== id),
        error: null,
      }));
    } catch (err) {
      set({
        error:
          err instanceof Error ? err.message : 'Failed to delete savings goal',
      });
    }
  },

  processQuickCommand: async (rawText: string) => {
    const parsed = parseQuickInput(rawText);
    const npt = getNowInNPT();
    const createdIds: {
      transactionId?: string;
      itemId?: string;
      activityId?: string;
      reminderId?: string;
    } = {};

    try {
      if (parsed.intent === 'reminder') {
        const title = parsed.title;
        const dateISO = parsed.dateISO || npt.isoDate;
        const timeString = parsed.timeString || '09:00';
        const created = await get().addReminder({
          title,
          description: `Created via Quick Input: "${rawText}"`,
          dateISO,
          timeString,
          priority: 'Medium',
          category: parsed.category || 'Bills & Finance',
          recurrence: 'none',
          alertMode: 'both',
        });
        if (!created) {
          throw new Error('Could not save the reminder. Please try again.');
        }
        createdIds.reminderId = created.id;

        return {
          success: true,
          message: parsed.humanSummary,
          parsed,
          undoAction: async () => {
            if (createdIds.reminderId) {
              await get().removeReminder(createdIds.reminderId);
            }
          },
        };
      }

      if (parsed.intent === 'activity') {
        const created = await get().addActivity({
          title: parsed.title,
          description: `Logged via Quick Input: "${rawText}"`,
          category: parsed.category || 'Health',
          dateISO: npt.isoDate,
          timeString: parsed.timeString || npt.time24,
          numericValue: parsed.numericValue || 1,
          unit: parsed.unit || 'mins',
          status: 'completed',
        });
        if (!created) {
          throw new Error('Could not save the activity. Please try again.');
        }
        createdIds.activityId = created.id;

        return {
          success: true,
          message: parsed.humanSummary,
          parsed,
          undoAction: async () => {
            if (createdIds.activityId) {
              await get().removeActivity(createdIds.activityId);
            }
          },
        };
      }

      // Financial transaction (Income or Expense)
      const accounts = get().accounts;
      let matchedAccount = accounts.find((a) => {
        if (parsed.accountScope && a.scope !== parsed.accountScope) return false;
        if (parsed.paymentMethod === 'Bank Transfer' && a.paymentMethod === 'Bank Transfer') return true;
        if (parsed.paymentMethod === 'Cash' && a.paymentMethod === 'Cash') return true;
        return a.paymentMethod === parsed.paymentMethod;
      });

      if (!matchedAccount && accounts.length > 0) {
        matchedAccount = accounts.find((a) => a.scope === (parsed.accountScope || 'Personal')) || accounts[0];
      }

      const txnAmount = parsed.amount || 0;
      if (txnAmount <= 0) {
        return {
          success: false,
          message:
            'Please include a positive amount, for example “coffee 150 cash”.',
          parsed,
        };
      }

      const createdTxn = await get().addTransaction({
        type: parsed.intent === 'income' ? 'income' : 'expense',
        title: parsed.title,
        amount: txnAmount,
        category: parsed.category || (parsed.intent === 'income' ? 'Other Income' : 'Shopping'),
        dateISO: npt.isoDate,
        paymentMethod: parsed.paymentMethod || matchedAccount?.paymentMethod || 'Cash',
        accountId: matchedAccount?.id,
        accountScope: parsed.accountScope || matchedAccount?.scope || 'Personal',
        description: `Added via Quick Input: "${rawText}"`,
      });
      if (!createdTxn) {
        throw new Error('Could not save the transaction. Please try again.');
      }
      createdIds.transactionId = createdTxn.id;

      // If user bought an item (e.g. "bought notebook, 5000"), also catalog into items inventory!
      if (parsed.isItemAndExpense) {
        const createdItem = await get().addItem(
          {
            name: parsed.itemName || parsed.title,
            description: `Auto-cataloged via Quick Input: "${rawText}"`,
            category: parsed.itemCategory || 'Books',
            purchasePrice: txnAmount,
            purchaseDateISO: npt.isoDate,
            quantity: 1,
            imageUri: '',
            location: parsed.itemLocation || 'Home / Study',
            status: 'Owned',
          },
          'Auto-cataloged from Quick Input message'
        );
        if (createdItem) createdIds.itemId = createdItem.id;
      }

      return {
        success: true,
        message: parsed.humanSummary,
        parsed,
        undoAction: async () => {
          if (createdIds.transactionId) {
            await get().removeTransaction(createdIds.transactionId);
          }
          if (createdIds.itemId) {
            await get().removeItem(createdIds.itemId);
          }
        },
      };
    } catch (err) {
      // Avoid leaving a partial multi-record command behind (for example, a
      // transaction saved before its linked item failed to save).
      const rollbackActions = [
        createdIds.itemId ? () => get().removeItem(createdIds.itemId!) : null,
        createdIds.transactionId
          ? () => get().removeTransaction(createdIds.transactionId!)
          : null,
        createdIds.activityId
          ? () => get().removeActivity(createdIds.activityId!)
          : null,
        createdIds.reminderId
          ? () => get().removeReminder(createdIds.reminderId!)
          : null,
      ].filter((action): action is () => Promise<void> => action !== null);

      for (const rollback of rollbackActions) {
        try {
          await rollback();
        } catch {
          // Best-effort cleanup; preserve the original error below.
        }
      }

      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to process command',
        parsed,
      };
    }
  },

  getFullBackupPayload: () => {
    const state = get();
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      accounts: state.accounts,
      transactions: state.transactions,
      items: state.items,
      itemHistory: state.itemHistory,
      activities: state.activities,
      reminders: state.reminders,
      savingsGoals: state.savingsGoals,
    };
  },

  restoreFromBackup: async (payload) => {
    // Cancel any existing scheduled notifications before overwriting database
    for (const existing of get().reminders) {
      if (existing.notificationId) {
        await cancelReminderNotification(existing.notificationId);
      }
    }
    await dbRestoreBackup(payload);
    await get().hydrateFromDB();

    // Reschedule active reminders if notifications are enabled
    if (get().settings.notificationsEnabled) {
      const hydratedReminders = get().reminders;
      const repeatCount = get().settings.alarmRepeatCount || 3;
      for (const rem of hydratedReminders) {
        if (!rem.isCompleted) {
          const notifId = await scheduleReminderNotification(rem, true, repeatCount);
          if (notifId !== (rem.notificationId || '')) {
            await dbUpdateReminder({ ...rem, notificationId: notifId });
          }
        }
      }
      const refreshed = await dbGetAllReminders();
      set({ reminders: refreshed });
    }
  },

  resetAllData: async () => {
    // Cancel any active scheduled notifications before resetting
    for (const existing of get().reminders) {
      if (existing.notificationId) {
        await cancelReminderNotification(existing.notificationId);
      }
    }
    await dbResetAllUserData();
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
