import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowDownLeft,
  ArrowUpDown,
  ArrowUpRight,
  ChevronRight,
  Edit3,
  Eye,
  EyeOff,
  Plus,
  Search,
  Target,
  Trash2,
  X,
} from 'lucide-react-native';
import {
  calculateAccountBalances,
  calculateFinancialSummary,
  useVaultStore,
} from '../../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../theme/colors';
import { LAYOUT } from '../../theme/layout';
import { formatCurrency } from '../../utils/currency';
import { adToBs, formatBSDateNepali } from '../../utils/nepaliDate';
import { useCurrentNPT } from '../../hooks/useCurrentNPT';
import { AccountScope, Transaction, TransactionType } from '../../types';
import { TransactionFormModal } from '../../components/TransactionFormModal';
import {
  CardWithHeader,
  CurrencyDisplayer,
  TrendingValueChip,
} from '../../components/monekin/MonekinComponents';
import {
  CategoryDonutChart,
  ScopeDistributionChart,
} from '../../components/monekin/MonekinCharts';

type TimeRangeKey = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';
type SortOption =
  | 'date_desc'
  | 'date_asc'
  | 'amount_desc'
  | 'amount_asc'
  | 'title_asc';

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'date_desc', label: 'Newest ↓' },
  { key: 'amount_desc', label: 'Highest ↓' },
  { key: 'date_asc', label: 'Oldest ↑' },
  { key: 'amount_asc', label: 'Lowest ↑' },
  { key: 'title_asc', label: 'A–Z' },
];

