import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { MilitaryProfile } from '../models/types';
import {
  computeDeterrenceRatio,
  computeEffectiveStrength,
  computeWarResolutionRelationDelta,
  declareWar,
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
