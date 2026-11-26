import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Activity,
  Calendar,
  CheckCircle2,
  Circle,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useVaultStore } from '../../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../theme/colors';
import { LAYOUT } from '../../theme/layout';
import {
  BS_MONTHS_NE,
  adToBs,
  formatADDateFull,
  formatBSDateNepali,
  toNepaliDigits,
} from '../../utils/nepaliDate';
import { useCurrentNPT } from '../../hooks/useCurrentNPT';
import {
  ACTIVITY_CATEGORIES,
  ActivityRecord,
  isActivityCompletedOnDate,
  isActivityScheduledOnDate,
} from '../../types';
import { ActivityFormModal } from '../../components/ActivityFormModal';
import { NepaliCalendarModal } from '../../components/NepaliCalendarModal';

export default function ActivityTrackerScreen() {
  const {
    settings,
    activities,
    toggleActivityStatus,
    removeActivity,
  } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('tracker', isDark);

  const nptToday = useCurrentNPT();
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedDateISO, setSelectedDateISO] = useState(nptToday.isoDate);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCalendar, setShowCalendar] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [editingActivity, setEditingActivity] =
    useState<ActivityRecord | null>(null);

  const selectedBS = useMemo(() => adToBs(selectedDateISO), [selectedDateISO]);

  // Compute Sunday–Saturday week bounds containing selectedDateISO
  const weekBounds = useMemo(() => {
    const [y, m, d] = selectedDateISO.split('-').map(Number);
    const utcDate = new Date(Date.UTC(y, m - 1, d));
    const weekday = utcDate.getUTCDay(); // 0 = Sunday
    const startUTC = new Date(utcDate.getTime() - weekday * 86400000);
    const endUTC = new Date(startUTC.getTime() + 6 * 86400000);
    const fmt = (dt: Date) =>
      `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(
        dt.getUTCDate()
      ).padStart(2, '0')}`;
    return { startISO: fmt(startUTC), endISO: fmt(endUTC) };
  }, [selectedDateISO]);

  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedCategory !== 'All' && act.category !== selectedCategory) {
        return false;
      }
      if (viewMode === 'daily') {
        return isActivityScheduledOnDate(act, selectedDateISO);
      }
      if (act.repeat === 'everyday' || act.repeat === 'weekdays') {
        return true;
      }
      if (viewMode === 'weekly') {
        return (
          act.dateISO >= weekBounds.startISO && act.dateISO <= weekBounds.endISO
        );
      }
      if (settings.preferredCalendar === 'BS') {
        const bs = adToBs(act.dateISO);
        return bs.year === selectedBS.year && bs.month === selectedBS.month;
      }
      return act.dateISO.slice(0, 7) === selectedDateISO.slice(0, 7);
    });
  }, [
    activities,
    viewMode,
    selectedDateISO,
    weekBounds,
    selectedBS,
    selectedCategory,
    settings.preferredCalendar,
  ]);

  const summary = useMemo(() => {
    const total = filteredActivities.length;
    const completed = filteredActivities.filter((a) =>
      isActivityCompletedOnDate(a, selectedDateISO)
    ).length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, rate };
  }, [filteredActivities, selectedDateISO]);

  const markedDates = useMemo(() => {
    const map: Record<string, { count: number; color: string }> = {};
    for (const a of activities) {
      if (!map[a.dateISO]) {
        map[a.dateISO] = { count: 0, color: palette.accent };
      }
      map[a.dateISO].count += 1;
    }
    return map;
  }, [activities, palette.accent]);

  const handleDelete = (act: ActivityRecord) => {
    Alert.alert(
      'Delete Habit',
      `Delete "${act.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => removeActivity(act.id),
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
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>
              Tracker
            </Text>
            <Text
              style={[styles.screenSubtitle, { color: theme.textMuted }]}
              numberOfLines={1}
            >
              Daily habits & progress
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingActivity(null);
              setFormVisible(true);
            }}
            style={[styles.addBtn, { backgroundColor: palette.accent }]}
          >
            <Plus size={15} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* Signature Obsidian Overview Card: Daily/Weekly/Monthly + Date + Progress Bar */}
        <View
          style={[
            styles.overviewCard,
            {
              backgroundColor: isDark ? '#151F32' : '#0F172A',
              borderColor: isDark ? '#26344E' : '#1E293B',
            },
          ]}
        >
          <View style={styles.viewModeToggle}>
            {(
              [
                { key: 'daily', label: 'Daily' },
                { key: 'weekly', label: 'Weekly' },
                { key: 'monthly', label: 'Monthly' },
              ] as const
            ).map((tab) => {
              const active = viewMode === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setViewMode(tab.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.viewModeBtn,
                    active && styles.viewModeBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.viewModeText,
                      {
                        color: active ? '#0F172A' : 'rgba(248,250,252,0.68)',
                      },
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            onPress={() => setShowCalendar(true)}
            style={styles.dateTapArea}
            accessibilityRole="button"
            accessibilityLabel="Select date"
          >
            <Calendar size={16} color="#A78BFA" />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeDateMain} numberOfLines={1}>
                {viewMode === 'daily'
                  ? formatBSDateNepali(selectedBS, false)
                  : viewMode === 'weekly'
                    ? `${formatBSDateNepali(adToBs(weekBounds.startISO), false)} – ${formatBSDateNepali(
                        adToBs(weekBounds.endISO),
                        false
                      )}`
                    : `${BS_MONTHS_NE[selectedBS.month - 1]} ${toNepaliDigits(
                        selectedBS.year
                      )}`}
              </Text>
              <Text style={styles.activeDateSub} numberOfLines={1}>
                {viewMode === 'weekly'
                  ? `${weekBounds.startISO} to ${weekBounds.endISO}`
                  : formatADDateFull(selectedDateISO)}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Luminous Progress Bar */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                {summary.completed} of {summary.total} completed
              </Text>
              <Text style={styles.progressPct}>{summary.rate}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: '#A78BFA',
                    width: `${summary.rate}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* Simple 5-Option Category Filter Row */}
        <View style={styles.filterRow}>
          {['All', ...ACTIVITY_CATEGORIES].map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
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
        </View>

        {/* Activity List */}
        {filteredActivities.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Activity size={24} color={palette.accent} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              No habits logged
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              Tap "+ Add" to log a habit or daily goal.
            </Text>
          </View>
        ) : (
          filteredActivities.map((act) => {
            const isCompleted = isActivityCompletedOnDate(act, selectedDateISO);
            const repeatTag =
              act.repeat === 'everyday'
                ? 'Everyday'
                : act.repeat === 'weekdays'
                  ? 'Sun–Fri'
                  : null;
            return (
              <View
                key={act.id}
                style={[
                  styles.activityCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <TouchableOpacity
                  onPress={() => toggleActivityStatus(act.id, selectedDateISO)}
                  style={styles.checkBtn}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isCompleted }}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={22} color={palette.accent} />
                  ) : (
                    <Circle size={22} color={theme.textMuted} />
                  )}
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.activityTitle,
                      {
                        color: theme.textPrimary,
                        textDecorationLine: isCompleted
                          ? 'line-through'
                          : 'none',
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {act.title}
                  </Text>
                  <Text
                    style={[styles.activityMeta, { color: theme.textMuted }]}
                  >
                    {act.category} • {act.numericValue} {act.unit}
                    {repeatTag ? ` • ${repeatTag}` : ''}
                  </Text>
                </View>

                <View style={styles.actionsGroup}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingActivity(act);
                      setFormVisible(true);
                    }}
                    style={styles.iconBtn}
                    hitSlop={8}
                  >
                    <Edit3 size={15} color={theme.textMuted} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(act)}
                    style={styles.iconBtn}
                    hitSlop={8}
                  >
                    <Trash2 size={15} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <ActivityFormModal
        visible={formVisible}
        editingActivity={editingActivity}
        initialDateISO={selectedDateISO}
        onClose={() => {
          setFormVisible(false);
          setEditingActivity(null);
        }}
      />

      <NepaliCalendarModal
        visible={showCalendar}
        selectedDateISO={selectedDateISO}
        onSelectDate={(iso) => setSelectedDateISO(iso)}
        onClose={() => setShowCalendar(false)}
        accentColor={palette.accent}
        title="Select Date"
        markedDates={markedDates}
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
    fontSize: 22,
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
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  overviewCard: {
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
  dateTapArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 14,
  },
  activeDateMain: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  activeDateSub: {
    fontSize: 11.5,
    marginTop: 1,
    color: 'rgba(248, 250, 252, 0.65)',
  },
  viewModeToggle: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 999,
    marginBottom: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
  },
  viewModeBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 999,
    alignItems: 'center',
  },
  viewModeBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  viewModeText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  progressSection: {
    gap: 7,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(248, 250, 252, 0.72)',
  },
  progressPct: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#A78BFA',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6.5,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    marginBottom: 10,
    gap: 11,
  },
  checkBtn: {
    padding: 2,
  },
  activityTitle: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  activityMeta: {
    fontSize: 11.5,
    marginTop: 2,
  },
  actionsGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 8,
  },
});
