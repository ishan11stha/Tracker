import { z } from 'zod';

/**
 * Validates a real Gregorian calendar date, not just the YYYY-MM-DD shape.
 * This also protects JSON backup restoration from malformed dates such as
 * 2026-02-31 or 2026-99-99.
 */
export function isValidISODate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Validates 24-hour HH:mm values in the range 00:00 through 23:59. */
export function isValidTime24(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
  .refine(isValidISODate, 'Invalid calendar date');

const time24Schema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)')
  .refine(isValidTime24, 'Invalid time (00:00–23:59)');

export type TransactionType = 'income' | 'expense';

export type AccountScope = 'Personal' | 'Family';

export interface Account {
  id: string;
  name: string; // e.g. 'Bank', 'Cash', 'eSewa'
  scope: AccountScope; // 'Personal' | 'Family'
  initialBalance: number;
  paymentMethod: PaymentMethod;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMethod =
  | 'Cash'
  | 'eSewa'
  | 'Khalti'
  | 'Bank Transfer'
  | 'Card'
  | 'ConnectIPS'
  | 'Other';

export interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  dateISO: string; // YYYY-MM-DD in Gregorian (AD)
  paymentMethod: PaymentMethod;
  accountId?: string;
  accountScope?: AccountScope;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export const accountSchema = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(50),
  scope: z.enum(['Personal', 'Family']),
  initialBalance: z.number().min(0, 'Balance cannot be negative'),
  paymentMethod: z.enum([
    'Cash',
    'eSewa',
    'Khalti',
    'Bank Transfer',
    'Card',
    'ConnectIPS',
    'Other',
  ]),
  color: z.string().optional(),
});

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  title: z
    .string()
    .trim()
    .min(1, 'Transaction title is required')
    .max(100, 'Title too long'),
  amount: z
    .number()
    .positive('Amount must be greater than 0')
    .max(1000000000, 'Amount exceeds maximum limit'),
  category: z.string().trim().min(1, 'Category is required'),
  dateISO: isoDateSchema,
  paymentMethod: z.enum([
    'Cash',
    'eSewa',
    'Khalti',
    'Bank Transfer',
    'Card',
    'ConnectIPS',
    'Other',
  ]),
  accountId: z.string().optional(),
  accountScope: z.enum(['Personal', 'Family']).optional(),
  description: z.string().max(500, 'Notes cannot exceed 500 characters'),
});

export type ItemStatus = 'Owned' | 'Borrowed' | 'Lent' | 'Sold' | 'Returned';

export interface PersonalItem {
  id: string;
  name: string;
  description: string;
  category: string;
  purchasePrice: number;
  purchaseDateISO: string; // YYYY-MM-DD
  quantity: number;
  imageUri: string;
  location: string;
  status: ItemStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ItemHistoryLog {
  id: string;
  itemId: string;
  action: string;
  previousStatus?: ItemStatus;
  newStatus: ItemStatus;
  note: string;
  timestamp: string;
}

export const itemSchema = z.object({
  name: z.string().trim().min(1, 'Item name is required').max(100),
  description: z.string().max(500),
  category: z.string().trim().min(1, 'Category is required'),
  purchasePrice: z.number().min(0, 'Price cannot be negative'),
  purchaseDateISO: isoDateSchema,

  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
  imageUri: z.string(),
  location: z.string().trim().min(1, 'Location is required').max(100),
  status: z.enum(['Owned', 'Borrowed', 'Lent', 'Sold', 'Returned']),
});

export type ActivityStatus = 'completed' | 'pending';

export type ActivityRepeat = 'everyday' | 'weekdays' | 'once';

export interface ActivityRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  dateISO: string; // YYYY-MM-DD (creation/target date)
  timeString: string; // HH:mm
  numericValue: number;
  unit: string; // e.g., 'mins', 'hrs', 'km', 'count'
  status: ActivityStatus;
  repeat?: ActivityRepeat;
  completedDates?: string[]; // YYYY-MM-DD dates completed for recurring habits
  createdAt: string;
  updatedAt: string;
}

