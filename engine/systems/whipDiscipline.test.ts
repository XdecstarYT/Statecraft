import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Bill, PartyWhip, Party, Politician } from '../models/types';
import {
  applyEnforceDisciplineToWhip,
  applyRebellionToWhip,
  assignPartyWhips,
  detectRebellion,
  enforceWhipDiscipline,
  getPartyLoyalty,
  DEFAULT_PARTY_LOYALTY,
} from './whipDiscipline';

function makePolitician(id: string, overrides: Partial<Politician> = {}): Politician {
  return {
    id,
    name: id,
    isPlayer: false,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

const PARTY_A: Party = { id: 'party-a', name: 'Party A', ideology: { economic: 0, social: 0 }, seats: 5, factions: [] };

function makeBill(overrides: Partial<Bill> = {}): Bill {
  return {
    id: 'bill-1',
    title: 'Test Bill',
    provisions: [],
    sponsorId: 'sponsor',
    status: 'floor',
    whipCount: {},
    ...overrides,
  };
}

describe('getPartyLoyalty', () => {
  it('defaults to DEFAULT_PARTY_LOYALTY when absent', () => {
    expect(getPartyLoyalty({}, 'unknown')).toBe(DEFAULT_PARTY_LOYALTY);
  });

  it('returns the stored value when present', () => {
    expect(getPartyLoyalty({ p1: 80 }, 'p1')).toBe(80);
  });
});

describe('assignPartyWhips', () => {
  it('picks the member with the strongest network+charisma per party', () => {
    const weak = makePolitician('weak', { attributes: { charisma: 1, intellect: 5, integrity: 5, network: 1, mediaSavvy: 5 } });
    const strong = makePolitician('strong', { attributes: { charisma: 8, intellect: 5, integrity: 5, network: 8, mediaSavvy: 5 } });
    const whips = assignPartyWhips([weak, strong], [PARTY_A]);
    expect(whips).toHaveLength(1);
    expect(whips[0].politicianId).toBe('strong');
    expect(whips[0].partyId).toBe('party-a');
  });

  it('is deterministic — ties break by id', () => {
    const a = makePolitician('a-member');
    const b = makePolitician('b-member');
    const whips1 = assignPartyWhips([a, b], [PARTY_A]);
    const whips2 = assignPartyWhips([b, a], [PARTY_A]);
    expect(whips1[0].politicianId).toBe(whips2[0].politicianId);
  });

  it('skips parties with no members', () => {
    const emptyParty: Party = { id: 'party-empty', name: 'Empty', ideology: { economic: 0, social: 0 }, seats: 0, factions: [] };
    const whips = assignPartyWhips([makePolitician('p1')], [PARTY_A, emptyParty]);
    expect(whips).toHaveLength(1);
  });
});

describe('detectRebellion', () => {
  it('detects a rebellion when a large share of the party votes against its own majority', () => {
    const members = ['m1', 'm2', 'm3', 'm4', 'm5'].map((id) => makePolitician(id));
    const bill = makeBill({ sponsorId: 'sponsor' });
    const finalWhipCount: Record<string, 'yes' | 'no'> = { m1: 'yes', m2: 'yes', m3: 'yes', m4: 'no', m5: 'no' };
    const rebellion = detectRebellion(bill, finalWhipCount, members, PARTY_A, 5, 'reb-1');
    expect(rebellion).not.toBeNull();
    expect(rebellion!.rebelIds.sort()).toEqual(['m4', 'm5']);
    expect(rebellion!.partyId).toBe('party-a');
  });

  it('returns null when the party holds together', () => {
    const members = ['m1', 'm2', 'm3', 'm4', 'm5'].map((id) => makePolitician(id));
    const bill = makeBill();
    const finalWhipCount: Record<string, 'yes' | 'no'> = { m1: 'yes', m2: 'yes', m3: 'yes', m4: 'yes', m5: 'no' };
    expect(detectRebellion(bill, finalWhipCount, members, PARTY_A, 5, 'reb-1')).toBeNull();
  });

  it('returns null for a party too small to have a meaningful backbench', () => {
    const members = ['m1', 'm2'].map((id) => makePolitician(id));
    const bill = makeBill();
    const finalWhipCount: Record<string, 'yes' | 'no'> = { m1: 'yes', m2: 'no' };
    expect(detectRebellion(bill, finalWhipCount, members, PARTY_A, 5, 'reb-1')).toBeNull();
  });

  it('excludes the sponsor from the vote tally', () => {
    const members = ['sponsor', 'm2', 'm3', 'm4', 'm5'].map((id) => makePolitician(id));
    const bill = makeBill({ sponsorId: 'sponsor' });
    const finalWhipCount: Record<string, 'yes' | 'no'> = { sponsor: 'yes', m2: 'yes', m3: 'yes', m4: 'yes', m5: 'yes' };
    expect(detectRebellion(bill, finalWhipCount, members, PARTY_A, 5, 'reb-1')).toBeNull();
  });
});

describe('applyRebellionToWhip', () => {
  it('lowers discipline score, clamped to 0', () => {
    const whip: PartyWhip = { partyId: 'party-a', politicianId: 'whip-1', disciplineScore: 5 };
    const rebellion = { id: 'reb-1', billId: 'bill-1', partyId: 'party-a', rebelIds: ['m1'], turn: 1 };
    const after = applyRebellionToWhip(whip, rebellion);
    expect(after.disciplineScore).toBeGreaterThanOrEqual(0);
    expect(after.disciplineScore).toBeLessThan(5);
  });
});

describe('enforceWhipDiscipline', () => {
  it('is deterministic for a given rng state', () => {
    const whip: PartyWhip = { partyId: 'party-a', politicianId: 'whip-1', disciplineScore: 60 };
    const a = enforceWhipDiscipline(whip, 5, new SeededRng(4));
    const b = enforceWhipDiscipline(whip, 5, new SeededRng(4));
    expect(a).toEqual(b);
  });

  it('a high-discipline whip succeeds far more often against a low-integrity rebel than a weak whip against a principled one', () => {
    const strongWhip: PartyWhip = { partyId: 'party-a', politicianId: 'whip-1', disciplineScore: 95 };
    const weakWhip: PartyWhip = { partyId: 'party-a', politicianId: 'whip-2', disciplineScore: 10 };
    const rngStrong = new SeededRng(7);
    const rngWeak = new SeededRng(7);
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 100; i++) {
      if (enforceWhipDiscipline(strongWhip, 1, rngStrong).success) strongWins++;
      if (enforceWhipDiscipline(weakWhip, 10, rngWeak).success) weakWins++;
    }
    expect(strongWins).toBeGreaterThan(weakWins);
  });

  it('applyEnforceDisciplineToWhip clamps discipline to [0, 100]', () => {
    const whip: PartyWhip = { partyId: 'party-a', politicianId: 'whip-1', disciplineScore: 98 };
    const after = applyEnforceDisciplineToWhip(whip, { success: true, disciplineDelta: 10, loyaltyDelta: 10, relationshipDelta: 10 });
    expect(after.disciplineScore).toBeLessThanOrEqual(100);
  });
});
