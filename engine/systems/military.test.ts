import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { MilitaryProfile } from '../models/types';
import {
  applyWarAttrition,
  computeDeterrenceRatio,
  computeEffectiveStrength,
  computeWarResolutionRelationDelta,
  declareWar,
  investInMilitary,
  resolveWarTurn,
} from './military';

function profile(strength: number, techLevel: number, personnel = 100): MilitaryProfile {
  return { strength, techLevel, personnel };
}

describe('computeEffectiveStrength', () => {
  it('scales up with tech level for the same raw strength', () => {
    const low = computeEffectiveStrength(profile(50, 0));
    const high = computeEffectiveStrength(profile(50, 100));
    expect(high).toBeGreaterThan(low);
  });

  it('is 0 at 0 strength regardless of tech', () => {
    expect(computeEffectiveStrength(profile(0, 100))).toBe(0);
  });
});

describe('computeDeterrenceRatio', () => {
  it('is greater than 1 when the player is stronger', () => {
    const ratio = computeDeterrenceRatio(profile(80, 80), profile(20, 20));
    expect(ratio).toBeGreaterThan(1);
  });

  it('is less than 1 when the counterpart is stronger', () => {
    const ratio = computeDeterrenceRatio(profile(20, 20), profile(80, 80));
    expect(ratio).toBeLessThan(1);
  });

  it('is 1 for exactly matched militaries', () => {
    expect(computeDeterrenceRatio(profile(50, 50), profile(50, 50))).toBeCloseTo(1, 5);
  });
});

describe('declareWar', () => {
  it('starts active with zero accumulated advantage', () => {
    const war = declareWar('rival', 5);
    expect(war.status).toBe('active');
    expect(war.advantage).toBe(0);
    expect(war.startTurn).toBe(5);
  });
});

describe('resolveWarTurn', () => {
  it('is a no-op once the war is no longer active', () => {
    const war = { ...declareWar('rival', 1), status: 'won' as const };
    const result = resolveWarTurn(war, profile(90, 90), profile(10, 10), 5, new SeededRng(1));
    expect(result.war).toEqual(war);
    expect(result.economyEffect).toEqual({});
  });

  it('trends toward victory for a much stronger player over many turns', () => {
    let war = declareWar('rival', 1);
    const rng = new SeededRng(42);
    let turn = 1;
    while (war.status === 'active' && turn < 200) {
      turn++;
      war = resolveWarTurn(war, profile(95, 90), profile(10, 10), turn, rng).war;
    }
    expect(war.status).toBe('won');
  });

  it('trends toward defeat for a much weaker player over many turns', () => {
    let war = declareWar('rival', 1);
    const rng = new SeededRng(42);
    let turn = 1;
    while (war.status === 'active' && turn < 200) {
      turn++;
      war = resolveWarTurn(war, profile(10, 10), profile(95, 90), turn, rng).war;
    }
    expect(war.status).toBe('lost');
  });

  it('calls a stalemate if neither side breaks decisively within the turn limit', () => {
    let war = declareWar('rival', 1);
    const rng = new SeededRng(7);
    let turn = 1;
    for (let i = 0; i < 25 && war.status === 'active'; i++) {
      turn++;
      war = resolveWarTurn(war, profile(50, 50), profile(50, 50), turn, rng).war;
    }
    expect(war.status).not.toBe('active');
  });

  it('always costs the budget while a war is active, regardless of outcome', () => {
    const war = declareWar('rival', 1);
    const result = resolveWarTurn(war, profile(50, 50), profile(50, 50), 2, new SeededRng(3));
    expect(result.economyEffect.budgetBalance).toBeLessThan(0);
  });

  it('is deterministic for the same starting state and rng seed', () => {
    const war = declareWar('rival', 1);
    const a = resolveWarTurn(war, profile(60, 60), profile(40, 40), 2, new SeededRng(99));
    const b = resolveWarTurn(war, profile(60, 60), profile(40, 40), 2, new SeededRng(99));
    expect(a).toEqual(b);
  });
});

