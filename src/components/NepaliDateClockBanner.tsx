import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { useNepalClock } from '../hooks/useNepalClock';
import { getThemeColors } from '../theme/colors';

interface NepaliDateClockBannerProps {
  timeFormat: '12h' | '24h';
  isDark: boolean;
  onPressCalendar: (todayISO: string) => void;
}

/**
 * Compact, executive Nepali Bikram Sambat Date & Live NPT Clock banner.
 * Isolates the 1-second timer so parent screens do not re-render every second.
 */
export const NepaliDateClockBanner: React.FC<NepaliDateClockBannerProps> =
  React.memo(({ timeFormat, isDark, onPressCalendar }) => {
    const theme = getThemeColors(isDark);
    const clock = useNepalClock(timeFormat, true);

    return (
      <TouchableOpacity
        activeOpacity={0.85}
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
        <View
          style={[
            styles.calIconWrap,
            {
              backgroundColor: isDark
                ? 'rgba(239, 68, 68, 0.16)'
                : 'rgba(220, 38, 38, 0.09)',
            },
          ]}
        >
          <Calendar size={18} color="#EF4444" />
        </View>

        <View style={styles.dateCol}>
          <Text
            style={[styles.bsHeadline, { color: theme.textPrimary }]}
            numberOfLines={1}
          >
            {clock.bsNepaliText}
          </Text>
          <Text
            style={[styles.adSubline, { color: theme.textMuted }]}
            numberOfLines={1}
          >
            {clock.adFullText}
          </Text>
        </View>

        <View style={styles.rightCol}>
          <View
            style={[
              styles.clockChip,
              { backgroundColor: theme.surfaceContainerHigh },
            ]}
          >
            <View style={styles.liveDot} />
            <Text style={[styles.clockText, { color: theme.textPrimary }]}>
              {clock.liveTimeText}
            </Text>
          </View>
          <View style={styles.patroHintRow}>
            <Text style={[styles.patroHintText, { color: theme.brand }]}>
              पात्रो
            </Text>
            <ChevronRight size={13} color={theme.brand} />
          </View>
        </View>
      </TouchableOpacity>
    );
  });

NepaliDateClockBanner.displayName = 'NepaliDateClockBanner';

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 14,
    gap: 12,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  calIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCol: {
    flex: 1,
  },
  bsHeadline: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  adSubline: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  clockChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
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
    letterSpacing: 0.2,
  },
  patroHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  patroHintText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
});
