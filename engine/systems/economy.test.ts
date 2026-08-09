import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { EconomyState } from '../models/types';
import {
  MAX_POLICY_DELAY_TURNS,
  MIN_POLICY_DELAY_TURNS,
  advanceEconomy,
  queuePolicyEffect,
} from './economy';

const baseEconomy: EconomyState = {
  gdpGrowth: 2.0,
  inflation: 3.0,
  unemployment: 5.0,
  debtToGdp: 60,
  budgetBalance: -2.0,
  pendingEffects: [],
};

describe('queuePolicyEffect', () => {
  it('adds a pending effect with the requested delay', () => {
    const economy = queuePolicyEffect(baseEconomy, { gdpGrowth: 1 }, 3);
    expect(economy.pendingEffects).toHaveLength(1);
    expect(economy.pendingEffects[0]).toEqual({ turnsRemaining: 3, delta: { gdpGrowth: 1 } });
  });

  it('rejects delays outside the 2-6 turn window', () => {
    expect(() => queuePolicyEffect(baseEconomy, {}, MIN_POLICY_DELAY_TURNS - 1)).toThrow();
    expect(() => queuePolicyEffect(baseEconomy, {}, MAX_POLICY_DELAY_TURNS + 1)).toThrow();
  });

  it('accepts the boundary delays', () => {
    expect(() => queuePolicyEffect(baseEconomy, {}, MIN_POLICY_DELAY_TURNS)).not.toThrow();
    expect(() => queuePolicyEffect(baseEconomy, {}, MAX_POLICY_DELAY_TURNS)).not.toThrow();
  });

  it('does not mutate the original economy state', () => {
    const before = JSON.stringify(baseEconomy);
    queuePolicyEffect(baseEconomy, { gdpGrowth: 1 }, 3);
    expect(JSON.stringify(baseEconomy)).toBe(before);
  });
});

describe('advanceEconomy', () => {
  it('does not apply a pending effect before its delay elapses', () => {
    let economy = queuePolicyEffect(baseEconomy, { gdpGrowth: 50 }, 3);
    const rng = new SeededRng(1);

    // Turn 1 and 2: the +50 growth effect should not be visible yet.
    economy = advanceEconomy(economy, rng);
    expect(economy.gdpGrowth).toBeLessThan(10);
    economy = advanceEconomy(economy, rng);
    expect(economy.gdpGrowth).toBeLessThan(10);
    expect(economy.pendingEffects).toHaveLength(1);
  });

  it('applies the pending effect exactly on the turn its delay reaches zero', () => {
    let economy = queuePolicyEffect(baseEconomy, { gdpGrowth: 50 }, 2);
    const rng = new SeededRng(1);

    economy = advanceEconomy(economy, rng); // turnsRemaining: 2 -> 1
    economy = advanceEconomy(economy, rng); // turnsRemaining: 1 -> 0, applied
    expect(economy.gdpGrowth).toBeGreaterThan(40);
    expect(economy.pendingEffects).toHaveLength(0);
  });

  it('produces the same result for the same starting rng state', () => {
    const rngA = new SeededRng(777);
    const rngB = new SeededRng(777);
    const resultA = advanceEconomy(baseEconomy, rngA);
    const resultB = advanceEconomy(baseEconomy, rngB);
    expect(resultA).toEqual(resultB);
  });

  it('produces different results for different rng states', () => {
    const resultA = advanceEconomy(baseEconomy, new SeededRng(1));
    const resultB = advanceEconomy(baseEconomy, new SeededRng(2));
    expect(resultA).not.toEqual(resultB);
  });

  it('never lets unemployment or debt-to-gdp go negative', () => {
    const nearZero: EconomyState = {
      ...baseEconomy,
      unemployment: 0.01,
      debtToGdp: 0.01,
    };
    const result = advanceEconomy(nearZero, new SeededRng(42));
    expect(result.unemployment).toBeGreaterThanOrEqual(0);
    expect(result.debtToGdp).toBeGreaterThanOrEqual(0);
  });

  it('moves indicators turn over turn rather than staying frozen', () => {
    let economy = baseEconomy;
    const rng = new SeededRng(9001);
    const history: number[] = [economy.gdpGrowth];
    for (let i = 0; i < 5; i++) {
      economy = advanceEconomy(economy, rng);
      history.push(economy.gdpGrowth);
    }
    const distinctValues = new Set(history.map((v) => v.toFixed(6)));
    expect(distinctValues.size).toBeGreaterThan(1);
  });

  it('a higher volatility multiplier produces larger swings from the same rng draws', () => {
    const calm = advanceEconomy(baseEconomy, new SeededRng(55), 0.5);
    const wild = advanceEconomy(baseEconomy, new SeededRng(55), 2);
    const calmSwing = Math.abs(calm.gdpGrowth - baseEconomy.gdpGrowth);
    const wildSwing = Math.abs(wild.gdpGrowth - baseEconomy.gdpGrowth);
    expect(wildSwing).toBeGreaterThan(calmSwing);
  });

  it('does not scale already-queued policy effects by the volatility multiplier', () => {
    const withEffect = queuePolicyEffect(baseEconomy, { gdpGrowth: 10 }, 2);
    let calm = withEffect;
    let wild = withEffect;
    const rngCalm = new SeededRng(1);
    const rngWild = new SeededRng(1);
    calm = advanceEconomy(calm, rngCalm, 0.1);
    calm = advanceEconomy(calm, rngCalm, 0.1);
    wild = advanceEconomy(wild, rngWild, 5);
    wild = advanceEconomy(wild, rngWild, 5);
    // Both landed the same +10 policy effect; only the tiny drift/noise differs.
    expect(Math.abs(calm.gdpGrowth - wild.gdpGrowth)).toBeLessThan(2);
  });
});
