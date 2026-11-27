import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  Activity,
  Bell,
  ChevronRight,
  Sparkles,
  Target,
} from 'lucide-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import { ObsidianHeroCard } from '../ui/ObsidianHero';
import { CurrencyDisplayer } from '../finance/FinanceDisplay';
import { AppSettings } from '../../types';

export interface NextUpSpotlight {
  kind: 'reminder' | 'habit' | 'goal' | 'clear';
  tag: string;
  title: string;
  meta: string;
  accent: string;
  id: string;
}

interface DailyPulseHeroProps {
  isDark: boolean;
  greetingText: string;
  todayTotalTasks: number;
  todayDoneTasks: number;
  dailyProgressPct: number;
  nextUp: NextUpSpotlight;
  spentToday: number;
  totalNetWorth: number;
  currency: AppSettings['currency'];
  privateMode: boolean;
  onPressRing: () => void;
  onPressNextUp: () => void;
  onPressSpent: () => void;
  onPressNetWorth: () => void;
}

const RING_RADIUS = 25;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function DailyPulseHero({
  isDark,
  greetingText,
  todayTotalTasks,
  todayDoneTasks,
  dailyProgressPct,
  nextUp,
  spentToday,
  totalNetWorth,
  currency,
  privateMode,
  onPressRing,
  onPressNextUp,
  onPressSpent,
  onPressNetWorth,
}: DailyPulseHeroProps) {
  const statusCopy =
    todayTotalTasks === 0
      ? 'No tasks scheduled today'
      : todayDoneTasks === todayTotalTasks
        ? `All ${todayTotalTasks} daily tasks completed`
        : `${todayDoneTasks} of ${todayTotalTasks} done today`;

  const cardStyle = isDark
    ? { backgroundColor: '#151F32', borderColor: '#26344E' }
    : {
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        shadowOpacity: 0.07,
      };

  const labelColor = isDark ? 'rgba(248, 250, 252, 0.56)' : '#64748B';
  const titleColor = isDark ? '#FFFFFF' : '#0F172A';
  const subColor = isDark ? 'rgba(248, 250, 252, 0.7)' : '#475569';
  const ringTrack = isDark ? 'rgba(255, 255, 255, 0.12)' : '#E2E8F0';
  const ringStroke =
    dailyProgressPct === 100
      ? isDark
        ? '#34D399'
        : '#059669'
      : isDark
        ? '#A78BFA'
        : '#6366F1';
  const subSurfaceStyle = isDark
    ? { backgroundColor: 'rgba(255, 255, 255, 0.07)', borderColor: 'transparent', borderWidth: 0 }
    : { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderWidth: 1 };
  const nextUpSurfaceStyle = isDark
    ? { backgroundColor: 'rgba(255, 255, 255, 0.08)', borderColor: 'transparent', borderWidth: 0 }
    : { backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderWidth: 1 };
  const nextUpAccent = isDark
    ? nextUp.accent
    : nextUp.kind === 'reminder'
      ? '#EA580C'
      : nextUp.kind === 'habit'
        ? '#7C3AED'
        : nextUp.kind === 'goal'
          ? '#059669'
          : '#0284C7';
  const spentColor = isDark ? '#FFFFFF' : '#0F172A';
  const netWorthColor = isDark ? '#38BDF8' : '#0284C7';
  const chevronColor = isDark ? 'rgba(248, 250, 252, 0.5)' : '#64748B';

  return (
    <ObsidianHeroCard isDark={isDark} style={cardStyle}>
      <View style={styles.pulseTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroLabel, { color: labelColor }]}>
            TODAY'S PULSE
          </Text>
          <Text
            style={[styles.pulseGreeting, { color: titleColor }]}
            numberOfLines={1}
          >
            {greetingText}
          </Text>
          <Text
            style={[styles.pulseSubtext, { color: subColor }]}
            numberOfLines={1}
          >
            {statusCopy}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onPressRing}
          style={styles.ringWrap}
          accessibilityRole="button"
          accessibilityLabel={`Today's completion ${dailyProgressPct} percent. Open tracker.`}
        >
          <Svg width={60} height={60} viewBox="0 0 62 62">
            <SvgCircle
              cx={31}
              cy={31}
              r={RING_RADIUS}
              stroke={ringTrack}
              strokeWidth={5.5}
              fill="none"
            />
            <SvgCircle
              cx={31}
              cy={31}
              r={RING_RADIUS}
              stroke={ringStroke}
              strokeWidth={5.5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={RING_CIRCUMFERENCE}
              strokeDashoffset={
                RING_CIRCUMFERENCE * (1 - dailyProgressPct / 100)
              }
              rotation={-90}
              origin="31, 31"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringPctText, { color: titleColor }]}>
              {dailyProgressPct}%
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.82}
        onPress={onPressNextUp}
        style={[styles.nextUpBar, nextUpSurfaceStyle]}
      >
        <View
          style={[
            styles.nextUpIconBox,
            { backgroundColor: `${nextUpAccent}1E` },
          ]}
        >
          {nextUp.kind === 'reminder' ? (
            <Bell size={16} color={nextUpAccent} />
          ) : nextUp.kind === 'habit' ? (
            <Activity size={16} color={nextUpAccent} />
          ) : nextUp.kind === 'goal' ? (
            <Target size={16} color={nextUpAccent} />
          ) : (
            <Sparkles size={16} color={nextUpAccent} />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.nextUpTag, { color: nextUpAccent }]}>
            {nextUp.tag}
          </Text>
          <Text
            style={[styles.nextUpTitle, { color: titleColor }]}
            numberOfLines={1}
          >
            {nextUp.title}
          </Text>
          <Text
            style={[styles.nextUpMeta, { color: subColor }]}
            numberOfLines={1}
          >
            {nextUp.meta}
          </Text>
        </View>

        <ChevronRight size={17} color={chevronColor} />
      </TouchableOpacity>

      <View style={styles.heroFlowPair}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPressSpent}
          style={[styles.heroFlowGlass, subSurfaceStyle]}
        >
          <View style={styles.flowTagRow}>
            <View
              style={[
                styles.flowDot,
                { backgroundColor: isDark ? '#FB7185' : '#E11D48' },
              ]}
            />
            <Text style={[styles.heroFlowLabel, { color: subColor }]}>
              Spent Today
            </Text>
          </View>
          <CurrencyDisplayer
            amount={spentToday}
            currency={currency}
            isDark={isDark}
            privateMode={privateMode}
            size="md"
            color={spentColor}
            compact={spentToday >= 1000000}
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onPressNetWorth}
          style={[styles.heroFlowGlass, subSurfaceStyle]}
        >
          <View style={styles.flowTagRow}>
            <View style={[styles.flowDot, { backgroundColor: netWorthColor }]} />
            <Text style={[styles.heroFlowLabel, { color: subColor }]}>
              Net Worth
            </Text>
          </View>
          <CurrencyDisplayer
            amount={totalNetWorth}
            currency={currency}
            isDark={isDark}
            privateMode={privateMode}
            size="md"
            color={netWorthColor}
            compact={totalNetWorth >= 1000000}
          />
        </TouchableOpacity>
      </View>
    </ObsidianHeroCard>
  );
}

const styles = StyleSheet.create({
  pulseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: 'rgba(248, 250, 252, 0.56)',
  },
  pulseGreeting: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 2,
  },
  pulseSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(248, 250, 252, 0.7)',
    marginTop: 2,
  },
  ringWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPctText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  nextUpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 11,
  },
  nextUpIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextUpTag: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  nextUpTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 1,
  },
  nextUpMeta: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(248, 250, 252, 0.65)',
    marginTop: 1,
  },
  heroFlowPair: {
    flexDirection: 'row',
    gap: 10,
  },
  heroFlowGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  flowTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flowDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  heroFlowLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(248, 250, 252, 0.72)',
  },
});
