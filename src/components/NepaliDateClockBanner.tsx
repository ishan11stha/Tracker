import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { useNepalClock } from '../hooks/useNepalClock';
import { getThemeColors } from '../theme/colors';

interface NepaliDateClockBannerProps {
  timeFormat: '12h' | '24h';
  isDark: boolean;
  onPressCalendar: (todayISO: string) => void;
}

/**
 * Dedicated self-updating Nepali Date & Live NPT Clock banner.
 * Isolates the 1-second timer so parent screens do not re-render every second.
 */
export const NepaliDateClockBanner: React.FC<NepaliDateClockBannerProps> = React.memo(
  ({ timeFormat, isDark, onPressCalendar }) => {
    const theme = getThemeColors(isDark);
    const clock = useNepalClock(timeFormat, true);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => onPressCalendar(clock.isoDate)}
        style={[
          styles.nepaliDateCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.nepaliDateTopRow}>
          <View style={styles.bsPill}>
            <Calendar size={13} color="#DC2626" />
            <Text style={styles.bsPillText}>
              बिक्रम सम्बत् (Bikram Sambat)
            </Text>
          </View>

          <View
            style={[
              styles.liveClockBadge,
              { backgroundColor: isDark ? '#0F172A' : '#F1F5F9' },
            ]}
          >
            <View style={styles.pulseDot} />
            <Clock size={12} color={theme.textPrimary} />
            <Text style={[styles.liveClockText, { color: theme.textPrimary }]}>
              {clock.liveTimeText}
            </Text>
          </View>
        </View>

        {/* Primary Nepali Date: e.g. २०८३ मंसिर ४, शुक्रबार */}
        <Text style={[styles.nepaliDateHeadline, { color: theme.textPrimary }]}>
          {clock.bsNepaliText}
        </Text>

        {/* Secondary Gregorian Date + Romanized BS */}
        <View style={styles.nepaliDateFooterRow}>
          <Text
            style={[styles.gregorianSubText, { color: theme.textSecondary }]}
          >
            {clock.adFullText} • {clock.bsEnglishText} BS
          </Text>
          <Text style={[styles.calendarCta, { color: theme.info }]}>
            पात्रो हेर्नुहोस् →
          </Text>
        </View>
      </TouchableOpacity>
    );
  }
);

NepaliDateClockBanner.displayName = 'NepaliDateClockBanner';

const styles = StyleSheet.create({
  nepaliDateCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
  },
  nepaliDateTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  bsPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
  },
  liveClockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveClockText: {
    fontSize: 11,
    fontWeight: '800',
  },
  nepaliDateHeadline: {
    fontSize: 23,
    fontWeight: '900',
    marginBottom: 4,
  },
  nepaliDateFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gregorianSubText: {
    fontSize: 12,
    fontWeight: '600',
  },
  calendarCta: {
    fontSize: 12,
    fontWeight: '700',
  },
});