export const activitySchema = z.object({
  title: z.string().trim().min(1, 'Activity title is required').max(100),
  description: z.string().max(500),
  category: z.string().trim().min(1, 'Category is required'),
  dateISO: isoDateSchema,
  timeString: time24Schema,
  numericValue: z.number().min(0, 'Cannot be negative'),
  unit: z.string().trim().max(30),
  status: z.enum(['completed', 'pending']),
  repeat: z.enum(['everyday', 'weekdays', 'once']).optional().default('once'),
  completedDates: z.array(isoDateSchema).optional().default([]),
});

export function isActivityCompletedOnDate(
  act: Pick<ActivityRecord, 'repeat' | 'completedDates' | 'status'>,
  dateISO: string
): boolean {
  if (act.repeat === 'everyday' || act.repeat === 'weekdays') {
    return (act.completedDates || []).includes(dateISO);
  }
  return act.status === 'completed';
}

export function isActivityScheduledOnDate(
  act: Pick<ActivityRecord, 'repeat' | 'dateISO'>,
  dateISO: string
): boolean {
  if (act.repeat === 'everyday') return true;
  if (act.repeat === 'weekdays') {
    const [y, m, d] = dateISO.split('-').map(Number);
    const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    return weekday !== 6; // Sunday–Friday (Saturday is Nepal weekend)
  }
  return act.dateISO === dateISO;
}

export type ReminderPriority = 'Low' | 'Medium' | 'High';

export type ReminderAlertMode = 'alarm' | 'vibrate' | 'both';

export type WeekdayRecurrenceKey =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';

export type LegacyReminderRecurrence =
  | 'none'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly';

/**
 * Supports single weekday ('sunday'..'saturday'), comma-separated weekdays
 * ('monday,wednesday,friday'), or legacy interval keys ('none', 'daily', etc.).
 */
export type ReminderRecurrence =
  | LegacyReminderRecurrence
  | WeekdayRecurrenceKey
  | string;

const VALID_WEEKDAY_SET = new Set<string>([
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]);

const VALID_LEGACY_RECURRENCE_SET = new Set<string>([
  'none',
  'daily',
  'weekly',
  'monthly',
  'yearly',
]);

export function isValidReminderRecurrence(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();
  if (VALID_LEGACY_RECURRENCE_SET.has(trimmed)) return true;
  const parts = trimmed
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return false;
  return parts.every((p) => VALID_WEEKDAY_SET.has(p));
}

export interface ReminderItem {
  id: string;
  title: string;
  description: string;
  dateISO: string; // YYYY-MM-DD
  timeString: string; // HH:mm (24h format stored)
  priority: ReminderPriority;
  category: string;
  recurrence: ReminderRecurrence;
  alertMode?: ReminderAlertMode;
  isCompleted: boolean;
  notificationId?: string;
  createdAt: string;
  updatedAt: string;
}

export const reminderSchema = z.object({
  title: z.string().trim().min(1, 'Reminder title is required').max(100),
  description: z.string().max(500),
  dateISO: isoDateSchema,
  timeString: time24Schema,
  priority: z.enum(['Low', 'Medium', 'High']),
  category: z.string().trim().min(1, 'Category is required'),
  recurrence: z
    .string()
    .trim()
    .refine(isValidReminderRecurrence, 'Invalid recurrence value'),
  alertMode: z.enum(['alarm', 'vibrate', 'both']).optional().default('both'),
});

export type SavingsGoalIcon =
  | 'plane'
  | 'shield'
  | 'smartphone'
  | 'car'
  | 'home'
  | 'heart'
  | 'graduation'
  | 'target';

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  savedAmount: number;
  targetDateISO?: string; // Optional YYYY-MM-DD target date
  icon: SavingsGoalIcon;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export const SAVINGS_GOAL_PRESETS: {
  icon: SavingsGoalIcon;
  label: string;
  color: string;
}[] = [
    { icon: 'shield', label: 'Emergency', color: '#10B981' },
    { icon: 'plane', label: 'Vacation', color: '#3B82F6' },
    { icon: 'smartphone', label: 'Tech', color: '#8B5CF6' },
    { icon: 'car', label: 'Vehicle', color: '#EF4444' },
    { icon: 'home', label: 'Home', color: '#0EA5E9' },
    { icon: 'heart', label: 'Wedding', color: '#EC4899' },
    { icon: 'graduation', label: 'Study', color: '#F59E0B' },
    { icon: 'target', label: 'Goal', color: '#0F172A' },
  ];

