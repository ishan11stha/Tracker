import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getNowInNPT } from '../utils/nepaliDate';

export type CurrentNPT = ReturnType<typeof getNowInNPT>;

/**
 * Returns Nepal Standard Time and refreshes it while the screen is focused.
 * A screen left open across midnight therefore rolls over to the new Nepali
 * day instead of keeping the timestamp captured at first mount.
 */
export function useCurrentNPT(refreshIntervalMs = 60_000): CurrentNPT {
  const [now, setNow] = useState<CurrentNPT>(() => getNowInNPT());

  useFocusEffect(
    useCallback(() => {
      setNow(getNowInNPT());
      const interval = setInterval(() => {
        setNow(getNowInNPT());
      }, refreshIntervalMs);

      return () => clearInterval(interval);
    }, [refreshIntervalMs])
  );

  return now;
}
