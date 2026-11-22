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
import { Calendar, Check, Clock, X } from 'lucide-react-native';
import {
  ACTIVITY_CATEGORIES,
  COMMON_ACTIVITY_UNITS,
  ActivityRecord,
  ActivityStatus,
  activitySchema,
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
import { sanitizeDecimalInput } from '../utils/numberInput';
import { NepaliCalendarModal } from './NepaliCalendarModal';
import { TimePickerModal } from './TimePickerModal';

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
  const [showTimePicker, setShowTimePicker] = useState(false);
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
      status: 'completed',
    },
  });

  const currentDateISO = watch('dateISO');
  const currentTime = watch('timeString');
  const currentCategory = watch('category');
  const currentUnit = watch('unit');
  const currentStatus = watch('status');

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
          status: 'completed',
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
          <View style={styles.headerRow}>
            <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
              {editingActivity ? 'Edit Activity Entry' : 'Log Daily Activity'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close activity form"
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
            {/* Status Toggle */}
            <View
              style={[
                styles.statusRow,
                { backgroundColor: theme.inputBg, borderColor: theme.border },
              ]}
            >
              <TouchableOpacity
                onPress={() => setValue('status', 'completed')}
                style={[
                  styles.statusBtn,
                  currentStatus === 'completed' && {
                    backgroundColor: palette.accent,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    {
                      color:
                        currentStatus === 'completed'
                          ? '#FFFFFF'
                          : theme.textSecondary,
                    },
                  ]}
                >
                  Completed (सम्पन्न)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setValue('status', 'pending')}
                style={[
                  styles.statusBtn,
                  currentStatus === 'pending' && {
                    backgroundColor: '#D97706',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusBtnText,
                    {
                      color:
                        currentStatus === 'pending'
                          ? '#FFFFFF'
                          : theme.textSecondary,
                    },
                  ]}
                >
                  Pending (बाँकी)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Activity Title */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Activity Title *
              </Text>
              <Controller
                control={control}
                name="title"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g., Morning Run, Deep Focus Coding, Book Reading"
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

            {/* Numeric Value & Unit */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Numerical Value *
                </Text>
                <TextInput
                  value={numInput}
                  onChangeText={(txt) => {
                    const { text, value } = sanitizeDecimalInput(txt);
                    setNumInput(text);
                    setValue('numericValue', value, {
                      shouldValidate: true,
                    });
                  }}
                  keyboardType="numeric"
                  placeholder="30"
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
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Unit
                </Text>
                <Controller
                  control={control}
                  name="unit"
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      value={value}
                      onChangeText={onChange}
                      placeholder="mins, km, pages..."
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
            </View>

            {/* Quick Unit Chips */}
            <View style={[styles.fieldGroup, { marginTop: -4 }]}>
              <View style={styles.chipsWrap}>
                {COMMON_ACTIVITY_UNITS.map((u) => {
                  const selected = currentUnit === u;
                  return (
                    <TouchableOpacity
                      key={u}
                      onPress={() => setValue('unit', u)}
                      style={[
                        styles.smallChip,
                        {
                          backgroundColor: selected
                            ? palette.accentSoft
                            : theme.inputBg,
                          borderColor: selected ? palette.accent : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '700',
                          color: selected ? palette.accent : theme.textSecondary,
                        }}
                      >
                        {u}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date & Time Row */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1.3 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Date (BS / AD)
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
                  Time (NPT)
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
                      Nepal Time
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Category *
              </Text>
              <View style={styles.chipsWrap}>
                {ACTIVITY_CATEGORIES.map((cat) => {
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
                Notes / Reflections
              </Text>
              <Controller
                control={control}
                name="description"
                render={({ field: { onChange, value } }) => (
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    placeholder="Key takeaways, metrics, or notes..."
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
                {editingActivity ? 'Update Activity' : 'Save Activity'}
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
          title="Select Activity Date"
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
  statusRow: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  statusBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  statusBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldGroup: {
    marginBottom: 14,
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
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
