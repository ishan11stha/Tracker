import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import {
  BSDate,
  adToBs,
  formatADDateFull,
  formatBSDateEnglish,
  formatBSDateNepali,
  formatNPTTime,
  getNowInNPT,
} from '../utils/nepaliDate';

export interface NepalClockState {
  isoDate: string;
  hours: number;
  minutes: number;
  seconds: number;
  bsDate: BSDate;
  bsNepaliText: string;
  bsEnglishText: string;
  adFullText: string;
  liveTimeText: string;
}

/**
 * Isolated hook for live Nepal Standard Time (Asia/Kathmandu, UTC+05:45)
 * and current Bikram Sambat date.
 */
export function useNepalClock(
  timeFormat: '12h' | '24h' = '12h',
  includeSeconds = true
): NepalClockState {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const tickMs = includeSeconds ? 1_000 : 30_000;

    const start = () => {
      if (interval !== null) clearInterval(interval);
      interval = setInterval(() => setNow(new Date()), tickMs);
    };

    start();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        // Catch up immediately after returning from the background.
        setNow(new Date());
        start();
      } else if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    });

    return () => {
      if (interval !== null) clearInterval(interval);
      subscription.remove();
    };
  }, [includeSeconds]);

  const npt = useMemo(() => getNowInNPT(now), [now]);
  const bsDate = useMemo(() => adToBs(npt.isoDate), [npt.isoDate]);
  const bsNepaliText = useMemo(() => formatBSDateNepali(bsDate, true), [bsDate]);
  const bsEnglishText = useMemo(
    () => formatBSDateEnglish(bsDate, false),
    [bsDate]
  );
  const adFullText = useMemo(
    () => formatADDateFull(npt.isoDate),
    [npt.isoDate]
  );
  const liveTimeText = useMemo(
    () => formatNPTTime(timeFormat, includeSeconds, now),
    [timeFormat, includeSeconds, now]
  );

  return {
    isoDate: npt.isoDate,
    hours: npt.hours,
    minutes: npt.minutes,
    seconds: npt.seconds,
    bsDate,
    bsNepaliText,
    bsEnglishText,
    adFullText,
    liveTimeText,
  };
}
