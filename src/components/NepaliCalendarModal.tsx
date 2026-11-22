import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  X,
} from 'lucide-react-native';
import {
  AD_MONTHS_EN,
  AD_MONTHS_SHORT,
  BS_MONTHS_EN,
  BS_MONTHS_NE,
  WEEKDAYS_SHORT_EN,
  WEEKDAYS_SHORT_NE,
  adToBs,
  buildADMonthGrid,
  buildBSMonthGrid,
  formatADDateFull,
  formatBSDateEnglish,
  formatBSDateNepali,
  getNowInNPT,
  toNepaliDigits,
} from '../utils/nepaliDate';
import { getThemeColors } from '../theme/colors';
import { useVaultStore } from '../store/useVaultStore';

interface NepaliCalendarModalProps {
  visible: boolean;
  selectedDateISO: string; // YYYY-MM-DD (Gregorian storage)
  onSelectDate: (isoDate: string) => void;
  onClose: () => void;
  accentColor?: string;
  title?: string;
  markedDates?: Record<string, { count: number; color?: string }>;
}

export const NepaliCalendarModal: React.FC<NepaliCalendarModalProps> = ({
  visible,
  selectedDateISO,
  onSelectDate,
  onClose,
  accentColor = '#0F172A',
  title = 'Select Date (मिति छान्नुहोस्)',
  markedDates,
}) => {
  const { settings } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);

  const todayISO = useMemo(() => getNowInNPT().isoDate, []);
  const initialISO = selectedDateISO || todayISO;
  const initialBS = useMemo(() => adToBs(initialISO), [initialISO]);
  const initialADParts = useMemo(
    () => initialISO.split('-').map(Number),
    [initialISO]
  );

  const [calendarMode, setCalendarMode] = useState<'BS' | 'AD'>(
    settings.preferredCalendar
  );
  const [viewBSYear, setViewBSYear] = useState<number>(initialBS.year);
  const [viewBSMonth, setViewBSMonth] = useState<number>(initialBS.month);
  const [viewADYear, setViewADYear] = useState<number>(initialADParts[0]);
  const [viewADMonth, setViewADMonth] = useState<number>(initialADParts[1]);
  const [showYearPicker, setShowYearPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setViewBSYear(initialBS.year);
      setViewBSMonth(initialBS.month);
      setViewADYear(initialADParts[0]);
      setViewADMonth(initialADParts[1]);
      setCalendarMode(settings.preferredCalendar);
      setShowYearPicker(false);
    }
  }, [
    visible,
    initialBS.year,
    initialBS.month,
    initialADParts,
    settings.preferredCalendar,
  ]);

  const selectedBS = useMemo(() => adToBs(initialISO), [initialISO]);

  const grid = useMemo(() => {
    if (calendarMode === 'BS') {
      return buildBSMonthGrid(viewBSYear, viewBSMonth);
    }
    return buildADMonthGrid(viewADYear, viewADMonth);
  }, [calendarMode, viewBSYear, viewBSMonth, viewADYear, viewADMonth]);

  const handlePrevMonth = () => {
    if (calendarMode === 'BS') {
      if (viewBSMonth === 1) {
        if (viewBSYear > 2000) {
          setViewBSYear((y) => y - 1);
          setViewBSMonth(12);
        }
      } else {
        setViewBSMonth((m) => m - 1);
      }
    } else {
      if (viewADMonth === 1) {
        setViewADYear((y) => y - 1);
        setViewADMonth(12);
      } else {
        setViewADMonth((m) => m - 1);
      }
    }
  };

  const handleNextMonth = () => {
    if (calendarMode === 'BS') {
      if (viewBSMonth === 12) {
        if (viewBSYear < 2099) {
          setViewBSYear((y) => y + 1);
          setViewBSMonth(1);
        }
      } else {
        setViewBSMonth((m) => m + 1);
      }
    } else {
      if (viewADMonth === 12) {
        setViewADYear((y) => y + 1);
        setViewADMonth(1);
      } else {
        setViewADMonth((m) => m + 1);
      }
    }
  };

  const handleJumpToday = () => {
    const nowNPT = getNowInNPT();
    const todayBS = adToBs(nowNPT.isoDate);
    setViewBSYear(todayBS.year);
    setViewBSMonth(todayBS.month);
    setViewADYear(nowNPT.year);
    setViewADMonth(nowNPT.month);
    onSelectDate(nowNPT.isoDate);
  };

  const bsYears = useMemo(() => {
    const arr: number[] = [];
    for (let y = 2070; y <= 2095; y++) arr.push(y);
    return arr;
  }, []);

  const adYears = useMemo(() => {
    const arr: number[] = [];
    for (let y = 2014; y <= 2038; y++) arr.push(y);
    return arr;
  }, []);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={[styles.overlay, { backgroundColor: theme.modalOverlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTitleWrap}>
              <Calendar size={18} color={accentColor} />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                {title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close calendar"
              hitSlop={8}
            >
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Selected Date Banner (BS + AD Simultaneous View) */}
          <View
            style={[
              styles.selectedBanner,
              {
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderColor: theme.border,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.bannerBS, { color: theme.textPrimary }]}>
                {formatBSDateNepali(selectedBS, true)}
              </Text>
              <Text style={[styles.bannerAD, { color: theme.textSecondary }]}>
                {formatBSDateEnglish(selectedBS, false)} • {formatADDateFull(initialISO)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleJumpToday}
              style={[styles.todayPill, { borderColor: accentColor }]}
            >
              <RotateCcw size={12} color={accentColor} />
              <Text style={[styles.todayPillText, { color: accentColor }]}>
                आज / Today
              </Text>
            </TouchableOpacity>
          </View>

          {/* BS / AD Mode Switcher */}
          <View style={styles.controlsBar}>
            <View
              style={[
                styles.modeToggle,
                { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  calendarMode === 'BS' && {
                    backgroundColor: accentColor,
                  },
                ]}
                onPress={() => setCalendarMode('BS')}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    {
                      color:
                        calendarMode === 'BS' ? '#FFFFFF' : theme.textSecondary,
                    },
                  ]}
                >
                  बि.सं. (BS)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeBtn,
                  calendarMode === 'AD' && {
                    backgroundColor: accentColor,
                  },
                ]}
                onPress={() => setCalendarMode('AD')}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    {
                      color:
                        calendarMode === 'AD' ? '#FFFFFF' : theme.textSecondary,
                    },
                  ]}
                >
                  ई.सं. (AD)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity
                onPress={handlePrevMonth}
                style={[styles.navIconBtn, { borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <ChevronLeft size={18} color={theme.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowYearPicker((prev) => !prev)}
                style={styles.monthTitleBtn}
              >
                {calendarMode === 'BS' ? (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.monthTitleMain, { color: theme.textPrimary }]}>
                      {BS_MONTHS_NE[viewBSMonth - 1]} {toNepaliDigits(viewBSYear)}
                    </Text>
                    <Text style={[styles.monthTitleSub, { color: theme.textMuted }]}>
                      {BS_MONTHS_EN[viewBSMonth - 1]} {viewBSYear} BS
                    </Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[styles.monthTitleMain, { color: theme.textPrimary }]}>
                      {AD_MONTHS_EN[viewADMonth - 1]} {viewADYear}
                    </Text>
                    <Text style={[styles.monthTitleSub, { color: theme.textMuted }]}>
                      Gregorian (AD)
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNextMonth}
                style={[styles.navIconBtn, { borderColor: theme.border }]}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <ChevronRight size={18} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Optional Year & Month Quick Selector */}
          {showYearPicker && (
            <View
              style={[
                styles.yearPickerBox,
                {
                  backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                  borderColor: theme.border,
                },
              ]}
            >
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.yearChipsRow}
              >
                {(calendarMode === 'BS' ? bsYears : adYears).map((yr) => {
                  const isActive =
                    calendarMode === 'BS' ? yr === viewBSYear : yr === viewADYear;
                  return (
                    <TouchableOpacity
                      key={yr}
                      onPress={() => {
                        if (calendarMode === 'BS') setViewBSYear(yr);
                        else setViewADYear(yr);
                        setShowYearPicker(false);
                      }}
                      style={[
                        styles.yearChip,
                        {
                          backgroundColor: isActive ? accentColor : 'transparent',
                          borderColor: isActive ? accentColor : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: isActive ? '#FFFFFF' : theme.textPrimary,
                        }}
                      >
                        {calendarMode === 'BS' ? `${toNepaliDigits(yr)} (${yr})` : yr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Weekday Headers */}
          <View style={styles.weekHeaderRow}>
            {[0, 1, 2, 3, 4, 5, 6].map((wIdx) => (
              <View key={wIdx} style={styles.weekHeaderCell}>
                <Text
                  style={[
                    styles.weekHeaderText,
                    {
                      color:
                        wIdx === 6
                          ? '#DC2626' // Saturday holiday in Nepal
                          : theme.textSecondary,
                    },
                  ]}
                >
                  {calendarMode === 'BS'
                    ? WEEKDAYS_SHORT_NE[wIdx]
                    : WEEKDAYS_SHORT_EN[wIdx]}
                </Text>
                <Text style={[styles.weekHeaderSub, { color: theme.textMuted }]}>
                  {calendarMode === 'BS'
                    ? WEEKDAYS_SHORT_EN[wIdx]
                    : WEEKDAYS_SHORT_NE[wIdx]}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.gridWrap}>
            {Array.from({ length: grid.leadingEmptyDays }).map((_, idx) => (
              <View key={`empty_${idx}`} style={styles.dayCell} />
            ))}

            {grid.days.map((cell) => {
              const isSelected = cell.isoDate === initialISO;
              const isToday = cell.isoDate === todayISO;
              const isSaturday = cell.weekday === 6;
              const marker = markedDates?.[cell.isoDate];

              const primaryText =
                calendarMode === 'BS'
                  ? toNepaliDigits(cell.bsDay)
                  : String(cell.adDay);
              const secondaryText =
                calendarMode === 'BS'
                  ? `${cell.adDay} ${AD_MONTHS_SHORT[cell.adMonth - 1].slice(0, 3)}`
                  : toNepaliDigits(cell.bsDay);

              return (
                <TouchableOpacity
                  key={cell.isoDate}
                  style={styles.dayCell}
                  onPress={() => {
                    onSelectDate(cell.isoDate);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${formatBSDateNepali(
                    adToBs(cell.isoDate),
                    true
                  )}, ${formatADDateFull(cell.isoDate)}`}
                >
                  <View
                    style={[
                      styles.dayInner,
                      isToday && {
                        borderWidth: 1.5,
                        borderColor: accentColor,
                      },
                      isSelected && {
                        backgroundColor: accentColor,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayPrimaryText,
                        {
                          color: isSelected
                            ? '#FFFFFF'
                            : isSaturday
                            ? '#DC2626'
                            : theme.textPrimary,
                        },
                      ]}
                    >
                      {primaryText}
                    </Text>
                    <Text
                      style={[
                        styles.daySecondaryText,
                        {
                          color: isSelected
                            ? 'rgba(255,255,255,0.85)'
                            : theme.textMuted,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {secondaryText}
                    </Text>
                    {marker && marker.count > 0 && (
                      <View
                        style={[
                          styles.markerDot,
                          {
                            backgroundColor: isSelected
                              ? '#FFFFFF'
                              : marker.color || accentColor,
                          },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer Action */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.confirmBtn,
                { backgroundColor: accentColor },
              ]}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>
                Confirm Date ({formatBSDateNepali(selectedBS, false)})
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  selectedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  bannerBS: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  bannerAD: {
    fontSize: 11,
  },
  todayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  todayPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  monthNav: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  navIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleBtn: {
    minWidth: 110,
    alignItems: 'center',
  },
  monthTitleMain: {
    fontSize: 14,
    fontWeight: '700',
  },
  monthTitleSub: {
    fontSize: 10,
  },
  yearPickerBox: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  yearChipsRow: {
    gap: 6,
    paddingHorizontal: 4,
  },
  yearChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 6,
    marginBottom: 6,
  },
  weekHeaderCell: {
    width: '14.285%',
    alignItems: 'center',
  },
  weekHeaderText: {
    fontSize: 12,
    fontWeight: '700',
  },
  weekHeaderSub: {
    fontSize: 9,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285%',
    aspectRatio: 0.95,
    padding: 2,
  },
  dayInner: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
  },
  daySecondaryText: {
    fontSize: 8,
    marginTop: 1,
  },
  markerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
  footerRow: {
    marginTop: 12,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
