import { ReactNode } from 'react';
import {
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LAYOUT } from '../../theme/layout';

interface ScreenShellProps {
  backgroundColor: string;
  children: ReactNode;
  modals?: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Shared safe-area + compact scrollable screen wrapper used across VAULT tabs.
 */
export function ScreenShell({
  backgroundColor,
  children,
  modals,
  contentStyle,
}: ScreenShellProps) {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, contentStyle]}
      >
        {children}
      </ScrollView>
      {modals}
    </SafeAreaView>
  );
}

interface HeroCardProps {
  isDark: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Unified dark-slate Hero Card container shared across all 5 VAULT main tabs.
 */
export function HeroCard({
  isDark,
  children,
  style,
}: HeroCardProps) {
  return (
    <View
      style={[
        styles.heroCard,
        isDark
          ? {
              backgroundColor: '#151F32',
              borderColor: '#26344E',
              shadowOpacity: 0.16,
            }
          : {
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0',
              shadowOpacity: 0.06,
            },
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface HeroPillOption<T extends string> {
  key: T;
  label: string;
}

interface HeroPillTabsProps<T extends string> {
  options: readonly HeroPillOption<T>[];
  value: T;
  onChange: (value: T) => void;
  isDark?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Segmented pill switcher inside a HeroCard with crisp light/dark contrast.
 */
export function HeroPillTabs<T extends string>({
  options,
  value,
  onChange,
  isDark = false,
  style,
}: HeroPillTabsProps<T>) {
  return (
    <View
      style={[
        styles.pillBar,
        isDark
          ? { backgroundColor: 'rgba(255, 255, 255, 0.09)' }
          : {
              backgroundColor: '#F1F5F9',
              borderWidth: 1,
              borderColor: '#E2E8F0',
            },
        style,
      ]}
    >
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={0.75}
            onPress={() => onChange(opt.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.pillBtn,
              active && {
                backgroundColor: isDark ? '#FFFFFF' : '#0F172A',
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.pillText,
                {
                  color: active
                    ? isDark
                      ? '#0F172A'
                      : '#FFFFFF'
                    : isDark
                      ? 'rgba(248,250,252,0.7)'
                      : '#475569',
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: LAYOUT.maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: LAYOUT.horizontalPadding,
    paddingTop: LAYOUT.topPadding,
    paddingBottom: LAYOUT.bottomPadding,
  },
  heroCard: {
    borderRadius: LAYOUT.heroRadius,
    borderWidth: 1,
    padding: 16,
    marginBottom: LAYOUT.cardGap,
    elevation: 4,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  pillBar: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    gap: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 6.5,
    paddingHorizontal: 6,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  pillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
});
