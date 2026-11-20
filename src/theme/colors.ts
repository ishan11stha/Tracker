export type SectionKey = 'dashboard' | 'money' | 'items' | 'tracker' | 'reminders';

export interface SectionPalette {
  background: string;
  surface: string;
  accent: string;
  accentSoft: string;
  accentBorder: string;
  accentText: string;
  badgeBg: string;
}

export const SECTION_COLORS: Record<SectionKey, SectionPalette> = {
  dashboard: {
    background: '#F5F6F8',
    surface: '#FFFFFF',
    accent: '#1E293B',
    accentSoft: '#E2E8F0',
    accentBorder: '#CBD5E1',
    accentText: '#0F172A',
    badgeBg: '#F1F5F9',
  },
  money: {
    background: '#E8F5E9',
    surface: '#FFFFFF',
    accent: '#16A34A',
    accentSoft: '#DCFCE7',
    accentBorder: '#BBF7D0',
    accentText: '#14532D',
    badgeBg: '#D1FAE5',
  },
  items: {
    background: '#E8F1FC',
    surface: '#FFFFFF',
    accent: '#2563EB',
    accentSoft: '#DBEAFE',
    accentBorder: '#BFDBFE',
    accentText: '#1E3A8A',
    badgeBg: '#DBEAFE',
  },
  tracker: {
    background: '#F0EBFA',
    surface: '#FFFFFF',
    accent: '#7C3AED',
    accentSoft: '#EDE9FE',
    accentBorder: '#DDD6FE',
    accentText: '#4C1D95',
    badgeBg: '#EDE9FE',
  },
  reminders: {
    background: '#FFF0E6',
    surface: '#FFFFFF',
    accent: '#EA580C',
    accentSoft: '#FFEDD5',
    accentBorder: '#FED7AA',
    accentText: '#7C2D12',
    badgeBg: '#FFEDD5',
  },
};

export const SECTION_COLORS_DARK: Record<SectionKey, SectionPalette> = {
  dashboard: {
    background: '#0F172A',
    surface: '#1E293B',
    accent: '#F8FAFC',
    accentSoft: '#334155',
    accentBorder: '#334155',
    accentText: '#F1F5F9',
    badgeBg: '#1E293B',
  },
  money: {
    background: '#0A1F14',
    surface: '#132A1E',
    accent: '#4ADE80',
    accentSoft: '#14532D',
    accentBorder: '#166534',
    accentText: '#DCFCE7',
    badgeBg: '#14532D',
  },
  items: {
    background: '#0B192C',
    surface: '#15253B',
    accent: '#60A5FA',
    accentSoft: '#1E3A8A',
    accentBorder: '#1D4ED8',
    accentText: '#DBEAFE',
    badgeBg: '#1E3A8A',
  },
  tracker: {
    background: '#171126',
    surface: '#231B38',
    accent: '#A78BFA',
    accentSoft: '#4C1D95',
    accentBorder: '#5B21B6',
    accentText: '#EDE9FE',
    badgeBg: '#4C1D95',
  },
  reminders: {
    background: '#21130B',
    surface: '#301C12',
    accent: '#FB923C',
    accentSoft: '#7C2D12',
    accentBorder: '#9A3412',
    accentText: '#FFEDD5',
    badgeBg: '#7C2D12',
  },
};

export const COLORS = {
  light: {
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    textMuted: '#94A3B8',
    card: '#FFFFFF',
    border: '#E2E8F0',
    divider: '#F1F5F9',
    income: '#16A34A',
    incomeBg: '#DCFCE7',
    expense: '#DC2626',
    expenseBg: '#FEE2E2',
    warning: '#D97706',
    warningBg: '#FEF3C7',
    info: '#2563EB',
    infoBg: '#DBEAFE',
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    modalOverlay: 'rgba(15, 23, 42, 0.45)',
    inputBg: '#F8FAFC',
  },
  dark: {
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    textMuted: '#64748B',
    card: '#1E293B',
    border: '#334155',
    divider: '#1E293B',
    income: '#4ADE80',
    incomeBg: 'rgba(22, 163, 74, 0.2)',
    expense: '#F87171',
    expenseBg: 'rgba(220, 38, 38, 0.2)',
    warning: '#FBBF24',
    warningBg: 'rgba(217, 119, 6, 0.2)',
    info: '#60A5FA',
    infoBg: 'rgba(37, 99, 235, 0.2)',
    tabBar: '#0F172A',
    tabBarBorder: '#1E293B',
    modalOverlay: 'rgba(0, 0, 0, 0.7)',
    inputBg: '#0F172A',
  },
};

export function getSectionPalette(section: SectionKey, isDark: boolean): SectionPalette {
  return isDark ? SECTION_COLORS_DARK[section] : SECTION_COLORS[section];
}

export function getThemeColors(isDark: boolean) {
  return isDark ? COLORS.dark : COLORS.light;
}
