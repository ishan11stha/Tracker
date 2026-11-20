import React, { useEffect, useMemo, useState } from 'react';
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
  Clock,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  Wallet,
} from 'lucide-react-native';
import {
  calculateFinancialSummary,
  useVaultStore,
} from '../../src/store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../src/theme/colors';
import {
  adToBs,
  formatADDateFull,
  formatBSDateEnglish,
  formatBSDateNepali,
  formatDisplayDate,
  formatNPTTime,
  formatTimeString,
  getNowInNPT,
} from '../../src/utils/nepaliDate';
import { formatCurrency } from '../../src/utils/currency';
import { TransactionFormModal } from '../../src/components/TransactionFormModal';
import { ItemFormModal } from '../../src/components/ItemFormModal';
import { ActivityFormModal } from '../../src/components/ActivityFormModal';
import { ReminderFormModal } from '../../src/components/ReminderFormModal';
import { NepaliCalendarModal } from '../../src/components/NepaliCalendarModal';
import { TransactionType } from '../../src/types';

export default function DashboardScreen() {
  const router = useRouter();
  const {
    settings,
    transactions,
    items,
    activities,
    reminders,
    toggleReminderCompleted,
    toggleActivityStatus,
  } = useVaultStore();

  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('dashboard', isDark);

  // Live Nepal Standard Time clock state (updates every second)
  const [nowDate, setNowDate] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const nptInfo = useMemo(() => getNowInNPT(nowDate), [nowDate]);
  const currentBS = useMemo(() => adToBs(nptInfo.isoDate), [nptInfo.isoDate]);
  const liveNPTString = useMemo(
    () => formatNPTTime(settings.timeFormat, true, nowDate),
    [settings.timeFormat, nowDate]
  );

  // Greeting in Nepali / English based on Nepal local hour
  const greeting = useMemo(() => {
    const h = nptInfo.hours;
    if (settings.language === 'ne') {
      if (h < 12) return 'शुभ प्रभात (Good Morning)';
      if (h < 17) return 'शुभ दिन (Good Afternoon)';
      return 'शुभ सन्ध्या (Good Evening)';
    }
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [nptInfo.hours, settings.language]);

  // Financial Summary: Total Balance = Total Income - Total Expenses
  const financialSummary = useMemo(
    () => calculateFinancialSummary(transactions),
    [transactions]
  );

  // Recent & Upcoming slices
  const recentTransactions = useMemo(
    () => transactions.slice(0, 4),
    [transactions]
  );

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

  // Quick Action Modals
  const [txnModalVisible, setTxnModalVisible] = useState(false);
  const [txnModalType, setTxnModalType] = useState<TransactionType>('income');
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [activityModalVisible, setActivityModalVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [inspectedDateISO, setInspectedDateISO] = useState(nptInfo.isoDate);

  const openQuickTxn = (type: TransactionType) => {
    setTxnModalType(type);
    setTxnModalVisible(true);
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
        {/* 1. HEADER: VAULT Logo, Personalized Greeting & Settings */}
        <View style={styles.headerContainer}>
          <View style={styles.brandRow}>
            <View
              style={[
                styles.logoBox,
                { backgroundColor: isDark ? '#F8FAFC' : '#0F172A' },
              ]}
            >
              <ShieldCheck
                size={20}
                color={isDark ? '#0F172A' : '#FFFFFF'}
                strokeWidth={2.4}
              />
            </View>
            <View>
              <View style={styles.titleTagRow}>
                <Text style={[styles.brandName, { color: theme.textPrimary }]}>
                  VAULT
                </Text>
                <View
                  style={[
                    styles.offlineBadge,
                    { backgroundColor: theme.incomeBg },
                  ]}
                >
                  <Text style={styles.offlineBadgeText}>OFFLINE-FIRST</Text>
                </View>
              </View>
              <Text style={[styles.greetingText, { color: theme.textSecondary }]}>
                {greeting}, {settings.userName.split(' ')[0]}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={[
              styles.settingsBtn,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Settings size={20} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* 2. NEPALI DATE & LIVE NPT CLOCK HERO BANNER (HIGH PRIORITY) */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            setInspectedDateISO(nptInfo.isoDate);
            setCalendarModalVisible(true);
          }}
          style={[
            styles.nepaliDateCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.nepaliDateTopRow}>
            <View style={styles.bsPill}>
              <Calendar size={13} color="#DC2626" />
              <Text style={styles.bsPillText}>
                बिक्रम सम्बत् (Bikram Sambat)
              </Text>
            </View>

            <View
              style={[
                styles.liveClockBadge,
                { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
              ]}
            >
              <View style={styles.pulseDot} />
              <Clock size={12} color={theme.textPrimary} />
              <Text
                style={[styles.liveClockText, { color: theme.textPrimary }]}
              >
                {liveNPTString}
              </Text>
            </View>
          </View>

          {/* Primary Nepali Date: e.g. २०८३ मंसिर ४, शुक्रबार */}
          <Text style={[styles.nepaliDateHeadline, { color: theme.textPrimary }]}>
            {formatBSDateNepali(currentBS, true)}
          </Text>

          {/* Secondary Gregorian Date + Romanized BS */}
          <View style={styles.nepaliDateFooterRow}>
            <Text
              style={[
                styles.gregorianSubText,
                { color: theme.textSecondary },
              ]}
            >
              {formatADDateFull(nptInfo.isoDate)} •{' '}
              {formatBSDateEnglish(currentBS, false)} BS
            </Text>
            <Text style={[styles.calendarCta, { color: theme.info }]}>
              पात्रो हेर्नुहोस् →
            </Text>
          </View>
        </TouchableOpacity>

        {/* 3. FINANCIAL OVERVIEW CARD */}
        <View
          style={[
            styles.financeCard,
            {
              backgroundColor: isDark ? '#1E293B' : '#0F172A',
            },
          ]}
        >
          <View style={styles.financeTopRow}>
            <View>
              <Text style={styles.balanceLabel}>
                TOTAL AVAILABLE BALANCE (कुल मौज्दात)
              </Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(
                  financialSummary.totalBalance,
                  settings.currency
                )}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/money')}
              style={styles.walletIconCircle}
            >
              <Wallet size={20} color="#4ADE80" />
            </TouchableOpacity>
          </View>

          <View style={styles.incomeExpenseSplit}>
            <View style={styles.splitBox}>
              <View style={styles.splitLabelRow}>
                <View
                  style={[
                    styles.splitArrowCircle,
                    { backgroundColor: 'rgba(74, 222, 128, 0.2)' },
                  ]}
                >
                  <ArrowDownLeft size={14} color="#4ADE80" />
                </View>
                <Text style={styles.splitLabelText}>Total Income</Text>
              </View>
              <Text style={[styles.splitValueText, { color: '#4ADE80' }]}>
                {formatCurrency(
                  financialSummary.totalIncome,
                  settings.currency
                )}
              </Text>
            </View>

            <View style={styles.splitDivider} />

            <View style={styles.splitBox}>
              <View style={styles.splitLabelRow}>
                <View
                  style={[
                    styles.splitArrowCircle,
                    { backgroundColor: 'rgba(248, 113, 113, 0.2)' },
                  ]}
                >
                  <ArrowUpRight size={14} color="#F87171" />
                </View>
                <Text style={styles.splitLabelText}>Total Expenses</Text>
              </View>
              <Text style={[styles.splitValueText, { color: '#F87171' }]}>
                {formatCurrency(
                  financialSummary.totalExpense,
                  settings.currency
                )}
              </Text>
            </View>
          </View>

          {/* Quick Add Income / Add Expense inside Financial Overview */}
          <View style={styles.financeQuickButtonsRow}>
            <TouchableOpacity
              onPress={() => openQuickTxn('income')}
              style={[
                styles.financeQuickBtn,
                { backgroundColor: '#16A34A' },
              ]}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.financeQuickBtnText}>Add Income</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openQuickTxn('expense')}
              style={[
                styles.financeQuickBtn,
                { backgroundColor: 'rgba(255,255,255,0.14)' },
              ]}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.financeQuickBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 4. QUICK ACTIONS BAR (5 Actions) */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: theme.textPrimary }]}>
            Quick Actions (द्रुत कार्यहरू)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActionsRow}
          >
            <TouchableOpacity
              onPress={() => openQuickTxn('income')}
              style={[
                styles.quickActionCard,
                { backgroundColor: '#E8F5E9', borderColor: '#BBF7D0' },
              ]}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: '#16A34A' }]}
              >
                <ArrowDownLeft size={18} color="#FFFFFF" />
              </View>
              <Text style={[styles.quickActionLabel, { color: '#14532D' }]}>
                Add Money
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openQuickTxn('expense')}
              style={[
                styles.quickActionCard,
                { backgroundColor: '#FEE2E2', borderColor: '#FECACA' },
              ]}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: '#DC2626' }]}
              >
                <ArrowUpRight size={18} color="#FFFFFF" />
              </View>
              <Text style={[styles.quickActionLabel, { color: '#7F1D1D' }]}>
                Add Expense
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setItemModalVisible(true)}
              style={[
                styles.quickActionCard,
                { backgroundColor: '#E8F1FC', borderColor: '#BFDBFE' },
              ]}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: '#2563EB' }]}
              >
                <Package size={18} color="#FFFFFF" />
              </View>
              <Text style={[styles.quickActionLabel, { color: '#1E3A8A' }]}>
                Add Item
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActivityModalVisible(true)}
              style={[
                styles.quickActionCard,
                { backgroundColor: '#F0EBFA', borderColor: '#DDD6FE' },
              ]}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: '#7C3AED' }]}
              >
                <Activity size={18} color="#FFFFFF" />
              </View>
              <Text style={[styles.quickActionLabel, { color: '#4C1D95' }]}>
                Add Activity
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setReminderModalVisible(true)}
              style={[
                styles.quickActionCard,
                { backgroundColor: '#FFF0E6', borderColor: '#FED7AA' },
              ]}
            >
              <View
                style={[styles.quickActionIcon, { backgroundColor: '#EA580C' }]}
              >
                <Bell size={18} color="#FFFFFF" />
              </View>
              <Text style={[styles.quickActionLabel, { color: '#7C2D12' }]}>
                Create Reminder
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* 5. OVERVIEW CARD: RECENT TRANSACTIONS */}
        <View
          style={[
            styles.overviewCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View
                style={[styles.moduleDot, { backgroundColor: '#16A34A' }]}
              />
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                Recent Transactions
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/money')}
              style={styles.seeAllBtn}
            >
              <Text style={[styles.seeAllText, { color: '#16A34A' }]}>
                View All
              </Text>
              <ChevronRight size={15} color="#16A34A" />
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              No transactions recorded yet. Tap Add Money or Add Expense above.
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
                      style={[
                        styles.itemSubtitle,
                        { color: theme.textSecondary },
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
                    {isIncome ? '+' : '-'}
                    {formatCurrency(t.amount, settings.currency)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* 6. OVERVIEW CARD: UPCOMING REMINDERS */}
        <View
          style={[
            styles.overviewCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View
                style={[styles.moduleDot, { backgroundColor: '#EA580C' }]}
              />
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                Upcoming Reminders
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/reminders')}
              style={styles.seeAllBtn}
            >
              <Text style={[styles.seeAllText, { color: '#EA580C' }]}>
                Manage
              </Text>
              <ChevronRight size={15} color="#EA580C" />
            </TouchableOpacity>
          </View>

          {upcomingReminders.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              All caught up! No pending reminders.
            </Text>
          ) : (
            upcomingReminders.map((rem, idx) => {
              const priorityColor =
                rem.priority === 'High'
                  ? '#DC2626'
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
                        { color: theme.textSecondary },
                      ]}
                    >
                      {formatDisplayDate(
                        rem.dateISO,
                        settings.preferredCalendar,
                        settings.language
                      )}{' '}
                      • {formatTimeString(rem.timeString, settings.timeFormat)}{' '}
                      NPT
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.priorityTag,
                      { backgroundColor: `${priorityColor}18` },
                    ]}
                  >
                    <Text
                      style={[styles.priorityTagText, { color: priorityColor }]}
                    >
                      {rem.priority}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* 7. OVERVIEW CARD: RECENT ACTIVITIES */}
        <View
          style={[
            styles.overviewCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View
                style={[styles.moduleDot, { backgroundColor: '#7C3AED' }]}
              />
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                Recent Activities
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/tracker')}
              style={styles.seeAllBtn}
            >
              <Text style={[styles.seeAllText, { color: '#7C3AED' }]}>
                Tracker
              </Text>
              <ChevronRight size={15} color="#7C3AED" />
            </TouchableOpacity>
          </View>

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
                          textDecorationLine: isDone ? 'line-through' : 'none',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {act.title}
                    </Text>
                    <Text
                      style={[
                        styles.itemSubtitle,
                        { color: theme.textSecondary },
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
                      { backgroundColor: isDark ? '#231B38' : '#EDE9FE' },
                    ]}
                  >
                    <Text style={[styles.metricPillText, { color: '#7C3AED' }]}>
                      {act.numericValue} {act.unit}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* 8. OVERVIEW CARD: ITEM SUMMARY */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => router.push('/(tabs)/items')}
          style={[
            styles.overviewCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View
                style={[styles.moduleDot, { backgroundColor: '#2563EB' }]}
              />
              <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>
                Item Inventory Summary
              </Text>
            </View>
            <View style={styles.seeAllBtn}>
              <Text style={[styles.seeAllText, { color: '#2563EB' }]}>
                Inventory
              </Text>
              <ChevronRight size={15} color="#2563EB" />
            </View>
          </View>

          <View style={styles.itemStatsGrid}>
            <View
              style={[
                styles.itemStatBox,
                { backgroundColor: isDark ? '#15253B' : '#E8F1FC' },
              ]}
            >
              <Text style={[styles.itemStatVal, { color: '#2563EB' }]}>
                {itemSummary.totalCount}
              </Text>
              <Text
                style={[styles.itemStatLabel, { color: theme.textSecondary }]}
              >
                Total Units
              </Text>
            </View>

            <View
              style={[
                styles.itemStatBox,
                { backgroundColor: isDark ? '#132A1E' : '#E8F5E9' },
              ]}
            >
              <Text style={[styles.itemStatVal, { color: '#16A34A' }]}>
                {itemSummary.owned}
              </Text>
              <Text
                style={[styles.itemStatLabel, { color: theme.textSecondary }]}
              >
                Owned
              </Text>
            </View>

            <View
              style={[
                styles.itemStatBox,
                { backgroundColor: isDark ? '#301C12' : '#FFF0E6' },
              ]}
            >
              <Text style={[styles.itemStatVal, { color: '#EA580C' }]}>
                {itemSummary.lent + itemSummary.borrowed}
              </Text>
              <Text
                style={[styles.itemStatLabel, { color: theme.textSecondary }]}
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
              style={[styles.assetValueLabel, { color: theme.textSecondary }]}
            >
              Estimated Asset Value:
            </Text>
            <Text
              style={[styles.assetValueAmount, { color: theme.textPrimary }]}
            >
              {formatCurrency(itemSummary.totalValue, settings.currency)}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Footer Tagline */}
        <View style={styles.footerWrap}>
          <Text style={[styles.footerBrand, { color: theme.textMuted }]}>
            VAULT • Your life. Your records. Your control.
          </Text>
        </View>
      </ScrollView>

      {/* Modals for Quick Actions */}
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
        accentColor="#0F172A"
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
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 32,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  titleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  offlineBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  offlineBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },
  greetingText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 1,
  },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nepaliDateCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
  },
  nepaliDateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bsPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
  },
  liveClockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveClockText: {
    fontSize: 11,
    fontWeight: '800',
  },
  nepaliDateHeadline: {
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 4,
  },
  nepaliDateFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gregorianSubText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarCta: {
    fontSize: 12,
    fontWeight: '700',
  },
  financeCard: {
    borderRadius: 24,
    padding: 20,
    marginBottom: 18,
    elevation: 6,
  },
  financeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  walletIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(74, 222, 128, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomeExpenseSplit: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  splitBox: {
    flex: 1,
  },
  splitDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 12,
  },
  splitLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  splitArrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitLabelText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  splitValueText: {
    fontSize: 15,
    fontWeight: '800',
  },
  financeQuickButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  financeQuickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 13,
  },
  financeQuickBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionBlock: {
    marginBottom: 18,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  quickActionsRow: {
    gap: 10,
    paddingRight: 8,
  },
  quickActionCard: {
    width: 106,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  overviewCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moduleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
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
    width: 36,
    height: 36,
    borderRadius: 11,
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
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metricPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  metricPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  itemStatsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  itemStatBox: {
    flex: 1,
    paddingVertical: 12,
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
    borderRadius: 12,
    borderWidth: 1,
  },
  assetValueLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  assetValueAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  footerWrap: {
    alignItems: 'center',
    marginTop: 8,
  },
  footerBrand: {
    fontSize: 11,
    fontWeight: '600',
  },
});
