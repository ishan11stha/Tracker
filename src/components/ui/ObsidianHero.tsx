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

interface ObsidianHeroCardProps {
  isDark: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Signature Obsidian Hero Card container shared across all 5 VAULT main tabs.
 */
export function ObsidianHeroCard({
  isDark,
  children,
  style,
}: ObsidianHeroCardProps) {
  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: isDark ? '#151F32' : '#0F172A',
          borderColor: isDark ? '#26344E' : '#1E293B',
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
  style?: StyleProp<ViewStyle>;
}

/**
 * Translucent segmented pill switcher inside an ObsidianHeroCard.
 */
export function HeroPillTabs<T extends string>({
  options,
  value,
  onChange,
  style,
}: HeroPillTabsProps<T>) {
  return (
    <View style={[styles.pillBar, style]}>
      {options.map((opt) => {
        const active = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={0.75}
            onPress={() => onChange(opt.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.pillBtn, active && styles.pillBtnActive]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.pillText,
                { color: active ? '#0F172A' : 'rgba(248,250,252,0.7)' },
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
