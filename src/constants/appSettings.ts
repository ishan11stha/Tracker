import type { AppSettings } from '../types';

/**
 * Canonical first-run settings shared by the database and UI store.
 * Keeping one source of truth prevents the persisted defaults and the
 * in-memory defaults from drifting apart.
 */
export const DEFAULT_SETTINGS: AppSettings = {
  userName: '',
  userTitle: 'Kathmandu, Nepal',
  currency: 'NPR',
  language: 'en',
  preferredCalendar: 'BS',
  timeFormat: '12h',
  notificationsEnabled: true,
  theme: 'dark',
  privateMode: false,
};
