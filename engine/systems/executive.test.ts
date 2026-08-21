import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Bill, Country, Politician } from '../models/types';
import {
  EXECUTIVE_ORDER_COOLDOWN_TURNS,
  VETO_OVERRIDE_THRESHOLD,
  applyVetoOverrideResult,
  canIssueExecutiveOrder,
  issueExecutiveOrder,
  requiresExecutiveSignature,
  resolveVetoOverride,
  sendToExecutiveReview,
  signBill,
  vetoBill,
} from './executive';

function makePolitician(overrides: Partial<Politician> & { id: string }): Politician {
  return {
    name: overrides.id,
    isPlayer: false,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

function makeBill(overrides: Partial<Bill> & { id: string; sponsorId: string }): Bill {
  return {
    title: 'Test Bill',
    provisions: [],
    status: 'awaiting_signature',
    whipCount: {},
    ...overrides,
  };
}

function makeCountry(regimeType: Country['regimeType']): Country {
  return {
    id: 'test-nation',
    name: 'Test Nation',
    regimeType,
    legislature: { name: 'Test Assembly', electoralSystem: 'FPTP', districts: [], totalSeats: 10, prThreshold: 0.05 },
  };
}

describe('requiresExecutiveSignature', () => {
  it('is false for parliamentary regimes', () => {
    expect(requiresExecutiveSignature(makeCountry('parliamentary'))).toBe(false);
  });
  it('is true for presidential and semi-presidential regimes', () => {
    expect(requiresExecutiveSignature(makeCountry('presidential'))).toBe(true);
    expect(requiresExecutiveSignature(makeCountry('semi-presidential'))).toBe(true);
  });
});

describe('sendToExecutiveReview / signBill / vetoBill', () => {
  it('sendToExecutiveReview marks the bill awaiting signature', () => {
    const bill = makeBill({ id: 'b1', sponsorId: 'sponsor', status: 'passed' });
    const reviewed = sendToExecutiveReview(bill);
    expect(reviewed.status).toBe('awaiting_signature');
    expect(reviewed.vetoStatus).toBe('none');
  });

  it('signBill enacts it as passed', () => {
    const bill = makeBill({ id: 'b1', sponsorId: 'sponsor' });
    const signed = signBill(bill);
    expect(signed.status).toBe('passed');
  });

  it('vetoBill marks it vetoed', () => {
    const bill = makeBill({ id: 'b1', sponsorId: 'sponsor' });
    const vetoed = vetoBill(bill);
    expect(vetoed.status).toBe('vetoed');
    expect(vetoed.vetoStatus).toBe('vetoed');
  });
});

describe('resolveVetoOverride', () => {
  it('overrides when nearly everyone strongly backs the sponsor', () => {
    const sponsor = makePolitician({ id: 'sponsor' });
    const members = Array.from({ length: 20 }, (_, i) => makePolitician({ id: `m${i}` }));
    const politicians = [sponsor, ...members];
    const relationships: Record<string, number> = {};
    for (const m of members) relationships[[sponsor.id, m.id].sort().join(':')] = 100;
    const bill = makeBill({ id: 'b1', sponsorId: sponsor.id, status: 'vetoed' });

    const result = resolveVetoOverride(bill, politicians, relationships, {}, new SeededRng(1));
    expect(result.passed).toBe(true);
    expect(result.yes / (result.yes + result.no)).toBeGreaterThanOrEqual(VETO_OVERRIDE_THRESHOLD);
  });

  it('is sustained (not overridden) for an ordinary, non-supermajority coalition, across many seeds', () => {
    const sponsor = makePolitician({ id: 'sponsor', ideology: { economic: 60, social: 60 } });
    const members = Array.from({ length: 30 }, (_, i) =>
      makePolitician({ id: `m${i}`, ideology: { economic: -30 + (i % 7) * 5, social: -30 + (i % 5) * 5 } })
    );
    const politicians = [sponsor, ...members];
    const bill = makeBill({ id: 'b1', sponsorId: sponsor.id, status: 'vetoed' });

    let sawSustained = false;
    for (let seed = 0; seed < 30 && !sawSustained; seed++) {
      const result = resolveVetoOverride(bill, politicians, {}, {}, new SeededRng(seed));
      if (!result.passed) sawSustained = true;
    }
    expect(sawSustained).toBe(true);
  });

  it('is deterministic given the same seed', () => {
    const sponsor = makePolitician({ id: 'sponsor' });
    const members = Array.from({ length: 10 }, (_, i) => makePolitician({ id: `m${i}` }));
    const politicians = [sponsor, ...members];
    const bill = makeBill({ id: 'b1', sponsorId: sponsor.id, status: 'vetoed' });
    const a = resolveVetoOverride(bill, politicians, {}, {}, new SeededRng(9));
    const b = resolveVetoOverride(bill, politicians, {}, {}, new SeededRng(9));
    expect(a).toEqual(b);
  });
});

describe('applyVetoOverrideResult', () => {
  it('restores passed status with vetoStatus overridden on success', () => {
    const bill = makeBill({ id: 'b1', sponsorId: 'sponsor', status: 'vetoed', vetoStatus: 'vetoed' });
    const resolved = applyVetoOverrideResult(bill, { yes: 10, no: 2, passed: true });
    expect(resolved.status).toBe('passed');
    expect(resolved.vetoStatus).toBe('overridden');
  });

  it('keeps the veto standing with vetoStatus sustained on failure', () => {
    const bill = makeBill({ id: 'b1', sponsorId: 'sponsor', status: 'vetoed', vetoStatus: 'vetoed' });
    const resolved = applyVetoOverrideResult(bill, { yes: 4, no: 8, passed: false });
    expect(resolved.status).toBe('vetoed');
    expect(resolved.vetoStatus).toBe('sustained');
  });
});

describe('canIssueExecutiveOrder', () => {
  it('is false for parliamentary regimes regardless of cooldown', () => {
    expect(canIssueExecutiveOrder(makeCountry('parliamentary'), 100, null)).toBe(false);
  });

  it('is true the first time (no prior order)', () => {
    expect(canIssueExecutiveOrder(makeCountry('presidential'), 10, null)).toBe(true);
  });

  it('is false within the cooldown window and true once it elapses', () => {
    const country = makeCountry('presidential');
    expect(canIssueExecutiveOrder(country, 10, 5)).toBe(false);
    expect(canIssueExecutiveOrder(country, 5 + EXECUTIVE_ORDER_COOLDOWN_TURNS - 1, 5)).toBe(false);
    expect(canIssueExecutiveOrder(country, 5 + EXECUTIVE_ORDER_COOLDOWN_TURNS, 5)).toBe(true);
  });
});

describe('issueExecutiveOrder', () => {
  it('stamps the turn issued', () => {
    const order = issueExecutiveOrder({ id: 'eo-1', title: 'Test Order', description: 'test' }, 42);
    expect(order.turnIssued).toBe(42);
    expect(order.id).toBe('eo-1');
  });
});
