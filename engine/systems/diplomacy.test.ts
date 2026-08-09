import { describe, expect, it } from 'vitest';
import type { EconomyState, Treaty } from '../models/types';
import {
  AID_RELATION_BONUS,
  SANCTIONS_RELATION_PENALTY,
  TREATY_BREAK_PENALTY,
  adjustRelation,
  breakTreaty,
  imposeSanctions,
  proposeTreaty,
  sendAid,
  signTreaty,
} from './diplomacy';

const baseEconomy: EconomyState = {
  gdpGrowth: 2.0,
  inflation: 3.0,
  unemployment: 5.0,
  debtToGdp: 60,
  budgetBalance: -2.0,
  pendingEffects: [],
};

describe('adjustRelation', () => {
  it('starts an unknown counterpart at 0 and applies the delta', () => {
    const relations = adjustRelation({}, 'nordholm', 25);
    expect(relations.nordholm).toBe(25);
  });

  it('clamps to -100..100', () => {
    expect(adjustRelation({ x: 90 }, 'x', 50).x).toBe(100);
    expect(adjustRelation({ x: -90 }, 'x', -50).x).toBe(-100);
  });
});

describe('treaty lifecycle', () => {
  const treatyParams: Omit<Treaty, 'status'> = {
    id: 'treaty-1',
    counterpartId: 'nordholm',
    type: 'trade',
    title: 'Kastoria-Nordholm Trade Accord',
    economyEffect: { gdpGrowth: 0.5 },
    relationEffect: 20,
  };

  it('proposeTreaty starts a treaty in "proposed" status', () => {
    const treaty = proposeTreaty(treatyParams);
    expect(treaty.status).toBe('proposed');
  });

  it('signing activates the treaty, bumps relations immediately, and queues the economic effect', () => {
    const treaty = proposeTreaty(treatyParams);
    const result = signTreaty(treaty, baseEconomy, {});
    expect(result.treaty.status).toBe('active');
    expect(result.relations.nordholm).toBe(20);
    expect(result.economy.pendingEffects).toHaveLength(1);
    expect(result.economy.pendingEffects[0].delta).toEqual({ gdpGrowth: 0.5 });
    // Not applied yet — still queued.
    expect(result.economy.gdpGrowth).toBe(baseEconomy.gdpGrowth);
  });

  it('refuses to sign a treaty that is not proposed', () => {
    const treaty: Treaty = { ...treatyParams, status: 'active' };
    expect(() => signTreaty(treaty, baseEconomy, {})).toThrow();
  });

  it('breaking an active treaty penalizes relations and refuses on a non-active treaty', () => {
    const active: Treaty = { ...treatyParams, status: 'active' };
    const result = breakTreaty(active, { nordholm: 20 });
    expect(result.treaty.status).toBe('broken');
    expect(result.relations.nordholm).toBe(20 + TREATY_BREAK_PENALTY);

    const proposed: Treaty = { ...treatyParams, status: 'proposed' };
    expect(() => breakTreaty(proposed, {})).toThrow();
  });
});

describe('direct diplomatic actions', () => {
  it('imposeSanctions costs relations and dents growth immediately', () => {
    const result = imposeSanctions('nordholm', baseEconomy, { nordholm: 10 });
    expect(result.relations.nordholm).toBe(10 + SANCTIONS_RELATION_PENALTY);
    expect(result.economy.gdpGrowth).toBeLessThan(baseEconomy.gdpGrowth);
  });

  it('sendAid buys relations at a small budget cost', () => {
    const result = sendAid('nordholm', baseEconomy, { nordholm: -10 });
    expect(result.relations.nordholm).toBe(-10 + AID_RELATION_BONUS);
    expect(result.economy.budgetBalance).toBeLessThan(baseEconomy.budgetBalance);
  });
});
