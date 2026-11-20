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
    paddingHorizontal: 9,
    paddingVertical: 3.5,
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
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#37A13B',
  },
  clockText: {
    fontSize: 11,
    fontWeight: '800',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  bsHeadline: {
    fontSize: 21,
    fontWeight: '800',
    marginBottom: 2,
  },
  adSubline: {
    fontSize: 12,
    fontWeight: '600',
  },
  calIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
