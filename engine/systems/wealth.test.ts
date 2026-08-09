import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import {
  WEALTH_SCANDAL_THRESHOLD,
  computeConflictOfInterestRisk,
  rollForWealthScandal,
} from './wealth';

describe('computeConflictOfInterestRisk', () => {
  it('is zero at or below the threshold', () => {
    expect(computeConflictOfInterestRisk(WEALTH_SCANDAL_THRESHOLD)).toBe(0);
    expect(computeConflictOfInterestRisk(WEALTH_SCANDAL_THRESHOLD - 50)).toBe(0);
    expect(computeConflictOfInterestRisk(0)).toBe(0);
  });

  it('rises above the threshold', () => {
    expect(computeConflictOfInterestRisk(WEALTH_SCANDAL_THRESHOLD + 100)).toBeGreaterThan(0);
  });

  it('is monotonically non-decreasing with wealth', () => {
    const low = computeConflictOfInterestRisk(WEALTH_SCANDAL_THRESHOLD + 50);
    const high = computeConflictOfInterestRisk(WEALTH_SCANDAL_THRESHOLD + 500);
    expect(high).toBeGreaterThanOrEqual(low);
  });

  it('caps at a real maximum rather than approaching certainty', () => {
    const extreme = computeConflictOfInterestRisk(WEALTH_SCANDAL_THRESHOLD * 100);
    expect(extreme).toBeLessThanOrEqual(0.15);
  });
});

describe('rollForWealthScandal', () => {
  it('never triggers at or below the threshold, across many seeds', () => {
    for (let seed = 0; seed < 100; seed++) {
      expect(rollForWealthScandal(WEALTH_SCANDAL_THRESHOLD, new SeededRng(seed))).toBe(false);
    }
  });

  it('is deterministic given the same rng state', () => {
    const wealth = WEALTH_SCANDAL_THRESHOLD * 3;
    const a = rollForWealthScandal(wealth, new SeededRng(4));
    const b = rollForWealthScandal(wealth, new SeededRng(4));
    expect(a).toBe(b);
  });

  it('eventually triggers at very high wealth across many seeds', () => {
    const wealth = WEALTH_SCANDAL_THRESHOLD * 3;
    let triggered = false;
    for (let seed = 0; seed < 100 && !triggered; seed++) {
      if (rollForWealthScandal(wealth, new SeededRng(seed))) triggered = true;
    }
    expect(triggered).toBe(true);
  });
});
