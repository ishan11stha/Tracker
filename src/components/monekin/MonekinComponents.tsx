import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Minus,
} from 'lucide-react-native';
import { getThemeColors } from '../../theme/colors';
import { formatCurrencyParts } from '../../utils/currency';

/**
 * 1. Monekin `CardWithHeader` (from `lib/core/presentation/widgets/card_with_header.dart`)
 * Radius 20, flat surfaceContainerLow with 1px subtle outlineVariant border.
 */
interface CardWithHeaderProps {
  title: string;
  subtitle?: string;
  isDark: boolean;
  headerActionText?: string;
  headerActionIcon?: React.ReactNode;
  onHeaderActionPress?: () => void;
  footerText?: string;
  onFooterPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  bodyStyle?: ViewStyle;
  accentColor?: string;
}

export const CardWithHeader: React.FC<CardWithHeaderProps> = ({
  title,
  subtitle,
  isDark,
  headerActionText,
  headerActionIcon,
  onHeaderActionPress,
  footerText,
  onFooterPress,
  children,
  style,
  bodyStyle,
  accentColor,
}) => {
  const theme = getThemeColors(isDark);
  const actionColor = accentColor || theme.brand;

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
        style,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.cardSubtitle, { color: theme.textMuted }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {onHeaderActionPress && (
          <TouchableOpacity
            onPress={onHeaderActionPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[
              styles.headerActionBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(255,255,255,0.08)'
                  : 'rgba(15, 51, 117, 0.08)',
                borderColor: isDark
                  ? 'rgba(255,255,255,0.12)'
                  : 'rgba(15, 51, 117, 0.12)',
              },
            ]}
          >
            {headerActionIcon}
            {headerActionText ? (
              <Text style={[styles.headerActionText, { color: actionColor }]}>
                {headerActionText}
              </Text>
            ) : null}
            {!headerActionIcon && !headerActionText && (
              <ChevronRight size={18} color={theme.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>

      <View style={[styles.cardBody, bodyStyle]}>{children}</View>

      {footerText && onFooterPress ? (
        <TouchableOpacity
          onPress={onFooterPress}
          style={[
            styles.cardFooter,
            { borderTopColor: theme.divider },
          ]}
        >
          <Text style={[styles.cardFooterText, { color: actionColor }]}>
            {footerText}
          </Text>
          <ChevronRight size={15} color={actionColor} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

/**
 * 2. Monekin `CurrencyDisplayer` (from `lib/core/presentation/widgets/number_ui_formatters/currency_displayer.dart`)
 * Displays currency symbol and decimal part in muted `textHint` style and integer in bold primary style.
 */
interface CurrencyDisplayerProps {
  amount: number;
  currency: 'NPR' | 'USD' | 'INR';
  isDark: boolean;
  privateMode?: boolean;
  size?: 'xl' | 'lg' | 'md' | 'sm';
  color?: string;
  compact?: boolean;
}

export const CurrencyDisplayer: React.FC<CurrencyDisplayerProps> = ({
  amount,
  currency,
  isDark,
  privateMode = false,
  size = 'md',
  color,
  compact = false,
}) => {
  const theme = getThemeColors(isDark);
  const parts = formatCurrencyParts(amount, currency, compact, privateMode);

  const fontSizes = {
    xl: { int: 32, sub: 18, mask: 18 },
    lg: { int: 22, sub: 14, mask: 14 },
    md: { int: 16, sub: 12, mask: 12 },
    sm: { int: 14, sub: 11, mask: 10 },
  }[size];

  const mainColor = color || theme.textPrimary;
  const subColor = color ? `${color}CC` : theme.textMuted;

  return (
    <Text numberOfLines={1} style={styles.currencyRow}>
      {parts.sign ? (
        <Text
          style={{
            fontSize: fontSizes.int,
            fontWeight: '800',
            color: mainColor,
          }}
        >
          {parts.sign}{' '}
        </Text>
      ) : null}
      <Text
        style={{
          fontSize: fontSizes.sub,
          fontWeight: '700',
          color: subColor,
        }}
      >
        {parts.symbol}{' '}
      </Text>
      <Text
        style={
          privateMode
            ? {
                fontSize: fontSizes.mask,
                fontWeight: '600',
                color: mainColor,
                letterSpacing: 3,
              }
            : {
                fontSize: fontSizes.int,
                fontWeight: '800',
                color: mainColor,
                letterSpacing: -0.4,
              }
        }
      >
        {parts.integerPart}
      </Text>
      {parts.decimalPart ? (
        <Text
          style={{
            fontSize: fontSizes.sub,
            fontWeight: '700',
            color: subColor,
          }}
        >
          {parts.decimalPart}
        </Text>
      ) : null}
    </Text>
  );
};

/**
 * 3. Monekin `TrendingValueChip` (from `lib/core/presentation/widgets/trending_value.dart`)
 * Displays directional arrow + percentage/delta inside a 9999px pill with 0.16 alpha fill.
 * Supports `inverse` (where an expense decrease is colored green!).
 */
interface TrendingValueChipProps {
  percentage: number; // e.g., 12.5 for +12.5%
  deltaText?: string;
  afterText?: string;
  inverse?: boolean;
  isDark: boolean;
}

export const TrendingValueChip: React.FC<TrendingValueChipProps> = ({
  percentage,
  deltaText,
  afterText,
  inverse = false,
  isDark,
}) => {
  const theme = getThemeColors(isDark);
  const raw = Number.isFinite(percentage) ? percentage : 0;
  const signed = inverse ? -raw : raw;

  const trendColor =
    signed === 0
      ? theme.brand
      : signed > 0
      ? theme.income
      : theme.expense;

  const bgAlphaColor =
    signed === 0
      ? isDark
        ? 'rgba(128, 134, 177, 0.2)'
        : 'rgba(15, 51, 117, 0.12)'
      : signed > 0
      ? theme.incomeBg
      : theme.expenseBg;

  return (
    <View style={styles.trendingWrap}>
      <View
        style={[
          styles.trendingPill,
          { backgroundColor: bgAlphaColor },
        ]}
      >
        {raw > 0 ? (
          <ArrowUp size={13} color={trendColor} strokeWidth={2.6} />
        ) : raw < 0 ? (
          <ArrowDown size={13} color={trendColor} strokeWidth={2.6} />
        ) : (
          <Minus size={13} color={trendColor} strokeWidth={2.6} />
        )}
        {deltaText ? (
          <Text style={[styles.trendingText, { color: trendColor }]}>
            {deltaText} •{' '}
          </Text>
        ) : null}
        <Text style={[styles.trendingText, { color: trendColor }]}>
          {Math.abs(Math.round(raw))}%
        </Text>
      </View>
      {afterText ? (
        <Text
          style={[styles.trendingAfterText, { color: theme.textMuted }]}
          numberOfLines={1}
        >
          {afterText}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20, // Monekin cardWithHeaderRadius = 20.0
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 12,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 11,
    borderTopWidth: 1,
  },
  cardFooterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  currencyRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  trendingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  trendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 10,
    paddingVertical: 3.5,
    borderRadius: 9999,
    gap: 2,
  },
  trendingText: {
    fontSize: 12,
    fontWeight: '800',
  },
  trendingAfterText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
