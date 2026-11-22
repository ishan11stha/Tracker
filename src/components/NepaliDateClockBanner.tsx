import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, ChevronRight, Clock } from 'lucide-react-native';
import { useNepalClock } from '../hooks/useNepalClock';
import { getThemeColors } from '../theme/colors';

interface NepaliDateClockBannerProps {
  timeFormat: '12h' | '24h';
  isDark: boolean;
  onPressCalendar: (todayISO: string) => void;
}

/**
 * Monekin-styled Nepali Date & Live NPT Clock card.
 * Isolates the 1-second timer so parent screens do not re-render every second.
 */
export const NepaliDateClockBanner: React.FC<NepaliDateClockBannerProps> =
  React.memo(({ timeFormat, isDark, onPressCalendar }) => {
    const theme = getThemeColors(isDark);
    const clock = useNepalClock(timeFormat, true);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => onPressCalendar(clock.isoDate)}
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Open Nepali calendar. ${clock.bsNepaliText}. ${clock.adFullText}. Current time ${clock.liveTimeText}`}
      >
        <View style={styles.topRow}>
          <View
            style={[
              styles.bsTag,
              {
                backgroundColor: isDark
                  ? 'rgba(239, 68, 68, 0.16)'
                  : 'rgba(220, 38, 38, 0.1)',
              },
            ]}
          >
            <Calendar size={12} color="#EF4444" />
            <Text style={styles.bsTagText}>बिक्रम सम्बत् • NEPALI CALENDAR</Text>
          </View>

          <View
            style={[
              styles.clockChip,
              { backgroundColor: theme.surfaceContainerHigh },
            ]}
          >
            <View style={styles.liveDot} />
            <Clock size={11} color={theme.textPrimary} />
            <Text style={[styles.clockText, { color: theme.textPrimary }]}>
              {clock.liveTimeText}
            </Text>
          </View>
        </View>

        <View style={styles.mainRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.bsHeadline, { color: theme.textPrimary }]}>
              {clock.bsNepaliText}
            </Text>
            <Text style={[styles.adSubline, { color: theme.textMuted }]}>
              {clock.adFullText} • {clock.bsEnglishText} BS
            </Text>
          </View>

          <View
            style={[
              styles.calIconBtn,
              {
                backgroundColor: isDark
                  ? 'rgba(128, 134, 177, 0.18)'
                  : 'rgba(15, 51, 117, 0.08)',
              },
            ]}
          >
            <ChevronRight size={18} color={theme.brand} />
          </View>
        </View>
      </TouchableOpacity>
    );
  });

NepaliDateClockBanner.displayName = 'NepaliDateClockBanner';

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  bsTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.4,
  },
  clockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#37A13B',
  },
  clockText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  bsHeadline: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  adSubline: {
    fontSize: 12,
    fontWeight: '600',
  },
  calIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
