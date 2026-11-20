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
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  Package,
  Plus,
  Settings,
  Smartphone,
  Wallet,
} from 'lucide-react-native';
import {
  calculateAccountBalances,
  calculateFinancialSummary,
  useVaultStore,
} from '../../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../theme/colors';
import {
  formatDisplayDate,
  formatTimeString,
  getNowInNPT,
} from '../../utils/nepaliDate';
import { formatCurrency } from '../../utils/currency';
import { NepaliDateClockBanner } from '../../components/NepaliDateClockBanner';
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
  CategoryDonutChart,
  FinanceHealthGauge,
  ScopeDistributionChart,
  getFinanceHealthMeta,
} from '../../components/monekin/MonekinCharts';
import { AccountScope, PaymentMethod, TransactionType } from '../../types';

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

  const initialNpt = useMemo(() => getNowInNPT(), []);

  // Monekin time-of-day welcome greeting (`_pickWelcomeGreeting`)
  const welcomeGreeting = useMemo(() => {
    const h = initialNpt.hours;
    if (settings.language === 'ne') {
      if (h >= 6 && h < 12) return 'शुभ प्रभात • Good morning';
      if (h >= 12 && h < 18) return 'शुभ दिन • Good afternoon';
      return 'शुभ सन्ध्या • Good evening';
    }
    if (h >= 6 && h < 12) return 'Good morning, welcome back';
    if (h >= 12 && h < 18) return 'Good afternoon, welcome back';
    return 'Good evening, welcome back';
  }, [initialNpt.hours, settings.language]);

  const [overviewScope, setOverviewScope] =
    useState<'All' | 'Personal' | 'Family'>('All');

  // Transactions filtered by selected top overview scope (All vs Personal vs Family)
  const scopedTransactions = useMemo(() => {
    if (overviewScope === 'All') return transactions;
    return transactions.filter(
      (t) => (t.accountScope || 'Personal') === overviewScope
    );
  }, [transactions, overviewScope]);

  // All-time total balance: Total Balance = Total Income - Total Expenses
  const allTimeSummary = useMemo(
    () => calculateFinancialSummary(scopedTransactions),
    [scopedTransactions]
  );

  // Period-filtered transactions & previous-period comparison (Monekin `DatePeriodState`)
  const {
    periodTransactions,
    periodSummary,
    prevPeriodSummary,
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

    // Build chronological running balance points for the SVG Area Chart
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
      periodTransactions: currentList,
      periodSummary: currSum,
      prevPeriodSummary: prevSum,
      incomeTrendPct: calcPct(currSum.totalIncome, prevSum.totalIncome),
      expenseTrendPct: calcPct(currSum.totalExpense, prevSum.totalExpense),
      balanceDelta: currSum.totalBalance,
      balanceTrendPct:
        allTimeSummary.totalIncome > 0
          ? (currSum.totalBalance / allTimeSummary.totalIncome) * 100
          : 0,
      evolutionPoints: pts,
    };
  }, [scopedTransactions, selectedPeriod, initialNpt.isoDate, allTimeSummary.totalIncome]);

  const [accountScopeFilter, setAccountScopeFilter] =
    useState<'All' | 'Personal' | 'Family'>('All');

  // Multi-wallet & Scope Balances (Personal: Bank 5000, Cash 50; Family: Bank 500, Cash 100)
  const accountSummary = useMemo(
    () => calculateAccountBalances(accounts, transactions),
    [accounts, transactions]
  );

  const displayedHeroBalance = useMemo(() => {
    if (overviewScope === 'Personal') return accountSummary.personalTotal;
    if (overviewScope === 'Family') return accountSummary.familyTotal;
    return accountSummary.grandTotal;
  }, [overviewScope, accountSummary]);

  const displayedAccounts = useMemo(() => {
    if (accountScopeFilter === 'Personal') {
      return accountSummary.personalAccounts;
    }
    if (accountScopeFilter === 'Family') {
      return accountSummary.familyAccounts;
    }
    return [...accountSummary.personalAccounts, ...accountSummary.familyAccounts];
  }, [accountScopeFilter, accountSummary]);

  // Monekin `FinanceHealthCard` score (0-100) from savings rate, cash flow, and task completion
  const financeHealthScore = useMemo(() => {
    const savingsRatio =
      allTimeSummary.totalIncome > 0
        ? Math.max(
          0,
          (allTimeSummary.totalIncome - allTimeSummary.totalExpense) /
          allTimeSummary.totalIncome
        )
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
  }, [allTimeSummary, activities, reminders, initialNpt.isoDate]);

  const healthMeta = useMemo(
    () => getFinanceHealthMeta(financeHealthScore),
    [financeHealthScore]
  );

  // Monekin `PieChartByCategories` data
  const expenseCategories = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of periodTransactions) {
      if (t.type === 'expense') {
        map[t.category] = (map[t.category] || 0) + t.amount;
      }
    }
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodTransactions]);

  const [recentScope, setRecentScope] =
    useState<'All' | 'Personal' | 'Family'>('All');
  const [recentSort, setRecentSort] = useState<
    'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'
  >('date_desc');

  // Slices for life tracker cards (with Scope Filter & Sorting)
  const recentTransactions = useMemo(() => {
    let list = transactions.filter((t) => {
      if (recentScope !== 'All' && (t.accountScope || 'Personal') !== recentScope) {
        return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (recentSort === 'date_desc') return b.dateISO.localeCompare(a.dateISO);
      if (recentSort === 'date_asc') return a.dateISO.localeCompare(b.dateISO);
      if (recentSort === 'amount_desc') return b.amount - a.amount;
      if (recentSort === 'amount_asc') return a.amount - b.amount;
      return 0;
    });

    return list.slice(0, 5);
  }, [transactions, recentScope, recentSort]);

  const upcomingReminders = useMemo(
    () =>
      reminders
        .filter((r) => !r.isCompleted)
        .sort((a, b) =>
          `${a.dateISO}T${a.timeString}`.localeCompare(
            `${b.dateISO}T${b.timeString}`
          )
        )
        .slice(0, 3),
    [reminders]
  );

  const recentActivities = useMemo(
    () => activities.slice(0, 3),
    [activities]
  );

  const itemSummary = useMemo(() => {
    const totalCount = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
    const totalValue = items.reduce(
      (acc, i) => acc + (i.purchasePrice || 0) * (i.quantity || 1),
      0
    );
    const owned = items.filter((i) => i.status === 'Owned').length;
    const lent = items.filter((i) => i.status === 'Lent').length;
    const borrowed = items.filter((i) => i.status === 'Borrowed').length;
    return { totalCount, totalValue, owned, lent, borrowed };
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

  const getAccountIcon = (method: PaymentMethod, color: string) => {
    if (method === 'Bank Transfer' || method === 'ConnectIPS') {
      return <Landmark size={18} color={color} />;
    }
    if (method === 'eSewa' || method === 'Khalti') {
      return <Smartphone size={18} color={color} />;
    }
    if (method === 'Card') {
      return <CreditCard size={18} color={color} />;
    }
    return <Wallet size={18} color={color} />;
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 1. MONEKIN HEADER: UserAvatar + Welcome Greeting + Private Mode Eye Button + Settings */}
        <View style={styles.headerGutter}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push('/settings')}
              style={styles.welcomeTouch}
            >
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
                <View style={styles.userNameRow}>
                  <Text
                    style={[styles.userNameText, { color: theme.textPrimary }]}
                    numberOfLines={1}
                  >
                    {settings.userName || 'Tap to set name'}
                  </Text>
                  <View
                    style={[
                      styles.vaultTagPill,
                      { backgroundColor: palette.accentSoft },
                    ]}
                  >
                    <Text
                      style={[styles.vaultTagText, { color: palette.accent }]}
                    >
                      VAULT
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>

            <View style={styles.headerBtnsGroup}>
              {/* Monekin Private Mode Button (`_buildPrivateModeButton`) */}
              <TouchableOpacity
                onPress={togglePrivateMode}
                style={[
                  styles.circleIconBtn,
                  { backgroundColor: theme.surfaceContainerHigh },
                ]}
              >
                {privateMode ? (
                  <EyeOff size={19} color={theme.textPrimary} />
                ) : (
                  <Eye size={19} color={theme.textPrimary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push('/settings')}
                style={[
                  styles.circleIconBtn,
                  { backgroundColor: theme.surfaceContainerHigh },
                ]}
              >
                <Settings size={19} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. NEPALI BIKRAM SAMBAT & LIVE NPT CLOCK BANNER */}
          <NepaliDateClockBanner
            timeFormat={settings.timeFormat}
            isDark={isDark}
            onPressCalendar={handleOpenCalendar}
          />
        </View>

        {/* 3. MONEKIN `EvolutionCard` BALANCE HERO (Full-Bleed SVG Area Chart + DateRangeChips) */}
        <View style={styles.evolutionBlock}>
          <View style={styles.evolutionHeaderInset}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Text style={[styles.evolutionLabel, { color: theme.textMuted }]}>
                {overviewScope === 'Personal'
                  ? 'PERSONAL BALANCE (आफ्नो)'
                  : overviewScope === 'Family'
                    ? 'FAMILY BALANCE (परिवार)'
                    : 'TOTAL NET WORTH (कुल मौज्दात)'}
              </Text>

              {/* Scope Switcher */}
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
          </View>

          {/* Full-bleed Smooth Area Chart (`DashboardBalanceChart`) */}
          <View style={styles.chartWrapper}>
            <BalanceEvolutionChart
              dataPoints={evolutionPoints}
              lineColor={palette.accent}
              height={118}
            />
          </View>

          {/* Monekin DateRangeChips (`7D`, `1M`, `3M`, `1Y`, `ALL`) */}
          <DateRangeChips
            selected={selectedPeriod}
            onSelect={setSelectedPeriod}
            accentColor={palette.accent}
            isDark={isDark}
          />
        </View>

        {/* Main Content Gutter (16px horizontal padding as in Monekin `dashboard.page.dart`) */}
        <View style={styles.contentGutter}>
          {/* 4. MONEKIN `IncomeExpenseFlowCard` PAIR (Expenses Left, Income Right) */}
          <View style={styles.flowCardsRow}>
            {/* Expenses Flow Card (inverse: true — drop in expenses is green!) */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => openQuickTxn('expense')}
              style={[
                styles.flowCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
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
                  <ArrowUpRight size={16} color={theme.expense} />
                </View>
                <Text
                  style={[styles.flowLabelText, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  EXPENSES
                </Text>
              </View>

              <View style={styles.flowAmountWrap}>
                <CurrencyDisplayer
                  amount={periodSummary.totalExpense}
                  currency={settings.currency}
                  isDark={isDark}
                  privateMode={privateMode}
                  size="lg"
                  compact={periodSummary.totalExpense >= 1000000}
                />
              </View>

              <TrendingValueChip
                percentage={expenseTrendPct}
                afterText={`vs prev ${selectedPeriod}`}
                inverse
                isDark={isDark}
              />
            </TouchableOpacity>

            {/* Income Flow Card */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => openQuickTxn('income')}
              style={[
                styles.flowCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
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
                  <ArrowDownLeft size={16} color={theme.income} />
                </View>
                <Text
                  style={[styles.flowLabelText, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  INCOME
                </Text>
              </View>

              <View style={styles.flowAmountWrap}>
                <CurrencyDisplayer
                  amount={periodSummary.totalIncome}
                  currency={settings.currency}
                  isDark={isDark}
                  privateMode={privateMode}
                  size="lg"
                  compact={periodSummary.totalIncome >= 1000000}
                />
              </View>

              <TrendingValueChip
                percentage={incomeTrendPct}
                afterText={`vs prev ${selectedPeriod}`}
                isDark={isDark}
              />
            </TouchableOpacity>
          </View>

          {/* 5. QUICK ACTIONS PILL BAR (5 VAULT Actions) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickPillsScroll}
          >
            <TouchableOpacity
              onPress={() => openQuickTxn('income')}
              style={[
                styles.quickPill,
                { backgroundColor: '#E8F5E9', borderColor: '#BBF7D0' },
              ]}
            >
              <Plus size={14} color="#37A13B" strokeWidth={2.6} />
              <Text style={[styles.quickPillText, { color: '#14532D' }]}>
                Add Money
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openQuickTxn('expense')}
              style={[
                styles.quickPill,
                { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
              ]}
            >
              <Plus size={14} color="#EF4444" strokeWidth={2.6} />
              <Text style={[styles.quickPillText, { color: '#7F1D1D' }]}>
                Add Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setItemModalVisible(true)}
              style={[
                styles.quickPill,
                { backgroundColor: '#E8F1FC', borderColor: '#BFDBFE' },
              ]}
            >
              <Package size={14} color="#1D4ED8" strokeWidth={2.3} />
              <Text style={[styles.quickPillText, { color: '#1E3A8A' }]}>
                Add Item
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActivityModalVisible(true)}
              style={[
                styles.quickPill,
                { backgroundColor: '#F0EBFA', borderColor: '#DDD6FE' },
              ]}
            >
              <Activity size={14} color="#6D28D9" strokeWidth={2.3} />
              <Text style={[styles.quickPillText, { color: '#4C1D95' }]}>
                Add Activity
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setReminderModalVisible(true)}
              style={[
                styles.quickPill,
                { backgroundColor: '#FFF0E6', borderColor: '#FED7AA' },
              ]}
            >
              <Bell size={14} color="#EA580C" strokeWidth={2.3} />
              <Text style={[styles.quickPillText, { color: '#7C2D12' }]}>
                Create Reminder
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Quick Action NLP Message Box (Replacing simple New button) */}
          <QuickActionMessageBox
            isDark={isDark}
            onOpenManualForm={() => openQuickTxn('income')}
          />

          {/* 6. MONEKIN `DashboardAccountList` ("My Accounts & Wallets" - Personal & Family) */}
          <CardWithHeader
            title="My Accounts & Wallets"
            subtitle="Personal & Family balances"
            isDark={isDark}
            headerActionIcon={<Plus size={14} color={palette.accent} />}
            headerActionText="New Txn"
            onHeaderActionPress={() => openQuickTxn('income')}
            footerText={`See all transactions (${transactions.length})`}
            onFooterPress={() => router.push('/(tabs)/money')}
            accentColor={palette.accent}
          >
            {/* Net Worth Summary Strip */}
            <View
              style={[
                styles.accountSummaryStrip,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.summaryScopeBox}>
                <Text
                  style={[styles.summaryScopeLabel, { color: theme.textMuted }]}
                >
                  Personal (Own)
                </Text>
                <CurrencyDisplayer
                  amount={accountSummary.personalTotal}
                  currency={settings.currency}
                  isDark={isDark}
                  privateMode={privateMode}
                  size="sm"
                  color="#2563EB"
                />
              </View>

              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: theme.divider },
                ]}
              />

              <View style={styles.summaryScopeBox}>
                <Text
                  style={[styles.summaryScopeLabel, { color: theme.textMuted }]}
                >
                  Family
                </Text>
                <CurrencyDisplayer
                  amount={accountSummary.familyTotal}
                  currency={settings.currency}
                  isDark={isDark}
                  privateMode={privateMode}
                  size="sm"
                  color="#7C3AED"
                />
              </View>

              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: theme.divider },
                ]}
              />

              <View style={styles.summaryScopeBox}>
                <Text
                  style={[styles.summaryScopeLabel, { color: theme.textMuted }]}
                >
                  Combined
                </Text>
                <CurrencyDisplayer
                  amount={accountSummary.grandTotal}
                  currency={settings.currency}
                  isDark={isDark}
                  privateMode={privateMode}
                  size="sm"
                  color={
                    accountSummary.grandTotal >= 0
                      ? theme.textPrimary
                      : theme.expense
                  }
                />
              </View>
            </View>

            {/* Scope Filter Tabs */}
            <View style={styles.scopeTabsRow}>
              {(['All', 'Personal', 'Family'] as const).map((scopeKey) => {
                const isSelected = accountScopeFilter === scopeKey;
                return (
                  <TouchableOpacity
                    key={scopeKey}
                    onPress={() => setAccountScopeFilter(scopeKey)}
                    style={[
                      styles.scopeTabBtn,
                      isSelected && {
                        backgroundColor:
                          scopeKey === 'Personal'
                            ? '#2563EB'
                            : scopeKey === 'Family'
                              ? '#7C3AED'
                              : palette.accent,
                      },
                      !isSelected && {
                        backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.scopeTabText,
                        {
                          color: isSelected ? '#FFFFFF' : theme.textMuted,
                          fontWeight: isSelected ? '800' : '600',
                        },
                      ]}
                    >
                      {scopeKey === 'Personal' ? 'Personal (Own)' : scopeKey}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {displayedAccounts.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No accounts found in this view.
              </Text>
            ) : (
              displayedAccounts.map((acc, idx) => (
                <TouchableOpacity
                  key={acc.id}
                  activeOpacity={0.8}
                  onPress={() => router.push('/(tabs)/money')}
                  style={[
                    styles.accountRow,
                    idx < displayedAccounts.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: theme.divider,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.accountIconCircle,
                      {
                        backgroundColor:
                          acc.scope === 'Personal' ? '#2563EB1C' : '#7C3AED1C',
                      },
                    ]}
                  >
                    {getAccountIcon(
                      acc.paymentMethod,
                      acc.scope === 'Personal' ? '#2563EB' : '#7C3AED'
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Text
                        style={[
                          styles.accountNameText,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {acc.name}
                      </Text>
                      <View
                        style={[
                          styles.scopeBadge,
                          {
                            backgroundColor:
                              acc.scope === 'Personal'
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
                                acc.scope === 'Personal' ? '#2563EB' : '#7C3AED',
                            },
                          ]}
                        >
                          {acc.scope === 'Personal' ? 'Personal' : 'Family'}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.accountMetaText,
                        { color: theme.textMuted },
                      ]}
                    >
                      Initial: Rs.{' '}
                      {acc.initialBalance.toLocaleString('en-IN')} •{' '}
                      {acc.movementCount}{' '}
                      {acc.movementCount === 1 ? 'movement' : 'movements'}
                    </Text>
                  </View>
                  <CurrencyDisplayer
                    amount={acc.currentBalance}
                    currency={settings.currency}
                    isDark={isDark}
                    privateMode={privateMode}
                    size="md"
                    color={
                      acc.currentBalance >= 0
                        ? theme.textPrimary
                        : theme.expense
                    }
                  />
                </TouchableOpacity>
              ))
            )}
          </CardWithHeader>

          {/* 7. MONEKIN `FinanceHealthCard` (270° Circular SVG Gauge + Score Badge) */}
          <CardWithHeader
            title="Financial & Life Health"
            subtitle="Savings ratio, cash flow & habit consistency"
            isDark={isDark}
            onHeaderActionPress={() => router.push('/(tabs)/money')}
            accentColor={palette.accent}
          >
            <View style={styles.healthCardRow}>
              <FinanceHealthGauge
                score={financeHealthScore}
                size={96}
                isDark={isDark}
              />
              <View style={styles.healthTextCol}>
                <View style={styles.healthBadgesWrap}>
                  <View
                    style={[
                      styles.healthBadgePill,
                      { backgroundColor: `${healthMeta.color}26` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.healthBadgeText,
                        { color: healthMeta.color },
                      ]}
                    >
                      {healthMeta.label}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.healthDescrText,
                    { color: theme.textSecondary },
                  ]}
                >
                  {healthMeta.description}
                </Text>
              </View>
            </View>
          </CardWithHeader>

          {/* 8. MONEKIN `PieChartByCategories` ("By Categories" Distribution Card) */}
          <CardWithHeader
            title="By Categories"
            subtitle={`Expense distribution (${selectedPeriod})`}
            isDark={isDark}
            onHeaderActionPress={() => router.push('/(tabs)/money')}
            accentColor={palette.accent}
          >
            <CategoryDonutChart
              items={expenseCategories}
              currency={settings.currency}
              isDark={isDark}
              privateMode={privateMode}
              emptyText="No expenses recorded in this period."
            />
          </CardWithHeader>

          {/* 8b. PERSONAL vs FAMILY PORTFOLIO ALLOCATION CHART */}
          <CardWithHeader
            title="Personal vs Family Portfolio"
            subtitle="Current asset share & net worth comparison"
            isDark={isDark}
            onHeaderActionPress={() => router.push('/(tabs)/money')}
            accentColor="#2563EB"
            footerText="Open detailed financial breakdown"
            onFooterPress={() => router.push('/(tabs)/money')}
          >
            <ScopeDistributionChart
              personalAmount={accountSummary.personalTotal}
              familyAmount={accountSummary.familyTotal}
              currency={settings.currency}
              isDark={isDark}
              privateMode={privateMode}
            />
          </CardWithHeader>

          {/* 9. RECENT TRANSACTIONS CARD (With Scope Filtering & Sorting) */}
          <CardWithHeader
            title="Recent Movements"
            isDark={isDark}
            headerActionText="View All"
            onHeaderActionPress={() => router.push('/(tabs)/money')}
            accentColor="#37A13B"
          >
            {/* Quick Filter & Sorting Controls */}
            <View style={styles.recentControlsRow}>
              {/* Scope filter */}
              <View style={styles.recentScopePills}>
                {(['All', 'Personal', 'Family'] as const).map((sc) => {
                  const isSel = recentScope === sc;
                  return (
                    <TouchableOpacity
                      key={sc}
                      onPress={() => setRecentScope(sc)}
                      style={[
                        styles.filterMiniPill,
                        isSel && {
                          backgroundColor:
                            sc === 'Personal'
                              ? '#2563EB'
                              : sc === 'Family'
                                ? '#7C3AED'
                                : isDark
                                  ? '#374151'
                                  : '#E2E8F0',
                        },
                        !isSel && {
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterMiniPillText,
                          {
                            color: isSel ? '#FFFFFF' : theme.textMuted,
                            fontWeight: isSel ? '800' : '600',
                          },
                        ]}
                      >
                        {sc === 'Personal' ? 'Personal' : sc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sort pills */}
              <View style={styles.recentSortPills}>
                {[
                  { key: 'date_desc', label: 'Newest' },
                  { key: 'amount_desc', label: 'Highest' },
                ].map((s) => {
                  const isSel = recentSort === s.key;
                  return (
                    <TouchableOpacity
                      key={s.key}
                      onPress={() =>
                        setRecentSort(
                          s.key as
                          | 'date_desc'
                          | 'date_asc'
                          | 'amount_desc'
                          | 'amount_asc'
                        )
                      }
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

            {recentTransactions.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No transactions recorded for this filter.
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
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
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
                                  scope === 'Personal' ? '#2563EB' : '#7C3AED',
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

          {/* 10. UPCOMING REMINDERS CARD */}
          <CardWithHeader
            title="Upcoming Reminders"
            subtitle="Scheduled Nepal Standard Time alerts"
            isDark={isDark}
            headerActionIcon={<Plus size={14} color="#EA580C" />}
            headerActionText="Add"
            onHeaderActionPress={() => setReminderModalVisible(true)}
            footerText="Manage all reminders"
            onFooterPress={() => router.push('/(tabs)/reminders')}
            accentColor="#EA580C"
          >
            {upcomingReminders.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                All caught up! No pending reminders.
              </Text>
            ) : (
              upcomingReminders.map((rem, idx) => {
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
                    style={[
                      styles.listItemRow,
                      idx < upcomingReminders.length - 1 && {
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
              })
            )}
          </CardWithHeader>

          {/* 11. RECENT DAILY ACTIVITIES CARD */}
          <CardWithHeader
            title="Daily Activities & Habits"
            isDark={isDark}
            headerActionIcon={<Plus size={14} color="#6D28D9" />}
            headerActionText="Log"
            onHeaderActionPress={() => setActivityModalVisible(true)}
            footerText="Open Activity Tracker"
            onFooterPress={() => router.push('/(tabs)/tracker')}
            accentColor="#6D28D9"
          >
            {recentActivities.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No daily activities logged yet.
              </Text>
            ) : (
              recentActivities.map((act, idx) => {
                const isDone = act.status === 'completed';
                return (
                  <TouchableOpacity
                    key={act.id}
                    onPress={() => toggleActivityStatus(act.id)}
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
                        {act.category} •{' '}
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
                        style={[styles.metricPillText, { color: '#6D28D9' }]}
                      >
                        {act.numericValue} {act.unit}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </CardWithHeader>

          {/* 12. NET WORTH & PERSONAL ITEMS INVENTORY CARD */}
          <CardWithHeader
            title="Assets & Personal Items"
            subtitle="Inventory valuation & lending status"
            isDark={isDark}
            headerActionIcon={<Plus size={14} color="#1D4ED8" />}
            headerActionText="Add Item"
            onHeaderActionPress={() => setItemModalVisible(true)}
            footerText="Open Item Inventory"
            onFooterPress={() => router.push('/(tabs)/items')}
            accentColor="#1D4ED8"
          >
            <View style={styles.itemStatsGrid}>
              <View
                style={[
                  styles.itemStatBox,
                  { backgroundColor: isDark ? '#132034' : '#E8F1FC' },
                ]}
              >
                <Text style={[styles.itemStatVal, { color: '#1D4ED8' }]}>
                  {itemSummary.totalCount}
                </Text>
                <Text
                  style={[styles.itemStatLabel, { color: theme.textMuted }]}
                >
                  Total Units
                </Text>
              </View>

              <View
                style={[
                  styles.itemStatBox,
                  { backgroundColor: isDark ? '#12241A' : '#E8F5E9' },
                ]}
              >
                <Text style={[styles.itemStatVal, { color: '#37A13B' }]}>
                  {itemSummary.owned}
                </Text>
                <Text
                  style={[styles.itemStatLabel, { color: theme.textMuted }]}
                >
                  Owned
                </Text>
              </View>

              <View
                style={[
                  styles.itemStatBox,
                  { backgroundColor: isDark ? '#291910' : '#FFF0E6' },
                ]}
              >
                <Text style={[styles.itemStatVal, { color: '#EA580C' }]}>
                  {itemSummary.lent + itemSummary.borrowed}
                </Text>
                <Text
                  style={[styles.itemStatLabel, { color: theme.textMuted }]}
                >
                  Lent / Borrowed
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.assetValueBanner,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text
                style={[styles.assetValueLabel, { color: theme.textMuted }]}
              >
                Estimated Asset Portfolio
              </Text>
              <CurrencyDisplayer
                amount={itemSummary.totalValue}
                currency={settings.currency}
                isDark={isDark}
                privateMode={privateMode}
                size="md"
              />
            </View>
          </CardWithHeader>
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
    paddingTop: 8,
    paddingBottom: 90,
  },
  headerGutter: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  welcomeTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  welcomeHint: {
    fontSize: 12,
    fontWeight: '600',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 1,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '800',
  },
  vaultTagPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  vaultTagText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  headerBtnsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evolutionBlock: {
    marginBottom: 16,
  },
  evolutionHeaderInset: {
    paddingHorizontal: 16,
  },
  evolutionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  evolutionValueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  chartWrapper: {
    marginTop: 8,
    marginBottom: 10,
  },
  contentGutter: {
    paddingHorizontal: 16,
  },
  flowCardsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  flowCard: {
    flex: 1,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
  },
  flowCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  flowIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowLabelText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  flowAmountWrap: {
    marginBottom: 8,
  },
  quickPillsScroll: {
    gap: 8,
    paddingBottom: 16,
  },
  quickPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  accountIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  accountMetaText: {
    fontSize: 11,
    marginTop: 2,
  },
  healthCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingTop: 4,
  },
  healthTextCol: {
    flex: 1,
  },
  healthBadgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  healthBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  healthDescrText: {
    fontSize: 12,
    lineHeight: 17,
  },
  emptyText: {
    fontSize: 13,
    paddingVertical: 12,
    textAlign: 'center',
  },
  listItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  txnIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
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
  itemStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  itemStatBox: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
  },
  itemStatVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  itemStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  assetValueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  assetValueLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  accountSummaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  summaryScopeBox: {
    flex: 1,
    alignItems: 'center',
  },
  summaryScopeLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },
  scopeTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  scopeTabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeTabText: {
    fontSize: 11,
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
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
    gap: 3,
  },
  scopeMiniTab: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scopeMiniTabText: {
    fontSize: 10,
  },
  recentControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentScopePills: {
    flexDirection: 'row',
    gap: 5,
  },
  filterMiniPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterMiniPillText: {
    fontSize: 10,
  },
  recentSortPills: {
    flexDirection: 'row',
    gap: 5,
  },
  sortMiniPill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  sortMiniPillText: {
    fontSize: 10,
  },
});
