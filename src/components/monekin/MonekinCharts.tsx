import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { CATEGORY_PALETTE, getThemeColors } from '../../theme/colors';
import {
  formatCurrency,
  getFinanceHealthMeta,
} from '../../utils/currency';

export { getFinanceHealthMeta };

export interface CategoryDistributionItem {
  category: string;
  amount: number;
}

interface CategoryDonutChartProps {
  items: CategoryDistributionItem[];
  currency: 'NPR' | 'USD' | 'INR';
  isDark: boolean;
  privateMode?: boolean;
  emptyText?: string;
}

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  items,
  currency,
  isDark,
  privateMode = false,
  emptyText = 'No category movements in this period.',
}) => {
  const theme = getThemeColors(isDark);
  const total = useMemo(
    () => items.reduce((acc, i) => acc + i.amount, 0),
    [items]
  );

  if (items.length === 0 || total <= 0) {
    return (
      <Text style={[styles.emptyChartText, { color: theme.textMuted }]}>
        {emptyText}
      </Text>
    );
  }

  const topItems = items.slice(0, 5);
  const size = 116;
  const strokeWidth = 16;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  let accumulatedAngle = -90;

  return (
    <View style={styles.donutContainer}>
      <View style={styles.donutSvgWrap}>
        <Svg width={size} height={size}>
          <Circle
            cx={cx}
            cy={cy}
            r={r}
            stroke={isDark ? '#21262D' : '#F1F5F9'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {topItems.map((item, idx) => {
            const pct = item.amount / total;
            const dash = Math.max(pct * circumference - 3, 2);
            const rotation = accumulatedAngle;
            accumulatedAngle += pct * 360;
            const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];

            return (
              <Circle
                key={item.category}
                cx={cx}
                cy={cy}
                r={r}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dash} ${circumference}`}
                strokeLinecap="round"
                fill="none"
                origin={`${cx}, ${cy}`}
                rotation={rotation}
              />
            );
          })}
        </Svg>
        <View style={styles.donutCenterLabel}>
          <Text style={[styles.donutCount, { color: theme.textPrimary }]}>
            {items.length}
          </Text>
          <Text style={[styles.donutSub, { color: theme.textMuted }]}>
            Cats
          </Text>
        </View>
      </View>

      <View style={styles.legendList}>
        {topItems.map((item, idx) => {
          const pct = Math.round((item.amount / total) * 100);
          const color = CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length];
          return (
            <View key={item.category} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text
                style={[styles.legendName, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {item.category}
              </Text>
              <View
                style={[
                  styles.pctPill,
                  { backgroundColor: `${color}1F` },
                ]}
              >
                <Text style={[styles.pctPillText, { color }]}>{pct}%</Text>
              </View>
              <Text
                style={[styles.legendAmount, { color: theme.textSecondary }]}
              >
                {formatCurrency(item.amount, currency, true, privateMode)}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export interface ScopeDistributionChartProps {
  personalAmount: number;
  familyAmount: number;
  currency: 'NPR' | 'USD' | 'INR';
  isDark: boolean;
  privateMode?: boolean;
}

export const ScopeDistributionChart: React.FC<ScopeDistributionChartProps> = ({
  personalAmount,
  familyAmount,
  currency,
  isDark,
  privateMode = false,
}) => {
  const theme = getThemeColors(isDark);
  const pSafe = Math.max(0, personalAmount);
  const fSafe = Math.max(0, familyAmount);
  const total = pSafe + fSafe;
  const personalPct = total > 0 ? Math.round((pSafe / total) * 100) : 50;
  const familyPct = total > 0 ? 100 - personalPct : 50;

  return (
    <View style={styles.scopeDistContainer}>
      <View
        style={[
          styles.scopeBarWrapper,
          { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' },
        ]}
      >
        <View
          style={[
            styles.scopeBarSegment,
            {
              flex: Math.max(personalPct, 5),
              backgroundColor: '#2563EB',
              borderTopLeftRadius: 10,
              borderBottomLeftRadius: 10,
              borderTopRightRadius: familyPct === 0 ? 10 : 2,
              borderBottomRightRadius: familyPct === 0 ? 10 : 2,
            },
          ]}
        />
        <View style={{ width: 4 }} />
        <View
          style={[
            styles.scopeBarSegment,
            {
              flex: Math.max(familyPct, 5),
              backgroundColor: '#7C3AED',
              borderTopRightRadius: 10,
              borderBottomRightRadius: 10,
              borderTopLeftRadius: personalPct === 0 ? 10 : 2,
              borderBottomLeftRadius: personalPct === 0 ? 10 : 2,
            },
          ]}
        />
      </View>

      <View style={styles.scopeDistLegend}>
        <View style={styles.scopeLegendItem}>
          <View style={[styles.scopeColorDot, { backgroundColor: '#2563EB' }]} />
          <Text style={[styles.scopeLegendTitle, { color: theme.textPrimary }]}>
            Personal:{' '}
            <Text style={{ color: isDark ? '#60A5FA' : '#2563EB' }}>
              {formatCurrency(personalAmount, currency, true, privateMode)}
            </Text>
          </Text>
          <View
            style={[
              styles.pctPill,
              { backgroundColor: isDark ? '#1E3A8A' : '#DBEAFE' },
            ]}
          >
            <Text
              style={[
                styles.pctPillText,
                { color: isDark ? '#60A5FA' : '#2563EB' },
              ]}
            >
              {personalPct}%
            </Text>
          </View>
        </View>

        <View style={styles.scopeLegendItem}>
          <View style={[styles.scopeColorDot, { backgroundColor: '#7C3AED' }]} />
          <Text style={[styles.scopeLegendTitle, { color: theme.textPrimary }]}>
            Family:{' '}
            <Text style={{ color: isDark ? '#A78BFA' : '#7C3AED' }}>
              {formatCurrency(familyAmount, currency, true, privateMode)}
            </Text>
          </Text>
          <View
            style={[
              styles.pctPill,
              { backgroundColor: isDark ? '#4C1D95' : '#EDE9FE' },
            ]}
          >
            <Text
              style={[
                styles.pctPillText,
                { color: isDark ? '#A78BFA' : '#7C3AED' },
              ]}
            >
              {familyPct}%
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scopeDistContainer: {
    paddingVertical: 4,
  },
  scopeBarWrapper: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 12,
  },
  scopeBarSegment: {
    height: '100%',
  },
  scopeDistLegend: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  scopeLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scopeColorDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  scopeLegendTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyChartText: {
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 14,
  },
  donutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 4,
  },
  donutSvgWrap: {
    width: 116,
    height: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCount: {
    fontSize: 18,
    fontWeight: '900',
  },
  donutSub: {
    fontSize: 10,
    fontWeight: '700',
  },
  legendList: {
    flex: 1,
    gap: 7,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  pctPill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  pctPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  legendAmount: {
    fontSize: 12,
    fontWeight: '700',
    minWidth: 58,
    textAlign: 'right',
  },
});
