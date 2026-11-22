import type { ReminderRecurrence } from '../types';

/**
 * Converts a Nepal Standard Time (UTC+05:45) YYYY-MM-DD and HH:mm into an exact Date object.
 */
export function getNPTTargetDate(dateISO: string, timeString: string): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);
  // NPT is UTC + 5h 45m (345 mins)
  const utcMillis =
    Date.UTC(year, month - 1, day, hours || 0, minutes || 0, 0) -
    345 * 60 * 1000;
  return new Date(utcMillis);
}

/**
 * Computes the next future trigger Date for a reminder according to its recurrence rule.
 * Pure business logic with zero native module dependencies.
 */
export function computeNextOccurrenceDate(
  dateISO: string,
  timeString: string,
  recurrence: ReminderRecurrence,
  now: Date = new Date()
): Date | null {
  const baseDate = getNPTTargetDate(dateISO, timeString);
  if (baseDate.getTime() > now.getTime()) {
    return baseDate;
  }
  if (recurrence === 'none') {
    return null;
  }

  const dayMs = 86400000;
  const elapsedMs = now.getTime() - baseDate.getTime();

  if (recurrence === 'daily') {
    const daysToAdd = Math.floor(elapsedMs / dayMs) + 1;
    return new Date(baseDate.getTime() + daysToAdd * dayMs);
  }

  if (recurrence === 'weekly') {
    const weekMs = 7 * dayMs;
    const weeksToAdd = Math.floor(elapsedMs / weekMs) + 1;
    return new Date(baseDate.getTime() + weeksToAdd * weekMs);
  }

  const [year, month, day] = dateISO.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);

  if (recurrence === 'monthly') {
    let candidateYear = year;
    let candidateMonth = month;
    for (let i = 0; i < 240; i++) {
      candidateMonth += 1;
      if (candidateMonth > 12) {
        candidateMonth = 1;
        candidateYear += 1;
      }
      const maxDays = new Date(
        Date.UTC(candidateYear, candidateMonth, 0)
      ).getUTCDate();
      const clampedDay = Math.min(day, maxDays);
      const candidateUTC =
        Date.UTC(
          candidateYear,
          candidateMonth - 1,
          clampedDay,
          hours || 0,
          minutes || 0,
          0
        ) -
        345 * 60 * 1000;
      if (candidateUTC > now.getTime()) {
        return new Date(candidateUTC);
      }
    }
  }

  if (recurrence === 'yearly') {
    let candidateYear = year;
    for (let i = 0; i < 50; i++) {
      candidateYear += 1;
      const maxDays = new Date(
        Date.UTC(candidateYear, month, 0)
      ).getUTCDate();
      const clampedDay = Math.min(day, maxDays);
      const candidateUTC =
        Date.UTC(
          candidateYear,
          month - 1,
          clampedDay,
          hours || 0,
          minutes || 0,
          0
        ) -
        345 * 60 * 1000;
      if (candidateUTC > now.getTime()) {
        return new Date(candidateUTC);
      }
    }
  }

  return null;
}
