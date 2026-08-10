/**
 * Turn/calendar conversion. One turn = one week (see CLAUDE.md §3's time
 * structure). A stylized 4-week month / 12-month year keeps the math simple
 * and exact rather than modeling real variable-length months.
 */

export const WEEKS_PER_MONTH = 4;
export const MONTHS_PER_YEAR = 12;
export const WEEKS_PER_YEAR = WEEKS_PER_MONTH * MONTHS_PER_YEAR;

export interface CalendarDate {
  year: number;
  /** 1-12 */
  month: number;
  /** 1-4, week within the month */
  week: number;
}

/** Converts a 1-based turn counter into a Year/Month/Week calendar date. */
export function turnToCalendarDate(turn: number): CalendarDate {
  const weekIndex = turn - 1;
  const year = Math.floor(weekIndex / WEEKS_PER_YEAR) + 1;
  const weekOfYear = ((weekIndex % WEEKS_PER_YEAR) + WEEKS_PER_YEAR) % WEEKS_PER_YEAR;
  const month = Math.floor(weekOfYear / WEEKS_PER_MONTH) + 1;
  const week = (weekOfYear % WEEKS_PER_MONTH) + 1;
  return { year, month, week };
}

export function formatCalendarDate(date: CalendarDate): string {
  return `Year ${date.year}, Month ${date.month}, Week ${date.week}`;
}
