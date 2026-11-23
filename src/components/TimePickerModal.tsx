import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Check, Clock, Minus, Plus, X } from 'lucide-react-native';
import { getThemeColors } from '../theme/colors';
import { useVaultStore } from '../store/useVaultStore';
import { formatTimeString, getNowInNPT } from '../utils/nepaliDate';

interface TimePickerModalProps {
  visible: boolean;
  value24: string; // "HH:mm"
  onSelectTime: (time24: string) => void;
  onClose: () => void;
  accentColor?: string;
}

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES_5 = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

const QUICK_PRESETS: { label: string; h: number; m: number }[] = [
  { label: '7 AM', h: 7, m: 0 },
  { label: '9 AM', h: 9, m: 0 },
  { label: '12 PM', h: 12, m: 0 },
  { label: '6 PM', h: 18, m: 0 },
  { label: '9 PM', h: 21, m: 0 },
];

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  value24,
  onSelectTime,
  onClose,
  accentColor = '#0F3375',
}) => {
  const { settings } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);

  const [initH, initM] = (value24 || '09:00').split(':').map(Number);
  const [selectedHour, setSelectedHour] = useState<number>(
    Number.isFinite(initH) && initH >= 0 && initH < 24 ? initH : 9
  );
  const [selectedMinute, setSelectedMinute] = useState<number>(
    Number.isFinite(initM) && initM >= 0 && initM < 60 ? initM : 0
  );

  useEffect(() => {
    if (visible) {
      const [h, m] = (value24 || '09:00').split(':').map(Number);
      setSelectedHour(Number.isFinite(h) && h >= 0 && h < 24 ? h : 9);
      setSelectedMinute(Number.isFinite(m) && m >= 0 && m < 60 ? m : 0);
    }
  }, [visible, value24]);

  const isPM = selectedHour >= 12;
  const displayHour12 = selectedHour % 12 === 0 ? 12 : selectedHour % 12;

  const setHour12 = (h12: number, pm: boolean) => {
    const normalized = h12 % 12;
    setSelectedHour(pm ? normalized + 12 : normalized);
  };

  const stepMinute = (delta: number) => {
    const total = (selectedHour * 60 + selectedMinute + delta + 1440) % 1440;
    setSelectedHour(Math.floor(total / 60));
    setSelectedMinute(total % 60);
  };

  const setNowNPT = () => {
    const now = getNowInNPT();
    setSelectedHour(now.hours);
    setSelectedMinute(now.minutes);
  };

  const current24 = `${String(selectedHour).padStart(2, '0')}:${String(
    selectedMinute
  ).padStart(2, '0')}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.overlay, { backgroundColor: theme.modalOverlay }]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Clock size={18} color={accentColor} />
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Set Time
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close time picker"
              hitSlop={8}
            >
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Big Digital Display + AM/PM Switch + +/-1m Fine Stepper */}
          <View
            style={[
              styles.digitalBox,
              {
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.digitalTimeRow}>
              <TouchableOpacity
                onPress={() => stepMinute(-1)}
                style={[
                  styles.stepBtn,
                  { backgroundColor: theme.surfaceContainerHigh },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Minus 1 minute"
              >
                <Minus size={15} color={theme.textPrimary} />
              </TouchableOpacity>

              <Text style={[styles.digitalText, { color: theme.textPrimary }]}>
                {String(displayHour12).padStart(2, '0')}:
                {String(selectedMinute).padStart(2, '0')}
              </Text>

              <TouchableOpacity
                onPress={() => stepMinute(1)}
                style={[
                  styles.stepBtn,
                  { backgroundColor: theme.surfaceContainerHigh },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Plus 1 minute"
              >
                <Plus size={15} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* AM / PM Pill Toggle */}
            <View
              style={[
                styles.ampmToggle,
                { backgroundColor: theme.surfaceContainerHigh },
              ]}
            >
              <TouchableOpacity
                onPress={() => setHour12(displayHour12, false)}
                style={[
                  styles.ampmBtn,
                  !isPM && { backgroundColor: accentColor },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: !isPM }}
              >
                <Text
                  style={[
                    styles.ampmText,
                    { color: !isPM ? '#FFFFFF' : theme.textMuted },
                  ]}
                >
                  AM
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setHour12(displayHour12, true)}
                style={[
                  styles.ampmBtn,
                  isPM && { backgroundColor: accentColor },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: isPM }}
              >
                <Text
                  style={[
                    styles.ampmText,
                    { color: isPM ? '#FFFFFF' : theme.textMuted },
                  ]}
                >
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 1-Tap Quick Presets Row */}
          <View style={styles.presetsRow}>
            <TouchableOpacity
              onPress={setNowNPT}
              style={[
                styles.presetChip,
                {
                  backgroundColor: `${accentColor}18`,
                  borderColor: accentColor,
                },
              ]}
            >
              <Text style={[styles.presetText, { color: accentColor }]}>
                Now
              </Text>
            </TouchableOpacity>

            {QUICK_PRESETS.map((p) => {
              const isSel = selectedHour === p.h && selectedMinute === p.m;
              return (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => {
                    setSelectedHour(p.h);
                    setSelectedMinute(p.m);
                  }}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isSel
                        ? accentColor
                        : theme.surfaceContainerHigh,
                      borderColor: isSel ? accentColor : 'transparent',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.presetText,
                      { color: isSel ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Zero-Scroll 6x2 Hour Grid (1..12) */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
            HOUR
          </Text>
          <View style={styles.grid6}>
            {HOURS_12.map((h12) => {
              const active = displayHour12 === h12;
              return (
                <TouchableOpacity
                  key={h12}
                  onPress={() => setHour12(h12, isPM)}
                  style={[
                    styles.gridCell,
                    {
                      backgroundColor: active
                        ? accentColor
                        : isDark
                          ? '#0F172A'
                          : '#F1F5F9',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.gridCellText,
                      { color: active ? '#FFFFFF' : theme.textPrimary },
                    ]}
                  >
                    {h12}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Zero-Scroll 6x2 Minute Grid (:00 .. :55) */}
          <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>
            MINUTE
          </Text>
          <View style={styles.grid6}>
            {MINUTES_5.map((m) => {
              const active = selectedMinute === m;
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setSelectedMinute(m)}
                  style={[
                    styles.gridCell,
                    {
                      backgroundColor: active
                        ? accentColor
                        : isDark
                          ? '#0F172A'
                          : '#F1F5F9',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.gridCellText,
                      { color: active ? '#FFFFFF' : theme.textPrimary },
                    ]}
                  >
                    :{String(m).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity
            onPress={() => {
              onSelectTime(current24);
              onClose();
            }}
            style={[styles.confirmBtn, { backgroundColor: accentColor }]}
          >
            <Check size={16} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>
              Set {formatTimeString(current24, settings.timeFormat)}
            </Text>
          </TouchableOpacity>
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
    maxWidth: 370,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  digitalBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  digitalTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitalText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  ampmToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  ampmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
  },
  ampmText: {
    fontSize: 12,
    fontWeight: '800',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 6.5,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  grid6: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  gridCell: {
    width: '15.2%',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 2,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
