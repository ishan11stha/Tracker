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
  Edit3,
  Plus,
  Search,
  Trash2,
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
import {
  CardWithHeader,
  CurrencyDisplayer,
  TrendingValueChip,
} from '../../components/monekin/MonekinComponents';
import { CategoryDonutChart } from '../../components/monekin/MonekinCharts';

type TimeRangeKey = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all';

export default function MoneyManagerScreen() {
  const { settings, transactions, removeTransaction } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const privateMode = Boolean(settings.privateMode);
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

  // Category distribution for Monekin Donut Chart
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

  const allCategories = useMemo(() => {
    const set = new Set<string>(['All']);
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return periodTransactions.filter((t) => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (selectedCategory !== 'All' && t.category !== selectedCategory)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.description || '').toLowerCase().includes(q) ||
          t.paymentMethod.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [periodTransactions, typeFilter, selectedCategory, searchQuery]);

  // Monekin Date-Grouped Ledger: Group filtered transactions by `dateISO` with daily net total
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

  const savingsPct =
    periodSummary.totalIncome > 0
      ? ((periodSummary.totalIncome - periodSummary.totalExpense) /
          periodSummary.totalIncome) *
        100
      : 0;

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
              Transactions & Stats
            </Text>
            <Text
              style={[styles.screenSubtitle, { color: theme.textMuted }]}
            >
              आम्दानी र खर्च विवरण • {formatBSDateNepali(todayBS, false)}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => handleOpenAdd('income')}
              style={[styles.addBtn, { backgroundColor: '#37A13B' }]}
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

        {/* Monekin Net Balance Summary Card */}
        <View
          style={[
            styles.balanceHeroCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroLabel, { color: theme.textMuted }]}>
                NET AVAILABLE BALANCE (Total Income − Total Expenses)
              </Text>
              <View style={styles.heroValueLine}>
                <CurrencyDisplayer
                  amount={allTimeSummary.totalBalance}
                  currency={settings.currency}
                  isDark={isDark}
                  privateMode={privateMode}
                  size="xl"
                  color={
                    allTimeSummary.totalBalance >= 0
                      ? theme.textPrimary
                      : theme.expense
                  }
                />
                <TrendingValueChip
                  percentage={savingsPct}
                  afterText="net ratio"
                  isDark={isDark}
                />
              </View>
            </View>
          </View>

          {/* Monekin Side-by-Side Period Income & Expense Flow Pills */}
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
                  style={[styles.heroStatTitle, { color: theme.textMuted }]}
                >
                  INCOME ({timeRange.toUpperCase()})
                </Text>
                <CurrencyDisplayer
                  amount={periodSummary.totalIncome}
                  currency={settings.currency}
                  isDark={isDark}
                  privateMode={privateMode}
                  size="md"
                  color={theme.income}
                />
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
                  style={[styles.heroStatTitle, { color: theme.textMuted }]}
                >
                  EXPENSES ({timeRange.toUpperCase()})
                </Text>
                <CurrencyDisplayer
                  amount={periodSummary.totalExpense}
                  currency={settings.currency}
                  isDark={isDark}
                  privateMode={privateMode}
                  size="md"
                  color={theme.expense}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Monekin Period Selector Chips (Daily, Weekly, Monthly, Yearly, All) */}
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
                  active && { backgroundColor: palette.accentSoft },
                ]}
              >
                <Text
                  style={[
                    styles.periodTabText,
                    {
                      color: active ? palette.accent : theme.textMuted,
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

        {/* Monekin Category Distribution Card (`PieChartByCategories`) */}
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
              { key: 'all', label: 'All Movements' },
              { key: 'income', label: 'Income' },
              { key: 'expense', label: 'Expenses' },
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
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Monekin Date-Grouped Transaction Ledger */}
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
              Try switching the period filter or add a new income/expense entry.
            </Text>
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
              {/* Monekin Date Group Header Bar */}
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

              {/* Transactions within this Date Group */}
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
                      <Text
                        style={[styles.txnTitle, { color: theme.textPrimary }]}
                        numberOfLines={1}
                      >
                        {t.title}
                      </Text>
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
                        >
                          <Edit3 size={14} color={theme.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(t)}
                          style={styles.iconActionBtn}
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
    paddingHorizontal: 16,
    paddingTop: 10,
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
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  heroTopRow: {
    marginBottom: 14,
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
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
  },
  heroStatPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 14,
  },
  heroStatTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  periodTabsBar: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    marginBottom: 14,
  },
  periodTabBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: 'center',
  },
  periodTabText: {
    fontSize: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
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
    paddingBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
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
    padding: 3,
  },
});
