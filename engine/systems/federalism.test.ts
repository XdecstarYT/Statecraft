import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { InterstateDispute, StateGovernment } from '../models/types';
import { MAX_ACTIVE_DISPUTES, mediateInterstateDispute, rollForInterstateDispute } from './federalism';

function makeGov(overrides: Partial<StateGovernment> & { provinceId: string }): StateGovernment {
  return {
    provinceName: overrides.provinceId,
    governorName: 'Test Governor',
    partyId: 'party-1',
    approval: 50,
    nextElectionTurn: 100,
    lastElectionTurn: null,
    termsServed: 0,
    legislatureSeats: {},
    federalTension: 50,
    ...overrides,
  };
}

describe('rollForInterstateDispute', () => {
  it('never spawns with fewer than two states', () => {
    const govs = [makeGov({ provinceId: 'a' })];
    for (let seed = 0; seed < 20; seed++) {
      expect(rollForInterstateDispute(govs, [], 1, new SeededRng(seed), 1)).toBeNull();
    }
  });

  it('spawns a dispute between two different real provinces at chance=1', () => {
    const govs = [makeGov({ provinceId: 'a' }), makeGov({ provinceId: 'b' }), makeGov({ provinceId: 'c' })];
    const dispute = rollForInterstateDispute(govs, [], 5, new SeededRng(1), 1);
    expect(dispute).not.toBeNull();
    expect(dispute!.stateAId).not.toBe(dispute!.stateBId);
    expect([dispute!.stateAId, dispute!.stateBId].every((id) => ['a', 'b', 'c'].includes(id))).toBe(true);
    expect(dispute!.status).toBe('active');
    expect(dispute!.turnStarted).toBe(5);
  });

  it('never spawns a second dispute at or beyond the active cap', () => {
    const govs = [makeGov({ provinceId: 'a' }), makeGov({ provinceId: 'b' }), makeGov({ provinceId: 'c' }), makeGov({ provinceId: 'd' })];
    const existing: InterstateDispute[] = Array.from({ length: MAX_ACTIVE_DISPUTES }, (_, i) => ({
      id: `d${i}`,
      stateAId: 'a',
      stateBId: 'b',
      type: 'trade',
      status: 'active',
      turnStarted: 1,
    }));
    for (let seed = 0; seed < 20; seed++) {
      expect(rollForInterstateDispute(govs, existing, 5, new SeededRng(seed), 1)).toBeNull();
    }
  });

  it('respects the chance parameter (never spawns at chance=0)', () => {
    const govs = [makeGov({ provinceId: 'a' }), makeGov({ provinceId: 'b' })];
    for (let seed = 0; seed < 20; seed++) {
      expect(rollForInterstateDispute(govs, [], 1, new SeededRng(seed), 0)).toBeNull();
    }
  });

  it('is deterministic given the same seed', () => {
    const govs = [makeGov({ provinceId: 'a' }), makeGov({ provinceId: 'b' }), makeGov({ provinceId: 'c' })];
    const a = rollForInterstateDispute(govs, [], 5, new SeededRng(3), 1);
    const b = rollForInterstateDispute(govs, [], 5, new SeededRng(3), 1);
    expect(a).toEqual(b);
  });
});

describe('mediateInterstateDispute', () => {
  const dispute: InterstateDispute = {
    id: 'd1',
    stateAId: 'a',
    stateBId: 'b',
    type: 'resource',
    status: 'active',
    turnStarted: 5,
  };
  const govs = [makeGov({ provinceId: 'a', federalTension: 50 }), makeGov({ provinceId: 'b', federalTension: 50 })];

  it('favoring a side relieves that state and raises the other', () => {
    const result = mediateInterstateDispute(dispute, 'favor_a', govs, 10);
    const a = result.governments.find((g) => g.provinceId === 'a')!;
    const b = result.governments.find((g) => g.provinceId === 'b')!;
    expect(a.federalTension).toBeLessThan(50);
    expect(b.federalTension).toBeGreaterThan(50);
  });

  it('a neutral choice relieves both states by a smaller, even amount', () => {
    const result = mediateInterstateDispute(dispute, 'neutral', govs, 10);
    const a = result.governments.find((g) => g.provinceId === 'a')!;
    const b = result.governments.find((g) => g.provinceId === 'b')!;
    expect(a.federalTension).toBeLessThan(50);
    expect(b.federalTension).toBeLessThan(50);
    expect(a.federalTension).toBe(b.federalTension);
  });

  it('marks the dispute resolved with the chosen resolution and turn', () => {
    const result = mediateInterstateDispute(dispute, 'favor_b', govs, 10);
    expect(result.dispute.status).toBe('resolved');
    expect(result.dispute.resolution).toBe('favor_b');
    expect(result.dispute.turnResolved).toBe(10);
  });

  it('leaves uninvolved states untouched', () => {
    const withThird = [...govs, makeGov({ provinceId: 'c', federalTension: 33 })];
    const result = mediateInterstateDispute(dispute, 'favor_a', withThird, 10);
    expect(result.governments.find((g) => g.provinceId === 'c')!.federalTension).toBe(33);
  });

  it('gives a larger growth bump for a neutral resolution than a favored one on a resource dispute', () => {
    const neutral = mediateInterstateDispute(dispute, 'neutral', govs, 10);
    const favored = mediateInterstateDispute(dispute, 'favor_a', govs, 10);
    expect(neutral.economyEffect.gdpGrowth!).toBeGreaterThan(favored.economyEffect.gdpGrowth!);
  });

  it('keeps tension within 0..100 bounds even from an extreme starting value', () => {
    const extreme = [makeGov({ provinceId: 'a', federalTension: 2 }), makeGov({ provinceId: 'b', federalTension: 98 })];
    const result = mediateInterstateDispute(dispute, 'favor_b', extreme, 10);
    for (const g of result.governments) {
      expect(g.federalTension).toBeGreaterThanOrEqual(0);
      expect(g.federalTension).toBeLessThanOrEqual(100);
    }
  });
});
