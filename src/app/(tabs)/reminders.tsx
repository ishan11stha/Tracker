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
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Edit3,
  Plus,
  Repeat,
  Trash2,
} from 'lucide-react-native';
import { useVaultStore } from '../../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../../theme/colors';
import { LAYOUT } from '../../theme/layout';
import {
  BS_MONTHS_EN,
  BS_MONTHS_NE,
  WEEKDAYS_SHORT_NE,
  adToBs,
  buildBSMonthGrid,
  formatBSDateNepali,
  formatTimeString,
  toNepaliDigits,
} from '../../utils/nepaliDate';
import { useCurrentNPT } from '../../hooks/useCurrentNPT';
import { ReminderItem, formatRecurrenceLabel } from '../../types';
import { ReminderFormModal } from '../../components/ReminderFormModal';

type ReminderTabKey = 'upcoming' | 'overdue' | 'completed' | 'calendar';

export default function RemindersScreen() {
  const {
    settings,
    reminders,
    toggleReminderCompleted,
    removeReminder,
  } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('reminders', isDark);

  const nptNow = useCurrentNPT();
  const currentTime24 = `${String(nptNow.hours).padStart(2, '0')}:${String(
    nptNow.minutes
  ).padStart(2, '0')}`;
  const todayBS = useMemo(() => adToBs(nptNow.isoDate), [nptNow.isoDate]);

  const [activeTab, setActiveTab] = useState<ReminderTabKey>('upcoming');
  const [formVisible, setFormVisible] = useState(false);
  const [editingReminder, setEditingReminder] =
    useState<ReminderItem | null>(null);

  // Calendar view state
  const [calBSYear, setCalBSYear] = useState(todayBS.year);
  const [calBSMonth, setCalBSMonth] = useState(todayBS.month);
  const [selectedCalDateISO, setSelectedCalDateISO] = useState(nptNow.isoDate);

  const isReminderOverdue = (r: ReminderItem) => {
    if (r.isCompleted) return false;
    if (r.dateISO < nptNow.isoDate) return true;
    if (r.dateISO === nptNow.isoDate && r.timeString < currentTime24)
      return true;
    return false;
  };

  const categorized = useMemo(() => {
    const upcoming: ReminderItem[] = [];
    const overdue: ReminderItem[] = [];
    const completed: ReminderItem[] = [];

    for (const r of reminders) {
      if (r.isCompleted) {
        completed.push(r);
      } else if (isReminderOverdue(r)) {
        overdue.push(r);
      } else {
        upcoming.push(r);
      }
    }
    return { upcoming, overdue, completed };
  }, [reminders, nptNow.isoDate, currentTime24]);

  const displayedList = useMemo(() => {
    if (activeTab === 'upcoming') return categorized.upcoming;
    if (activeTab === 'overdue') return categorized.overdue;
    if (activeTab === 'completed') return categorized.completed;
    return reminders.filter((r) => r.dateISO === selectedCalDateISO);
  }, [activeTab, categorized, reminders, selectedCalDateISO]);

  // BS Calendar grid for Calendar View tab
  const calendarGrid = useMemo(
    () => buildBSMonthGrid(calBSYear, calBSMonth),
    [calBSYear, calBSMonth]
  );

  const remindersByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of reminders) {
      map[r.dateISO] = (map[r.dateISO] || 0) + 1;
    }
    return map;
  }, [reminders]);

  const handlePrevMonth = () => {
    if (calBSMonth === 1) {
      setCalBSYear((y) => Math.max(2000, y - 1));
      setCalBSMonth(12);
    } else {
      setCalBSMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calBSMonth === 12) {
      setCalBSYear((y) => Math.min(2099, y + 1));
      setCalBSMonth(1);
    } else {
      setCalBSMonth((m) => m + 1);
    }
  };

  const handleDelete = (r: ReminderItem) => {
    Alert.alert('Delete Reminder', `Delete reminder "${r.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => removeReminder(r.id),
      },
    ]);
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
              Reminder Manager
            </Text>
            <Text
              style={[styles.screenSubtitle, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              नेपाली मिति र समय अनुसार अलर्ट • Asia/Kathmandu
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => {
              setEditingReminder(null);
              setFormVisible(true);
            }}
            style={[styles.addBtn, { backgroundColor: palette.accent }]}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>New Reminder</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar: Upcoming, Overdue, Completed, Calendar View */}
        <View
          style={[
            styles.tabsContainer,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {(
            [
              {
                key: 'upcoming',
                label: 'Upcoming',
                count: categorized.upcoming.length,
              },
              {
                key: 'overdue',
                label: 'Overdue',
                count: categorized.overdue.length,
              },
              {
                key: 'completed',
                label: 'Done',
                count: categorized.completed.length,
              },
              { key: 'calendar', label: 'Calendar', count: 0 },
            ] as { key: ReminderTabKey; label: string; count: number }[]
          ).map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.75}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={[
                  styles.tabButton,
                  active && {
                    backgroundColor: palette.accent,
                    shadowColor: palette.accent,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 3,
                    elevation: 2,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: active ? '#FFFFFF' : theme.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {t.label}
                </Text>
                {t.count > 0 && (
                  <View
                    style={[
                      styles.tabBadge,
                      {
                        backgroundColor: active
                          ? 'rgba(255, 255, 255, 0.28)'
                          : isDark
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(0, 0, 0, 0.08)',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.tabBadgeText,
                        { color: active ? '#FFFFFF' : theme.textPrimary },
                      ]}
                    >
                      {t.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Interactive Embedded Nepali Calendar View when "Calendar" tab is active */}
        {activeTab === 'calendar' && (
          <View
            style={[
              styles.calendarCard,
              {
                backgroundColor: theme.card,
                borderColor: palette.accentBorder,
              },
            ]}
          >
            <View style={styles.calHeaderRow}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={[styles.calNavBtn, { borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="Previous Nepali month"
              >
                <ChevronLeft size={18} color={theme.textPrimary} />
              </TouchableOpacity>

              <View style={{ alignItems: 'center' }}>
                <Text
                  style={[styles.calMonthTitle, { color: theme.textPrimary }]}
                >
                  {BS_MONTHS_NE[calBSMonth - 1]} {toNepaliDigits(calBSYear)}
                </Text>
                <Text
                  style={[styles.calMonthSub, { color: theme.textSecondary }]}
                >
                  {BS_MONTHS_EN[calBSMonth - 1]} {calBSYear} BS
                </Text>
              </View>

              <TouchableOpacity
                onPress={handleNextMonth}
                style={[styles.calNavBtn, { borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="Next Nepali month"
              >
                <ChevronRight size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS_SHORT_NE.map((w, idx) => (
                <Text
                  key={w}
                  style={[
                    styles.weekLabel,
                    { color: idx === 6 ? '#DC2626' : theme.textSecondary },
                  ]}
                >
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.calGrid}>
              {Array.from({ length: calendarGrid.leadingEmptyDays }).map(
                (_, i) => (
                  <View key={`empty_${i}`} style={styles.calCell} />
                )
              )}

              {calendarGrid.days.map((cell) => {
                const isSelected = cell.isoDate === selectedCalDateISO;
                const isToday = cell.isoDate === nptNow.isoDate;
                const count = remindersByDate[cell.isoDate] || 0;

                return (
                  <TouchableOpacity
                    key={cell.isoDate}
                    onPress={() => setSelectedCalDateISO(cell.isoDate)}
                    style={styles.calCell}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${formatBSDateNepali(
                      adToBs(cell.isoDate),
                      true
                    )}${count > 0 ? `, ${count} reminders` : ''}`}
                  >
                    <View
                      style={[
                        styles.calDayBox,
                        isToday && {
                          borderWidth: 1.5,
                          borderColor: palette.accent,
                        },
                        isSelected && {
                          backgroundColor: palette.accent,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.calDayText,
                          {
                            color: isSelected
                              ? '#FFFFFF'
                              : cell.weekday === 6
                              ? '#DC2626'
                              : theme.textPrimary,
                          },
                        ]}
                      >
                        {toNepaliDigits(cell.bsDay)}
                      </Text>
                      {count > 0 && (
                        <View
                          style={[
                            styles.calDot,
                            {
                              backgroundColor: isSelected
                                ? '#FFFFFF'
                                : palette.accent,
                            },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View
              style={[
                styles.calSelectedBar,
                { borderTopColor: theme.divider },
              ]}
            >
              <Text
                style={[
                  styles.calSelectedText,
                  { color: theme.textPrimary },
                ]}
              >
                {formatBSDateNepali(adToBs(selectedCalDateISO), true)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingReminder(null);
                  setFormVisible(true);
                }}
              >
                <Text
                  style={[styles.addOnDateLink, { color: palette.accent }]}
                >
                  + Add on this date
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Reminders List */}
        {displayedList.length === 0 ? (
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Bell size={28} color={palette.accent} />
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              No reminders in this view
            </Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Create a reminder with Nepali Bikram Sambat date & Nepal Standard
              Time notification.
            </Text>
          </View>
        ) : (
          displayedList.map((rem) => {
            const bs = adToBs(rem.dateISO);
            const overdue = isReminderOverdue(rem);
            const priorityColor =
              rem.priority === 'High'
                ? '#DC2626'
                : rem.priority === 'Medium'
                ? '#D97706'
                : '#2563EB';

            return (
              <View
                key={rem.id}
                style={[
                  styles.reminderCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: overdue ? '#FCA5A5' : theme.border,
                  },
                ]}
              >
                <View style={styles.remTopRow}>
                  <TouchableOpacity
                    onPress={() => toggleReminderCompleted(rem.id)}
                    style={styles.checkWrap}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: rem.isCompleted }}
                    accessibilityLabel={`Mark ${rem.title} as ${
                      rem.isCompleted ? 'not completed' : 'completed'
                    }`}
                  >
                    {rem.isCompleted ? (
                      <CheckCircle2 size={24} color="#16A34A" />
                    ) : (
                      <Circle size={24} color={palette.accent} />
                    )}
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <View style={styles.titlePriorityRow}>
                      <Text
                        style={[
                          styles.remTitle,
                          {
                            color: theme.textPrimary,
                            textDecorationLine: rem.isCompleted
                              ? 'line-through'
                              : 'none',
                          },
                        ]}
                      >
                        {rem.title}
                      </Text>

                      <View
                        style={[
                          styles.priorityBadge,
                          { backgroundColor: `${priorityColor}18` },
                        ]}
                      >
                        <Text
                          style={[
                            styles.priorityBadgeText,
                            { color: priorityColor },
                          ]}
                        >
                          {rem.priority}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.remCategory,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {rem.category}
                    </Text>

                    <View style={styles.dateTimeRow}>
                      <Calendar size={12} color={palette.accent} />
                      <Text
                        style={[
                          styles.dateTimeText,
                          { color: theme.textPrimary },
                        ]}
                      >
                        {formatBSDateNepali(bs, false)}
                      </Text>
                      <Clock size={12} color={theme.textMuted} />
                      <Text
                        style={[
                          styles.dateTimeText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        {formatTimeString(rem.timeString, settings.timeFormat)}{' '}
                        NPT
                      </Text>
                      {rem.recurrence !== 'none' && (
                        <View style={styles.recurBadge}>
                          <Repeat size={11} color={palette.accent} />
                          <Text
                            style={[
                              styles.recurText,
                              { color: palette.accent },
                            ]}
                          >
                            {formatRecurrenceLabel(rem.recurrence)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {overdue && (
                      <View style={styles.overdueBanner}>
                        <AlertTriangle size={12} color="#DC2626" />
                        <Text style={styles.overdueText}>
                          Overdue in Nepal Standard Time
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actionsCol}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingReminder(rem);
                        setFormVisible(true);
                      }}
                      style={styles.iconBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit reminder ${rem.title}`}
                      hitSlop={8}
                    >
                      <Edit3 size={15} color={theme.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(rem)}
                      style={styles.iconBtn}
                      accessibilityRole="button"
                      accessibilityLabel={`Delete reminder ${rem.title}`}
                      hitSlop={8}
                    >
                      <Trash2 size={15} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>

                {rem.description ? (
                  <Text
                    style={[
                      styles.remDesc,
                      {
                        color: theme.textSecondary,
                        borderTopColor: theme.divider,
                      },
                    ]}
                  >
                    {rem.description}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </ScrollView>

      <ReminderFormModal
        visible={formVisible}
        editingReminder={editingReminder}
        initialDateISO={
          activeTab === 'calendar' ? selectedCalDateISO : nptNow.isoDate
        }
        onClose={() => {
          setFormVisible(false);
          setEditingReminder(null);
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 14,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    gap: 4,
  },
  tabButtonText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  tabBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  calendarCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  calHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calMonthTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  calMonthSub: {
    fontSize: 11,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekLabel: {
    width: '14.285%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.285%',
    aspectRatio: 1,
    padding: 2,
  },
  calDayBox: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayText: {
    fontSize: 13,
    fontWeight: '700',
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  calSelectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  calSelectedText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addOnDateLink: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 18,
    padding: 26,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  reminderCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  remTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkWrap: {
    marginTop: 2,
  },
  titlePriorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  remTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  remCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  dateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  dateTimeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recurBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#FFEDD5',
  },
  recurText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  overdueBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  overdueText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  actionsCol: {
    gap: 10,
    alignItems: 'center',
  },
  iconBtn: {
    padding: 3,
  },
  remDesc: {
    fontSize: 12,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
});
