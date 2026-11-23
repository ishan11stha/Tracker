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
  ChevronRight,
  Circle,
  Eye,
  EyeOff,
  Package,
  Plus,
  Settings,
  ShieldCheck,
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
  DateRangeChips,
  MONEKIN_PERIODS,
  MonekinPeriodKey,
  TrendingValueChip,
} from '../../components/monekin/MonekinComponents';
import {
  BalanceEvolutionChart,
  getFinanceHealthMeta,
} from '../../components/monekin/MonekinCharts';
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

  const [selectedPeriod, setSelectedPeriod] =
    useState<MonekinPeriodKey>('1M');
  const initialNpt = useCurrentNPT();

  const welcomeGreeting = useMemo(() => {
    const h = initialNpt.hours;
    if (settings.language === 'ne') {
      if (h >= 6 && h < 12) return 'शुभ प्रभात • Good morning';
      if (h >= 12 && h < 18) return 'शुभ दिन • Good afternoon';
      return 'शुभ सन्ध्या • Good evening';
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

  const allTimeSummary = useMemo(
    () => calculateFinancialSummary(scopedTransactions),
    [scopedTransactions]
  );

  const {
    periodSummary,
    incomeTrendPct,
    expenseTrendPct,
    balanceDelta,
    balanceTrendPct,
    evolutionPoints,
  } = useMemo(() => {
    const periodDef =
      MONEKIN_PERIODS.find((p) => p.key === selectedPeriod) ||
      MONEKIN_PERIODS[1];
    const todayParts = initialNpt.isoDate.split('-').map(Number);
    const todayUTC = Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]);

    const currentList = scopedTransactions.filter((t) => {
      if (!periodDef.days) return true;
      const parts = t.dateISO.split('-').map(Number);
      const tUTC = Date.UTC(parts[0], parts[1] - 1, parts[2]);
      const diffDays = Math.floor((todayUTC - tUTC) / 86400000);
      return diffDays >= 0 && diffDays <= periodDef.days;
    });

    const prevList = scopedTransactions.filter((t) => {
      if (!periodDef.days) return false;
      const parts = t.dateISO.split('-').map(Number);
      const tUTC = Date.UTC(parts[0], parts[1] - 1, parts[2]);
      const diffDays = Math.floor((todayUTC - tUTC) / 86400000);
      return diffDays > periodDef.days && diffDays <= periodDef.days * 2;
    });

    const currSum = calculateFinancialSummary(currentList);
    const prevSum = calculateFinancialSummary(prevList);

    const calcPct = (curr: number, prev: number) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    const sortedAsc = [...scopedTransactions].sort((a, b) =>
      a.dateISO.localeCompare(b.dateISO)
    );
    let running = 0;
    const pts: number[] = [0];
    for (const t of sortedAsc) {
      running += t.type === 'income' ? t.amount : -t.amount;
      pts.push(running);
    }
    if (pts.length < 4) {
      pts.unshift(0);
    }

    return {
      periodSummary: currSum,
      incomeTrendPct: calcPct(currSum.totalIncome, prevSum.totalIncome),
      expenseTrendPct: calcPct(currSum.totalExpense, prevSum.totalExpense),
      balanceDelta: currSum.totalBalance,
      balanceTrendPct:
        allTimeSummary.totalIncome > 0
          ? (currSum.totalBalance / allTimeSummary.totalIncome) * 100
          : 0,
      evolutionPoints: pts,
    };
  }, [
    scopedTransactions,
    selectedPeriod,
    initialNpt.isoDate,
    allTimeSummary.totalIncome,
  ]);

  const accountSummary = useMemo(
    () => calculateAccountBalances(accounts, transactions),
    [accounts, transactions]
  );

  const displayedHeroBalance = useMemo(() => {
    if (overviewScope === 'Personal') return accountSummary.personalTotal;
    if (overviewScope === 'Family') return accountSummary.familyTotal;
    return accountSummary.grandTotal;
  }, [overviewScope, accountSummary]);

  const hasAnyRecords =
    transactions.length > 0 || activities.length > 0 || reminders.length > 0;

  const financeHealthScore = useMemo(() => {
    if (!hasAnyRecords) return 0;

    const savingsRatio =
      allTimeSummary.totalIncome > 0
        ? Math.max(
            0,
            (allTimeSummary.totalIncome - allTimeSummary.totalExpense) /
              allTimeSummary.totalIncome
          )
        : allTimeSummary.totalExpense > 0
          ? 0
          : 0.5;
    const savingsPoints = Math.min(60, Math.round(savingsRatio * 75));

    const completedActs = activities.filter(
      (a) => a.status === 'completed'
    ).length;
    const actRatio =
      activities.length > 0 ? completedActs / activities.length : 1;
    const actPoints = Math.round(actRatio * 20);

    const overdueRems = reminders.filter(
      (r) => !r.isCompleted && r.dateISO < initialNpt.isoDate
    ).length;
    const remPoints = Math.max(0, 20 - overdueRems * 7);

    return Math.min(100, Math.max(10, savingsPoints + actPoints + remPoints));
  }, [hasAnyRecords, allTimeSummary, activities, reminders, initialNpt.isoDate]);

  const healthMeta = useMemo(() => {
    if (!hasAnyRecords) {
      return {
        color: palette.accent,
        label: 'NEW VAULT',
      };
    }
    return getFinanceHealthMeta(financeHealthScore);
  }, [hasAnyRecords, financeHealthScore, palette.accent]);

  const [recentSort, setRecentSort] = useState<'date_desc' | 'amount_desc'>(
    'date_desc'
  );

  const recentTransactions = useMemo(() => {
    const list = transactions.filter((t) => {
      if (
        overviewScope !== 'All' &&
        (t.accountScope || 'Personal') !== overviewScope
      ) {
        return false;
      }
      return true;
    });

    return [...list]
      .sort((a, b) => {
        if (recentSort === 'amount_desc') return b.amount - a.amount;
        return b.dateISO.localeCompare(a.dateISO);
      })
      .slice(0, 5);
  }, [transactions, overviewScope, recentSort]);

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

  const itemSummary = useMemo(() => {
    const totalCount = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
    const totalValue = items.reduce(
      (acc, i) => acc + (i.purchasePrice || 0) * (i.quantity || 1),
      0
    );
    const lentOrBorrowed = items.filter(
      (i) => i.status === 'Lent' || i.status === 'Borrowed'
    ).length;
    return { totalCount, totalValue, lentOrBorrowed };
  }, [items]);

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
        {/* 1. EXECUTIVE HEADER */}
        <View style={styles.headerRow}>
          <View style={styles.welcomeLeft}>
            <View
              style={[
                styles.userAvatar,
                { backgroundColor: palette.accent },
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
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
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
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Settings size={18} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. COMPACT NEPALI BIKRAM SAMBAT & LIVE NPT CLOCK BANNER */}
        <NepaliDateClockBanner
          timeFormat={settings.timeFormat}
          isDark={isDark}
          onPressCalendar={handleOpenCalendar}
        />

        {/* 3. UNIFIED FLAGSHIP FINANCIAL HERO CARD */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.heroHeaderRow}>
            <Text style={[styles.evolutionLabel, { color: theme.textMuted }]}>
              {overviewScope === 'Personal'
                ? 'PERSONAL BALANCE (आफ्नो)'
                : overviewScope === 'Family'
                  ? 'FAMILY BALANCE (परिवार)'
                  : 'TOTAL NET WORTH (कुल मौज्दात)'}
            </Text>

            <View
              style={[
                styles.scopeMiniTabs,
                {
                  backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                  borderColor: theme.border,
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
                    accessibilityLabel={`Show ${sc} accounts`}
                    style={[
                      styles.scopeMiniTab,
                      isSel && {
                        backgroundColor:
                          sc === 'Personal'
                            ? '#2563EB'
                            : sc === 'Family'
                              ? '#7C3AED'
                              : palette.accent,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scopeMiniTabText,
                        {
                          color: isSel ? '#FFFFFF' : theme.textMuted,
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

          <View style={styles.evolutionValueRow}>
            <CurrencyDisplayer
              amount={displayedHeroBalance}
              currency={settings.currency}
              isDark={isDark}
              privateMode={privateMode}
              size="xl"
            />
            <TrendingValueChip
              percentage={balanceTrendPct}
              deltaText={formatCurrency(
                Math.abs(balanceDelta),
                settings.currency,
                true,
                privateMode
              )}
              isDark={isDark}
            />
          </View>

          <View style={styles.chartWrapper}>
            <BalanceEvolutionChart
              dataPoints={evolutionPoints}
              lineColor={palette.accent}
              height={92}
            />
          </View>

          <DateRangeChips
            selected={selectedPeriod}
            onSelect={setSelectedPeriod}
            accentColor={palette.accent}
            isDark={isDark}
          />

          {/* Integrated Period Income & Expense Flow Tiles */}
          <View
            style={[
              styles.heroFlowsRow,
              { borderTopColor: theme.divider },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openQuickTxn('income')}
              style={[
                styles.heroFlowTile,
                {
                  backgroundColor: isDark
                    ? 'rgba(55, 161, 59, 0.12)'
                    : '#F0FDF4',
                },
              ]}
            >
              <View style={styles.flowCardTop}>
                <View
                  style={[
                    styles.flowIconBadge,
                    { backgroundColor: theme.incomeBg },
                  ]}
                >
                  <ArrowDownLeft size={14} color={theme.income} />
                </View>
                <Text
                  style={[styles.flowLabelText, { color: theme.income }]}
                  numberOfLines={1}
                >
                  INCOME ({selectedPeriod})
                </Text>
              </View>
              <CurrencyDisplayer
                amount={periodSummary.totalIncome}
                currency={settings.currency}
                isDark={isDark}
                privateMode={privateMode}
                size="md"
                compact={periodSummary.totalIncome >= 1000000}
              />
              <TrendingValueChip
                percentage={incomeTrendPct}
                afterText={`vs prev ${selectedPeriod}`}
                isDark={isDark}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openQuickTxn('expense')}
              style={[
                styles.heroFlowTile,
                {
                  backgroundColor: isDark
                    ? 'rgba(239, 68, 68, 0.12)'
                    : '#FEF2F2',
                },
              ]}
            >
              <View style={styles.flowCardTop}>
                <View
                  style={[
                    styles.flowIconBadge,
                    { backgroundColor: theme.expenseBg },
                  ]}
                >
                  <ArrowUpRight size={14} color={theme.expense} />
                </View>
                <Text
                  style={[styles.flowLabelText, { color: theme.expense }]}
                  numberOfLines={1}
                >
                  EXPENSES ({selectedPeriod})
                </Text>
              </View>
              <CurrencyDisplayer
                amount={periodSummary.totalExpense}
                currency={settings.currency}
                isDark={isDark}
                privateMode={privateMode}
                size="md"
                compact={periodSummary.totalExpense >= 1000000}
              />
              <TrendingValueChip
                percentage={expenseTrendPct}
                afterText={`vs prev ${selectedPeriod}`}
                inverse
                isDark={isDark}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. 5-ICON QUICK LAUNCH DOCK (Icons only, no text labels) */}
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
                  ? 'rgba(55, 161, 59, 0.16)'
                  : '#E8F5E9',
                borderColor: isDark
                  ? 'rgba(55, 161, 59, 0.35)'
                  : '#BBF7D0',
              },
            ]}
          >
            <ArrowDownLeft
              size={20}
              color={isDark ? '#4ADE80' : '#16A34A'}
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
                  ? 'rgba(239, 68, 68, 0.16)'
                  : '#FEE2E2',
                borderColor: isDark
                  ? 'rgba(239, 68, 68, 0.35)'
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
                  ? 'rgba(37, 99, 235, 0.16)'
                  : '#E8F1FC',
                borderColor: isDark
                  ? 'rgba(37, 99, 235, 0.35)'
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
                  ? 'rgba(109, 40, 217, 0.16)'
                  : '#F0EBFA',
                borderColor: isDark
                  ? 'rgba(109, 40, 217, 0.35)'
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
                  ? 'rgba(234, 88, 12, 0.16)'
                  : '#FFF0E6',
                borderColor: isDark
                  ? 'rgba(234, 88, 12, 0.35)'
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

        {/* 5. SMART NLP QUICK COMMAND BAR */}
        <QuickActionMessageBox isDark={isDark} />

        {/* 6. 2x2 INTERACTIVE VAULT PULSE BENTO GRID */}
        <View style={styles.bentoGrid}>
          <View style={styles.bentoRow}>
            {/* Tile 1: Vault Health Score */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push('/(tabs)/money')}
              style={[
                styles.bentoCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.bentoTopRow}>
                <View
                  style={[
                    styles.bentoIconWrap,
                    { backgroundColor: `${healthMeta.color}1F` },
                  ]}
                >
                  <ShieldCheck size={16} color={healthMeta.color} />
                </View>
                <View
                  style={[
                    styles.bentoTagPill,
                    { backgroundColor: `${healthMeta.color}1F` },
                  ]}
                >
                  <Text
                    style={[styles.bentoTagText, { color: healthMeta.color }]}
                  >
                    {healthMeta.label}
                  </Text>
                </View>
              </View>
              <Text style={[styles.bentoValue, { color: theme.textPrimary }]}>
                {financeHealthScore}
                <Text style={[styles.bentoValueSub, { color: theme.textMuted }]}>
                  /100
                </Text>
              </Text>
              <Text style={[styles.bentoLabel, { color: theme.textMuted }]}>
                Financial & Life Health
              </Text>
            </TouchableOpacity>

            {/* Tile 2: Asset Portfolio */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push('/(tabs)/items')}
              style={[
                styles.bentoCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.bentoTopRow}>
                <View
                  style={[
                    styles.bentoIconWrap,
                    {
                      backgroundColor: isDark
                        ? 'rgba(37, 99, 235, 0.2)'
                        : '#DBEAFE',
                    },
                  ]}
                >
                  <Package
                    size={16}
                    color={isDark ? '#60A5FA' : '#2563EB'}
                  />
                </View>
                <ChevronRight size={15} color={theme.textMuted} />
              </View>
              <Text
                style={[styles.bentoValue, { color: theme.textPrimary }]}
                numberOfLines={1}
              >
                {formatCurrency(
                  itemSummary.totalValue,
                  settings.currency,
                  true,
                  privateMode
                )}
              </Text>
              <Text
                style={[styles.bentoLabel, { color: theme.textMuted }]}
                numberOfLines={1}
              >
                {itemSummary.totalCount} items
                {itemSummary.lentOrBorrowed > 0
                  ? ` • ${itemSummary.lentOrBorrowed} lent`
                  : ' tracked'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bentoRow}>
            {/* Tile 3: Habits & Activities */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push('/(tabs)/tracker')}
              style={[
                styles.bentoCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.bentoTopRow}>
                <View
                  style={[
                    styles.bentoIconWrap,
                    {
                      backgroundColor: isDark
                        ? 'rgba(109, 40, 217, 0.2)'
                        : '#EDE9FE',
                    },
                  ]}
                >
                  <Activity
                    size={16}
                    color={isDark ? '#A78BFA' : '#7C3AED'}
                  />
                </View>
                <ChevronRight size={15} color={theme.textMuted} />
              </View>
              <Text style={[styles.bentoValue, { color: theme.textPrimary }]}>
                {completedActivitiesCount}
                <Text style={[styles.bentoValueSub, { color: theme.textMuted }]}>
                  /{activities.length}
                </Text>
              </Text>
              <Text style={[styles.bentoLabel, { color: theme.textMuted }]}>
                Habits Completed
              </Text>
            </TouchableOpacity>

            {/* Tile 4: Active Reminders */}
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => router.push('/(tabs)/reminders')}
              style={[
                styles.bentoCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View style={styles.bentoTopRow}>
                <View
                  style={[
                    styles.bentoIconWrap,
                    {
                      backgroundColor: isDark
                        ? 'rgba(234, 88, 12, 0.2)'
                        : '#FFEDD5',
                    },
                  ]}
                >
                  <Bell size={16} color={isDark ? '#FB923C' : '#EA580C'} />
                </View>
                <ChevronRight size={15} color={theme.textMuted} />
              </View>
              <Text style={[styles.bentoValue, { color: theme.textPrimary }]}>
                {pendingReminders.length}
              </Text>
              <Text style={[styles.bentoLabel, { color: theme.textMuted }]}>
                Active Reminders
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 7. RECENT MOVEMENTS CARD */}
        <CardWithHeader
          title="Recent Movements"
          subtitle={
            overviewScope === 'All'
              ? 'Latest income & expenses'
              : `${overviewScope} portfolio`
          }
          isDark={isDark}
          headerActionText="Ledger"
          onHeaderActionPress={() => router.push('/(tabs)/money')}
          accentColor="#37A13B"
        >
          {recentTransactions.length > 1 && (
            <View style={styles.recentControlsRow}>
              <Text style={[styles.recentSubtitle, { color: theme.textMuted }]}>
                Latest {recentTransactions.length} entries
              </Text>
              <View style={styles.recentSortPills}>
                {(
                  [
                    { key: 'date_desc', label: 'Newest' },
                    { key: 'amount_desc', label: 'Highest' },
                  ] as const
                ).map((s) => {
                  const isSel = recentSort === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      onPress={() => setRecentSort(s.key)}
                      style={[
                        styles.sortMiniPill,
                        isSel && {
                          backgroundColor: isDark ? '#1F2937' : '#F1F5F9',
                          borderColor: palette.accent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sortMiniPillText,
                          {
                            color: isSel ? palette.accent : theme.textMuted,
                            fontWeight: isSel ? '800' : '600',
                          },
                        ]}
                      >
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {recentTransactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No transactions yet. Tap Income or Expense above to record your
              first movement.
            </Text>
          ) : (
            recentTransactions.map((t, idx) => {
              const isIncome = t.type === 'income';
              const scope = t.accountScope || 'Personal';
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
                    <View style={styles.titleScopeRow}>
                      <Text
                        style={[
                          styles.itemTitle,
                          { color: theme.textPrimary, flexShrink: 1 },
                        ]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
                      <View
                        style={[
                          styles.scopeBadge,
                          {
                            backgroundColor:
                              scope === 'Personal'
                                ? isDark
                                  ? '#1E3A8A'
                                  : '#DBEAFE'
                                : isDark
                                  ? '#4C1D95'
                                  : '#EDE9FE',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.scopeBadgeText,
                            {
                              color:
                                scope === 'Personal'
                                  ? isDark
                                    ? '#60A5FA'
                                    : '#2563EB'
                                  : isDark
                                    ? '#A78BFA'
                                    : '#7C3AED',
                            },
                          ]}
                        >
                          {scope}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.itemSubtitle,
                        { color: theme.textMuted },
                      ]}
                    >
                      {t.category} • {t.paymentMethod} •{' '}
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

        {/* 8. UNIFIED UPCOMING REMINDERS & DAILY HABITS AGENDA CARD */}
        <CardWithHeader
          title="Schedule & Daily Habits"
          subtitle="Upcoming alerts and tracked routines"
          isDark={isDark}
          headerActionIcon={<Plus size={13} color={palette.accent} />}
          headerActionText="Reminder"
          onHeaderActionPress={() => setReminderModalVisible(true)}
          accentColor={palette.accent}
        >
          {upcomingReminders.length === 0 && recentActivities.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No active reminders or habits scheduled yet.
            </Text>
          ) : (
            <>
              {upcomingReminders.map((rem, idx) => {
                const priorityColor =
                  rem.priority === 'High'
                    ? '#EF4444'
                    : rem.priority === 'Medium'
                      ? '#D97706'
                      : '#2563EB';
                return (
                  <TouchableOpacity
                    key={rem.id}
                    onPress={() => toggleReminderCompleted(rem.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: rem.isCompleted }}
                    accessibilityLabel={`Mark ${rem.title} as completed`}
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
                        style={[
                          styles.itemSubtitle,
                          { color: theme.textMuted },
                        ]}
                      >
                        Alert •{' '}
                        {formatDisplayDate(
                          rem.dateISO,
                          settings.preferredCalendar,
                          settings.language
                        )}{' '}
                        •{' '}
                        {formatTimeString(rem.timeString, settings.timeFormat)}{' '}
                        NPT
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.priorityTag,
                        { backgroundColor: `${priorityColor}1F` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityTagText,
                          { color: priorityColor },
                        ]}
                      >
                        {rem.priority}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {recentActivities.map((act, idx) => {
                const isDone = act.status === 'completed';
                return (
                  <TouchableOpacity
                    key={act.id}
                    onPress={() => toggleActivityStatus(act.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isDone }}
                    accessibilityLabel={`Mark ${act.title} as ${
                      isDone ? 'pending' : 'completed'
                    }`}
                    style={[
                      styles.listItemRow,
                      idx < recentActivities.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.divider,
                      },
                    ]}
                  >
                    {isDone ? (
                      <CheckCircle2 size={20} color="#6D28D9" />
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
                        style={[
                          styles.itemSubtitle,
                          { color: theme.textMuted },
                        ]}
                      >
                        Habit • {act.category} •{' '}
                        {formatDisplayDate(
                          act.dateISO,
                          settings.preferredCalendar,
                          settings.language
                        )}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.metricPill,
                        {
                          backgroundColor: isDark
                            ? 'rgba(167, 139, 250, 0.18)'
                            : '#EDE9FE',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.metricPillText,
                          { color: isDark ? '#A78BFA' : '#6D28D9' },
                        ]}
                      >
                        {act.numericValue} {act.unit}
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
        title="Nepali Bikram Sambat Calendar (पात्रो)"
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
    paddingBottom: 40,
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
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  welcomeHint: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  userNameText: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 1,
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
    borderRadius: 22,
    borderWidth: 1,
    paddingTop: 16,
    paddingBottom: 14,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 6,
    gap: 8,
  },
  evolutionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    flexShrink: 1,
  },
  evolutionValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  chartWrapper: {
    marginTop: 6,
    marginBottom: 6,
  },
  heroFlowsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    marginTop: 10,
    borderTopWidth: 1,
  },
  heroFlowTile: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  flowCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  flowIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowLabelText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  bentoGrid: {
    gap: 10,
    marginBottom: 16,
  },
  bentoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bentoCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  bentoTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  bentoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  bentoTagText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  bentoValue: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  bentoValueSub: {
    fontSize: 13,
    fontWeight: '700',
  },
  bentoLabel: {
    fontSize: 11.5,
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
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleScopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  amountBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  priorityTag: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  priorityTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metricPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  metricPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scopeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scopeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scopeMiniTabs: {
    flexDirection: 'row',
    borderRadius: 9,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  scopeMiniTab: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 7,
  },
  scopeMiniTabText: {
    fontSize: 10,
  },
  recentControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 6,
  },
  recentSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  recentSortPills: {
    flexDirection: 'row',
    gap: 6,
  },
  sortMiniPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortMiniPillText: {
    fontSize: 10.5,
  },
});
