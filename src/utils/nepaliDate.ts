/**
 * Authentic Bikram Sambat (BS) <-> Gregorian (AD) Date & Nepal Standard Time (NPT) Engine
 *
 * Uses verified Nepali calendar month-day lookup tables from 2000 BS to 2099 BS
 * anchored precisely to 2000-01-01 BS = 1943-04-14 AD.
 * Never approximates by adding 56 years / 8 months.
 */

export interface BSDate {
  year: number;
  month: number; // 1 (Baisakh) to 12 (Chaitra)
  day: number; // 1 to 32
  weekday: number; // 0 (Sunday / आइतबार) to 6 (Saturday / शनिबार)
}

export interface ADDate {
  year: number;
  month: number; // 1 (Jan) to 12 (Dec)
  day: number; // 1 to 31
  weekday: number; // 0 to 6
}

export const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export const BS_MONTHS_NE = [
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कार्तिक',
  'मंसिर',
  'पुष',
  'माघ',
  'फागुन',
  'चैत',
];

export const BS_MONTHS_EN = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

export const AD_MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const AD_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const WEEKDAYS_NE = [
  'आइतबार',
  'सोमबार',
  'मंगलबार',
  'बुधबार',
  'बिहिबार',
  'शुक्रबार',
  'शनिबार',
];

export const WEEKDAYS_SHORT_NE = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि'];

export const WEEKDAYS_EN = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const WEEKDAYS_SHORT_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Verified lookup table of days in each month (Baisakh..Chaitra) for BS years 2000..2099
 * Anchor: 2000 Baisakh 1 = 1943-04-14 (Wednesday)
 */
