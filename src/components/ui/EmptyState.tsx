import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { getThemeColors } from '../../theme/colors';

interface EmptyStateProps {
  isDark: boolean;
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  accentColor?: string;
  onAction?: () => void;
  compact?: boolean;
}

/**
 * Clean, actionable empty state with tinted icon badge and direct CTA button.
 */
export function EmptyState({
  isDark,
  icon,
  title,
  subtitle,
  actionLabel,
  accentColor = '#0F172A',
  onAction,
  compact = false,
}: EmptyStateProps) {
  const theme = getThemeColors(isDark);
  const btnBg = isDark ? accentColor : '#0F172A';

  return (
    <View
      style={[
        styles.container,
        !compact && {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 18,
          paddingVertical: 22,
          paddingHorizontal: 18,
        },
        compact && { paddingVertical: 16, paddingHorizontal: 8 },
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: `${accentColor}1A` },
        ]}
      >
        {icon}
      </View>
      <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onAction}
          style={[styles.ctaBtn, { backgroundColor: btnBg }]}
        >
          <Plus size={14} color="#FFFFFF" strokeWidth={2.6} />
          <Text style={styles.ctaText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
    maxWidth: 260,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});
