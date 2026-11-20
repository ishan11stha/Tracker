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
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Edit3,
  Plus,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react-native';
import {
  calculateFinancialSummary,
  useVaultStore,
} from '../../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../theme/colors';
import { formatCurrency } from '../../utils/currency';
import {
  adToBs,
  formatBSDateNepali,
  getNowInNPT,
} from '../../utils/nepaliDate';
import { Transaction, TransactionType } from '../../types';
import { TransactionFormModal } from '../../components/TransactionFormModal';

type TimeRangeKey = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

export default function MoneyManagerScreen() {
  const { settings, transactions, removeTransaction } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('money', isDark);

  const [timeRange, setTimeRange] = useState<TimeRangeKey>('monthly');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalInitialType, setModalInitialType] =
    useState<TransactionType>('expense');
  const [editingTxn, setEditingTxn] = useState<Transaction | null>(null);

  const nptToday = useMemo(() => getNowInNPT(), []);
  const todayBS = useMemo(() => adToBs(nptToday.isoDate), [nptToday.isoDate]);

  // Overall all-time balance: Total Balance = Total Income - Total Expenses
  const allTimeSummary = useMemo(
    () => calculateFinancialSummary(transactions),
    [transactions]
  );

  // Filter transactions by selected period (daily, weekly, monthly, yearly, all)
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
    nptToday,
    todayBS,
    settings.preferredCalendar,
  ]);

  const periodSummary = useMemo(
    () => calculateFinancialSummary(periodTransactions),
    [periodTransactions]
  );

  // Category Breakdown for visual chart
  const categoryBreakdown = useMemo(() => {
    const map: Record<
      string,
      { category: string; income: number; expense: number }
    > = {};
    for (const t of periodTransactions) {
      if (!map[t.category]) {
        map[t.category] = { category: t.category, income: 0, expense: 0 };
      }
      if (t.type === 'income') map[t.category].income += t.amount;
      else map[t.category].expense += t.amount;
    }
    return Object.values(map).sort(
      (a, b) => b.expense + b.income - (a.expense + a.income)
    );
  }, [periodTransactions]);

  // All available categories for filter chips
  const allCategories = useMemo(() => {
    const set = new Set<string>(['All']);
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [transactions]);

  // Search & filtered transaction list
  const filteredTransactions = useMemo(() => {
    return periodTransactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (selectedCategory !== 'All' && t.category !== selectedCategory)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchCat = t.category.toLowerCase().includes(q);
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchMethod = t.paymentMethod.toLowerCase().includes(q);
        return matchTitle || matchCat || matchDesc || matchMethod;
      }
      return true;
    });
  }, [periodTransactions, typeFilter, selectedCategory, searchQuery]);

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

  const maxChartVal = Math.max(
    periodSummary.totalIncome,
    periodSummary.totalExpense,
    1
  );
  const incomeBarPct = Math.round(
    (periodSummary.totalIncome / maxChartVal) * 100
  );
  const expenseBarPct = Math.round(
    (periodSummary.totalExpense / maxChartVal) * 100
  );

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
          <View>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>
              Money Manager
            </Text>
            <Text
              style={[styles.screenSubtitle, { color: theme.textSecondary }]}
            >
              आम्दानी र खर्च विवरण • {formatBSDateNepali(todayBS, false)}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => handleOpenAdd('income')}
              style={[styles.addBtn, { backgroundColor: '#16A34A' }]}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleOpenAdd('expense')}
              style={[styles.addBtn, { backgroundColor: '#DC2626' }]}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addBtnText}>Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Total Balance Hero Card (Total Balance = Total Income - Total Expenses) */}
        <View
          style={[
            styles.balanceHeroCard,
            { backgroundColor: theme.card, borderColor: palette.accentBorder },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View>
              <Text style={[styles.heroLabel, { color: theme.textSecondary }]}>
                NET AVAILABLE BALANCE (Total Income − Total Expenses)
              </Text>
              <Text
                style={[
                  styles.heroBalanceValue,
                  {
                    color:
                      allTimeSummary.totalBalance >= 0
                        ? theme.textPrimary
                        : '#DC2626',
                  },
                ]}
              >
                {formatCurrency(
                  allTimeSummary.totalBalance,
                  settings.currency
                )}
              </Text>
            </View>
            <View
              style={[
                styles.heroIconWrap,
                { backgroundColor: palette.accentSoft },
              ]}
            >
              <Wallet size={22} color={palette.accent} />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View
              style={[
                styles.heroStatPill,
                { backgroundColor: theme.incomeBg },
              ]}
            >
              <ArrowDownLeft size={16} color={theme.income} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.heroStatTitle, { color: theme.textSecondary }]}
                >
                  Total Income
                </Text>
                <Text style={[styles.heroStatAmount, { color: theme.income }]}>
                  {formatCurrency(
                    allTimeSummary.totalIncome,
                    settings.currency
                  )}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.heroStatPill,
                { backgroundColor: theme.expenseBg },
              ]}
            >
              <ArrowUpRight size={16} color={theme.expense} />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.heroStatTitle, { color: theme.textSecondary }]}
                >
                  Total Expenses
                </Text>
                <Text style={[styles.heroStatAmount, { color: theme.expense }]}>
                  {formatCurrency(
                    allTimeSummary.totalExpense,
                    settings.currency
                  )}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Time Period Selector (Daily, Weekly, Monthly, Yearly, All) */}
        <View
          style={[
            styles.periodTabsBar,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {(
            [
              { key: 'daily', label: 'Daily' },
              { key: 'weekly', label: 'Weekly' },
              { key: 'monthly', label: 'Monthly' },
              { key: 'yearly', label: 'Yearly' },
              { key: 'all', label: 'All' },
            ] as { key: TimeRangeKey; label: string }[]
          ).map((tab) => {
            const active = timeRange === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setTimeRange(tab.key)}
                style={[
                  styles.periodTabBtn,
                  active && { backgroundColor: palette.accent },
                ]}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    { color: active ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Income vs Expense Visual Comparison Chart Card */}
        <View
          style={[
            styles.chartCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.chartHeaderRow}>
            <View style={styles.chartTitleWrap}>
              <BarChart3 size={18} color={palette.accent} />
              <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>
                Income vs Expense ({timeRange.toUpperCase()})
              </Text>
            </View>
            <Text
              style={[
                styles.netPeriodText,
                {
                  color:
                    periodSummary.totalBalance >= 0
                      ? theme.income
                      : theme.expense,
                },
              ]}
            >
              Net:{' '}
              {formatCurrency(
                periodSummary.totalBalance,
                settings.currency,
                true
              )}
            </Text>
          </View>

          {/* Horizontal Comparative Bars */}
          <View style={styles.barGroup}>
            <View style={styles.barLabelRow}>
              <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
                Income (आम्दानी)
              </Text>
              <Text style={[styles.barAmount, { color: theme.income }]}>
                {formatCurrency(periodSummary.totalIncome, settings.currency)}
              </Text>
            </View>
            <View
              style={[styles.barTrack, { backgroundColor: theme.inputBg }]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(incomeBarPct, 4)}%`,
                    backgroundColor: '#16A34A',
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.barGroup}>
            <View style={styles.barLabelRow}>
              <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
                Expenses (खर्च)
              </Text>
              <Text style={[styles.barAmount, { color: theme.expense }]}>
                {formatCurrency(periodSummary.totalExpense, settings.currency)}
              </Text>
            </View>
            <View
              style={[styles.barTrack, { backgroundColor: theme.inputBg }]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(expenseBarPct, 4)}%`,
                    backgroundColor: '#DC2626',
                  },
                ]}
              />
            </View>
          </View>

          {/* Top Categories Mini Breakdown */}
          {categoryBreakdown.length > 0 && (
            <View
              style={[
                styles.catBreakdownBox,
                { borderTopColor: theme.divider },
              ]}
            >
              <Text
                style={[styles.catBreakdownTitle, { color: theme.textMuted }]}
              >
                CATEGORY DISTRIBUTION
              </Text>
              {categoryBreakdown.slice(0, 4).map((cb) => {
                const isExp = cb.expense >= cb.income;
                const val = isExp ? cb.expense : cb.income;
                return (
                  <View key={cb.category} style={styles.catRow}>
                    <Text
                      style={[styles.catName, { color: theme.textPrimary }]}
                    >
                      {cb.category}
                    </Text>
                    <Text
                      style={[
                        styles.catVal,
                        { color: isExp ? theme.expense : theme.income },
                      ]}
                    >
                      {formatCurrency(val, settings.currency)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Search & Filters */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Search size={18} color={theme.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search title, category, eSewa/Khalti, notes..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Type & Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipsRow}
        >
          {(
            [
              { key: 'all', label: 'All Types' },
              { key: 'income', label: 'Income Only' },
              { key: 'expense', label: 'Expense Only' },
            ] as const
          ).map((tf) => {
            const active = typeFilter === tf.key;
            return (
              <TouchableOpacity
                key={tf.key}
                onPress={() => setTypeFilter(tf.key)}
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
                    { color: active ? '#FFFFFF' : theme.textPrimary },
                  ]}
                >
                  {tf.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {allCategories.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active
                      ? isDark
                        ? '#334155'
                        : '#0F172A'
                      : theme.card,
                    borderColor: active ? '#0F172A' : theme.border,
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

        {/* Transaction History List */}
        <View style={styles.historyHeaderRow}>
          <Text style={[styles.historyTitle, { color: theme.textPrimary }]}>
            Transaction History ({filteredTransactions.length})
          </Text>
        </View>

        {filteredTransactions.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              No matching transactions
            </Text>
            <Text
              style={[styles.emptySub, { color: theme.textSecondary }]}
            >
              Try switching the time filter or add a new income/expense entry.
            </Text>
          </View>
        ) : (
          filteredTransactions.map((t) => {
            const isIncome = t.type === 'income';
            const bs = adToBs(t.dateISO);
            return (
              <View
                key={t.id}
                style={[
                  styles.txnCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.txnTopRow}>
                  <View
                    style={[
                      styles.txnTypeIcon,
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
                    <Text
                      style={[styles.txnTitle, { color: theme.textPrimary }]}
                    >
                      {t.title}
                    </Text>
                    <Text
                      style={[styles.txnMeta, { color: theme.textSecondary }]}
                    >
                      {t.category} • {t.paymentMethod}
                    </Text>
                    <Text style={[styles.txnDate, { color: theme.textMuted }]}>
                      {formatBSDateNepali(bs, false)} ({t.dateISO})
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={[
                        styles.txnAmount,
                        { color: isIncome ? theme.income : theme.expense },
                      ]}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(t.amount, settings.currency)}
                    </Text>
                    <View style={styles.txnActionsRow}>
                      <TouchableOpacity
                        onPress={() => handleOpenEdit(t)}
                        style={styles.iconActionBtn}
                      >
                        <Edit3 size={15} color={theme.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(t)}
                        style={styles.iconActionBtn}
                      >
                        <Trash2 size={15} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {t.description ? (
                  <Text
                    style={[
                      styles.txnDescription,
                      {
                        color: theme.textSecondary,
                        borderTopColor: theme.divider,
                      },
                    ]}
                  >
                    {t.description}
                  </Text>
                ) : null}
              </View>
            );
          })
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
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
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
    paddingVertical: 9,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  balanceHeroCard: {
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroBalanceValue: {
    fontSize: 26,
    fontWeight: '900',
  },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  heroStatPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 14,
  },
  heroStatTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  heroStatAmount: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 1,
  },
  periodTabsBar: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 14,
  },
  periodTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  periodTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  chartCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  netPeriodText: {
    fontSize: 12,
    fontWeight: '800',
  },
  barGroup: {
    marginBottom: 10,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  barAmount: {
    fontSize: 12,
    fontWeight: '800',
  },
  barTrack: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  catBreakdownBox: {
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 10,
  },
  catBreakdownTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  catName: {
    fontSize: 12,
    fontWeight: '600',
  },
  catVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterChipsRow: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  historyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 18,
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
  txnCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  txnTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  txnTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  txnMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  txnDate: {
    fontSize: 11,
    marginTop: 2,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: '900',
  },
  txnActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  iconActionBtn: {
    padding: 4,
  },
  txnDescription: {
    fontSize: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
});
