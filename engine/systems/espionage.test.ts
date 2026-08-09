import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { MilitaryProfile } from '../models/types';
import {
  applyCovertMilitaryDelta,
  attemptCovertOperation,
  computeOperationDetectionChance,
  computeOperationSuccessChance,
  investInIntelligence,
} from './espionage';

const COUNTERPART_MILITARY: MilitaryProfile = { strength: 50, personnel: 200, techLevel: 50 };

describe('computeOperationSuccessChance', () => {
  it('rises with intelligence capability', () => {
    expect(computeOperationSuccessChance(100)).toBeGreaterThan(computeOperationSuccessChance(0));
  });

  it('stays within [0.2, 0.9]', () => {
    expect(computeOperationSuccessChance(0)).toBeGreaterThanOrEqual(0.2);
    expect(computeOperationSuccessChance(100)).toBeLessThanOrEqual(0.9);
  });
});

describe('computeOperationDetectionChance', () => {
  it('falls as the player\'s own intelligence capability rises', () => {
    const low = computeOperationDetectionChance('sabotage', 0, 50);
    const high = computeOperationDetectionChance('sabotage', 100, 50);
    expect(high).toBeLessThan(low);
  });

  it('rises against a more technologically sophisticated counterpart', () => {
    const weak = computeOperationDetectionChance('sabotage', 50, 10);
    const strong = computeOperationDetectionChance('sabotage', 50, 90);
    expect(strong).toBeGreaterThan(weak);
  });

  it('a coup carries higher baseline risk than espionage, all else equal', () => {
    const espionageRisk = computeOperationDetectionChance('espionage', 50, 50);
    const coupRisk = computeOperationDetectionChance('coup', 50, 50);
    expect(coupRisk).toBeGreaterThan(espionageRisk);
  });

  it('stays within [0.03, 0.9]', () => {
    expect(computeOperationDetectionChance('coup', 0, 100)).toBeLessThanOrEqual(0.9);
    expect(computeOperationDetectionChance('espionage', 100, 0)).toBeGreaterThanOrEqual(0.03);
  });
});

describe('attemptCovertOperation', () => {
  it('is deterministic for a given rng state', () => {
    const a = attemptCovertOperation('sabotage', 50, COUNTERPART_MILITARY, new SeededRng(42));
    const b = attemptCovertOperation('sabotage', 50, COUNTERPART_MILITARY, new SeededRng(42));
    expect(a).toEqual(b);
  });

  it('always applies the operation budget cost regardless of outcome', () => {
    for (let seed = 0; seed < 20; seed++) {
      const outcome = attemptCovertOperation('sabotage', 50, COUNTERPART_MILITARY, new SeededRng(seed));
      expect(outcome.economyEffect.budgetBalance).toBeLessThan(0);
    }
  });

  it('only applies counterpart military damage on success', () => {
    const rng = new SeededRng(3);
    for (let i = 0; i < 30; i++) {
      const outcome = attemptCovertOperation('sabotage', 30, COUNTERPART_MILITARY, rng);
      if (!outcome.success) {
        expect(outcome.counterpartMilitaryDelta.strength ?? 0).toBe(0);
      } else {
        expect(outcome.counterpartMilitaryDelta.strength ?? 0).toBeLessThan(0);
      }
    }
  });

  it('espionage never damages the counterpart military even on success', () => {
    const rng = new SeededRng(9);
    for (let i = 0; i < 30; i++) {
      const outcome = attemptCovertOperation('espionage', 80, COUNTERPART_MILITARY, rng);
      expect(outcome.counterpartMilitaryDelta.strength ?? 0).toBe(0);
      expect(outcome.counterpartMilitaryDelta.techLevel ?? 0).toBe(0);
    }
  });

  it('a coup grants a relation bonus on success and a penalty when detected, additively', () => {
    const rng = new SeededRng(1);
    let sawBoth = false;
    for (let i = 0; i < 200 && !sawBoth; i++) {
      const outcome = attemptCovertOperation('coup', 10, COUNTERPART_MILITARY, rng);
      if (outcome.success && outcome.detected) {
        expect(outcome.relationDelta).toBe(40 + -70);
        sawBoth = true;
      }
    }
    expect(sawBoth).toBe(true);
  });

  it('a purely failed, undetected operation has zero relation impact and zero gains', () => {
    const rng = new SeededRng(1);
    let sawClean = false;
    for (let i = 0; i < 200 && !sawClean; i++) {
      const outcome = attemptCovertOperation('espionage', 5, COUNTERPART_MILITARY, rng);
      if (!outcome.success && !outcome.detected) {
        expect(outcome.relationDelta).toBe(0);
        expect(outcome.techGain).toBe(0);
        sawClean = true;
      }
    }
    expect(sawClean).toBe(true);
  });
});

describe('applyCovertMilitaryDelta', () => {
  it('reduces strength and techLevel by the delta', () => {
    const result = applyCovertMilitaryDelta(COUNTERPART_MILITARY, { strength: -10, techLevel: -5 });
    expect(result.strength).toBe(40);
    expect(result.techLevel).toBe(45);
  });

  it('never drops below a token minimum of 1', () => {
    const result = applyCovertMilitaryDelta({ strength: 5, personnel: 10, techLevel: 3 }, { strength: -50, techLevel: -50 });
    expect(result.strength).toBe(1);
    expect(result.techLevel).toBe(1);
  });

  it('leaves fields unchanged when no delta is given for them', () => {
    const result = applyCovertMilitaryDelta(COUNTERPART_MILITARY, {});
    expect(result.strength).toBe(COUNTERPART_MILITARY.strength);
    expect(result.techLevel).toBe(COUNTERPART_MILITARY.techLevel);
  });
});

describe('investInIntelligence', () => {
  it('raises capability and costs budget', () => {
    const result = investInIntelligence(20, 'modest');
    expect(result.capability).toBeGreaterThan(20);
    expect(result.economyEffect.budgetBalance).toBeLessThan(0);
  });

  it('a major investment costs more and gains more than a modest one', () => {
    const modest = investInIntelligence(20, 'modest');
    const major = investInIntelligence(20, 'major');
    expect(major.capability).toBeGreaterThan(modest.capability);
    expect(major.economyEffect.budgetBalance!).toBeLessThan(modest.economyEffect.budgetBalance!);
  });

  it('clamps capability to 100', () => {
    const result = investInIntelligence(95, 'major');
    expect(result.capability).toBe(100);
  });
});
