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
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  Package,
  Plus,
  Settings,
} from 'lucide-react-native';
import {
  calculateAccountBalances,
  calculateFinancialSummary,
  useVaultStore,
} from '../../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../theme/colors';
import { LAYOUT } from '../../theme/layout';
import {
  formatDisplayDate,
  formatTimeString,
} from '../../utils/nepaliDate';
import { formatCurrency } from '../../utils/currency';
import { NepaliDateClockBanner } from '../../components/NepaliDateClockBanner';
import { useCurrentNPT } from '../../hooks/useCurrentNPT';
import { QuickActionMessageBox } from '../../components/QuickActionMessageBox';
import { TransactionFormModal } from '../../components/TransactionFormModal';
import { ItemFormModal } from '../../components/ItemFormModal';
import { ActivityFormModal } from '../../components/ActivityFormModal';
import { ReminderFormModal } from '../../components/ReminderFormModal';
import { NepaliCalendarModal } from '../../components/NepaliCalendarModal';
import {
  CardWithHeader,
  CurrencyDisplayer,
} from '../../components/monekin/MonekinComponents';
import { TransactionType } from '../../types';

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
    toggleReminderCompleted,
    toggleActivityStatus,
  } = useVaultStore();

  const isDark = settings.theme === 'dark';
  const privateMode = Boolean(settings.privateMode);
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('dashboard', isDark);

  const initialNpt = useCurrentNPT();

  const welcomeGreeting = useMemo(() => {
    const h = initialNpt.hours;
    if (settings.language === 'ne') {
      if (h >= 6 && h < 12) return 'शुभ प्रभात';
      if (h >= 12 && h < 18) return 'शुभ दिन';
      return 'शुभ सन्ध्या';
    }
    if (h >= 6 && h < 12) return 'Good morning';
    if (h >= 12 && h < 18) return 'Good afternoon';
    return 'Good evening';
  }, [initialNpt.hours, settings.language]);

  const [overviewScope, setOverviewScope] =
    useState<'All' | 'Personal' | 'Family'>('All');

  const scopedTransactions = useMemo(() => {
    if (overviewScope === 'All') return transactions;
    return transactions.filter(
      (t) => (t.accountScope || 'Personal') === overviewScope
    );
  }, [transactions, overviewScope]);

  const summary = useMemo(
    () => calculateFinancialSummary(scopedTransactions),
    [scopedTransactions]
  );

  const accountSummary = useMemo(
    () => calculateAccountBalances(accounts, transactions),
    [accounts, transactions]
  );

  const displayedHeroBalance = useMemo(() => {
    if (overviewScope === 'Personal') return accountSummary.personalTotal;
    if (overviewScope === 'Family') return accountSummary.familyTotal;
    return accountSummary.grandTotal;
  }, [overviewScope, accountSummary]);

  const recentTransactions = useMemo(() => {
    return [...scopedTransactions]
      .sort((a, b) => b.dateISO.localeCompare(a.dateISO))
      .slice(0, 4);
  }, [scopedTransactions]);

  const pendingReminders = useMemo(
    () =>
      reminders
        .filter((r) => !r.isCompleted)
        .sort((a, b) =>
          `${a.dateISO}T${a.timeString}`.localeCompare(
            `${b.dateISO}T${b.timeString}`
          )
        ),
    [reminders]
  );

  const upcomingReminders = useMemo(
    () => pendingReminders.slice(0, 3),
    [pendingReminders]
  );

  const recentActivities = useMemo(
    () => activities.slice(0, 3),
    [activities]
  );

  const completedActivitiesCount = useMemo(
    () => activities.filter((a) => a.status === 'completed').length,
    [activities]
  );

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
  const [inspectedDateISO, setInspectedDateISO] = useState(initialNpt.isoDate);

  const openQuickTxn = useCallback((type: TransactionType) => {
    setTxnModalType(type);
    setTxnModalVisible(true);
  }, []);

  const handleOpenCalendar = useCallback((todayISO: string) => {
    setInspectedDateISO(todayISO);
    setCalendarModalVisible(true);
  }, []);

  const togglePrivateMode = useCallback(() => {
    updateSettings({ privateMode: !privateMode });
  }, [privateMode, updateSettings]);

  const userInitials = useMemo(() => {
    const raw = (settings.userName || 'My Vault').trim();
    const parts = raw.split(/\s+/);
    return parts.length > 1
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }, [settings.userName]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. CLEAN MINIMAL HEADER */}
        <View style={styles.headerRow}>
          <View style={styles.welcomeLeft}>
            <View
              style={[
                styles.userAvatar,
                { backgroundColor: isDark ? '#1E293B' : '#0F172A' },
              ]}
            >
              <Text style={styles.userAvatarText}>{userInitials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.welcomeHint, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {welcomeGreeting}
              </Text>
              <Text
                style={[styles.userNameText, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {settings.userName || 'My Vault'}
              </Text>
            </View>
          </View>

          <View style={styles.headerBtnsGroup}>
            <TouchableOpacity
              onPress={togglePrivateMode}
              style={[
                styles.circleIconBtn,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              accessibilityRole="switch"
              accessibilityLabel="Hide balances in private mode"
              accessibilityState={{ checked: privateMode }}
            >
              {privateMode ? (
                <EyeOff size={18} color={theme.textPrimary} />
              ) : (
                <Eye size={18} color={theme.textPrimary} />
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

        {/* 2. COMPACT NEPALI DATE & LIVE NPT CLOCK */}
        <NepaliDateClockBanner
          timeFormat={settings.timeFormat}
          isDark={isDark}
          onPressCalendar={handleOpenCalendar}
        />

        {/* 3. SIMPLIFIED NET WORTH HERO CARD */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.heroHeaderRow}>
            <Text style={[styles.heroLabel, { color: theme.textMuted }]}>
              {overviewScope === 'Personal'
                ? 'PERSONAL BALANCE'
                : overviewScope === 'Family'
                  ? 'FAMILY BALANCE'
                  : 'NET BALANCE'}
            </Text>

            <View
              style={[
                styles.scopeMiniTabs,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                },
              ]}
            >
              {(['All', 'Personal', 'Family'] as const).map((sc) => {
                const isSel = overviewScope === sc;
                return (
                  <TouchableOpacity
                    key={sc}
                    onPress={() => setOverviewScope(sc)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: isSel }}
                    style={[
                      styles.scopeMiniTab,
                      isSel && {
                        backgroundColor: isDark ? '#38BDF8' : '#0F172A',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scopeMiniTabText,
                        {
                          color: isSel
                            ? isDark
                              ? '#0B0F19'
                              : '#FFFFFF'
                            : theme.textMuted,
                          fontWeight: isSel ? '800' : '600',
                        },
                      ]}
                    >
                      {sc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.heroBalanceWrap}>
            <CurrencyDisplayer
              amount={displayedHeroBalance}
              currency={settings.currency}
              isDark={isDark}
              privateMode={privateMode}
              size="xl"
            />
          </View>

          <View style={[styles.heroFlowsRow, { borderTopColor: theme.divider }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openQuickTxn('income')}
              style={styles.heroFlowCol}
            >
              <View style={styles.flowLabelRow}>
                <ArrowDownLeft size={14} color={theme.income} />
                <Text style={[styles.flowLabelText, { color: theme.textMuted }]}>
                  Income
                </Text>
              </View>
              <CurrencyDisplayer
                amount={summary.totalIncome}
                currency={settings.currency}
                isDark={isDark}
                privateMode={privateMode}
                size="md"
                color={theme.income}
                compact={summary.totalIncome >= 1000000}
              />
            </TouchableOpacity>

            <View
              style={[styles.flowDivider, { backgroundColor: theme.divider }]}
            />

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openQuickTxn('expense')}
              style={styles.heroFlowCol}
            >
              <View style={styles.flowLabelRow}>
                <ArrowUpRight size={14} color={theme.expense} />
                <Text style={[styles.flowLabelText, { color: theme.textMuted }]}>
                  Expenses
                </Text>
              </View>
              <CurrencyDisplayer
                amount={summary.totalExpense}
                currency={settings.currency}
                isDark={isDark}
                privateMode={privateMode}
                size="md"
                color={theme.expense}
                compact={summary.totalExpense >= 1000000}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. 5-ICON QUICK LAUNCH DOCK (Icons only) */}
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
                borderColor: isDark
                  ? 'rgba(16, 185, 129, 0.3)'
                  : '#A7F3D0',
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
                borderColor: isDark
                  ? 'rgba(239, 68, 68, 0.3)'
                  : '#FECACA',
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
                borderColor: isDark
                  ? 'rgba(37, 99, 235, 0.3)'
                  : '#BFDBFE',
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
                borderColor: isDark
                  ? 'rgba(124, 58, 237, 0.3)'
                  : '#DDD6FE',
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
                borderColor: isDark
                  ? 'rgba(234, 88, 12, 0.3)'
                  : '#FED7AA',
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

        {/* 5. SINGLE-LINE SMART COMMAND INPUT */}
        <QuickActionMessageBox isDark={isDark} />

        {/* 6. COMPACT 3-STAT OVERVIEW STRIP */}
        <View
          style={[
            styles.statsStrip,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/items')}
            style={styles.stripCell}
          >
            <Text style={[styles.stripNum, { color: '#2563EB' }]}>
              {totalItemUnits}
            </Text>
            <Text style={[styles.stripLabel, { color: theme.textMuted }]}>
              Items
            </Text>
          </TouchableOpacity>

          <View
            style={[styles.stripDivider, { backgroundColor: theme.divider }]}
          />

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/tracker')}
            style={styles.stripCell}
          >
            <Text style={[styles.stripNum, { color: '#7C3AED' }]}>
              {completedActivitiesCount}/{activities.length}
            </Text>
            <Text style={[styles.stripLabel, { color: theme.textMuted }]}>
              Habits
            </Text>
          </TouchableOpacity>

          <View
            style={[styles.stripDivider, { backgroundColor: theme.divider }]}
          />

          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push('/(tabs)/reminders')}
            style={styles.stripCell}
          >
            <Text style={[styles.stripNum, { color: '#EA580C' }]}>
              {pendingReminders.length}
            </Text>
            <Text style={[styles.stripLabel, { color: theme.textMuted }]}>
              Alerts
            </Text>
          </TouchableOpacity>
        </View>

        {/* 7. RECENT MOVEMENTS */}
        <CardWithHeader
          title="Recent Movements"
          isDark={isDark}
          headerActionText="All"
          onHeaderActionPress={() => router.push('/(tabs)/money')}
          accentColor="#10B981"
        >
          {recentTransactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No transactions yet.
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
          )}
        </CardWithHeader>

        {/* 8. UPCOMING SCHEDULE & HABITS */}
        <CardWithHeader
          title="Today & Upcoming"
          isDark={isDark}
          headerActionIcon={<Plus size={13} color={palette.accent} />}
          headerActionText="Alert"
          onHeaderActionPress={() => setReminderModalVisible(true)}
          accentColor={palette.accent}
        >
          {upcomingReminders.length === 0 && recentActivities.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Nothing scheduled yet.
            </Text>
          ) : (
            <>
              {upcomingReminders.map((rem, idx) => (
                <TouchableOpacity
                  key={rem.id}
                  onPress={() => toggleReminderCompleted(rem.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rem.isCompleted }}
                  style={[
                    styles.listItemRow,
                    (idx < upcomingReminders.length - 1 ||
                      recentActivities.length > 0) && {
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
                      {formatDisplayDate(
                        rem.dateISO,
                        settings.preferredCalendar,
                        settings.language
                      )}{' '}
                      • {formatTimeString(rem.timeString, settings.timeFormat)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {recentActivities.map((act, idx) => {
                const isDone = act.status === 'completed';
                return (
                  <TouchableOpacity
                    key={act.id}
                    onPress={() => toggleActivityStatus(act.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isDone }}
                    style={[
                      styles.listItemRow,
                      idx < recentActivities.length - 1 && {
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
        </CardWithHeader>
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 10,
  },
  welcomeLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  welcomeHint: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  userNameText: {
    fontSize: 17,
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
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  heroLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  scopeMiniTabs: {
    flexDirection: 'row',
    borderRadius: 9,
    padding: 2,
    gap: 2,
  },
  scopeMiniTab: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  scopeMiniTabText: {
    fontSize: 10.5,
  },
  heroBalanceWrap: {
    marginBottom: 14,
  },
  heroFlowsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  heroFlowCol: {
    flex: 1,
    gap: 3,
  },
  flowDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 14,
  },
  flowLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flowLabelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickDockRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  quickDockBtn: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    borderWidth: 1,
  },
  statsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    marginBottom: 14,
  },
  stripCell: {
    flex: 1,
    alignItems: 'center',
  },
  stripDivider: {
    width: 1,
    height: 26,
  },
  stripNum: {
    fontSize: 17,
    fontWeight: '900',
  },
  stripLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 12.5,
    paddingVertical: 10,
    textAlign: 'center',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  txnIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
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
