import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Clock, Check, X } from 'lucide-react-native';
import { getThemeColors } from '../theme/colors';
import { useVaultStore } from '../store/useVaultStore';
import { formatTimeString } from '../utils/nepaliDate';

interface TimePickerModalProps {
  visible: boolean;
  value24: string; // "HH:mm"
  onSelectTime: (time24: string) => void;
  onClose: () => void;
  accentColor?: string;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  value24,
  onSelectTime,
  onClose,
  accentColor = '#0F172A',
}) => {
  const { settings } = useVaultStore();
  const isDark = settings.theme === 'dark';
  const theme = getThemeColors(isDark);

  const [initH, initM] = (value24 || '09:00').split(':').map(Number);
  const [selectedHour, setSelectedHour] = useState<number>(
    Number.isFinite(initH) ? initH : 9
  );
  const [selectedMinute, setSelectedMinute] = useState<number>(
    Number.isFinite(initM) ? initM : 0
  );

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

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
          <View style={styles.headerRow}>
            <View style={styles.titleRow}>
              <Clock size={18} color={accentColor} />
              <Text style={[styles.title, { color: theme.textPrimary }]}>
                Select Nepal Time (NPT)
              </Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.previewBox,
              {
                backgroundColor: isDark ? '#0F172A' : '#F8FAFC',
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.previewMain, { color: theme.textPrimary }]}>
              {formatTimeString(current24, settings.timeFormat)} NPT
            </Text>
            <Text style={[styles.previewSub, { color: theme.textSecondary }]}>
              Asia/Kathmandu (UTC+05:45) • 24h: {current24}
            </Text>
          </View>

          <View style={styles.columnsWrap}>
            {/* Hour Column */}
            <View style={styles.column}>
              <Text style={[styles.colLabel, { color: theme.textSecondary }]}>
                Hour (घण्टा)
              </Text>
              <ScrollView
                style={styles.colScroll}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.chipGrid}>
                  {hours.map((h) => {
                    const active = h === selectedHour;
                    const label =
                      settings.timeFormat === '24h'
                        ? String(h).padStart(2, '0')
                        : `${h % 12 === 0 ? 12 : h % 12} ${
                            h >= 12 ? 'PM' : 'AM'
                          }`;
                    return (
                      <TouchableOpacity
                        key={h}
                        onPress={() => setSelectedHour(h)}
                        style={[
                          styles.timeChip,
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
                            styles.timeChipText,
                            {
                              color: active ? '#FFFFFF' : theme.textPrimary,
                            },
                          ]}
                        >
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>

            {/* Minute Column */}
            <View style={styles.column}>
              <Text style={[styles.colLabel, { color: theme.textSecondary }]}>
                Minute (मिनेट)
              </Text>
              <ScrollView
                style={styles.colScroll}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.chipGrid}>
                  {minutes.map((m) => {
                    const active = m === selectedMinute;
                    return (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setSelectedMinute(m)}
                        style={[
                          styles.timeChip,
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
                            styles.timeChipText,
                            {
                              color: active ? '#FFFFFF' : theme.textPrimary,
                            },
                          ]}
                        >
                          :{String(m).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              onSelectTime(current24);
              onClose();
            }}
            style={[styles.confirmBtn, { backgroundColor: accentColor }]}
          >
            <Check size={16} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>
              Set Time ({formatTimeString(current24, settings.timeFormat)} NPT)
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
    maxWidth: 380,
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
    fontWeight: '700',
  },
  previewBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  previewMain: {
    fontSize: 20,
    fontWeight: '800',
  },
  previewSub: {
    fontSize: 11,
    marginTop: 2,
  },
  columnsWrap: {
    flexDirection: 'row',
    gap: 12,
    height: 210,
    marginBottom: 14,
  },
  column: {
    flex: 1,
  },
  colLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  colScroll: {
    flex: 1,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeChip: {
    width: '47%',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  timeChipText: {
    fontSize: 12,
    fontWeight: '700',
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
