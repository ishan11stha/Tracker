import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Calendar,
  CheckCircle2,
  Circle,
  Moon,
  Package,
  Settings,
  Sun,
  Target,
} from 'lucide-react-native';
import {
  calculateAccountBalances,
  useVaultStore,
} from '../../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../theme/colors';
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
import { useShallow } from 'zustand/react/shallow';
import { ScreenShell } from '../../components/ui/HeroCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { DailyPulseHero } from '../../components/home/DailyPulseHero';
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
  } = useVaultStore(
    useShallow((s) => ({
      settings: s.settings,
      updateSettings: s.updateSettings,
      accounts: s.accounts,
      transactions: s.transactions,
      items: s.items,
      activities: s.activities,
      reminders: s.reminders,
      savingsGoals: s.savingsGoals,
      toggleReminderCompleted: s.toggleReminderCompleted,
      toggleActivityStatus: s.toggleActivityStatus,
    }))
  );

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
    <ScreenShell
      backgroundColor={palette.background}
      modals={
        <>
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
        </>
      }
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

        {/* 2. DAILY PULSE COMMAND HERO CARD */}
        <DailyPulseHero
          isDark={isDark}
          greetingText={greetingText}
          todayTotalTasks={todayTotalTasks}
          todayDoneTasks={todayDoneTasks}
          dailyProgressPct={dailyProgressPct}
          nextUp={nextUp}
          spentToday={spentToday}
          totalNetWorth={totalNetWorth}
          currency={settings.currency}
          privateMode={privateMode}
          onPressRing={() => router.push('/(tabs)/tracker')}
          onPressNextUp={handleNextUpPress}
          onPressSpent={() => router.push('/(tabs)/money')}
          onPressNetWorth={() => router.push('/(tabs)/items')}
        />

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
              <EmptyState
                isDark={isDark}
                compact
                icon={<ArrowUpRight size={20} color="#EF4444" />}
                accentColor="#EF4444"
                title="No movements yet"
                subtitle="Use the quick icons or voice bar above to log one."
              />
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
            <EmptyState
              isDark={isDark}
              compact
              icon={<Bell size={20} color="#EA580C" />}
              accentColor="#EA580C"
              title="All caught up for today"
              subtitle="Add a habit or reminder to keep your day on track."
              actionLabel="Add Reminder"
              onAction={() => setReminderModalVisible(true)}
            />
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
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  userNameText: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  dateStripTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  dateStripText: {
    fontSize: 12,
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
    gap: 8,
  },
  circleIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDockRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  quickDockBtn: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 11,
    marginBottom: 12,
  },
  stripCell: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  stripDivider: {
    width: 1,
    height: 24,
  },
  stripNum: {
    fontSize: 15,
    fontWeight: '900',
  },
  feedCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  feedTabsPill: {
    flexDirection: 'row',
    borderRadius: 11,
    padding: 3,
    gap: 2,
  },
  feedTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9,
  },
  feedTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  feedSeeAll: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 12.5,
    paddingVertical: 16,
    textAlign: 'center',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 11,
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