export default function MoneyManagerScreen() {
  const router = useRouter();
  const {
    settings,
    updateSettings,
    accounts,
    transactions,
    savingsGoals,
    removeTransaction,
  } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const privateMode = Boolean(settings.privateMode);
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('money', isDark);

  const [timeRange, setTimeRange] = useState<TimeRangeKey>('monthly');
  const [scopeFilter, setScopeFilter] = useState<'all' | AccountScope>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialType, setModalInitialType] =
    useState<TransactionType>('expense');
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

  const nptToday = useCurrentNPT();
  const todayBS = useMemo(() => adToBs(nptToday.isoDate), [nptToday.isoDate]);

  const accountSummary = useMemo(
    () => calculateAccountBalances(accounts, transactions),
    [accounts, transactions]
  );

  const allTimeSummary = useMemo(
    () => calculateFinancialSummary(transactions),
    [transactions]
  );

  const periodTransactions = useMemo(() => {
    const todayParts = nptToday.isoDate.split('-').map(Number);
    const todayUTC = Date.UTC(todayParts[0], todayParts[1] - 1, todayParts[2]);

    return transactions.filter((t) => {
      if (timeRange === 'all') return true;
      if (timeRange === 'daily') {
        return t.dateISO === nptToday.isoDate;
      }
      const parts = t.dateISO.split('-').map(Number);
      const tUTC = Date.UTC(parts[0], parts[1] - 1, parts[2]);
      const diffDays = Math.floor((todayUTC - tUTC) / 86400000);

      if (timeRange === 'weekly') {
        return diffDays >= 0 && diffDays <= 7;
      }
      if (timeRange === 'monthly') {
        if (settings.preferredCalendar === 'BS') {
          const bs = adToBs(t.dateISO);
          return bs.year === todayBS.year && bs.month === todayBS.month;
        }
        return parts[0] === nptToday.year && parts[1] === nptToday.month;
      }
      if (timeRange === 'yearly') {
        if (settings.preferredCalendar === 'BS') {
          const bs = adToBs(t.dateISO);
          return bs.year === todayBS.year;
        }
        return parts[0] === nptToday.year;
      }
      return true;
    });
  }, [
    transactions,
    timeRange,
    nptToday.isoDate,
    nptToday.year,
    nptToday.month,
    todayBS,
    settings.preferredCalendar,
  ]);

  const periodSummary = useMemo(
    () => calculateFinancialSummary(periodTransactions),
    [periodTransactions]
  );

  const categoryChartItems = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of periodTransactions) {
      if (typeFilter === 'income' && t.type !== 'income') continue;
      if (typeFilter !== 'income' && t.type !== 'expense') continue;
      map[t.category] = (map[t.category] || 0) + t.amount;
    }
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodTransactions, typeFilter]);

  // Dynamic category list without a duplicate 'All' chip
  const dynamicCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return;
      set.add(t.category);
    });
    return Array.from(set);
  }, [transactions, typeFilter]);

  const filteredTransactions = useMemo(() => {
    let list = periodTransactions.filter((t) => {
      if (
        scopeFilter !== 'all' &&
        (t.accountScope || 'Personal') !== scopeFilter
      ) {
        return false;
      }
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (selectedCategory !== 'All' && t.category !== selectedCategory)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          t.paymentMethod.toLowerCase().includes(q) ||
          (t.accountScope || 'Personal').toLowerCase().includes(q)
        );
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'date_desc') return b.dateISO.localeCompare(a.dateISO);
      if (sortBy === 'date_asc') return a.dateISO.localeCompare(b.dateISO);
      if (sortBy === 'amount_desc') return b.amount - a.amount;
      if (sortBy === 'amount_asc') return a.amount - b.amount;
      if (sortBy === 'title_asc') return a.title.localeCompare(b.title);
      return 0;
    });

    return list;
  }, [
    periodTransactions,
    scopeFilter,
    typeFilter,
    selectedCategory,
    searchQuery,
    sortBy,
  ]);

  const dateGroupedTransactions = useMemo(() => {
    const groups: {
      dateISO: string;
      bsFormatted: string;
      dailyNet: number;
      items: Transaction[];
    }[] = [];
    const map = new Map<string, (typeof groups)[0]>();

    for (const t of filteredTransactions) {
      let grp = map.get(t.dateISO);
      if (!grp) {
        const bs = adToBs(t.dateISO);
        grp = {
          dateISO: t.dateISO,
          bsFormatted: formatBSDateNepali(bs, true),
          dailyNet: 0,
          items: [],
        };
        map.set(t.dateISO, grp);
        groups.push(grp);
      }
      grp.items.push(t);
      grp.dailyNet += t.type === 'income' ? t.amount : -t.amount;
    }
    return groups;
  }, [filteredTransactions]);

  const handleOpenAdd = (type: TransactionType) => {
    setEditingTxn(null);
    setModalInitialType(type);
    setModalVisible(true);
  };

  const handleOpenEdit = (txn: Transaction) => {
    setEditingTxn(txn);
    setModalInitialType(txn.type);
    setModalVisible(true);
  };

  const handleDelete = (txn: Transaction) => {
    Alert.alert(
      'Delete Transaction',
      `Are you sure you want to delete "${txn.title}" (${formatCurrency(
        txn.amount,
        settings.currency
      )})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeTransaction(txn.id),
        },
      ]
    );
  };

  const cycleSort = () => {
    const idx = SORT_OPTIONS.findIndex((s) => s.key === sortBy);
    const next = SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length];
    setSortBy(next.key);
  };

  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.key === sortBy)?.label || 'Newest ↓';

  const savingsPct =
    periodSummary.totalIncome > 0
      ? ((periodSummary.totalIncome - periodSummary.totalExpense) /
          periodSummary.totalIncome) *
        100
      : 0;

  const savingsGoalsSummary = useMemo(() => {
    const saved = savingsGoals.reduce((acc, g) => acc + g.savedAmount, 0);
    const target = savingsGoals.reduce((acc, g) => acc + g.targetAmount, 0);
    const pct =
      target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
    return { count: savingsGoals.length, saved, target, pct };
  }, [savingsGoals]);

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: palette.background }]}
      edges={['top']}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={[styles.screenTitle, { color: theme.textPrimary }]}
              numberOfLines={1}
            >
              Money
            </Text>
            <Text
              style={[styles.screenSubtitle, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              {formatBSDateNepali(todayBS, false)}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => handleOpenAdd('income')}
              style={[styles.addBtn, { backgroundColor: '#10B981' }]}
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addBtnText}>Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleOpenAdd('expense')}
              style={[styles.addBtn, { backgroundColor: '#EF4444' }]}
            >
              <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.addBtnText}>Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Signature Obsidian Balance + Period Summary Card */}
        <View
          style={[
            styles.balanceHeroCard,
            {
              backgroundColor: isDark ? '#151F32' : '#0F172A',
              borderColor: isDark ? '#26344E' : '#1E293B',
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroLabelRow}>
              <Text style={styles.heroLabel}>NET AVAILABLE BALANCE</Text>
              <TouchableOpacity
                onPress={() => updateSettings({ privateMode: !privateMode })}
                activeOpacity={0.78}
                accessibilityRole="switch"
                accessibilityLabel="Hide balances in private mode"
                accessibilityState={{ checked: privateMode }}
                style={styles.heroEyeBtn}
              >
                {privateMode ? (
                  <EyeOff size={15} color="#FFFFFF" />
                ) : (
                  <Eye size={15} color="rgba(248, 250, 252, 0.85)" />
                )}
              </TouchableOpacity>
            </View>
            <View style={styles.heroValueLine}>
              <CurrencyDisplayer
                amount={allTimeSummary.totalBalance}
                currency={settings.currency}
                isDark={true}
                privateMode={privateMode}
                size="xl"
                color={
                  allTimeSummary.totalBalance >= 0 ? '#FFFFFF' : '#FB7185'
                }
              />
              <TrendingValueChip
                percentage={savingsPct}
                afterText="saved"
                isDark={true}
              />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatGlass}>
              <View style={styles.heroStatTagRow}>
                <View style={[styles.heroDot, { backgroundColor: '#34D399' }]} />
                <Text style={styles.heroStatTitle}>
                  INCOME ({timeRange.toUpperCase()})
                </Text>
              </View>
              <CurrencyDisplayer
                amount={periodSummary.totalIncome}
                currency={settings.currency}
                isDark={true}
                privateMode={privateMode}
                size="md"
                color="#34D399"
              />
            </View>

            <View style={styles.heroStatGlass}>
              <View style={styles.heroStatTagRow}>
                <View style={[styles.heroDot, { backgroundColor: '#FB7185' }]} />
                <Text style={styles.heroStatTitle}>
                  EXPENSES ({timeRange.toUpperCase()})
                </Text>
              </View>
              <CurrencyDisplayer
                amount={periodSummary.totalExpense}
                currency={settings.currency}
                isDark={true}
                privateMode={privateMode}
                size="md"
                color="#FB7185"
              />
            </View>
          </View>

          {/* Translucent Period Selector */}
          <View style={styles.periodTabsBar}>
            {(
              [
                { key: 'daily', label: 'Day' },
                { key: 'weekly', label: 'Week' },
                { key: 'monthly', label: 'Month' },
                { key: 'yearly', label: 'Year' },
                { key: 'all', label: 'All' },
              ] as { key: TimeRangeKey; label: string }[]
            ).map((tab) => {
              const active = timeRange === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setTimeRange(tab.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Show ${tab.label} transactions`}
                  style={[
                    styles.periodTabBtn,
                    active && styles.periodTabBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodTabText,
                      {
                        color: active ? '#0F172A' : 'rgba(248,250,252,0.68)',
                        fontWeight: active ? '800' : '600',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Savings Goals Quick Access Card */}
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => router.push('/goals')}
          style={[
            styles.goalsBannerCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.goalsIconWrap,
              {
                backgroundColor: isDark
                  ? 'rgba(16, 185, 129, 0.16)'
                  : '#ECFDF5',
              },
            ]}
          >
            <Target size={19} color="#10B981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.goalsBannerTitle, { color: theme.textPrimary }]}>
              Savings Goals
            </Text>
            <Text style={[styles.goalsBannerSub, { color: theme.textMuted }]}>
              {savingsGoalsSummary.count === 0
                ? 'Set targets for trips, emergency fund & more'
                : `${savingsGoalsSummary.count} goals • ${formatCurrency(
                    savingsGoalsSummary.saved,
                    settings.currency,
                    true,
                    privateMode
                  )} / ${formatCurrency(
                    savingsGoalsSummary.target,
                    settings.currency,
                    true,
                    privateMode
                  )} (${savingsGoalsSummary.pct}%)`}
            </Text>
          </View>
          <ChevronRight size={18} color={theme.textMuted} />
        </TouchableOpacity>

        {/* Deduplicated Personal vs Family Portfolio & Wallets Card */}
        <CardWithHeader
          title="Personal vs Family Wallets"
          subtitle="Ownership split & individual account balances"
          isDark={isDark}
          accentColor="#2563EB"
        >
          <ScopeDistributionChart
            personalAmount={accountSummary.personalTotal}
            familyAmount={accountSummary.familyTotal}
            currency={settings.currency}
            isDark={isDark}
            privateMode={privateMode}
          />

          {/* Compact 2-Column Wallet Breakdown (No duplicate Personal/Family total headers) */}
          <View style={styles.scopeDetailsGrid}>
            <View
              style={[
                styles.scopeDetailCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              {accountSummary.personalAccounts.map((a) => (
                <View key={a.id} style={styles.scopeSubRow}>
                  <Text
                    style={[styles.scopeSubLabel, { color: theme.textMuted }]}
                    numberOfLines={1}
                  >
                    {a.name}
                  </Text>
                  <Text
                    style={[
                      styles.scopeSubVal,
                      { color: theme.textPrimary },
                    ]}
                  >
                    {formatCurrency(
                      a.currentBalance,
                      settings.currency,
                      true,
                      privateMode
                    )}
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.scopeDetailCard,
                {
                  backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
                  borderColor: isDark ? '#334155' : '#E2E8F0',
                },
              ]}
            >
              {accountSummary.familyAccounts.map((a) => (
                <View key={a.id} style={styles.scopeSubRow}>
                  <Text
                    style={[styles.scopeSubLabel, { color: theme.textMuted }]}
                    numberOfLines={1}
                  >
                    {a.name}
                  </Text>
                  <Text
                    style={[
                      styles.scopeSubVal,
                      { color: theme.textPrimary },
                    ]}
                  >
                    {formatCurrency(
                      a.currentBalance,
                      settings.currency,
                      true,
                      privateMode
                    )}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </CardWithHeader>

        {/* Only show Category Distribution Donut when movements exist */}
        {categoryChartItems.length > 0 && (
          <CardWithHeader
            title="Movements by Category"
            subtitle={`${
              typeFilter === 'income' ? 'Income' : 'Expense'
            } breakdown (${timeRange})`}
            isDark={isDark}
            accentColor={palette.accent}
          >
            <CategoryDonutChart
              items={categoryChartItems}
              currency={settings.currency}
              isDark={isDark}
              privateMode={privateMode}
              emptyText="No category movements for this filter."
            />
          </CardWithHeader>
        )}

        {/* Consolidated Search + Sort Bar */}
        <View style={styles.searchSortRow}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Search size={17} color={theme.textMuted} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search title, category, eSewa/Khalti..."
              placeholderTextColor={theme.textMuted}
              style={[styles.searchInput, { color: theme.textPrimary }]}
              accessibilityLabel="Search transactions"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Clear transaction search"
                hitSlop={8}
              >
                <X size={15} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={cycleSort}
            activeOpacity={0.78}
            accessibilityRole="button"
            accessibilityLabel={`Sort transactions. Current sort: ${currentSortLabel}`}
            style={[
              styles.sortToggleBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <ArrowUpDown size={14} color={palette.accent} />
            <Text style={[styles.sortToggleText, { color: theme.textPrimary }]}>
              {currentSortLabel}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Unified Scope + Type + Category Filter Strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          {(
            [
              { key: 'all', label: 'All Scopes' },
              { key: 'Personal', label: 'Personal' },
              { key: 'Family', label: 'Family' },
            ] as const
          ).map((sf) => {
            const active = scopeFilter === sf.key;
            return (
              <TouchableOpacity
                key={`scope_${sf.key}`}
                onPress={() => setScopeFilter(sf.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active
                      ? sf.key === 'Personal'
                        ? '#2563EB'
                        : sf.key === 'Family'
                          ? '#7C3AED'
                          : palette.accent
                      : theme.card,
                    borderColor: active
                      ? sf.key === 'Personal'
                        ? '#2563EB'
                        : sf.key === 'Family'
                          ? '#7C3AED'
                          : palette.accent
                      : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? '#FFFFFF' : theme.textPrimary },
                  ]}
                >
                  {sf.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {(
            [
              { key: 'all', label: 'All Types' },
              { key: 'income', label: 'Income' },
              { key: 'expense', label: 'Expenses' },
            ] as const
          ).map((tf) => {
            const active = typeFilter === tf.key;
            return (
              <TouchableOpacity
                key={`type_${tf.key}`}
                onPress={() => {
                  setTypeFilter(tf.key);
                  setSelectedCategory('All');
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? theme.brand : theme.card,
                    borderColor: active ? theme.brand : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {tf.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {dynamicCategories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={`cat_${cat}`}
                onPress={() =>
                  setSelectedCategory(active ? 'All' : cat)
                }
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? palette.accent : theme.card,
                    borderColor: active ? palette.accent : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: active ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Date-Grouped Transaction Ledger */}
        {dateGroupedTransactions.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              No matching transactions
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              {searchQuery ||
              selectedCategory !== 'All' ||
              typeFilter !== 'all' ||
              scopeFilter !== 'all' ||
              timeRange !== 'all'
                ? 'No transactions found with the active filters.'
                : 'Tap "+ Income" or "+ Expense" above to record your first transaction.'}
            </Text>
            {(searchQuery.trim().length > 0 ||
              selectedCategory !== 'All' ||
              typeFilter !== 'all' ||
              scopeFilter !== 'all' ||
              timeRange !== 'all') && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setTypeFilter('all');
                  setScopeFilter('all');
                  setTimeRange('all');
                }}
                style={[
                  styles.resetFilterBtn,
                  { backgroundColor: palette.accent },
                ]}
              >
                <Text style={styles.resetFilterBtnText}>Reset All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          dateGroupedTransactions.map((group) => (
            <View
              key={group.dateISO}
              style={[
                styles.dateGroupCard,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.dateGroupHeader,
                  { borderBottomColor: theme.divider },
                ]}
              >
                <View>
                  <Text
                    style={[
                      styles.dateGroupBS,
                      { color: theme.textPrimary },
                    ]}
                  >
                    {group.bsFormatted}
                  </Text>
                  <Text
                    style={[styles.dateGroupAD, { color: theme.textMuted }]}
                  >
                    {group.dateISO}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.dateGroupNet,
                    {
                      color:
                        group.dailyNet >= 0 ? theme.income : theme.expense,
                    },
                  ]}
                >
                  {group.dailyNet >= 0 ? '+' : '−'}
                  {formatCurrency(
                    Math.abs(group.dailyNet),
                    settings.currency,
                    false,
                    privateMode
                  )}
                </Text>
              </View>

              {group.items.map((t, idx) => {
                const isIncome = t.type === 'income';
                return (
                  <View
                    key={t.id}
                    style={[
                      styles.txnRow,
                      idx < group.items.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: theme.divider,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.txnTypeCircle,
                        {
                          backgroundColor: isIncome
                            ? theme.incomeBg
                            : theme.expenseBg,
                        },
                      ]}
                    >
                      {isIncome ? (
                        <ArrowDownLeft size={18} color={theme.income} />
                      ) : (
                        <ArrowUpRight size={18} color={theme.expense} />
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
                            styles.txnTitle,
                            { color: theme.textPrimary, flexShrink: 1 },
                          ]}
                          numberOfLines={1}
                        >
                          {t.title}
                        </Text>
                        <View
                          style={[
                            styles.scopeTag,
                            {
                              backgroundColor:
                                t.accountScope === 'Family'
                                  ? isDark
                                    ? '#4C1D95'
                                    : '#EDE9FE'
                                  : isDark
                                    ? '#1E3A8A'
                                    : '#DBEAFE',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.scopeTagText,
                              {
                                color:
                                  t.accountScope === 'Family'
                                    ? isDark
                                      ? '#A78BFA'
                                      : '#7C3AED'
                                    : isDark
                                      ? '#60A5FA'
                                      : '#2563EB',
                              },
                            ]}
                          >
                            {t.accountScope === 'Family'
                              ? 'Family'
                              : 'Personal'}
                          </Text>
                        </View>
                      </View>
                      <Text
                        style={[styles.txnMeta, { color: theme.textMuted }]}
                      >
                        {t.category} • {t.paymentMethod}
                      </Text>
                      {t.description ? (
                        <Text
                          style={[
                            styles.txnNote,
                            { color: theme.textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {t.description}
                        </Text>
                      ) : null}
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.txnAmount,
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
                      <View style={styles.txnActionsRow}>
                        <TouchableOpacity
                          onPress={() => handleOpenEdit(t)}
                          style={styles.iconActionBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Edit transaction ${t.title}`}
                          hitSlop={8}
                        >
                          <Edit3 size={14} color={theme.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(t)}
                          style={styles.iconActionBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete transaction ${t.title}`}
                          hitSlop={8}
                        >
                          <Trash2 size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <TransactionFormModal
        visible={modalVisible}
        initialType={modalInitialType}
        editingTransaction={editingTxn}
        onClose={() => {
          setModalVisible(false);
          setEditingTxn(null);
        }}
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
    paddingHorizontal: LAYOUT.horizontalPadding,
    paddingTop: 16,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 21,
    fontWeight: '800',
  },
  screenSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8.5,
    borderRadius: 999,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  balanceHeroCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
    elevation: 4,
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
  },
  heroTopRow: {
    marginBottom: 14,
  },
  heroLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  heroEyeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: 'rgba(248, 250, 252, 0.65)',
  },
  heroValueLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  heroStatGlass: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    paddingHorizontal: 13,
    paddingVertical: 11,
    borderRadius: 16,
    gap: 4,
  },
  heroStatTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  heroStatTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: 'rgba(248, 250, 252, 0.72)',
  },
  periodTabsBar: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  periodTabBtn: {
    flex: 1,
    paddingVertical: 6.5,
    borderRadius: 999,
    alignItems: 'center',
  },
  periodTabBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  periodTabText: {
    fontSize: 11.5,
  },
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 42,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  sortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 42,
  },
  sortToggleText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  filterChipsRow: {
    gap: 7,
    paddingBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  dateGroupCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  dateGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  dateGroupBS: {
    fontSize: 13,
    fontWeight: '800',
  },
  dateGroupAD: {
    fontSize: 11,
    marginTop: 1,
  },
  dateGroupNet: {
    fontSize: 13,
    fontWeight: '800',
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  txnTypeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  txnMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  txnNote: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txnActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 8,
  },
  scopeDetailsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  scopeDetailCard: {
    flex: 1,
    borderRadius: 14,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderWidth: 1,
    gap: 6,
  },
  scopeSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  scopeSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  scopeSubVal: {
    fontSize: 11,
    fontWeight: '800',
  },
  scopeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scopeTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  resetFilterBtn: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetFilterBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  goalsBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
    gap: 12,
  },
  goalsIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalsBannerTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  goalsBannerSub: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
});