export const BS_CALENDAR_DATA: Record<number, number[]> = {
  2000: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2001: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2002: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2003: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2004: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2005: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2006: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2007: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2008: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2009: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2010: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2011: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2012: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2013: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2014: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2015: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2016: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2017: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2018: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2019: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2020: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2021: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2022: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2023: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2024: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2025: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2026: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2027: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2028: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2029: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2030: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2031: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2032: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2033: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2034: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2035: [30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2036: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2037: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2038: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2039: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2040: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2041: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2042: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2043: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2044: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2045: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2046: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2047: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2048: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2049: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2050: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2051: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2052: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2053: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2054: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2055: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2056: [31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30],
  2057: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2058: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2059: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2060: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2061: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2062: [30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31],
  2063: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2064: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2065: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2066: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31],
  2067: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2068: [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2069: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2070: [31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30],
  2071: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2072: [31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2073: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31],
  2074: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2075: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2076: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2077: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2078: [31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30],
  2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2085: [31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2086: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2087: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2088: [30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30],
  2089: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2090: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2091: [31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30],
  2092: [30, 31, 32, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2093: [30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2094: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30],
  2095: [31, 31, 32, 31, 31, 31, 30, 29, 30, 30, 30, 30],
  2096: [30, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30],
  2097: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30],
  2098: [31, 31, 32, 31, 31, 31, 29, 30, 29, 30, 29, 31],
  2099: [31, 31, 32, 31, 31, 31, 30, 29, 29, 30, 30, 30],
};

// Anchor: 2000-01-01 BS === 1943-04-14 AD
const ANCHOR_AD_UTC = Date.UTC(1943, 3, 14); // Month is 0-indexed (3 = April)

export function toNepaliDigits(value: number | string): string {
  return String(value).replace(/\d/g, (d) => NEPALI_DIGITS[Number(d)]);
}

/**
 * Returns the current date & time components in Nepal Standard Time (Asia/Kathmandu, UTC+05:45)
 */
export function getNowInNPT(now: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  weekday: number;
  isoDate: string;
} {
  // Nepal Standard Time is strictly UTC + 5 hours 45 minutes (+345 minutes)
  const nptMillis = now.getTime() + 345 * 60 * 1000;
  const nptDate = new Date(nptMillis);

  const year = nptDate.getUTCFullYear();
  const month = nptDate.getUTCMonth() + 1;
  const day = nptDate.getUTCDate();
  const hours = nptDate.getUTCHours();
  const minutes = nptDate.getUTCMinutes();
  const seconds = nptDate.getUTCSeconds();
  const weekday = nptDate.getUTCDay();
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { year, month, day, hours, minutes, seconds, weekday, isoDate };
}

/**
 * Formats live Nepal Standard Time in 12h or 24h format
 */
export function formatNPTTime(
  timeFormat: '12h' | '24h' = '12h',
  includeSeconds = false,
  now: Date = new Date()
): string {
  const { hours, minutes, seconds } = getNowInNPT(now);
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  if (timeFormat === '24h') {
    const hh = String(hours).padStart(2, '0');
    return includeSeconds ? `${hh}:${mm}:${ss} NPT` : `${hh}:${mm} NPT`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const hh12 = String(hour12).padStart(2, '0');
  return includeSeconds ? `${hh12}:${mm}:${ss} ${period} NPT` : `${hour12}:${mm} ${period} NPT`;
}

/**
 * Converts a Gregorian (AD) YYYY-MM-DD string or (year, month, day) to Bikram Sambat (BS)
 */
export function adToBs(adInput: string | { year: number; month: number; day: number }): BSDate {
  let adYear: number;
  let adMonth: number;
  let adDay: number;

  if (typeof adInput === 'string') {
    const parts = adInput.split('T')[0].split('-').map(Number);
    adYear = parts[0];
    adMonth = parts[1];
    adDay = parts[2];
  } else {
    adYear = adInput.year;
    adMonth = adInput.month;
    adDay = adInput.day;
  }

  const targetUTC = Date.UTC(adYear, adMonth - 1, adDay);
  const weekday = new Date(targetUTC).getUTCDay();
  let totalDays = Math.floor((targetUTC - ANCHOR_AD_UTC) / (1000 * 60 * 60 * 24));

  if (totalDays < 0) {
    return { year: 2000, month: 1, day: 1, weekday };
  }

  let bsYear = 2000;
  let bsMonth = 1;
  let bsDay = 1;

  while (BS_CALENDAR_DATA[bsYear]) {
    const monthDays = BS_CALENDAR_DATA[bsYear];
    const yearTotal = monthDays.reduce((acc, d) => acc + d, 0);
    if (totalDays >= yearTotal) {
      totalDays -= yearTotal;
      bsYear++;
    } else {
      for (let m = 0; m < 12; m++) {
        if (totalDays >= monthDays[m]) {
          totalDays -= monthDays[m];
        } else {
          bsMonth = m + 1;
          bsDay = totalDays + 1;
          break;
        }
      }
      break;
    }
  }

  return {
    year: bsYear,
    month: bsMonth,
    day: bsDay,
    weekday,
  };
}

/**
 * Converts a Bikram Sambat (BS) date (year, month, day) to Gregorian (AD) ISO string (YYYY-MM-DD) and ADDate
 */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): {
  year: number;
  month: number;
  day: number;
  weekday: number;
  isoDate: string;
} {
  const clampedYear = Math.min(2099, Math.max(2000, Math.trunc(bsYear)));
  const clampedMonth = Math.min(12, Math.max(1, Math.trunc(bsMonth)));
  const maxDay = getDaysInBSMonth(clampedYear, clampedMonth);
  const clampedDay = Math.min(maxDay, Math.max(1, Math.trunc(bsDay)));

  let totalDays = 0;

  for (let y = 2000; y < clampedYear; y++) {
    const months = BS_CALENDAR_DATA[y];
    if (months) {
      totalDays += months.reduce((acc, d) => acc + d, 0);
    }
  }

  const currentYearMonths = BS_CALENDAR_DATA[clampedYear] || BS_CALENDAR_DATA[2083];
  for (let m = 0; m < clampedMonth - 1; m++) {
    totalDays += currentYearMonths[m];
  }

  totalDays += clampedDay - 1;

  const targetUTC = ANCHOR_AD_UTC + totalDays * 24 * 60 * 60 * 1000;
  const d = new Date(targetUTC);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const weekday = d.getUTCDay();
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { year, month, day, weekday, isoDate };
}

/**
 * Gets the number of days in a given BS year and month (1..12)
 */
export function getDaysInBSMonth(bsYear: number, bsMonth: number): number {
  const yearData = BS_CALENDAR_DATA[bsYear] || BS_CALENDAR_DATA[2083];
  return yearData[bsMonth - 1] || 30;
}

/**
 * Gets the number of days in a given AD year and month (1..12)
 */
export function getDaysInADMonth(adYear: number, adMonth: number): number {
  return new Date(Date.UTC(adYear, adMonth, 0)).getUTCDate();
}

/**
 * Formats a BSDate in Nepali script as required on the Dashboard:
 * e.g., "२०८३ मंसिर ४, शुक्रबार"
 */
export function formatBSDateNepali(bs: BSDate, includeWeekday = true): string {
  const y = toNepaliDigits(bs.year);
  const m = BS_MONTHS_NE[bs.month - 1];
  const d = toNepaliDigits(bs.day);
  const w = WEEKDAYS_NE[bs.weekday];
  return includeWeekday ? `${y} ${m} ${d}, ${w}` : `${y} ${m} ${d}`;
}

/**
 * Formats a BSDate in romanized English:
 * e.g., "4 Mangsir 2083, Friday"
 */
export function formatBSDateEnglish(bs: BSDate, includeWeekday = false): string {
  const m = BS_MONTHS_EN[bs.month - 1];
  const w = WEEKDAYS_EN[bs.weekday];
  return includeWeekday ? `${bs.day} ${m} ${bs.year}, ${w}` : `${bs.day} ${m} ${bs.year}`;
}

/**
 * Formats an AD ISO date string (YYYY-MM-DD) as full English date:
 * e.g., "Friday, November 20, 2026"
 */
export function formatADDateFull(isoDate: string): string {
  const parts = isoDate.split('T')[0].split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const weekday = WEEKDAYS_EN[d.getUTCDay()];
  const monthName = AD_MONTHS_EN[parts[1] - 1];
  return `${weekday}, ${monthName} ${parts[2]}, ${parts[0]}`;
}

/**
 * Formats an AD ISO date string according to user preferences (BS or AD, Nepali or English)
 */
export function formatDisplayDate(
  isoDate: string,
  preferredCalendar: 'BS' | 'AD' = 'BS',
  language: 'ne' | 'en' = 'ne',
  includeWeekday = false
): string {
  if (!isoDate) return '';
  if (preferredCalendar === 'BS') {
    const bs = adToBs(isoDate);
    return language === 'ne'
      ? formatBSDateNepali(bs, includeWeekday)
      : formatBSDateEnglish(bs, includeWeekday);
  }
  const parts = isoDate.split('T')[0].split('-').map(Number);
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const monthShort = AD_MONTHS_SHORT[parts[1] - 1];
  const weekdayShort = WEEKDAYS_SHORT_EN[d.getUTCDay()];
  return includeWeekday
    ? `${weekdayShort}, ${monthShort} ${parts[2]}, ${parts[0]}`
    : `${monthShort} ${parts[2]}, ${parts[0]}`;
}

/**
 * Formats a 24h time string "HH:mm" into 12h or 24h string
 */
export function formatTimeString(time24: string, format: '12h' | '24h' = '12h'): string {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (format === '24h') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Builds a calendar grid for a given BS year and month
 */
export interface CalendarCell {
  bsYear: number;
  bsMonth: number;
  bsDay: number;
  adYear: number;
  adMonth: number;
  adDay: number;
  isoDate: string;
  weekday: number;
}

export function buildBSMonthGrid(bsYear: number, bsMonth: number): {
  leadingEmptyDays: number;
  days: CalendarCell[];
} {
  const daysCount = getDaysInBSMonth(bsYear, bsMonth);
  const firstDayAd = bsToAd(bsYear, bsMonth, 1);
  const leadingEmptyDays = firstDayAd.weekday;
  const days: CalendarCell[] = [];

  for (let d = 1; d <= daysCount; d++) {
    const ad = bsToAd(bsYear, bsMonth, d);
    days.push({
      bsYear,
      bsMonth,
      bsDay: d,
      adYear: ad.year,
      adMonth: ad.month,
      adDay: ad.day,
      isoDate: ad.isoDate,
      weekday: ad.weekday,
    });
  }

  return { leadingEmptyDays, days };
}

/**
 * Builds a calendar grid for a given AD year and month
 */
export function buildADMonthGrid(adYear: number, adMonth: number): {
  leadingEmptyDays: number;
  days: CalendarCell[];
} {
  const daysCount = getDaysInADMonth(adYear, adMonth);
  const firstDayUTC = new Date(Date.UTC(adYear, adMonth - 1, 1));
  const leadingEmptyDays = firstDayUTC.getUTCDay();
  const days: CalendarCell[] = [];

  for (let d = 1; d <= daysCount; d++) {
    const isoDate = `${adYear}-${String(adMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const bs = adToBs({ year: adYear, month: adMonth, day: d });
    days.push({
      bsYear: bs.year,
      bsMonth: bs.month,
      bsDay: bs.day,
      adYear,
      adMonth,
      adDay: d,
      isoDate,
      weekday: bs.weekday,
    });
  }

  return { leadingEmptyDays, days };
}
