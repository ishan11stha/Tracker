import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Edit3,
  History,
  MapPin,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import { useVaultStore } from '../../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../theme/colors';
import { formatCurrency } from '../../utils/currency';
import { adToBs, formatBSDateNepali } from '../../utils/nepaliDate';
import { ITEM_STATUSES, ItemStatus, PersonalItem } from '../../types';
import { ItemFormModal } from '../../components/ItemFormModal';
import {
  CardWithHeader,
  CurrencyDisplayer,
} from '../../components/monekin/MonekinComponents';
import { CategoryDonutChart } from '../../components/monekin/MonekinCharts';

const STATUS_BADGE_COLORS: Record<
  ItemStatus,
  { bg: string; text: string }
> = {
  Owned: { bg: 'rgba(55, 161, 59, 0.16)', text: '#37A13B' },
  Borrowed: { bg: 'rgba(217, 119, 6, 0.16)', text: '#D97706' },
  Lent: { bg: 'rgba(234, 88, 12, 0.16)', text: '#EA580C' },
  Sold: { bg: 'rgba(29, 78, 216, 0.16)', text: '#1D4ED8' },
  Returned: { bg: 'rgba(100, 116, 139, 0.16)', text: '#64748B' },
};

export default function ItemTrackerScreen() {
  const { settings, items, itemHistory, removeItem } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const privateMode = Boolean(settings.privateMode);
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('items', isDark);

  const [statusFilter, setStatusFilter] = useState<'All' | ItemStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PersonalItem | null>(null);
  const [historyItem, setHistoryItem] = useState<PersonalItem | null>(null);

  const stats = useMemo(() => {
    const totalItems = items.length;
    const totalUnits = items.reduce((acc, i) => acc + (i.quantity || 1), 0);
    const totalValue = items.reduce(
      (acc, i) => acc + (i.purchasePrice || 0) * (i.quantity || 1),
      0
    );
    const lentCount = items.filter((i) => i.status === 'Lent').length;
    const borrowedCount = items.filter((i) => i.status === 'Borrowed').length;
    return { totalItems, totalUnits, totalValue, lentCount, borrowedCount };
  }, [items]);

  // Asset valuation distribution by category for Monekin Donut Chart
  const assetCategoryDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    for (const i of items) {
      const val = (i.purchasePrice || 0) * (i.quantity || 1);
      if (val > 0) {
        map[i.category] = (map[i.category] || 0) + val;
      }
    }
    return Object.entries(map)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter !== 'All' && item.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          (item.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [items, statusFilter, searchQuery]);

  const selectedItemLogs = useMemo(() => {
    if (!historyItem) return [];
    return itemHistory.filter((h) => h.itemId === historyItem.id);
  }, [itemHistory, historyItem]);

  const handleDelete = (item: PersonalItem) => {
    Alert.alert(
      'Delete Item',
      `Remove "${item.name}" and its history from VAULT?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeItem(item.id),
        },
      ]
    );
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
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>
              Assets & Items
            </Text>
            <Text
              style={[styles.screenSubtitle, { color: theme.textMuted }]}
            >
              सामान तथा सम्पत्ति अभिलेख • Inventory & Lending
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingItem(null);
              setFormVisible(true);
            }}
            style={[styles.addBtn, { backgroundColor: palette.accent }]}
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Add Item</Text>
          </TouchableOpacity>
        </View>

        {/* Monekin Net Asset Portfolio Card */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.summaryTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>
                TOTAL ASSET PORTFOLIO VALUATION
              </Text>
              <CurrencyDisplayer
                amount={stats.totalValue}
                currency={settings.currency}
                isDark={isDark}
                privateMode={privateMode}
                size="xl"
              />
            </View>
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: palette.accentSoft },
              ]}
            >
              <Package size={22} color={palette.accent} />
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View
              style={[
                styles.metricBox,
                { backgroundColor: theme.surfaceContainerHigh },
              ]}
            >
              <Text style={[styles.metricNum, { color: palette.accent }]}>
                {stats.totalUnits}
              </Text>
              <Text style={[styles.metricText, { color: theme.textMuted }]}>
                Total Units
              </Text>
            </View>

            <View
              style={[
                styles.metricBox,
                { backgroundColor: theme.surfaceContainerHigh },
              ]}
            >
              <Text style={[styles.metricNum, { color: '#EA580C' }]}>
                {stats.lentCount}
              </Text>
              <Text style={[styles.metricText, { color: theme.textMuted }]}>
                Lent Out
              </Text>
            </View>

            <View
              style={[
                styles.metricBox,
                { backgroundColor: theme.surfaceContainerHigh },
              ]}
            >
              <Text style={[styles.metricNum, { color: '#D97706' }]}>
                {stats.borrowedCount}
              </Text>
              <Text style={[styles.metricText, { color: theme.textMuted }]}>
                Borrowed
              </Text>
            </View>
          </View>
        </View>

        {/* Monekin Asset Valuation Contribution Donut Card */}
        <CardWithHeader
          title="Valuation by Category"
          subtitle="Portfolio share across personal item categories"
          isDark={isDark}
          accentColor={palette.accent}
        >
          <CategoryDonutChart
            items={assetCategoryDistribution}
            currency={settings.currency}
            isDark={isDark}
            privateMode={privateMode}
            emptyText="Add item valuations to view portfolio breakdown."
          />
        </CardWithHeader>

        {/* Search Input */}
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
            placeholder="Search items by name, category, location..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {(['All', ...ITEM_STATUSES] as const).map((st) => {
            const active = statusFilter === st;
            return (
              <TouchableOpacity
                key={st}
                onPress={() => setStatusFilter(st)}
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
                  {st}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Items List */}
        {filteredItems.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              No items found
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              Tap "Add Item" to record electronics, books, documents, or lent
              belongings.
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const badge = STATUS_BADGE_COLORS[item.status];
            const bs = adToBs(item.purchaseDateISO);
            return (
              <View
                key={item.id}
                style={[
                  styles.itemCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.itemTopRow}>
                  {item.imageUri ? (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={styles.itemImage}
                    />
                  ) : (
                    <View
                      style={[
                        styles.itemPlaceholder,
                        { backgroundColor: palette.accentSoft },
                      ]}
                    >
                      <Package size={22} color={palette.accent} />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameBadgeRow}>
                      <Text
                        style={[styles.itemName, { color: theme.textPrimary }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: badge.bg },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: badge.text },
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.itemCategory,
                        { color: theme.textMuted },
                      ]}
                    >
                      {item.category} • Qty: {item.quantity}
                    </Text>

                    <View style={styles.locationRow}>
                      <MapPin size={12} color={palette.accent} />
                      <Text
                        style={[
                          styles.locationText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {item.location}
                      </Text>
                    </View>
                  </View>
                </View>

                {item.description ? (
                  <Text
                    style={[
                      styles.itemDescription,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {item.description}
                  </Text>
                ) : null}

                <View
                  style={[
                    styles.itemFooterRow,
                    { borderTopColor: theme.divider },
                  ]}
                >
                  <View>
                    <Text
                      style={[styles.itemPrice, { color: theme.textPrimary }]}
                    >
                      {formatCurrency(
                        item.purchasePrice,
                        settings.currency,
                        false,
                        privateMode
                      )}
                    </Text>
                    <Text
                      style={[styles.itemDate, { color: theme.textMuted }]}
                    >
                      {formatBSDateNepali(bs, false)} ({item.purchaseDateISO})
                    </Text>
                  </View>

                  <View style={styles.actionBtnsGroup}>
                    <TouchableOpacity
                      onPress={() => setHistoryItem(item)}
                      style={[
                        styles.actionPillBtn,
                        { backgroundColor: theme.surfaceContainerHigh },
                      ]}
                    >
                      <History size={13} color={palette.accent} />
                      <Text
                        style={[
                          styles.actionPillText,
                          { color: palette.accent },
                        ]}
                      >
                        History
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setEditingItem(item);
                        setFormVisible(true);
                      }}
                      style={[
                        styles.iconBtn,
                        { backgroundColor: theme.surfaceContainerHigh },
                      ]}
                    >
                      <Edit3 size={15} color={theme.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      style={[
                        styles.iconBtn,
                        { backgroundColor: theme.expenseBg },
                      ]}
                    >
                      <Trash2 size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / Edit Item Modal */}
      <ItemFormModal
        visible={formVisible}
        editingItem={editingItem}
        onClose={() => {
          setFormVisible(false);
          setEditingItem(null);
        }}
      />

      {/* Item History Modal */}
      <Modal
        visible={Boolean(historyItem)}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryItem(null)}
      >
        <Pressable
          style={[
            styles.modalOverlay,
            { backgroundColor: theme.modalOverlay },
          ]}
          onPress={() => setHistoryItem(null)}
        >
          <Pressable
            style={[
              styles.historyCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.historyHeader}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.historyTitle, { color: theme.textPrimary }]}
                >
                  Item History Log
                </Text>
                <Text
                  style={[
                    styles.historySubtitle,
                    { color: theme.textMuted },
                  ]}
                >
                  {historyItem?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryItem(null)}>
                <X size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 320 }}>
              {selectedItemLogs.length === 0 ? (
                <Text
                  style={[styles.emptySub, { color: theme.textMuted, padding: 16 }]}
                >
                  No history entries recorded yet.
                </Text>
              ) : (
                selectedItemLogs.map((log) => {
                  const datePart = log.timestamp.slice(0, 10);
                  const bs = adToBs(datePart);
                  return (
                    <View
                      key={log.id}
                      style={[
                        styles.historyLogRow,
                        { borderBottomColor: theme.divider },
                      ]}
                    >
                      <View
                        style={[
                          styles.timelineDot,
                          { backgroundColor: palette.accent },
                        ]}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.logAction,
                            { color: theme.textPrimary },
                          ]}
                        >
                          {log.action}
                        </Text>
                        <Text
                          style={[
                            styles.logNote,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {log.note}
                        </Text>
                        <Text
                          style={[styles.logTime, { color: theme.textMuted }]}
                        >
                          {formatBSDateNepali(bs, false)} ({datePart})
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  summaryCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
  },
  metricNum: {
    fontSize: 18,
    fontWeight: '900',
  },
  metricText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
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
  filterRow: {
    gap: 8,
    paddingBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 14,
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
  itemCard: {
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  itemImage: {
    width: 54,
    height: 54,
    borderRadius: 16,
  },
  itemPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  itemCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemDescription: {
    fontSize: 12,
    marginTop: 8,
  },
  itemFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  itemDate: {
    fontSize: 11,
    marginTop: 1,
  },
  actionBtnsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  historyCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  historySubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  historyLogRow: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  logAction: {
    fontSize: 13,
    fontWeight: '800',
  },
  logNote: {
    fontSize: 12,
    marginTop: 2,
  },
  logTime: {
    fontSize: 11,
    marginTop: 2,
  },
});
