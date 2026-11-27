import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  Moon,
  Package,
  Settings,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react-native';
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import {
  calculateAccountBalances,
  useVaultStore,
} from '../../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../theme/colors';
import { LAYOUT } from '../../theme/layout';
import {
  formatDisplayDate,
  formatTimeString,
} from '../../utils/nepaliDate';
import { formatCurrency } from '../../utils/currency';
import { useCurrentNPT } from '../../hooks/useCurrentNPT';
import { useNepalClock } from '../../hooks/useNepalClock';
import { QuickActionMessageBox } from '../../components/QuickActionMessageBox';
import { TransactionFormModal } from '../../components/TransactionFormModal';
import { ItemFormModal } from '../../components/ItemFormModal';
import { ActivityFormModal } from '../../components/ActivityFormModal';
import { ReminderFormModal } from '../../components/ReminderFormModal';
import { NepaliCalendarModal } from '../../components/NepaliCalendarModal';
import { CurrencyDisplayer } from '../../components/monekin/MonekinComponents';
import {
  TransactionType,
  isActivityCompletedOnDate,
  isActivityScheduledOnDate,
  isReminderCompletedOnDate,
} from '../../types';

/**
 * Isolated slim live BS date + NPT clock pill so Home does not re-render every second.
 */
const LiveNepaliDatePill = React.memo(
  ({
    timeFormat,
    isDark,
    onPress,
  }: {
    timeFormat: '12h' | '24h';
    isDark: boolean;
    onPress: (iso: string) => void;
  }) => {
    const theme = getThemeColors(isDark);
    const clock = useNepalClock(timeFormat, true);
    return (
      <TouchableOpacity
        activeOpacity={0.78}
        onPress={() => onPress(clock.isoDate)}
        style={styles.dateStripTouch}
        accessibilityRole="button"
        accessibilityLabel={`Open Nepali calendar. ${clock.bsNepaliText}. ${clock.liveTimeText}`}
      >
        <Calendar size={13} color={isDark ? '#38BDF8' : '#0F172A'} />
        <Text
          style={[styles.dateStripText, { color: theme.textSecondary }]}
          numberOfLines={1}
        >
          {clock.bsNepaliText}
        </Text>
        <View style={styles.liveClockBadge}>
          <View style={styles.liveDot} />
          <Text
            style={[styles.liveClockText, { color: theme.textPrimary }]}
            numberOfLines={1}
          >
            {clock.liveTimeText}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
);
LiveNepaliDatePill.displayName = 'LiveNepaliDatePill';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    settings,
    updateSettings,
    accounts,
    transactions,
    items,
    activities,
    reminders,
    savingsGoals,
    toggleReminderCompleted,
    toggleActivityStatus,
  } = useVaultStore();

  const isDark = settings.theme === 'dark';
  const privateMode = Boolean(settings.privateMode);
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('dashboard', isDark);

  const [feedTab, setFeedTab] = useState<'recent' | 'schedule'>('recent');

  const nowNPT = useCurrentNPT();
  const todayISO = nowNPT.isoDate;

  const greetingText = useMemo(() => {
    if (nowNPT.hours < 12) return 'Good morning';
    if (nowNPT.hours < 17) return 'Good afternoon';
    return 'Good evening';
  }, [nowNPT.hours]);

  const accountSummary = useMemo(
    () => calculateAccountBalances(accounts, transactions),
    [accounts, transactions]
  );

  const spentToday = useMemo(
    () =>
      transactions
        .filter((t) => t.type === 'expense' && t.dateISO === todayISO)
        .reduce((acc, t) => acc + t.amount, 0),
    [transactions, todayISO]
  );

  const totalAssetValue = useMemo(
    () =>
      items
        .filter((i) => i.status === 'Owned' || i.status === 'Lent')
        .reduce((acc, i) => acc + i.purchasePrice * (i.quantity || 1), 0),
    [items]
  );

  const totalNetWorth = accountSummary.grandTotal + totalAssetValue;

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
      .slice(0, 5);
  }, [transactions]);

  const pendingReminders = useMemo(
    () =>
      reminders
        .filter((r) => !isReminderCompletedOnDate(r, todayISO))
        .sort((a, b) =>
          `${a.dateISO}T${a.timeString}`.localeCompare(
            `${b.dateISO}T${b.timeString}`
          )
        ),
    [reminders, todayISO]
  );

  const todayReminders = useMemo(
    () =>
      reminders.filter(
        (r) => r.dateISO === todayISO || r.recurrence === 'daily'
      ),
    [reminders, todayISO]
  );

  const todayHabits = useMemo(
    () => activities.filter((a) => isActivityScheduledOnDate(a, todayISO)),
    [activities, todayISO]
  );

  const completedTodayCount = useMemo(
    () =>
      todayHabits.filter((a) => isActivityCompletedOnDate(a, todayISO)).length,
    [todayHabits, todayISO]
  );

  const todayTotalTasks = todayHabits.length + todayReminders.length;
  const todayDoneTasks =
    completedTodayCount +
    todayReminders.filter((r) => isReminderCompletedOnDate(r, todayISO)).length;
  const dailyProgressPct =
    todayTotalTasks > 0
      ? Math.round((todayDoneTasks / todayTotalTasks) * 100)
      : 100;

  const nextUp = useMemo(() => {
    const nextReminder = pendingReminders[0];
    if (nextReminder) {
      return {
        kind: 'reminder' as const,
        tag: 'NEXT ALERT',
        title: nextReminder.title,
        meta: `${formatTimeString(nextReminder.timeString, settings.timeFormat)} NPT`,
        accent: '#FB923C',
        id: nextReminder.id,
      };
    }

    const nextHabit = todayHabits.find(
      (a) => !isActivityCompletedOnDate(a, todayISO)
    );
    if (nextHabit) {
      return {
        kind: 'habit' as const,
        tag: 'NEXT HABIT',
        title: nextHabit.title,
        meta: `${nextHabit.numericValue} ${nextHabit.unit} • Tap to check off`,
        accent: '#A78BFA',
        id: nextHabit.id,
      };
    }

    const activeGoal = savingsGoals.find(
      (g) => g.targetAmount > 0 && g.savedAmount < g.targetAmount
    );
    if (activeGoal) {
      const pct = Math.min(
        100,
        Math.round((activeGoal.savedAmount / activeGoal.targetAmount) * 100)
      );
      return {
        kind: 'goal' as const,
        tag: 'TOP GOAL',
        title: activeGoal.title,
        meta: `${pct}% saved toward target`,
        accent: '#34D399',
        id: activeGoal.id,
      };
    }

    return {
      kind: 'clear' as const,
      tag: 'STATUS',
      title: 'All clear for today',
      meta: 'Tap to add a habit or plan your day',
      accent: '#38BDF8',
      id: 'clear',
    };
  }, [
    pendingReminders,
    todayHabits,
    todayISO,
    savingsGoals,
    settings.timeFormat,
  ]);

  const handleNextUpPress = useCallback(() => {
    if (nextUp.kind === 'reminder') {
      router.push('/(tabs)/reminders');
    } else if (nextUp.kind === 'habit') {
      toggleActivityStatus(nextUp.id, todayISO);
    } else if (nextUp.kind === 'goal') {
      router.push('/goals');
    } else {
      router.push('/(tabs)/tracker');
    }
  }, [nextUp, router, toggleActivityStatus, todayISO]);

  const totalItemUnits = useMemo(
    () => items.reduce((acc, i) => acc + (i.quantity || 1), 0),
    [items]
  );

  // Modal states
  const [txnModalVisible, setTxnModalVisible] = useState(false);
  const [txnModalType, setTxnModalType] = useState<TransactionType>('income');
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [inspectedDateISO, setInspectedDateISO] = useState(todayISO);

  const openQuickTxn = useCallback((type: TransactionType) => {
    setTxnModalType(type);
    setTxnModalVisible(true);
  }, []);

  const handleOpenCalendar = useCallback((iso: string) => {
    setInspectedDateISO(iso);
    setCalendarModalVisible(true);
  }, []);

  const toggleTheme = useCallback(() => {
    updateSettings({ theme: isDark ? 'light' : 'dark' });
  }, [isDark, updateSettings]);

  const upcomingScheduleCount =
    pendingReminders.slice(0, 3).length + todayHabits.slice(0, 3).length;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. CLEAN TOP HEADER */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.userNameText, { color: theme.textPrimary }]}
              numberOfLines={1}
            >
              {settings.userName || 'My Vault'}
            </Text>
            <LiveNepaliDatePill
              timeFormat={settings.timeFormat}
              isDark={isDark}
              onPress={handleOpenCalendar}
            />
          </View>

          <View style={styles.headerBtnsGroup}>
            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.circleIconBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              accessibilityRole="switch"
              accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} theme`}
              accessibilityState={{ checked: isDark }}
            >
              {isDark ? (
                <Sun size={18} color="#FBBF24" />
              ) : (
                <Moon size={18} color={theme.textPrimary} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={[
                styles.circleIconBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Settings size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. SIGNATURE OBSIDIAN DAILY PULSE COMMAND CARD */}
        <View
          style={[
            styles.signatureCard,
            {
              backgroundColor: isDark ? '#151F32' : '#0F172A',
              borderColor: isDark ? '#26344E' : '#1E293B',
            },
          ]}
        >
          {/* Top Row: Greeting + Live Daily Completion Ring */}
          <View style={styles.pulseTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroLabel}>TODAY'S PULSE</Text>
              <Text style={styles.pulseGreeting} numberOfLines={1}>
                {greetingText}
              </Text>
              <Text style={styles.pulseSubtext} numberOfLines={1}>
                {todayTotalTasks === 0
                  ? 'No tasks scheduled today'
                  : todayDoneTasks === todayTotalTasks
                    ? `All ${todayTotalTasks} daily tasks completed`
                    : `${todayDoneTasks} of ${todayTotalTasks} done today`}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push('/(tabs)/tracker')}
              style={styles.ringWrap}
              accessibilityRole="button"
              accessibilityLabel={`Today's completion ${dailyProgressPct} percent. Open tracker.`}
            >
              <Svg width={62} height={62} viewBox="0 0 62 62">
                <SvgCircle
                  cx={31}
                  cy={31}
                  r={25}
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth={5.5}
                  fill="none"
                />
                <SvgCircle
                  cx={31}
                  cy={31}
                  r={25}
                  stroke={dailyProgressPct === 100 ? '#34D399' : '#A78BFA'}
                  strokeWidth={5.5}
                  strokeLinecap="round"
                  fill="none"
                  strokeDasharray={2 * Math.PI * 25}
                  strokeDashoffset={
                    2 * Math.PI * 25 * (1 - dailyProgressPct / 100)
                  }
                  rotation={-90}
                  origin="31, 31"
                />
              </Svg>
              <View style={styles.ringCenter}>
                <Text style={styles.ringPctText}>{dailyProgressPct}%</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Center Spotlight: Interactive Next Up Bar */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={handleNextUpPress}
            style={styles.nextUpBar}
          >
            <View
              style={[
                styles.nextUpIconBox,
                { backgroundColor: `${nextUp.accent}24` },
              ]}
            >
              {nextUp.kind === 'reminder' ? (
                <Bell size={16} color={nextUp.accent} />
              ) : nextUp.kind === 'habit' ? (
                <Activity size={16} color={nextUp.accent} />
              ) : nextUp.kind === 'goal' ? (
                <Target size={16} color={nextUp.accent} />
              ) : (
                <Sparkles size={16} color={nextUp.accent} />
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.nextUpTag, { color: nextUp.accent }]}>
                {nextUp.tag}
              </Text>
              <Text style={styles.nextUpTitle} numberOfLines={1}>
                {nextUp.title}
              </Text>
              <Text style={styles.nextUpMeta} numberOfLines={1}>
                {nextUp.meta}
              </Text>
            </View>

            <ChevronRight size={17} color="rgba(248, 250, 252, 0.5)" />
          </TouchableOpacity>

          {/* Bottom Pair: Today's Spend + Holistic Total Net Worth (Cash + Assets) */}
          <View style={styles.heroFlowPair}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/money')}
              style={styles.heroFlowGlass}
            >
              <View style={styles.flowTagRow}>
                <View
                  style={[styles.flowDot, { backgroundColor: '#FB7185' }]}
                />
                <Text style={styles.heroFlowLabel}>Spent Today</Text>
              </View>
              <CurrencyDisplayer
                amount={spentToday}
                currency={settings.currency}
                isDark={true}
                privateMode={privateMode}
                size="md"
                color="#FFFFFF"
                compact={spentToday >= 1000000}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/items')}
              style={styles.heroFlowGlass}
            >
              <View style={styles.flowTagRow}>
                <View
                  style={[styles.flowDot, { backgroundColor: '#38BDF8' }]}
                />
                <Text style={styles.heroFlowLabel}>Net Worth</Text>
              </View>
              <CurrencyDisplayer
                amount={totalNetWorth}
                currency={settings.currency}
                isDark={true}
                privateMode={privateMode}
                size="md"
                color="#38BDF8"
                compact={totalNetWorth >= 1000000}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 3. 5-ICON QUICK LAUNCH DOCK (Icons only) */}
        <View style={styles.quickDockRow}>
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => openQuickTxn('income')}
            accessibilityRole="button"
            accessibilityLabel="Add income"
            style={[
              styles.quickDockBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(16, 185, 129, 0.14)'
                  : '#ECFDF5',
              },
            ]}
          >
            <ArrowDownLeft
              size={20}
              color={isDark ? '#34D399' : '#059669'}
              strokeWidth={2.5}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => openQuickTxn('expense')}
            accessibilityRole="button"
            accessibilityLabel="Add expense"
            style={[
              styles.quickDockBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(239, 68, 68, 0.14)'
                  : '#FEF2F2',
              },
            ]}
          >
            <ArrowUpRight
              size={20}
              color={isDark ? '#F87171' : '#DC2626'}
              strokeWidth={2.5}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => setItemModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Add item"
            style={[
              styles.quickDockBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(37, 99, 235, 0.14)'
                  : '#EFF6FF',
              },
            ]}
          >
            <Package
              size={20}
              color={isDark ? '#60A5FA' : '#2563EB'}
              strokeWidth={2.3}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => setActivityModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Log habit or activity"
            style={[
              styles.quickDockBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(124, 58, 237, 0.14)'
                  : '#F5F3FF',
              },
            ]}
          >
            <Activity
              size={20}
              color={isDark ? '#A78BFA' : '#7C3AED'}
              strokeWidth={2.3}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => setReminderModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Create reminder alert"
            style={[
              styles.quickDockBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(234, 88, 12, 0.14)'
                  : '#FFF7ED',
              },
            ]}
          >
            <Bell
              size={20}
              color={isDark ? '#FB923C' : '#EA580C'}
              strokeWidth={2.3}
            />
          </TouchableOpacity>
        </View>

        {/* 4. SINGLE-LINE SMART COMMAND BAR */}
        <QuickActionMessageBox isDark={isDark} />

        {/* 5. COMPACT 4-MODULE PULSE BAR (Icon + Count only) */}
        <View
          style={[
            styles.statsStrip,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/goals')}
            accessibilityRole="button"
            accessibilityLabel={`${savingsGoals.length} savings goals`}
            style={styles.stripCell}
          >
            <Target size={17} color="#10B981" />
            <Text style={[styles.stripNum, { color: theme.textPrimary }]}>
              {savingsGoals.length}
            </Text>
          </TouchableOpacity>

          <View
            style={[styles.stripDivider, { backgroundColor: theme.divider }]}
          />

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/items')}
            accessibilityRole="button"
            accessibilityLabel={`${totalItemUnits} items`}
            style={styles.stripCell}
          >
            <Package size={17} color="#2563EB" />
            <Text style={[styles.stripNum, { color: theme.textPrimary }]}>
              {totalItemUnits}
            </Text>
          </TouchableOpacity>

          <View
            style={[styles.stripDivider, { backgroundColor: theme.divider }]}
          />

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/tracker')}
            accessibilityRole="button"
            accessibilityLabel={`${completedTodayCount} of ${todayHabits.length} habits completed today`}
            style={styles.stripCell}
          >
            <Activity size={17} color="#7C3AED" />
            <Text style={[styles.stripNum, { color: theme.textPrimary }]}>
              {completedTodayCount}/{todayHabits.length}
            </Text>
          </TouchableOpacity>

          <View
            style={[styles.stripDivider, { backgroundColor: theme.divider }]}
          />

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/reminders')}
            accessibilityRole="button"
            accessibilityLabel={`${pendingReminders.length} pending alerts`}
            style={styles.stripCell}
          >
            <Bell size={17} color="#EA580C" />
            <Text style={[styles.stripNum, { color: theme.textPrimary }]}>
              {pendingReminders.length}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 6. UNIFIED FEED CARD (Recent Movements | Today's Schedule) */}
        <View
          style={[
            styles.feedCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.feedHeaderRow}>
            <View
              style={[
                styles.feedTabsPill,
                { backgroundColor: theme.surfaceContainerHigh },
              ]}
            >
              <TouchableOpacity
                onPress={() => setFeedTab('recent')}
                style={[
                  styles.feedTabBtn,
                  feedTab === 'recent' && {
                    backgroundColor: theme.card,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.feedTabText,
                    {
                      color:
                        feedTab === 'recent'
                          ? theme.textPrimary
                          : theme.textMuted,
                    },
                  ]}
                >
                  Recent
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setFeedTab('schedule')}
                style={[
                  styles.feedTabBtn,
                  feedTab === 'schedule' && {
                    backgroundColor: theme.card,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.feedTabText,
                    {
                      color:
                        feedTab === 'schedule'
                          ? theme.textPrimary
                          : theme.textMuted,
                    },
                  ]}
                >
                  Schedule
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() =>
                router.push(
                  feedTab === 'recent' ? '/(tabs)/money' : '/(tabs)/reminders'
                )
              }
              hitSlop={8}
            >
              <Text
                style={[
                  styles.feedSeeAll,
                  { color: isDark ? '#38BDF8' : '#0F172A' },
                ]}
              >
                See all
              </Text>
            </TouchableOpacity>
          </View>

          {feedTab === 'recent' ? (
            recentTransactions.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No movements yet. Tap the green or red icon above to log one.
              </Text>
            ) : (
              recentTransactions.map((t, idx) => {
                const isIncome = t.type === 'income';
                return (
                  <View
                    key={t.id}
                    style={[
                      styles.listItemRow,
                      idx < recentTransactions.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.divider,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.txnIconWrap,
                        {
                          backgroundColor: isIncome
                            ? theme.incomeBg
                            : theme.expenseBg,
                        },
                      ]}
                    >
                      {isIncome ? (
                        <ArrowDownLeft size={16} color={theme.income} />
                      ) : (
                        <ArrowUpRight size={16} color={theme.expense} />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.itemTitle, { color: theme.textPrimary }]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                      <Text
                        style={[styles.itemSubtitle, { color: theme.textMuted }]}
                      >
                        {t.category} •{' '}
                        {formatDisplayDate(
                          t.dateISO,
                          settings.preferredCalendar,
                          settings.language
                        )}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.amountBadgeText,
                        { color: isIncome ? theme.income : theme.expense },
                      ]}
                    >
                      {isIncome ? '+' : '−'}
                      {formatCurrency(
                        t.amount,
                        settings.currency,
                        false,
                        privateMode
                      )}
                    </Text>
                  </View>
                );
              })
            )
          ) : upcomingScheduleCount === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              You're all caught up for today.
            </Text>
          ) : (
            <>
              {pendingReminders.slice(0, 3).map((rem, idx) => (
                <TouchableOpacity
                  key={rem.id}
                  onPress={() => toggleReminderCompleted(rem.id, todayISO)}
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: isReminderCompletedOnDate(rem, todayISO),
                  }}
                  style={[
                    styles.listItemRow,
                    (idx < Math.min(3, pendingReminders.length) - 1 ||
                      todayHabits.length > 0) && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.divider,
                    },
                  ]}
                >
                  <Circle size={20} color="#EA580C" />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.itemTitle, { color: theme.textPrimary }]}
                      numberOfLines={1}
                    >
                      {rem.title}
                    </Text>
                    <Text
                      style={[styles.itemSubtitle, { color: theme.textMuted }]}
                    >
                      {formatTimeString(rem.timeString, settings.timeFormat)}{' '}
                      NPT
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {todayHabits.slice(0, 3).map((act, idx) => {
                const isDone = isActivityCompletedOnDate(act, todayISO);
                return (
                  <TouchableOpacity
                    key={act.id}
                    onPress={() => toggleActivityStatus(act.id, todayISO)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isDone }}
                    style={[
                      styles.listItemRow,
                      idx < Math.min(3, todayHabits.length) - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.divider,
                      },
                    ]}
                  >
                    {isDone ? (
                      <CheckCircle2 size={20} color="#7C3AED" />
                    ) : (
                      <Circle size={20} color={theme.textMuted} />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.itemTitle,
                          {
                            color: theme.textPrimary,
                            textDecorationLine: isDone
                              ? 'line-through'
                              : 'none',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {act.title}
                      </Text>
                      <Text
                        style={[styles.itemSubtitle, { color: theme.textMuted }]}
                      >
                        {act.category} • {act.numericValue} {act.unit}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}
        </View>
      </ScrollView>

      {/* Modals */}
      <TransactionFormModal
        visible={txnModalVisible}
        initialType={txnModalType}
        onClose={() => setTxnModalVisible(false)}
      />

      <ItemFormModal
        visible={itemModalVisible}
        onClose={() => setItemModalVisible(false)}
      />

      <ActivityFormModal
        visible={activityModalVisible}
        onClose={() => setActivityModalVisible(false)}
      />

      <ReminderFormModal
        visible={reminderModalVisible}
        onClose={() => setReminderModalVisible(false)}
      />

      <NepaliCalendarModal
        visible={calendarModalVisible}
        selectedDateISO={inspectedDateISO}
        onSelectDate={(iso) => setInspectedDateISO(iso)}
        onClose={() => setCalendarModalVisible(false)}
        accentColor={palette.accent}
        title="Nepali Calendar (पात्रो)"
      />
    </SafeAreaView>
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
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 42,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    gap: 12,
  },
  userNameText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  dateStripTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 5,
  },
  dateStripText: {
    fontSize: 12.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  liveClockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveClockText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  headerBtnsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  circleIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureCard: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  pulseTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 18,
  },
  heroLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: 'rgba(248, 250, 252, 0.56)',
  },
  pulseGreeting: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.4,
    marginTop: 4,
  },
  pulseSubtext: {
    fontSize: 12.5,
    fontWeight: '600',
    color: 'rgba(248, 250, 252, 0.7)',
    marginTop: 4,
  },
  ringWrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPctText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  nextUpBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 16,
  },
  nextUpIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextUpTag: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  nextUpTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  nextUpMeta: {
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(248, 250, 252, 0.65)',
    marginTop: 2,
  },
  heroFlowPair: {
    flexDirection: 'row',
    gap: 12,
  },
  heroFlowGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 6,
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
    fontSize: 11.5,
    fontWeight: '700',
    color: 'rgba(248, 250, 252, 0.72)',
  },
  quickDockRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  quickDockBtn: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    marginBottom: 20,
  },
  stripCell: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  stripDivider: {
    width: 1,
    height: 32,
  },
  stripNum: {
    fontSize: 16,
    fontWeight: '900',
  },
  feedCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  feedTabsPill: {
    flexDirection: 'row',
    borderRadius: 13,
    padding: 4,
    gap: 3,
  },
  feedTabBtn: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 10,
  },
  feedTabText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  feedSeeAll: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    paddingVertical: 22,
    textAlign: 'center',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    gap: 13,
  },
  txnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  amountBadgeText: {
    fontSize: 13.5,
    fontWeight: '800',
  },
});
