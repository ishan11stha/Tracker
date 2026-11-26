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
import {
  Calendar,
  Car,
  Check,
  GraduationCap,
  Heart,
  Home,
  Plane,
  Shield,
  Smartphone,
  Target,
  X,
} from 'lucide-react-native';
import {
  SAVINGS_GOAL_PRESETS,
  SavingsGoal,
  SavingsGoalIcon,
} from '../types';
import { useVaultStore } from '../store/useVaultStore';
import { getThemeColors } from '../theme/colors';
import { LAYOUT } from '../theme/layout';
import { adToBs, formatBSDateNepali, getNowInNPT } from '../utils/nepaliDate';
import { sanitizeDecimalInput } from '../utils/numberInput';
import { NepaliCalendarModal } from './NepaliCalendarModal';

export function renderGoalIcon(
  icon: SavingsGoalIcon,
  color: string,
  size = 20
) {
  switch (icon) {
    case 'plane':
      return <Plane size={size} color={color} />;
    case 'shield':
      return <Shield size={size} color={color} />;
    case 'smartphone':
      return <Smartphone size={size} color={color} />;
    case 'car':
      return <Car size={size} color={color} />;
    case 'home':
      return <Home size={size} color={color} />;
    case 'heart':
      return <Heart size={size} color={color} />;
    case 'graduation':
      return <GraduationCap size={size} color={color} />;
    default:
      return <Target size={size} color={color} />;
  }
}

interface SavingsGoalFormModalProps {
  visible: boolean;
  editingGoal?: SavingsGoal | null;
  onClose: () => void;
}

export const SavingsGoalFormModal: React.FC<SavingsGoalFormModalProps> = ({
  visible,
  editingGoal = null,
  onClose,
}) => {
  const { settings, addSavingsGoal, editSavingsGoal, isSubmitting } =
    useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);

  const [title, setTitle] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [targetValue, setTargetValue] = useState(0);
  const [savedInput, setSavedInput] = useState('');
  const [savedValue, setSavedValue] = useState(0);
  const [targetDateISO, setTargetDateISO] = useState<string>('');
  const [selectedIcon, setSelectedIcon] = useState<SavingsGoalIcon>('shield');
  const [selectedColor, setSelectedColor] = useState<string>('#10B981');
  const [showCalendar, setShowCalendar] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (visible) {
      setErrorMsg('');
      if (editingGoal) {
        setTitle(editingGoal.title);
        setTargetInput(String(editingGoal.targetAmount));
        setTargetValue(editingGoal.targetAmount);
        setSavedInput(String(editingGoal.savedAmount));
        setSavedValue(editingGoal.savedAmount);
        setTargetDateISO(editingGoal.targetDateISO || '');
        setSelectedIcon(editingGoal.icon);
        setSelectedColor(editingGoal.color);
      } else {
        setTitle('');
        setTargetInput('');
        setTargetValue(0);
        setSavedInput('0');
        setSavedValue(0);
        setTargetDateISO('');
        setSelectedIcon('shield');
        setSelectedColor('#10B981');
      }
    }
  }, [visible, editingGoal]);

  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg('Please enter a goal name.');
      return;
    }
    if (targetValue <= 0) {
      setErrorMsg('Target amount must be greater than 0.');
      return;
    }
    setErrorMsg('');

    const payload = {
      title: title.trim(),
      targetAmount: targetValue,
      savedAmount: Math.max(0, savedValue),
      targetDateISO: targetDateISO || undefined,
      icon: selectedIcon,
      color: selectedColor,
    };

    try {
      if (editingGoal) {
        await editSavingsGoal(editingGoal.id, payload);
      } else {
        await addSavingsGoal(payload);
      }
      onClose();
    } catch {
      // handled in store
    }
  };

  const todayISO = getNowInNPT().isoDate;

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
              {editingGoal ? 'Edit Savings Goal' : 'New Savings Goal'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
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
            {/* Goal Title */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Goal Name *
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Emergency Fund, New Phone, Vacation"
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

            {/* Target Amount & Saved So Far */}
            <View style={styles.twoColRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                  Target ({settings.currency}) *
                </Text>
                <TextInput
                  value={targetInput}
                  onChangeText={(txt) => {
                    const { text, value } = sanitizeDecimalInput(txt);
                    setTargetInput(text);
                    setTargetValue(value);
                  }}
                  keyboardType="numeric"
                  placeholder="50000"
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
                  Saved So Far
                </Text>
                <TextInput
                  value={savedInput}
                  onChangeText={(txt) => {
                    const { text, value } = sanitizeDecimalInput(txt);
                    setSavedInput(text);
                    setSavedValue(value);
                  }}
                  keyboardType="numeric"
                  placeholder="0"
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
            </View>

            {/* Icon & Theme Preset */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Icon & Color
              </Text>
              <View style={styles.presetsGrid}>
                {SAVINGS_GOAL_PRESETS.map((preset) => {
                  const active = selectedIcon === preset.icon;
                  return (
                    <TouchableOpacity
                      key={preset.icon}
                      onPress={() => {
                        setSelectedIcon(preset.icon);
                        setSelectedColor(preset.color);
                      }}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: active
                            ? `${preset.color}20`
                            : theme.inputBg,
                          borderColor: active ? preset.color : theme.border,
                        },
                      ]}
                    >
                      {renderGoalIcon(preset.icon, preset.color, 17)}
                      <Text
                        style={[
                          styles.presetLabel,
                          {
                            color: active
                              ? preset.color
                              : theme.textSecondary,
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Optional Target Date */}
            <View style={styles.fieldGroup}>
              <View style={styles.dateLabelRow}>
                <Text
                  style={[
                    styles.label,
                    { color: theme.textSecondary, marginBottom: 0 },
                  ]}
                >
                  Target Date (Optional)
                </Text>
                {targetDateISO ? (
                  <TouchableOpacity onPress={() => setTargetDateISO('')}>
                    <Text style={styles.clearDateText}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

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
                <Calendar size={16} color={selectedColor} />
                <Text
                  style={[
                    styles.pickerMainText,
                    {
                      color: targetDateISO
                        ? theme.textPrimary
                        : theme.textMuted,
                    },
                  ]}
                >
                  {targetDateISO
                    ? `${formatBSDateNepali(adToBs(targetDateISO), false)} (${targetDateISO})`
                    : 'No target date set (tap to choose)'}
                </Text>
              </TouchableOpacity>
            </View>

            {errorMsg ? (
              <Text style={styles.errorText}>{errorMsg}</Text>
            ) : null}

            <TouchableOpacity
              disabled={isSubmitting}
              onPress={handleSave}
              style={[
                styles.submitBtn,
                {
                  backgroundColor: selectedColor,
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>
                {editingGoal ? 'Update Goal' : 'Create Goal'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <NepaliCalendarModal
          visible={showCalendar}
          selectedDateISO={targetDateISO || todayISO}
          onSelectDate={(iso) => setTargetDateISO(iso)}
          onClose={() => setShowCalendar(false)}
          accentColor={selectedColor}
          title="Select Target Date"
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
    maxHeight: '90%',
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
  dateLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  clearDateText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#EF4444',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 46,
    fontSize: 14,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    width: '23%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  presetLabel: {
    fontSize: 10.5,
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
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 10,
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
