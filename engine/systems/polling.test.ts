import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Party, Politician, PollingFirm } from '../models/types';
import { commissionApprovalPoll, commissionPartyPoll, computeMarginOfError } from './polling';

function makeFirm(overrides: Partial<PollingFirm> = {}): PollingFirm {
  return { id: 'firm-1', name: 'Test Polling', sampleSize: 1000, houseBias: 0, reliability: 1, ...overrides };
}

function makePolitician(overrides: Partial<Politician> = {}): Politician {
  return {
    id: 'player',
    name: 'Alex Varga',
    isPlayer: true,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

function makeParty(overrides: Partial<Party> & { id: string }): Party {
  return { name: overrides.id, ideology: { economic: 0, social: 0 }, seats: 10, factions: [], ...overrides };
}

describe('computeMarginOfError', () => {
  it('matches the standard 95% CI formula for a known case', () => {
    // p=0.5, n=1000 -> 1.96*sqrt(0.25/1000)*100 ~= 3.098
    expect(computeMarginOfError(0.5, 1000)).toBeCloseTo(3.098, 2);
  });

  it('shrinks as sample size grows', () => {
    expect(computeMarginOfError(0.5, 4000)).toBeLessThan(computeMarginOfError(0.5, 1000));
  });

  it('is largest at p=0.5 and smaller toward the extremes', () => {
    expect(computeMarginOfError(0.5, 1000)).toBeGreaterThan(computeMarginOfError(0.9, 1000));
    expect(computeMarginOfError(0.5, 1000)).toBeGreaterThan(computeMarginOfError(0.1, 1000));
  });
});

describe('commissionApprovalPoll', () => {
  it('is deterministic given the same rng state', () => {
    const firm = makeFirm();
    const politician = makePolitician();
    const a = commissionApprovalPoll(firm, politician, 5, new SeededRng(11));
    const b = commissionApprovalPoll(firm, politician, 5, new SeededRng(11));
    expect(a).toEqual(b);
  });

  it('reports the true value alongside the sampled one', () => {
    const firm = makeFirm();
    const politician = makePolitician({ approval: { public: 62, base: 50, partyElite: 50 } });
    const poll = commissionApprovalPoll(firm, politician, 1, new SeededRng(1));
    expect(poll.trueValue).toBe(62);
  });

  it('a large sample stays close to the true value on average across many polls', () => {
    const firm = makeFirm({ sampleSize: 5000 });
    const politician = makePolitician({ approval: { public: 55, base: 50, partyElite: 50 } });
    let sum = 0;
    const trials = 200;
    for (let seed = 0; seed < trials; seed++) {
      sum += commissionApprovalPoll(firm, politician, 1, new SeededRng(seed)).sampledValue;
    }
    expect(sum / trials).toBeGreaterThan(50);
    expect(sum / trials).toBeLessThan(60);
  });

  it('house bias shifts the sampled value on average', () => {
    const biasedFirm = makeFirm({ houseBias: 5, sampleSize: 3000 });
    const neutralFirm = makeFirm({ houseBias: 0, sampleSize: 3000 });
    const politician = makePolitician({ approval: { public: 50, base: 50, partyElite: 50 } });
    let biasedSum = 0;
    let neutralSum = 0;
    const trials = 200;
    for (let seed = 0; seed < trials; seed++) {
      biasedSum += commissionApprovalPoll(biasedFirm, politician, 1, new SeededRng(seed)).sampledValue;
      neutralSum += commissionApprovalPoll(neutralFirm, politician, 1, new SeededRng(seed)).sampledValue;
    }
    expect(biasedSum / trials).toBeGreaterThan(neutralSum / trials);
  });

  it('a less reliable firm produces a wider spread of results than a highly reliable one', () => {
    const unreliable = makeFirm({ reliability: 0.2, sampleSize: 1000 });
    const reliable = makeFirm({ reliability: 1, sampleSize: 1000 });
    const politician = makePolitician({ approval: { public: 50, base: 50, partyElite: 50 } });

    function stddev(values: number[]): number {
      const mean = values.reduce((s, v) => s + v, 0) / values.length;
      return Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
    }

    const unreliableValues: number[] = [];
    const reliableValues: number[] = [];
    for (let seed = 0; seed < 200; seed++) {
      unreliableValues.push(commissionApprovalPoll(unreliable, politician, 1, new SeededRng(seed)).sampledValue);
      reliableValues.push(commissionApprovalPoll(reliable, politician, 1, new SeededRng(seed)).sampledValue);
    }
    expect(stddev(unreliableValues)).toBeGreaterThan(stddev(reliableValues));
  });
});

describe('commissionPartyPoll', () => {
  it('uses seat share as the true value', () => {
    const firm = makeFirm();
    const parties = [makeParty({ id: 'a', seats: 30 }), makeParty({ id: 'b', seats: 70 })];
    const poll = commissionPartyPoll(firm, parties[0], parties, 1, new SeededRng(1));
    expect(poll.trueValue).toBe(30);
  });

  it('handles zero total seats without dividing by zero', () => {
    const firm = makeFirm();
    const parties = [makeParty({ id: 'a', seats: 0 })];
    const poll = commissionPartyPoll(firm, parties[0], parties, 1, new SeededRng(1));
    expect(poll.trueValue).toBe(0);
    expect(Number.isFinite(poll.sampledValue)).toBe(true);
  });
});