describe('computeWarResolutionRelationDelta', () => {
  it('returns a negative delta for every conclusive outcome', () => {
    expect(computeWarResolutionRelationDelta('won')).toBeLessThan(0);
    expect(computeWarResolutionRelationDelta('lost')).toBeLessThan(0);
    expect(computeWarResolutionRelationDelta('stalemate')).toBeLessThan(0);
  });

  it('is 0 for a still-active war', () => {
    expect(computeWarResolutionRelationDelta('active')).toBe(0);
  });
});

describe('applyWarAttrition', () => {
  it('reduces both personnel and strength', () => {
    const before = profile(50, 50, 200);
    const after = applyWarAttrition(before);
    expect(after.personnel).toBeLessThan(before.personnel);
    expect(after.strength).toBeLessThan(before.strength);
  });

  it('never decays personnel or strength below 1', () => {
    const after = applyWarAttrition(profile(1, 50, 1));
    expect(after.personnel).toBeGreaterThanOrEqual(1);
    expect(after.strength).toBeGreaterThanOrEqual(1);
  });

  it('leaves tech level untouched', () => {
    const after = applyWarAttrition(profile(50, 77, 200));
    expect(after.techLevel).toBe(77);
  });
});

describe('investInMilitary', () => {
  it('grows strength, tech level, and personnel', () => {
    const before = profile(40, 40, 100);
    const { military } = investInMilitary(before, 'modest');
    expect(military.strength).toBeGreaterThan(before.strength);
    expect(military.techLevel).toBeGreaterThan(before.techLevel);
    expect(military.personnel).toBeGreaterThan(before.personnel);
  });

  it('costs the budget immediately', () => {
    const { economyEffect } = investInMilitary(profile(40, 40, 100), 'modest');
    expect(economyEffect.budgetBalance).toBeLessThan(0);
  });

  it('a major investment costs more and gives more than a modest one', () => {
    const before = profile(40, 40, 100);
    const modest = investInMilitary(before, 'modest');
    const major = investInMilitary(before, 'major');
    expect(Math.abs(major.economyEffect.budgetBalance!)).toBeGreaterThan(Math.abs(modest.economyEffect.budgetBalance!));
    expect(major.military.strength).toBeGreaterThan(modest.military.strength);
  });

  it('clamps strength and tech level to 100', () => {
    const { military } = investInMilitary(profile(99, 99, 100), 'major');
    expect(military.strength).toBeLessThanOrEqual(100);
    expect(military.techLevel).toBeLessThanOrEqual(100);
  });
});

describe('resolveWarTurn with an ally bonus', () => {
  it('a positive ally bonus improves the player\'s outcome over many turns', () => {
    const seed = 55;
    const player = profile(40, 40);
    const counterpart = profile(45, 45);

    let warAlone = declareWar('rival', 1);
    const rngAlone = new SeededRng(seed);
    let turn = 1;
    while (warAlone.status === 'active' && turn < 300) {
      turn++;
      warAlone = resolveWarTurn(warAlone, player, counterpart, turn, rngAlone).war;
    }

    let warWithAlly = declareWar('rival', 1);
    const rngAllied = new SeededRng(seed);
    turn = 1;
    while (warWithAlly.status === 'active' && turn < 300) {
      turn++;
      warWithAlly = resolveWarTurn(warWithAlly, player, counterpart, turn, rngAllied, 40).war;
    }

    expect(warWithAlly.advantage).toBeGreaterThan(warAlone.advantage);
  });
});

describe('resolveWarTurn spoils scaling', () => {
  it('winning against a much stronger counterpart yields a bigger economic swing than beating a weak one', () => {
    const war = declareWar('rival', 1);
    // Force a decisive win on turn 2 for both cases via extreme mismatches and a fixed seed.
    const beatWeak = resolveWarTurn(
      { ...war, advantage: 99 },
      profile(90, 90),
      profile(5, 5),
      2,
      new SeededRng(1)
    );
    const beatStrong = resolveWarTurn(
      { ...war, advantage: 99 },
      profile(90, 90),
      profile(85, 85),
      2,
      new SeededRng(1)
    );
    expect(beatWeak.war.status).toBe('won');
    expect(beatStrong.war.status).toBe('won');
    expect(beatStrong.economyEffect.gdpGrowth!).toBeGreaterThan(beatWeak.economyEffect.gdpGrowth!);
  });
});
