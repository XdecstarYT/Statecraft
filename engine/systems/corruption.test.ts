import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import {
  CORRUPTION_TIERS,
  attemptCorruptionAction,
  computeDetectionChance,
  computeScandalSeverity,
} from './corruption';

describe('computeDetectionChance', () => {
  it('is higher for higher-risk tiers, all else equal', () => {
    const soft = computeDetectionChance('soft', 7, 0);
    const medium = computeDetectionChance('medium', 7, 0);
    const hard = computeDetectionChance('hard', 7, 0);
    expect(medium).toBeGreaterThan(soft);
    expect(hard).toBeGreaterThan(medium);
  });

  it('rises as the actor is less careful (lower integrity)', () => {
    const careful = computeDetectionChance('medium', 10, 0);
    const careless = computeDetectionChance('medium', 1, 0);
    expect(careless).toBeGreaterThan(careful);
  });

  it('rises under active investigative pressure', () => {
    const unwatched = computeDetectionChance('medium', 5, 0);
    const watched = computeDetectionChance('medium', 5, 1);
    expect(watched).toBeGreaterThan(unwatched);
  });

  it('never exceeds the 0.95 cap even in the worst case', () => {
    expect(computeDetectionChance('hard', 1, 1)).toBeLessThanOrEqual(0.95);
  });

  it('is never negative', () => {
    expect(computeDetectionChance('soft', 10, 0)).toBeGreaterThanOrEqual(0);
  });

  it('scales with the difficulty detection multiplier', () => {
    const easy = computeDetectionChance('medium', 5, 0.5, 0.7);
    const standard = computeDetectionChance('medium', 5, 0.5, 1);
    const hard = computeDetectionChance('medium', 5, 0.5, 1.3);
    expect(easy).toBeLessThan(standard);
    expect(hard).toBeGreaterThan(standard);
  });

  it('still respects the 0.95 cap with a high multiplier', () => {
    expect(computeDetectionChance('hard', 1, 1, 3)).toBeLessThanOrEqual(0.95);
  });
});

describe('computeScandalSeverity', () => {
  it('is more severe for higher-risk tiers', () => {
    const soft = computeScandalSeverity('soft', 'admit');
    const hard = computeScandalSeverity('hard', 'admit');
    expect(hard).toBeLessThan(soft); // more negative
  });

  it('admitting fault is less damaging than denying it', () => {
    const admit = computeScandalSeverity('medium', 'admit');
    const deny = computeScandalSeverity('medium', 'deny');
    expect(admit).toBeGreaterThan(deny); // less negative
  });

  it('always returns a negative (or zero) approval impact', () => {
    for (const tier of ['soft', 'medium', 'hard'] as const) {
      for (const response of ['admit', 'deny', 'scapegoat'] as const) {
        expect(computeScandalSeverity(tier, response)).toBeLessThanOrEqual(0);
      }
    }
  });
});

describe('attemptCorruptionAction', () => {
  it('returns the tier’s configured favor gain and budget impact', () => {
    const rng = new SeededRng(1);
    const result = attemptCorruptionAction('medium', 5, 0, rng);
    expect(result.favorGain).toBe(CORRUPTION_TIERS.medium.favorGain);
    expect(result.budgetImpact).toBe(CORRUPTION_TIERS.medium.budgetImpact);
  });

  it('is deterministic given the same starting rng state', () => {
    const a = attemptCorruptionAction('hard', 3, 0.5, new SeededRng(42));
    const b = attemptCorruptionAction('hard', 3, 0.5, new SeededRng(42));
    expect(a).toEqual(b);
  });

  it('is essentially never detected for a careful soft act with zero scrutiny', () => {
    // detection chance here is just the tier base (0.08) — roll many seeds, expect it rare.
    let detections = 0;
    for (let seed = 0; seed < 200; seed++) {
      const result = attemptCorruptionAction('soft', 10, 0, new SeededRng(seed));
      if (result.detected) detections++;
    }
    expect(detections).toBeLessThan(200 * 0.2);
  });

  it('is detected far more often for a careless hard act under full scrutiny', () => {
    let detections = 0;
    for (let seed = 0; seed < 200; seed++) {
      const result = attemptCorruptionAction('hard', 1, 1, new SeededRng(seed));
      if (result.detected) detections++;
    }
    expect(detections).toBeGreaterThan(200 * 0.8);
  });
});