export const savingsGoalSchema = z.object({
  title: z.string().trim().min(1, 'Goal name is required').max(100),
  targetAmount: z
    .number()
    .positive('Target amount must be greater than 0')
    .max(1000000000, 'Target amount exceeds maximum limit'),
  savedAmount: z.number().min(0, 'Saved amount cannot be negative'),
  targetDateISO: z
    .string()
    .optional()
    .refine(
      (val) => !val || isValidISODate(val),
      'Invalid target calendar date'
    ),
  icon: z.enum([
    'plane',
    'shield',
    'smartphone',
    'car',
    'home',
    'heart',
    'graduation',
    'target',
  ]),
  color: z.string().min(4).max(20),
});

export interface AppSettings {
  userName: string;
  userTitle: string;
  currency: 'NPR' | 'USD' | 'INR';
  language: 'ne' | 'en';
  preferredCalendar: 'BS' | 'AD';
  timeFormat: '12h' | '24h';
  notificationsEnabled: boolean;
  alarmRepeatCount?: number; // 1, 2, 3, or 5 times
  theme: 'light' | 'dark';
  privateMode?: boolean;
}

export const appSettingsSchema = z.object({
  // A profile name is optional: backups must remain restorable before setup.
  userName: z.string().trim().max(100),
  userTitle: z.string().trim().max(100),
  currency: z.enum(['NPR', 'USD', 'INR']),
  language: z.enum(['ne', 'en']),
  preferredCalendar: z.enum(['BS', 'AD']),
  timeFormat: z.enum(['12h', '24h']),
  notificationsEnabled: z.boolean(),
  alarmRepeatCount: z.number().int().min(1).max(10).optional().default(3),
  theme: z.enum(['light', 'dark']),
  privateMode: z.boolean().optional(),
});

