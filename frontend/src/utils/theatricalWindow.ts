/** Calendar-day difference: a − b (local dates, noon to avoid DST edge cases). */
function calendarDaysBetween(a: Date, b: Date): number {
  const aMid = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12);
  const bMid = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12);
  return Math.round((aMid.getTime() - bMid.getTime()) / 86_400_000);
}

/** nth occurrence of weekday in month (weekday: 0=Sun … 6=Sat; n is 1-based). */
function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  n: number
): Date {
  const first = new Date(year, monthIndex, 1, 12);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, monthIndex, 1 + offset + (n - 1) * 7, 12);
}

/** Last occurrence of weekday in month. */
function lastWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number
): Date {
  const lastDay = new Date(year, monthIndex + 1, 0, 12);
  const offset = (lastDay.getDay() - weekday + 7) % 7;
  return new Date(year, monthIndex, lastDay.getDate() - offset, 12);
}

/**
 * Tentpoles often open Wed/Thu before a holiday. Match release in
 * [holiday − 4 days, holiday + 2 days].
 */
const HOLIDAY_WINDOW_BEFORE = 4;
const HOLIDAY_WINDOW_AFTER = 2;

type NamedWeekend = { label: string; date: Date };

function usHolidayWeekends(year: number): NamedWeekend[] {
  return [
    { label: "Memorial Day", date: lastWeekdayOfMonth(year, 4, 1) },
    { label: "July 4th", date: new Date(year, 6, 4, 12) },
    { label: "Labor Day", date: nthWeekdayOfMonth(year, 8, 1, 1) },
    { label: "Thanksgiving", date: nthWeekdayOfMonth(year, 10, 4, 4) },
  ];
}

/**
 * Prior theatrical week before Thanksgiving (not the holiday weekend itself).
 * e.g. Nov 17, 2026 → "week before Thanksgiving" when Thanksgiving is Nov 26.
 */
const THANKSGIVING_WEEK_BEFORE_MIN = 5; // days before (exclusive of holiday window)
const THANKSGIVING_WEEK_BEFORE_MAX = 13;

function thanksgivingDate(year: number): Date {
  return nthWeekdayOfMonth(year, 10, 4, 4);
}

/** Named US theatrical weekend, if the release falls in that window. */
export function namedTheatricalWeekend(release: Date): string | null {
  const year = release.getFullYear();
  // Check adjacent years so a late-Dec / early-Jan edge never misses (July 4 etc. are mid-year).
  for (const y of [year - 1, year, year + 1]) {
    for (const h of usHolidayWeekends(y)) {
      const d = calendarDaysBetween(release, h.date);
      if (d >= -HOLIDAY_WINDOW_BEFORE && d <= HOLIDAY_WINDOW_AFTER) {
        return h.label;
      }
    }
  }

  for (const y of [year - 1, year, year + 1]) {
    const daysBefore = -calendarDaysBetween(release, thanksgivingDate(y));
    if (
      daysBefore >= THANKSGIVING_WEEK_BEFORE_MIN &&
      daysBefore <= THANKSGIVING_WEEK_BEFORE_MAX
    ) {
      return "week before Thanksgiving";
    }
  }

  return null;
}

/** Broad US theatrical season when no named weekend applies. */
export function theatricalSeason(monthIndex: number): string {
  if (monthIndex === 10 || monthIndex === 11) return "Holiday";
  if (monthIndex <= 1) return "Winter";
  if (monthIndex <= 3) return "Spring";
  if (monthIndex <= 7) return "Summer";
  return "Fall";
}

/** Named weekend if matched, otherwise season label. */
export function theatricalWindow(release: Date): string {
  return namedTheatricalWeekend(release) ?? theatricalSeason(release.getMonth());
}
