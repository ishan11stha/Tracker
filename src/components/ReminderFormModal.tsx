import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Bell,
  Calendar,
  Check,
  Clock,
  Repeat,
  Vibrate,
  Volume2,
  X,
} from 'lucide-react-native';
import {
  REMINDER_ALERT_MODES,
  REMINDER_CATEGORIES,
  REMINDER_PRIORITIES,
  REMINDER_WEEKDAYS,
  ReminderAlertMode,
  ReminderItem,
  ReminderPriority,
  ReminderRecurrence,
  WeekdayRecurrenceKey,
  parseRecurrenceWeekdays,
  reminderSchema,
} from '../types';
import { useVaultStore } from '../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../theme/colors';
import { LAYOUT } from '../theme/layout';
import {
  adToBs,
  formatBSDateNepali,
  formatTimeString,
  getNowInNPT,
} from '../utils/nepaliDate';
import { NepaliCalendarModal } from './NepaliCalendarModal';
import { TimePickerModal } from './TimePickerModal';

interface ReminderFormModalProps {
  visible: boolean;
  editingReminder?: ReminderItem | null;
  initialDateISO?: string;
  onClose: () => void;
}

interface ReminderFormValues {
  title: string;
  description: string;
  dateISO: string;
  timeString: string;
  priority: ReminderPriority;
  category: string;
  recurrence: ReminderRecurrence;
  alertMode?: ReminderAlertMode;
}

