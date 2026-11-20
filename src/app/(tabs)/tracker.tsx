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
  Clock,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useVaultStore } from '../../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../theme/colors';
import {
  BS_MONTHS_NE,
  adToBs,
  formatADDateFull,
  formatBSDateNepali,
  formatTimeString,
  getNowInNPT,
  toNepaliDigits,
} from '../../utils/nepaliDate';
import { ACTIVITY_CATEGORIES, ActivityRecord } from '../../types';
import { ActivityFormModal } from '../../components/ActivityFormModal';
import { NepaliCalendarModal } from '../../components/NepaliCalendarModal';
import { FinanceHealthGauge } from '../../components/monekin/MonekinCharts';

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

  const nptToday = useMemo(() => getNowInNPT(), []);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDateISO, setSelectedDateISO] = useState(nptToday.isoDate);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCalendar, setShowCalendar] = useState(false);

  const [formVisible, setFormVisible] = useState(false);
  const [editingActivity, setEditingActivity] =
    useState<ActivityRecord | null>(null);

  const selectedBS = useMemo(() => adToBs(selectedDateISO), [selectedDateISO]);

  // Filter activities by Daily or Monthly view
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      if (selectedCategory !== 'All' && act.category !== selectedCategory) {
        return false;
      }
      if (viewMode === 'daily') {
        return act.dateISO === selectedDateISO;
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
    selectedBS,
    selectedCategory,
    settings.preferredCalendar,
  ]);

  const summary = useMemo(() => {
    const total = filteredActivities.length;
    const completed = filteredActivities.filter(
      (a) => a.status === 'completed'
    ).length;
    const pending = total - completed;
    const totalNumeric = filteredActivities.reduce(
      (acc, a) => acc + (a.numericValue || 0),
      0
    );
    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, totalNumeric, completionRate };
  }, [filteredActivities]);

  // Marked dates for calendar picker
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
      'Delete Activity',
      `Delete "${act.title}" (${act.numericValue} ${act.unit})?`,
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
          <View>
            <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>
              Activity & Habits
            </Text>
            <Text
              style={[styles.screenSubtitle, { color: theme.textMuted }]}
            >
              दैनिक क्रियाकलाप तथा बानी ट्र्याकर
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
            <Text style={styles.addBtnText}>Log Activity</Text>
          </TouchableOpacity>
        </View>

        {/* Daily / Monthly Switcher + Date Selector Bar */}
        <View
          style={[
            styles.dateControlCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.viewModeToggle,
              { backgroundColor: theme.surfaceContainerHigh },
            ]}
          >
            <TouchableOpacity
              onPress={() => setViewMode('daily')}
              style={[
                styles.viewModeBtn,
                viewMode === 'daily' && { backgroundColor: palette.accent },
              ]}
            >
              <Text
                style={[
                  styles.viewModeText,
                  {
                    color:
                      viewMode === 'daily' ? '#FFFFFF' : theme.textMuted,
                  },
                ]}
              >
                Daily View (दैनिक)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode('monthly')}
              style={[
                styles.viewModeBtn,
                viewMode === 'monthly' && { backgroundColor: palette.accent },
              ]}
            >
              <Text
                style={[
                  styles.viewModeText,
                  {
                    color:
                      viewMode === 'monthly' ? '#FFFFFF' : theme.textMuted,
                  },
                ]}
              >
                Monthly View (मासिक)
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setShowCalendar(true)}
            style={[
              styles.activeDateBanner,
              { backgroundColor: theme.inputBg, borderColor: theme.border },
            ]}
          >
            <Calendar size={18} color={palette.accent} />
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.activeDateMain, { color: theme.textPrimary }]}
              >
                {viewMode === 'daily'
                  ? formatBSDateNepali(selectedBS, true)
                  : `${BS_MONTHS_NE[selectedBS.month - 1]} ${toNepaliDigits(
                    selectedBS.year
                  )} (मासिक सारांश)`}
              </Text>
              <Text
                style={[styles.activeDateSub, { color: theme.textMuted }]}
              >
                {formatADDateFull(selectedDateISO)}
              </Text>
            </View>
            <Text style={[styles.changeDateText, { color: palette.accent }]}>
              Change
            </Text>
          </TouchableOpacity>
        </View>

        {/* Monekin 270° Circular Completion Gauge Card */}
        <View
          style={[
            styles.statsCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.gaugeSummaryRow}>
            <FinanceHealthGauge
              score={summary.completionRate}
              size={88}
              isDark={isDark}
            />
            <View style={styles.statsGridRight}>
              <View style={styles.statMiniBox}>
                <Text style={[styles.statVal, { color: palette.accent }]}>
                  {summary.total}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Total Logs
                </Text>
              </View>

              <View style={styles.statMiniBox}>
                <Text style={[styles.statVal, { color: '#37A13B' }]}>
                  {summary.completed}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Completed
                </Text>
              </View>

              <View style={styles.statMiniBox}>
                <Text style={[styles.statVal, { color: '#D97706' }]}>
                  {summary.pending}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textMuted }]}>
                  Pending
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {['All', ...ACTIVITY_CATEGORIES].map((cat) => {
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                onPress={() => setSelectedCategory(cat)}
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
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Activity Entries List */}
        {filteredActivities.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Activity size={28} color={palette.accent} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              No activities logged for this{' '}
              {viewMode === 'daily' ? 'day' : 'month'}
            </Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>
              Tap "Log Activity" to record workouts, study hours, hydration, or
              daily habits.
            </Text>
          </View>
        ) : (
          filteredActivities.map((act) => {
            const isCompleted = act.status === 'completed';
            const bs = adToBs(act.dateISO);
            return (
              <View
                key={act.id}
                style={[
                  styles.activityCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.activityMainRow}>
                  <TouchableOpacity
                    onPress={() => toggleActivityStatus(act.id)}
                    style={styles.checkBtn}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={24} color={palette.accent} />
                    ) : (
                      <Circle size={24} color={theme.textMuted} />
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
                    >
                      {act.title}
                    </Text>

                    <Text
                      style={[
                        styles.activityCategory,
                        { color: theme.textMuted },
                      ]}
                    >
                      {act.category}
                    </Text>

                    <View style={styles.timeMetaRow}>
                      <Clock size={12} color={theme.textMuted} />
                      <Text
                        style={[
                          styles.timeMetaText,
                          { color: theme.textMuted },
                        ]}
                      >
                        {formatBSDateNepali(bs, false)} •{' '}
                        {formatTimeString(act.timeString, settings.timeFormat)}{' '}
                        NPT
                      </Text>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 8 }}>
                    <View
                      style={[
                        styles.numericBadge,
                        { backgroundColor: palette.accentSoft },
                      ]}
                    >
                      <Text
                        style={[
                          styles.numericBadgeText,
                          { color: palette.accent },
                        ]}
                      >
                        {act.numericValue} {act.unit}
                      </Text>
                    </View>

                    <View style={styles.actionsGroup}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingActivity(act);
                          setFormVisible(true);
                        }}
                        style={styles.iconBtn}
                      >
                        <Edit3 size={15} color={theme.textMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(act)}
                        style={styles.iconBtn}
                      >
                        <Trash2 size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {act.description ? (
                  <Text
                    style={[
                      styles.activityDesc,
                      {
                        color: theme.textSecondary,
                        borderTopColor: theme.divider,
                      },
                    ]}
                  >
                    {act.description}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <ActivityFormModal
        visible={formVisible}
        editingActivity={editingActivity}
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
        title="Select Activity Date (BS / AD)"
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
  dateControlCard: {
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    marginBottom: 14,
  },
  viewModeToggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 999,
    marginBottom: 10,
  },
  viewModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeDateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  activeDateMain: {
    fontSize: 14,
    fontWeight: '800',
  },
  activeDateSub: {
    fontSize: 11,
    marginTop: 1,
  },
  changeDateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  gaugeSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statsGridRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statMiniBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 20,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
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
    padding: 26,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  activityCard: {
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    marginBottom: 10,
  },
  activityMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkBtn: {
    padding: 2,
  },
  activityTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  activityCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  timeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  timeMetaText: {
    fontSize: 11,
  },
  numericBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  numericBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionsGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  iconBtn: {
    padding: 3,
  },
  activityDesc: {
    fontSize: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
});
