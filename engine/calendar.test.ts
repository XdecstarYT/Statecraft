import { describe, expect, it } from 'vitest';
import { formatCalendarDate, turnToCalendarDate, WEEKS_PER_MONTH, WEEKS_PER_YEAR } from './calendar';

describe('turnToCalendarDate', () => {
  it('starts at Year 1, Month 1, Week 1', () => {
    expect(turnToCalendarDate(1)).toEqual({ year: 1, month: 1, week: 1 });
  });

  it('stays in month 1 for the first WEEKS_PER_MONTH turns', () => {
    expect(turnToCalendarDate(WEEKS_PER_MONTH)).toEqual({ year: 1, month: 1, week: WEEKS_PER_MONTH });
  });

  it('rolls over into month 2 on the next week', () => {
    expect(turnToCalendarDate(WEEKS_PER_MONTH + 1)).toEqual({ year: 1, month: 2, week: 1 });
  });

  it('reaches month 12 in year 1 at the end of the year', () => {
    expect(turnToCalendarDate(WEEKS_PER_YEAR)).toEqual({ year: 1, month: 12, week: WEEKS_PER_MONTH });
  });

  it('rolls over into year 2 on the next week', () => {
    expect(turnToCalendarDate(WEEKS_PER_YEAR + 1)).toEqual({ year: 2, month: 1, week: 1 });
  });

  it('correctly computes an arbitrary date well into year 3', () => {
    // 2 full years, then 5 full months, then 2 more weeks into month 6 (turn is 1-based).
    const turn = WEEKS_PER_YEAR * 2 + WEEKS_PER_MONTH * 5 + 2 + 1;
    expect(turnToCalendarDate(turn)).toEqual({ year: 3, month: 6, week: 3 });
  });
});

describe('formatCalendarDate', () => {
  it('formats as "Year Y, Month M, Week W"', () => {
    expect(formatCalendarDate({ year: 2, month: 5, week: 3 })).toBe('Year 2, Month 5, Week 3');
  });
});
