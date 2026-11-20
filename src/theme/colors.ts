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
    background: '#F5F6F8',
    surface: '#FFFFFF',
    surfaceHigh: '#EEF1F6',
    accent: '#0F3375', // Monekin brandBlue
    accentSoft: '#E6ECF7',
    accentBorder: '#C8D6EE',
    accentText: '#0F3375',
    badgeBg: '#EEF2F9',
  },
  money: {
    background: '#E8F5E9',
    surface: '#FFFFFF',
    surfaceHigh: '#DCFCE7',
    accent: '#37A13B', // Monekin success green
    accentSoft: '#DCFCE7',
    accentBorder: '#BBF7D0',
    accentText: '#14532D',
    badgeBg: '#D1FAE5',
  },
  items: {
    background: '#E8F1FC',
    surface: '#FFFFFF',
    surfaceHigh: '#DBEAFE',
    accent: '#1D4ED8',
    accentSoft: '#DBEAFE',
    accentBorder: '#BFDBFE',
    accentText: '#1E3A8A',
    badgeBg: '#DBEAFE',
  },
  tracker: {
    background: '#F0EBFA',
    surface: '#FFFFFF',
    surfaceHigh: '#EDE9FE',
    accent: '#6D28D9',
    accentSoft: '#EDE9FE',
    accentBorder: '#DDD6FE',
    accentText: '#4C1D95',
    badgeBg: '#EDE9FE',
  },
  reminders: {
    background: '#FFF0E6',
    surface: '#FFFFFF',
    surfaceHigh: '#FFEDD5',
    accent: '#EA580C',
    accentSoft: '#FFEDD5',
    accentBorder: '#FED7AA',
    accentText: '#7C2D12',
    badgeBg: '#FFEDD5',
  },
};

export const SECTION_COLORS_DARK: Record<SectionKey, SectionPalette> = {
  dashboard: {
    background: '#0D1117',
    surface: '#161B22',
    surfaceHigh: '#21262D',
    accent: '#8086B1', // Monekin dark brand color
    accentSoft: 'rgba(128, 134, 177, 0.18)',
    accentBorder: '#30363D',
    accentText: '#E6EDF3',
    badgeBg: '#21262D',
  },
  money: {
    background: '#0A1810',
    surface: '#12241A',
    surfaceHigh: '#1A3326',
    accent: '#8BC34A',
    accentSoft: 'rgba(139, 195, 74, 0.18)',
    accentBorder: '#1E462E',
    accentText: '#DCFCE7',
    badgeBg: '#14532D',
  },
  items: {
    background: '#0B1524',
    surface: '#132034',
    surfaceHigh: '#1C2E4A',
    accent: '#60A5FA',
    accentSoft: 'rgba(96, 165, 250, 0.18)',
    accentBorder: '#1E3A8A',
    accentText: '#DBEAFE',
    badgeBg: '#1E3A8A',
  },
  tracker: {
    background: '#140F21',
    surface: '#1E1732',
    surfaceHigh: '#2A2045',
    accent: '#A78BFA',
    accentSoft: 'rgba(167, 139, 250, 0.18)',
    accentBorder: '#4C1D95',
    accentText: '#EDE9FE',
    badgeBg: '#4C1D95',
  },
  reminders: {
    background: '#1C110A',
    surface: '#291910',
    surfaceHigh: '#3B2416',
    accent: '#FB923C',
    accentSoft: 'rgba(251, 146, 60, 0.18)',
    accentBorder: '#7C2D12',
    accentText: '#FFEDD5',
    badgeBg: '#7C2D12',
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
