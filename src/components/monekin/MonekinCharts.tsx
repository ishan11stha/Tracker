import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { CATEGORY_PALETTE, getThemeColors } from '../../theme/colors';
import {
  formatCurrency,
  getFinanceHealthMeta,
} from '../../utils/currency';

export { getFinanceHealthMeta };

/**
 * 1. Monekin `DashboardBalanceChart` (from `lib/app/home/widgets/dashboard_balance_chart.dart`)
 * Full-bleed smooth cubic bezier SVG area chart with vertical gradient fill (0.35 -> 0.12 -> 0).
 */
interface BalanceEvolutionChartProps {
  dataPoints: number[];
  lineColor: string;
  height?: number;
}

export const BalanceEvolutionChart: React.FC<BalanceEvolutionChartProps> = ({
  dataPoints,
  lineColor,
  height = 115,
}) => {
  const width = 360;
  const padTop = 12;
  const padBottom = 8;

  const { linePath, areaPath, lastPoint } = useMemo(() => {
    const pts =
      dataPoints.length >= 2
        ? dataPoints
        : dataPoints.length === 1
        ? [dataPoints[0] * 0.85, dataPoints[0]]
        : [0, 0];

    const minVal = Math.min(...pts);
    const maxVal = Math.max(...pts);
    const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;
    const drawH = height - padTop - padBottom;

    const coords = pts.map((v, i) => {
      const x = (i / (pts.length - 1)) * width;
      const y = padTop + drawH - ((v - minVal) / range) * drawH;
      return { x, y };
    });

    // Smooth cubic bezier curve through points
    let d = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const midX = (p0.x + p1.x) / 2;
      d += ` C ${midX.toFixed(1)} ${p0.y.toFixed(1)}, ${midX.toFixed(
        1
      )} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }

    const area = `${d} L ${width} ${height} L 0 ${height} Z`;
    return {
      linePath: d,
      areaPath: area,
      lastPoint: coords[coords.length - 1],
    };
  }, [dataPoints, height]);

  return (
    <View style={{ height, width: '100%' }}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="monekinAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={lineColor} stopOpacity={0.36} />
            <Stop offset="55%" stopColor={lineColor} stopOpacity={0.12} />
            <Stop offset="100%" stopColor={lineColor} stopOpacity={0.0} />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#monekinAreaGrad)" />
        <Path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={2.8}
          strokeLinecap="round"
        />
        {lastPoint && (
          <Circle
            cx={lastPoint.x - 4}
            cy={lastPoint.y}
            r={4.2}
            fill={lineColor}
            stroke="#FFFFFF"
            strokeWidth={2}
          />
        )}
      </Svg>
    </View>
  );
};

/**
 * 2. Monekin `FinanceHealthGauge` (from `lib/core/presentation/widgets/finance_health_gauge.dart`)
 * A 270° circular gauge (startAngle 135°, sweepAngle 270°) with a rounded value arc
 * and a centered "score / 100" label.
 */
interface FinanceHealthGaugeProps {
  score: number; // 0 to 100
  size?: number;
  isDark: boolean;
}

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleInDegrees: number
) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const sweep = endAngle - startAngle;
  const largeArcFlag = sweep <= 180 ? '0' : '1';
  return [
    'M',
    start.x.toFixed(2),
    start.y.toFixed(2),
    'A',
    r.toFixed(2),
    r.toFixed(2),
    0,
    largeArcFlag,
    1,
    end.x.toFixed(2),
    end.y.toFixed(2),
  ].join(' ');
}

export const FinanceHealthGauge: React.FC<FinanceHealthGaugeProps> = ({
  score,
  size = 96,
  isDark,
}) => {
  const theme = getThemeColors(isDark);
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const meta = getFinanceHealthMeta(clamped);

  const strokeWidth = 9;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  const startAngle = 135;
  const totalSweep = 270;
  const trackPath = describeArc(cx, cy, r, startAngle, startAngle + totalSweep);
  const activeSweep = (clamped / 100) * totalSweep;
  const valuePath =
    activeSweep > 1
      ? describeArc(cx, cy, r, startAngle, startAngle + activeSweep)
      : '';

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Path
          d={trackPath}
          fill="none"
          stroke={isDark ? '#30363D' : '#E2E8F0'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {valuePath ? (
          <Path
            d={valuePath}
            fill="none"
            stroke={meta.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ) : null}
      </Svg>
      <View style={styles.gaugeCenter}>
        <Text style={[styles.gaugeScoreText, { color: meta.color }]}>
          {clamped}
        </Text>
        <Text style={[styles.gaugeMaxText, { color: theme.textMuted }]}>
          /100
        </Text>
      </View>
    </View>
  );
};

/**
 * 3. Monekin `CategoryDonutChart` (from `lib/app/stats/widgets/movements_distribution/pie_chart_by_categories.dart`)
 * Multi-segment SVG Donut Chart + Legend list with percentage badges.
 */
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

const styles = StyleSheet.create({
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeScoreText: {
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },
  gaugeMaxText: {
    fontSize: 11,
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
