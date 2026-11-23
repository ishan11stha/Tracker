import type { ReminderRecurrence, WeekdayRecurrenceKey } from '../types';

const WEEKDAY_INDEX_MAP: Record<WeekdayRecurrenceKey, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const ORDERED_WEEKDAYS: WeekdayRecurrenceKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

function extractWeekdays(recurrence: string): WeekdayRecurrenceKey[] {
  if (!recurrence || recurrence === 'none') return [];
  const lower = recurrence.trim().toLowerCase();
  if (lower === 'daily') return [];
  const parts = lower
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  return ORDERED_WEEKDAYS.filter((day) => parts.includes(day));
}

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
 * Supports specific weekday names ('sunday'..'saturday' or comma-separated weekdays)
 * as well as legacy interval keys ('none', 'daily', 'weekly', 'monthly', 'yearly').
 * If a reminder is set for the current minute (within 60s of `now`), schedules 2s ahead
 * so "Now" reminders fire immediately instead of being dropped.
 */
export function computeNextOccurrenceDate(
  dateISO: string,
  timeString: string,
  recurrence: ReminderRecurrence,
  now: Date = new Date()
): Date | null {
  const baseDate = getNPTTargetDate(dateISO, timeString);
  const normalizedRecurrence = (recurrence || 'none').trim().toLowerCase();
  const nowMs = now.getTime();

  // Check if recurrence specifies one or more weekday names (e.g. 'sunday', 'monday,wednesday')
  const selectedWeekdayKeys = extractWeekdays(normalizedRecurrence);

  if (selectedWeekdayKeys.length > 0) {
    const allowedIndices = new Set<number>(
      selectedWeekdayKeys.map((k) => WEEKDAY_INDEX_MAP[k])
    );
    const [hours, minutes] = timeString.split(':').map(Number);
    const startReferenceMs = Math.max(baseDate.getTime(), nowMs);
    const nptRef = new Date(startReferenceMs + 345 * 60 * 1000);
    const refYear = nptRef.getUTCFullYear();
    const refMonth = nptRef.getUTCMonth();
    const refDay = nptRef.getUTCDate();

    for (let offset = 0; offset <= 14; offset++) {
      const candidateNPTMidnightUTC = Date.UTC(refYear, refMonth, refDay + offset);
      const weekday = new Date(candidateNPTMidnightUTC).getUTCDay();
      if (!allowedIndices.has(weekday)) continue;

      const candidateTriggerUTC =
        Date.UTC(refYear, refMonth, refDay + offset, hours || 0, minutes || 0, 0) -
        345 * 60 * 1000;
      if (candidateTriggerUTC > nowMs) {
        return new Date(candidateTriggerUTC);
      }
      // If set for the current minute on a matching weekday, fire 2 seconds from now
      if (nowMs - candidateTriggerUTC >= 0 && nowMs - candidateTriggerUTC < 60000) {
        return new Date(nowMs + 2000);
      }
    }
    return null;
  }

  if (baseDate.getTime() > nowMs) {
    return baseDate;
  }

  // If the user selected the current minute (e.g. via "Now" preset), trigger 2 seconds from now
  if (nowMs - baseDate.getTime() >= 0 && nowMs - baseDate.getTime() < 60000) {
    return new Date(nowMs + 2000);
  }

  const dayMs = 86400000;

  if (normalizedRecurrence === 'none') {
    // If the user picked today's date in NPT but an earlier hour, roll to tomorrow at that time
    // so a newly created reminder on today's date never silently fails to schedule.
    const nptNow = new Date(nowMs + 345 * 60 * 1000);
    const todayNPTISO = `${nptNow.getUTCFullYear()}-${String(
      nptNow.getUTCMonth() + 1
    ).padStart(2, '0')}-${String(nptNow.getUTCDate()).padStart(2, '0')}`;
    if (dateISO === todayNPTISO && baseDate.getTime() + dayMs > nowMs) {
      return new Date(baseDate.getTime() + dayMs);
    }
    return null;
  }

  const elapsedMs = nowMs - baseDate.getTime();

  if (normalizedRecurrence === 'daily') {
    const daysToAdd = Math.floor(elapsedMs / dayMs) + 1;
    return new Date(baseDate.getTime() + daysToAdd * dayMs);
  }

  if (normalizedRecurrence === 'weekly') {
    const weekMs = 7 * dayMs;
    const weeksToAdd = Math.floor(elapsedMs / weekMs) + 1;
    return new Date(baseDate.getTime() + weeksToAdd * weekMs);
  }

  const [year, month, day] = dateISO.split('-').map(Number);
  const [hours, minutes] = timeString.split(':').map(Number);

  if (normalizedRecurrence === 'monthly') {
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
      if (candidateUTC > nowMs) {
        return new Date(candidateUTC);
      }
    }
  }

  if (normalizedRecurrence === 'yearly') {
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
      if (candidateUTC > nowMs) {
        return new Date(candidateUTC);
      }
    }
  }

  return null;
}
