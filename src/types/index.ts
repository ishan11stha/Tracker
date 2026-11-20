import { z } from 'zod';

export type TransactionType = 'income' | 'expense';

export type PaymentMethod = 'Cash' | 'eSewa' | 'Khalti' | 'Bank Transfer' | 'Card' | 'ConnectIPS' | 'Other';

export interface Transaction {
  id: string;
  type: TransactionType;
  title: string;
  amount: number;
  category: string;
  dateISO: string; // YYYY-MM-DD in Gregorian (AD)
  paymentMethod: PaymentMethod;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  title: z.string().trim().min(1, 'Transaction title is required').max(100, 'Title too long'),
  amount: z
    .number({ invalid_type_error: 'Enter a valid amount' })
    .positive('Amount must be greater than 0')
    .max(1000000000, 'Amount exceeds maximum limit'),
  category: z.string().trim().min(1, 'Category is required'),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  paymentMethod: z.enum(['Cash', 'eSewa', 'Khalti', 'Bank Transfer', 'Card', 'ConnectIPS', 'Other']),
  description: z.string().max(500, 'Notes cannot exceed 500 characters').optional().default(''),
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
  description: z.string().max(500).optional().default(''),
  category: z.string().trim().min(1, 'Category is required'),
  purchasePrice: z
    .number({ invalid_type_error: 'Enter a valid price' })
    .min(0, 'Price cannot be negative'),
  purchaseDateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid purchase date'),
  quantity: z
    .number({ invalid_type_error: 'Enter a valid quantity' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
  imageUri: z.string().optional().default(''),
  location: z.string().trim().min(1, 'Location is required').max(100),
  status: z.enum(['Owned', 'Borrowed', 'Lent', 'Sold', 'Returned']),
});

export type ActivityStatus = 'completed' | 'pending';

export interface ActivityRecord {
  id: string;
  title: string;
  description: string;
  category: string;
  dateISO: string; // YYYY-MM-DD
  timeString: string; // HH:mm
  numericValue: number;
  unit: string; // e.g., 'mins', 'km', 'glasses', 'pages', 'hrs', 'kcal'
  status: ActivityStatus;
  createdAt: string;
  updatedAt: string;
}

export const activitySchema = z.object({
  title: z.string().trim().min(1, 'Activity title is required').max(100),
  description: z.string().max(500).optional().default(''),
  category: z.string().trim().min(1, 'Category is required'),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  timeString: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time (HH:MM)'),
  numericValue: z.number({ invalid_type_error: 'Enter a valid number' }).min(0, 'Cannot be negative'),
  unit: z.string().trim().max(30).optional().default('mins'),
  status: z.enum(['completed', 'pending']),
});

export type ReminderPriority = 'Low' | 'Medium' | 'High';
export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ReminderItem {
  id: string;
  title: string;
  description: string;
  dateISO: string; // YYYY-MM-DD
  timeString: string; // HH:mm (24h format stored)
  priority: ReminderPriority;
  category: string;
  recurrence: ReminderRecurrence;
  isCompleted: boolean;
  notificationId?: string;
  createdAt: string;
  updatedAt: string;
}

export const reminderSchema = z.object({
  title: z.string().trim().min(1, 'Reminder title is required').max(100),
  description: z.string().max(500).optional().default(''),
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  timeString: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time (HH:MM)'),
  priority: z.enum(['Low', 'Medium', 'High']),
  category: z.string().trim().min(1, 'Category is required'),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'yearly']),
});

export interface AppSettings {
  userName: string;
  userTitle: string;
  currency: 'NPR' | 'USD' | 'INR';
  language: 'ne' | 'en';
  preferredCalendar: 'BS' | 'AD';
  timeFormat: '12h' | '24h';
  notificationsEnabled: boolean;
  theme: 'light' | 'dark';
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
  'Fitness & Health',
  'Work & Deep Focus',
  'Reading & Study',
  'Hydration & Wellness',
  'Meditation',
  'Household',
  'Hobby',
  'Custom',
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