export const vaultBackupSchema = z.object({
  // Only schema version 1 is understood by this application. Rejecting newer
  // backups is safer than silently importing data with an unknown format.
  version: z.number().int().min(1).max(1, 'Unsupported backup version'),
  exportedAt: z.string(),
  settings: appSettingsSchema,
  transactions: z.array(
    transactionSchema.extend({
      id: z.string().min(1),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  items: z.array(
    itemSchema.extend({
      id: z.string().min(1),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  itemHistory: z.array(
    z.object({
      id: z.string().min(1),
      itemId: z.string().min(1),
      action: z.string(),
      previousStatus: z
        .enum(['Owned', 'Borrowed', 'Lent', 'Sold', 'Returned'])
        .nullable()
        .optional()
        .transform((val) => val ?? undefined),
      newStatus: z.enum(['Owned', 'Borrowed', 'Lent', 'Sold', 'Returned']),
      note: z.string(),
      timestamp: z.string(),
    })
  ),
  activities: z.array(
    activitySchema.extend({
      id: z.string().min(1),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  reminders: z.array(
    reminderSchema.extend({
      id: z.string().min(1),
      isCompleted: z.boolean(),
      notificationId: z.string().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
  ),
  accounts: z
    .array(
      accountSchema.extend({
        id: z.string().min(1),
        createdAt: z.string(),
        updatedAt: z.string(),
      })
    )
    .optional(),
  savingsGoals: z
    .array(
      savingsGoalSchema.extend({
        id: z.string().min(1),
        createdAt: z.string(),
        updatedAt: z.string(),
      })
    )
    .optional(),
});

export type QuickIntent =
  | 'income'
  | 'expense'
  | 'item'
  | 'activity'
  | 'reminder';

export interface ParsedQuickInput {
  rawText: string;
  intent: QuickIntent;
  title: string;
  amount?: number;
  category?: string;
  paymentMethod?: PaymentMethod;
  accountScope?: AccountScope;
  accountId?: string;
  // For dual item + expense ("bought notebook, 5000")
  isItemAndExpense?: boolean;
  itemName?: string;
  itemCategory?: string;
  itemPrice?: number;
  itemLocation?: string;
  // For habit/activity ("5km run 30 mins")
  numericValue?: number;
  unit?: string;
  timeString?: string;
  // For reminder ("remind me tomorrow 5pm to pay wifi")
  dateISO?: string;
  // Metadata & Feedback
  confidence: number;
  humanSummary: string;
}

export const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Business',
  'Investment',
  'Remittance',
  'Rental',
  'Gift',
  'Other Income',
];

export const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Groceries',
  'Transport',
  'Rent & Utilities',
  'Shopping',
  'Health & Medical',
  'Education',
  'Entertainment',
  'Family & Bills',
  'Other Expense',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'eSewa',
  'Khalti',
  'Bank Transfer',
  'ConnectIPS',
  'Card',
  'Other',
];

export const ITEM_CATEGORIES = [
  'Electronics',
  'Documents',
  'Books',
  'Tools & Gear',
  'Appliances',
  'Jewelry & Valuables',
  'Clothing',
  'Vehicle & Accessories',
  'Other',
];

export const ITEM_STATUSES: ItemStatus[] = [
  'Owned',
  'Borrowed',
  'Lent',
  'Sold',
  'Returned',
];

export const ACTIVITY_CATEGORIES = [
  'Health',
  'Work',
  'Study',
  'Personal',
];

export const COMMON_ACTIVITY_UNITS = [
  'mins',
  'hrs',
  'km',
  'count',
];

export const REMINDER_CATEGORIES = [
  'Bills & Finance',
  'Work & Deadlines',
  'Personal & Family',
  'Health & Medicine',
  'Event & Festival',
  'Maintenance',
  'Other',
];

export const REMINDER_PRIORITIES: { label: ReminderPriority; color: string }[] = [
  { label: 'Low', color: '#2563EB' },
  { label: 'Medium', color: '#D97706' },
  { label: 'High', color: '#DC2626' },
];

export const REMINDER_ALERT_MODES: {
  key: ReminderAlertMode;
  label: string;
  sublabel: string;
}[] = [
    { key: 'alarm', label: 'Alarm', sublabel: 'Sound ring' },
    { key: 'vibrate', label: 'Vibrate', sublabel: 'Vibrate mode' },
    { key: 'both', label: 'Alarm & Vibrate', sublabel: 'Sound + vibrate' },
  ];

export const REMINDER_WEEKDAYS: {
  key: WeekdayRecurrenceKey;
  label: string;
  shortLabel: string;
  weekdayIndex: number;
}[] = [
    { key: 'sunday', label: 'Sunday', shortLabel: 'Sun', weekdayIndex: 0 },
    { key: 'monday', label: 'Monday', shortLabel: 'Mon', weekdayIndex: 1 },
    { key: 'tuesday', label: 'Tuesday', shortLabel: 'Tue', weekdayIndex: 2 },
    { key: 'wednesday', label: 'Wednesday', shortLabel: 'Wed', weekdayIndex: 3 },
    { key: 'thursday', label: 'Thursday', shortLabel: 'Thu', weekdayIndex: 4 },
    { key: 'friday', label: 'Friday', shortLabel: 'Fri', weekdayIndex: 5 },
    { key: 'saturday', label: 'Saturday', shortLabel: 'Sat', weekdayIndex: 6 },
  ];

export function parseRecurrenceWeekdays(
  recurrence: ReminderRecurrence
): WeekdayRecurrenceKey[] {
  if (!recurrence || recurrence === 'none') return [];
  const lower = recurrence.toLowerCase();
  if (lower === 'daily') {
    return REMINDER_WEEKDAYS.map((d) => d.key);
  }
  const parts = lower
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return REMINDER_WEEKDAYS.filter((d) => parts.includes(d.key)).map(
    (d) => d.key
  );
}

export function formatRecurrenceLabel(recurrence: ReminderRecurrence): string {
  if (!recurrence || recurrence === 'none') return 'Once';
  const lower = recurrence.trim().toLowerCase();
  if (lower === 'daily') return 'Every Day';
  if (lower === 'weekly') return 'Weekly';
  if (lower === 'monthly') return 'Monthly';
  if (lower === 'yearly') return 'Yearly';

  const days = parseRecurrenceWeekdays(lower);
  if (days.length === 0) return recurrence;
  if (days.length === 7) return 'Every Day';
  if (days.length === 1) {
    return (
      REMINDER_WEEKDAYS.find((d) => d.key === days[0])?.label || days[0]
    );
  }
  return days
    .map(
      (k) => REMINDER_WEEKDAYS.find((d) => d.key === k)?.shortLabel || k
    )
    .join(', ');
}
