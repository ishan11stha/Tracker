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
  View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Check, X } from 'lucide-react-native';
import {
  ACTIVITY_CATEGORIES,
  ActivityRecord,
  ActivityRepeat,
  ActivityStatus,
  COMMON_ACTIVITY_UNITS,
  activitySchema,
} from '../types';
import { useVaultStore } from '../store/useVaultStore';
import { getSectionPalette, getThemeColors } from '../theme/colors';
import { LAYOUT } from '../theme/layout';
import {
  adToBs,
  formatBSDateNepali,
  getNowInNPT,
} from '../utils/nepaliDate';
import { sanitizeDecimalInput } from '../utils/numberInput';
import { NepaliCalendarModal } from './NepaliCalendarModal';

interface ActivityFormModalProps {
  visible: boolean;
  editingActivity?: ActivityRecord | null;
  initialDateISO?: string;
  onClose: () => void;
}

interface ActivityFormValues {
  title: string;
  description: string;
  category: string;
  dateISO: string;
  timeString: string;
  numericValue: number;
  unit: string;
  status: ActivityStatus;
  repeat?: ActivityRepeat;
  completedDates?: string[];
}

export const ActivityFormModal: React.FC<ActivityFormModalProps> = ({
  visible,
  editingActivity = null,
  initialDateISO,
  onClose,
}) => {
  const { settings, addActivity, editActivity, isSubmitting } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);
  const palette = getSectionPalette('tracker', isDark);

  const [showCalendar, setShowCalendar] = useState(false);
  const [numInput, setNumInput] = useState('30');

  const npt = getNowInNPT();
  const defaultTime = `${String(npt.hours).padStart(2, '0')}:${String(
    npt.minutes
  ).padStart(2, '0')}`;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      title: '',
      description: '',
      category: ACTIVITY_CATEGORIES[0],
      dateISO: npt.isoDate,
      timeString: defaultTime,
      numericValue: 30,
      unit: 'mins',
      status: 'pending',
      repeat: 'everyday',
      completedDates: [],
    },
  });

  const currentDateISO = watch('dateISO');
  const currentCategory = watch('category');
  const currentUnit = watch('unit');
  const currentRepeat = watch('repeat') || 'everyday';

  useEffect(() => {
    if (visible) {
      if (editingActivity) {
        reset({
          title: editingActivity.title,
          description: editingActivity.description || '',
          category: editingActivity.category,
          dateISO: editingActivity.dateISO,
          timeString: editingActivity.timeString,
          numericValue: editingActivity.numericValue,
          unit: editingActivity.unit || 'mins',
          status: editingActivity.status,
          repeat: editingActivity.repeat || 'once',
          completedDates: editingActivity.completedDates || [],
        });
        setNumInput(String(editingActivity.numericValue));
      } else {
        const now = getNowInNPT();
        const nowTime = `${String(now.hours).padStart(2, '0')}:${String(
          now.minutes
        ).padStart(2, '0')}`;
        reset({
          title: '',
          description: '',
          category: ACTIVITY_CATEGORIES[0],
          dateISO: initialDateISO || now.isoDate,
          timeString: nowTime,
          numericValue: 30,
          unit: 'mins',
          status: 'pending',
          repeat: 'everyday',
          completedDates: [],
        });
        setNumInput('30');
      }
    }
  }, [visible, editingActivity, initialDateISO, reset]);

  const onSubmit = async (values: ActivityFormValues) => {
    try {
      if (editingActivity) {
        await editActivity(editingActivity.id, values);
      } else {
        await addActivity(values);
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
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              alignSelf: 'center',
              marginBottom: 10,
              backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#CBD5E1',
            }}
          />
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              {editingActivity ? 'Edit Habit' : 'Log Habit'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close habit form"
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
            {/* Title */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Habit / Activity *
              </Text>
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g., Morning Run, Study, Read Book"
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

            {/* Amount + 4 Quick Unit Chips */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Amount & Unit
              </Text>
              <View style={styles.amountUnitRow}>
                <TextInput
                  value={numInput}
                  onChangeText={(txt) => {
                    const { text, value } = sanitizeDecimalInput(txt);
                    setNumInput(text);
                    setValue('numericValue', value, { shouldValidate: true });
                  }}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.numInput,
                    {
                      backgroundColor: theme.inputBg,
                      color: theme.textPrimary,
                      borderColor: theme.border,
                    },
                  ]}
                />

                <View style={styles.unitPillsRow}>
                  {COMMON_ACTIVITY_UNITS.map((u) => {
                    const selected = currentUnit === u;
                    return (
                      <TouchableOpacity
                        key={u}
                        onPress={() => setValue('unit', u)}
                        style={[
                          styles.unitChip,
                          {
                            backgroundColor: selected
                              ? palette.accent
                              : theme.inputBg,
                            borderColor: selected
                              ? palette.accent
                              : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitChipText,
                            {
                              color: selected
                                ? '#FFFFFF'
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {u}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 4 Clean Category Options */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Category
              </Text>
              <View style={styles.catRow}>
                {ACTIVITY_CATEGORIES.map((cat) => {
                  const selected = currentCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => setValue('category', cat)}
                      style={[
                        styles.catBtn,
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
                          styles.catBtnText,
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

            {/* Repeat Schedule: Everyday / Sun-Fri / Once */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Schedule
              </Text>
              <View style={styles.catRow}>
                {(
                  [
                    { key: 'everyday', label: 'Everyday' },
                    { key: 'weekdays', label: 'Sun–Fri' },
                    { key: 'once', label: 'Once' },
                  ] as const
                ).map((opt) => {
                  const selected = currentRepeat === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => setValue('repeat', opt.key)}
                      style={[
                        styles.catBtn,
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
                          styles.catBtnText,
                          { color: selected ? '#FFFFFF' : theme.textPrimary },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date Selector — only shown for one-time logs */}
            {currentRepeat === 'once' && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Date
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
                  <Text
                    style={[styles.pickerMainText, { color: theme.textPrimary }]}
                  >
                    {formatBSDateNepali(bsDate, false)} ({currentDateISO})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Optional 1-line Note */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Note (Optional)
              </Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Short note..."
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.textInput,
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
                {editingActivity ? 'Update' : 'Save Habit'}
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
          title="Select Date"
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
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: '88%',
    borderTopWidth: 1,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  fieldGroup: {
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
    minHeight: 46,
    fontSize: 14,
  },
  amountUnitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numInput: {
    width: 76,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  unitPillsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
  },
  unitChip: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  catRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  catBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  pickerMainText: {
    fontSize: 13.5,
    fontWeight: '700',
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
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