function getUpcomingNPTTimeString(): string {
  const now = getNowInNPT();
  const totalMins = now.hours * 60 + now.minutes + 5;
  const rounded = (Math.ceil(totalMins / 5) * 5) % 1440;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const ReminderFormModal: React.FC<ReminderFormModalProps> = ({
  visible,
  editingReminder = null,
  initialDateISO,
  onClose,
}) => {
  const { settings, addReminder, editReminder, isSubmitting } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('reminders', isDark);

  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const npt = getNowInNPT();

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: '',
      description: '',
      dateISO: initialDateISO || npt.isoDate,
      timeString: getUpcomingNPTTimeString(),
      priority: 'Medium',
      category: REMINDER_CATEGORIES[0],
      recurrence: 'none',
      alertMode: 'both',
    },
  });

  const currentDateISO = watch('dateISO');
  const currentTime = watch('timeString');
  const currentPriority = watch('priority');
  const currentCategory = watch('category');
  const currentRecurrence = watch('recurrence');
  const currentAlertMode = watch('alertMode') || 'both';

  useEffect(() => {
    if (visible) {
      if (editingReminder) {
        reset({
          title: editingReminder.title,
          description: editingReminder.description || '',
          dateISO: editingReminder.dateISO,
          timeString: editingReminder.timeString,
          priority: editingReminder.priority,
          category: editingReminder.category,
          recurrence: editingReminder.recurrence,
          alertMode: editingReminder.alertMode || 'both',
        });
      } else {
        reset({
          title: '',
          description: '',
          dateISO: initialDateISO || getNowInNPT().isoDate,
          timeString: getUpcomingNPTTimeString(),
          priority: 'Medium',
          category: REMINDER_CATEGORIES[0],
          recurrence: 'none',
          alertMode: 'both',
        });
      }
    }
  }, [visible, editingReminder, initialDateISO, reset]);

  const onSubmit = async (values: ReminderFormValues) => {
    try {
      if (editingReminder) {
        await editReminder(editingReminder.id, values);
      } else {
        await addReminder(values);
      }
      onClose();
    } catch {
      // handled in store
    }
  };

  const bsDate = adToBs(currentDateISO || npt.isoDate);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Bell size={18} color={palette.accent} />
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                {editingReminder ? 'Edit Reminder' : 'Create Reminder'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close reminder form"
              hitSlop={8}
            >
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Reminder Title */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Reminder Title *
              </Text>
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g., Pay NEA Electricity Bill, Renew Insurance"
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.inputBg,
                        color: theme.textPrimary,
                        borderColor: errors.title ? '#DC2626' : theme.border,
                      },
                    ]}
                  />
                )}
              />
              {errors.title && (
                <Text style={styles.errorText}>{errors.title.message}</Text>
              )}
            </View>

            {/* Nepali Date & NPT Time Row */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1.35 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Nepali Date (BS / AD) *
                </Text>
                <TouchableOpacity
                  onPress={() => setShowCalendar(true)}
                  style={[
                    styles.pickerBtn,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Calendar size={16} color={palette.accent} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.pickerMainText, { color: theme.textPrimary }]}
                      numberOfLines={1}
                    >
                      {formatBSDateNepali(bsDate, false)}
                    </Text>
                    <Text
                      style={[styles.pickerSubText, { color: theme.textMuted }]}
                    >
                      {currentDateISO}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Time (NPT) *
                </Text>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  style={[
                    styles.pickerBtn,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <Clock size={16} color={palette.accent} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.pickerMainText, { color: theme.textPrimary }]}
                    >
                      {formatTimeString(currentTime, settings.timeFormat)}
                    </Text>
                    <Text
                      style={[styles.pickerSubText, { color: theme.textMuted }]}
                    >
                      Asia/Kathmandu
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Priority Level */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Priority *
              </Text>
              <View style={styles.priorityRow}>
                {REMINDER_PRIORITIES.map((p) => {
                  const selected = currentPriority === p.label;
                  return (
                    <TouchableOpacity
                      key={p.label}
                      onPress={() => setValue('priority', p.label)}
                      style={[
                        styles.priorityBtn,
                        {
                          backgroundColor: selected ? p.color : theme.inputBg,
                          borderColor: selected ? p.color : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityBtnText,
                          { color: selected ? '#FFFFFF' : theme.textPrimary },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Alert Mode: Alarm & Vibrate */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Volume2 size={13} color={theme.textSecondary} />
                <Text
                  style={[
                    styles.label,
                    { color: theme.textSecondary, marginBottom: 0 },
                  ]}
                >
                  Alert Mode (Alarm & Vibrate) *
                </Text>
              </View>
              <View style={styles.priorityRow}>
                {REMINDER_ALERT_MODES.map((mode) => {
                  const selected = currentAlertMode === mode.key;
                  const iconColor = selected ? '#FFFFFF' : palette.accent;
                  return (
                    <TouchableOpacity
                      key={mode.key}
                      onPress={() => {
                        setValue('alertMode', mode.key, {
                          shouldValidate: true,
                        });
                        if (
                          (mode.key === 'vibrate' || mode.key === 'both') &&
                          Platform.OS !== 'web'
                        ) {
                          try {
                            Vibration.vibrate([0, 200, 100, 300]);
                          } catch {
                            // Ignore on devices without vibrator
                          }
                        }
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${mode.label} (${mode.sublabel})`}
                      style={[
                        styles.priorityBtn,
                        {
                          backgroundColor: selected
                            ? palette.accent
                            : theme.inputBg,
                          borderColor: selected ? palette.accent : theme.border,
                          paddingHorizontal: 6,
                          paddingVertical: 9,
                          gap: 3,
                        },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        {mode.key === 'alarm' ? (
                          <Volume2 size={14} color={iconColor} />
                        ) : mode.key === 'vibrate' ? (
                          <Vibrate size={14} color={iconColor} />
                        ) : (
                          <Bell size={14} color={iconColor} />
                        )}
                        <Text
                          style={[
                            styles.priorityBtnText,
                            {
                              fontSize: 12,
                              color: selected ? '#FFFFFF' : theme.textPrimary,
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {mode.label}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '600',
                          color: selected
                            ? 'rgba(255,255,255,0.86)'
                            : theme.textMuted,
                        }}
                        numberOfLines={1}
                      >
                        {mode.sublabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Recurrence (Days of the Week) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Repeat size={13} color={theme.textSecondary} />
                <Text style={[styles.label, { color: theme.textSecondary, marginBottom: 0 }]}>
                  Repeat Days
                </Text>
              </View>
              <View style={styles.chipsWrap}>
                {REMINDER_WEEKDAYS.map((day) => {
                  const selectedDays = parseRecurrenceWeekdays(currentRecurrence);
                  const selected = selectedDays.includes(day.key);
                  const handleToggleDay = (key: WeekdayRecurrenceKey) => {
                    const liveDays = parseRecurrenceWeekdays(
                      getValues('recurrence')
                    );
                    const isCurrentlySelected = liveDays.includes(key);
                    const nextDays = isCurrentlySelected
                      ? liveDays.filter((d) => d !== key)
                      : REMINDER_WEEKDAYS.filter(
                          (d) => liveDays.includes(d.key) || d.key === key
                        ).map((d) => d.key);
                    setValue(
                      'recurrence',
                      nextDays.length > 0 ? nextDays.join(',') : 'none',
                      { shouldValidate: true }
                    );
                  };
                  return (
                    <TouchableOpacity
                      key={day.key}
                      onPress={() => handleToggleDay(day.key)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`Repeat on ${day.label}`}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? palette.accent
                            : theme.inputBg,
                          borderColor: selected ? palette.accent : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? '#FFFFFF' : theme.textPrimary },
                        ]}
                      >
                        {day.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Category *
              </Text>
              <View style={styles.chipsWrap}>
                {REMINDER_CATEGORIES.map((cat) => {
                  const selected = currentCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setValue('category', cat)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? palette.accent
                            : theme.inputBg,
                          borderColor: selected ? palette.accent : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: selected ? '#FFFFFF' : theme.textPrimary },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Description */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Description & Notes
              </Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Additional details for the Android notification..."
                    placeholderTextColor={theme.textMuted}
                    multiline
                    numberOfLines={3}
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: theme.inputBg,
                        color: theme.textPrimary,
                        borderColor: theme.border,
                      },
                    ]}
                  />
                )}
              />
            </View>

            <TouchableOpacity
              disabled={isSubmitting}
              onPress={() => {
                handleSubmit(onSubmit)();
              }}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: palette.accent,
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>
                {editingReminder ? 'Update Reminder' : 'Schedule Reminder'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <NepaliCalendarModal
          visible={showCalendar}
          selectedDateISO={currentDateISO || npt.isoDate}
          onSelectDate={(iso) => setValue('dateISO', iso)}
          onClose={() => setShowCalendar(false)}
          accentColor={palette.accent}
          title="Select Reminder Date"
        />

        <TimePickerModal
          visible={showTimePicker}
          value24={currentTime}
          onSelectTime={(t) => setValue('timeString', t)}
          onClose={() => setShowTimePicker(false)}
          accentColor={palette.accent}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  sheet: {
    width: '100%',
    maxWidth: LAYOUT.maxModalWidth,
    alignSelf: 'center',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
    maxHeight: '92%',
    borderTopWidth: 1,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 72,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  pickerMainText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pickerSubText: {
    fontSize: 10,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
