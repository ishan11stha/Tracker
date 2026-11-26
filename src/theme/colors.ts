export type SectionKey = 'dashboard' | 'money' | 'items' | 'tracker' | 'reminders';

export interface SectionPalette {
  background: string;
  surface: string;
  surfaceHigh: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  accentText: string;
  badgeBg: string;
}

/**
 * Monekin-inspired Design System Tokens blended with VAULT Section Identities.
 * Brand Blue: #0F3375 | Success: #37A13B | Danger: #EF4444
 */
export const SECTION_COLORS: Record<SectionKey, SectionPalette> = {
  dashboard: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceHigh: '#F1F5F9',
    accent: '#0F172A',
    accentSoft: '#EEF2F6',
    accentBorder: '#CBD5E1',
    accentText: '#0F172A',
    badgeBg: '#F1F5F9',
  },
  money: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceHigh: '#F1F5F9',
    accent: '#10B981',
    accentSoft: '#ECFDF5',
    accentBorder: '#A7F3D0',
    accentText: '#065F46',
    badgeBg: '#ECFDF5',
  },
  items: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceHigh: '#F1F5F9',
    accent: '#2563EB',
    accentSoft: '#EFF6FF',
    accentBorder: '#BFDBFE',
    accentText: '#1E40AF',
    badgeBg: '#EFF6FF',
  },
  tracker: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceHigh: '#F1F5F9',
    accent: '#7C3AED',
    accentSoft: '#F5F3FF',
    accentBorder: '#DDD6FE',
    accentText: '#5B21B6',
    badgeBg: '#F5F3FF',
  },
  reminders: {
    background: '#F8FAFC',
    surface: '#FFFFFF',
    surfaceHigh: '#F1F5F9',
    accent: '#EA580C',
    accentSoft: '#FFF7ED',
    accentBorder: '#FED7AA',
    accentText: '#9A3412',
    badgeBg: '#FFF7ED',
  },
};

export const SECTION_COLORS_DARK: Record<SectionKey, SectionPalette> = {
  dashboard: {
    background: '#0B0F19',
    surface: '#131A29',
    surfaceHigh: '#1E293B',
    accent: '#38BDF8',
    accentSoft: 'rgba(56, 189, 248, 0.16)',
    accentBorder: '#1E293B',
    accentText: '#F8FAFC',
    badgeBg: '#1E293B',
  },
  money: {
    background: '#0B0F19',
    surface: '#131A29',
    surfaceHigh: '#1E293B',
    accent: '#34D399',
    accentSoft: 'rgba(52, 211, 153, 0.16)',
    accentBorder: '#1E293B',
    accentText: '#ECFDF5',
    badgeBg: '#1E293B',
  },
  items: {
    background: '#0B0F19',
    surface: '#131A29',
    surfaceHigh: '#1E293B',
    accent: '#60A5FA',
    accentSoft: 'rgba(96, 165, 250, 0.16)',
    accentBorder: '#1E293B',
    accentText: '#EFF6FF',
    badgeBg: '#1E293B',
  },
  tracker: {
    background: '#0B0F19',
    surface: '#131A29',
    surfaceHigh: '#1E293B',
    accent: '#A78BFA',
    accentSoft: 'rgba(167, 139, 250, 0.16)',
    accentBorder: '#1E293B',
    accentText: '#F5F3FF',
    badgeBg: '#1E293B',
  },
  reminders: {
    background: '#0B0F19',
    surface: '#131A29',
    surfaceHigh: '#1E293B',
    accent: '#FB923C',
    accentSoft: 'rgba(251, 146, 60, 0.16)',
    accentBorder: '#1E293B',
    accentText: '#FFF7ED',
    badgeBg: '#1E293B',
  },
};

export const COLORS = {
  light: {
    brand: '#0F3375',
    textPrimary: '#1E242B',
    textSecondary: '#434343', // Monekin textBody
    textMuted: '#7B7B7B', // Monekin textHint
    card: '#FFFFFF',
    surfaceContainerHigh: '#EEF1F6',
    border: '#E2E8F0',
    divider: '#F1F5F9',
    income: '#37A13B', // Monekin success
    incomeBg: 'rgba(55, 161, 59, 0.16)',
    expense: '#EF4444', // Monekin danger
    expenseBg: 'rgba(239, 68, 68, 0.16)',
    warning: '#D97706',
    warningBg: 'rgba(217, 119, 6, 0.16)',
    info: '#1D4ED8',
    infoBg: 'rgba(29, 78, 216, 0.14)',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E5E7EB',
    modalOverlay: 'rgba(15, 23, 42, 0.48)',
    inputBg: '#F8FAFC',
  },
  dark: {
    brand: '#8086B1',
    textPrimary: '#F0F6FC',
    textSecondary: '#D3D3D3', // Monekin dark textBody
    textMuted: '#999999', // Monekin dark textHint
    card: '#161B22',
    surfaceContainerHigh: '#21262D',
    border: '#30363D',
    divider: '#21262D',
    income: '#8BC34A',
    incomeBg: 'rgba(139, 195, 74, 0.18)',
    expense: '#FF5252',
    expenseBg: 'rgba(255, 82, 82, 0.18)',
    warning: '#FBBF24',
    warningBg: 'rgba(251, 191, 36, 0.18)',
    info: '#60A5FA',
    infoBg: 'rgba(96, 165, 250, 0.18)',
    tabBar: '#161B22',
    tabBarBorder: '#30363D',
    modalOverlay: 'rgba(0, 0, 0, 0.72)',
    inputBg: '#0D1117',
  },
};

export const CATEGORY_PALETTE = [
  '#0F3375',
  '#37A13B',
  '#2563EB',
  '#EA580C',
  '#7C3AED',
  '#0891B2',
  '#D97706',
  '#DC2626',
  '#4F46E5',
  '#059669',
];

export function getSectionPalette(
  section: SectionKey,
  isDark: boolean
): SectionPalette {
  return isDark ? SECTION_COLORS_DARK[section] : SECTION_COLORS[section];
}

export function getThemeColors(isDark: boolean) {
  return isDark ? COLORS.dark : COLORS.light;
}
