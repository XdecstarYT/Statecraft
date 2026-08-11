import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Bill, Party, Politician } from '../models/types';
import { proposeBill } from './legislative';
import {
  STANDING_COMMITTEE_DEFS,
  applyCommitteeVoteResult,
  assignCommittees,
  findCommitteeForBill,
  resolveCommitteeVote,
} from './committees';

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

function makeParty(overrides: Partial<Party> & { id: string }): Party {
  return {
    name: overrides.id,
    ideology: { economic: 0, social: 0 },
    seats: 0,
    factions: [],
    ...overrides,
  };
}

describe('assignCommittees', () => {
  const parties = [
    makeParty({ id: 'party-a', seats: 60 }),
    makeParty({ id: 'party-b', seats: 40 }),
  ];
  const politicians = [
    ...Array.from({ length: 60 }, (_, i) => makePolitician({ id: `a-${i}`, partyId: 'party-a' })),
    ...Array.from({ length: 40 }, (_, i) => makePolitician({ id: `b-${i}`, partyId: 'party-b' })),
  ];

  it('creates exactly one committee per standing committee definition', () => {
    const committees = assignCommittees(politicians, parties, new SeededRng(1));
    expect(committees).toHaveLength(STANDING_COMMITTEE_DEFS.length);
    expect(committees.map((c) => c.id)).toEqual(STANDING_COMMITTEE_DEFS.map((d) => d.id));
  });

  it('is deterministic given the same seed', () => {
    const a = assignCommittees(politicians, parties, new SeededRng(42));
    const b = assignCommittees(politicians, parties, new SeededRng(42));
    expect(a).toEqual(b);
  });

  it('produces a different membership for a different seed', () => {
    const a = assignCommittees(politicians, parties, new SeededRng(1));
    const b = assignCommittees(politicians, parties, new SeededRng(2));
    expect(a[0].memberIds).not.toEqual(b[0].memberIds);
  });

  it('assigns membership roughly proportional to each party\'s seat share', () => {
    const committees = assignCommittees(politicians, parties, new SeededRng(7));
    for (const committee of committees) {
      const aCount = committee.memberIds.filter((id) => id.startsWith('a-')).length;
      const share = aCount / committee.memberIds.length;
      // party-a holds 60% of seats; allow slack for integer rounding on small committees.
      expect(share).toBeGreaterThan(0.4);
      expect(share).toBeLessThan(0.8);
    }
  });

  it('gives every member a real politician id and a chair drawn from the membership', () => {
    const committees = assignCommittees(politicians, parties, new SeededRng(3));
    const allIds = new Set(politicians.map((p) => p.id));
    for (const committee of committees) {
      expect(committee.memberIds.length).toBeGreaterThan(0);
      for (const id of committee.memberIds) expect(allIds.has(id)).toBe(true);
      expect(committee.memberIds).toContain(committee.chairId);
    }
  });

  it('caps committee size at the chamber size for a very small legislature', () => {
    const tinyParties = [makeParty({ id: 'party-a', seats: 3 })];
    const tinyPoliticians = [
      makePolitician({ id: 'p1', partyId: 'party-a' }),
      makePolitician({ id: 'p2', partyId: 'party-a' }),
      makePolitician({ id: 'p3', partyId: 'party-a' }),
    ];
    const committees = assignCommittees(tinyPoliticians, tinyParties, new SeededRng(1));
    for (const committee of committees) {
      expect(committee.memberIds.length).toBeLessThanOrEqual(3);
    }
  });
});

describe('findCommitteeForBill', () => {
  const committees = assignCommittees(
    [makePolitician({ id: 'p1' })],
    [makeParty({ id: 'party-a', seats: 1 })],
    new SeededRng(1)
  );

  it('routes a categorized bill to the matching committee', () => {
    const bill = proposeBill({ id: 'b1', title: 'Health Bill', category: 'healthcare', provisions: [], sponsorId: 'p1' });
    const committee = findCommitteeForBill(committees, bill);
    expect(committee?.id).toBe('health');
  });

  it('falls back to Ways & Means for an uncategorized bill', () => {
    const bill = proposeBill({ id: 'b2', title: 'Old Save Bill', provisions: [], sponsorId: 'p1' });
    const committee = findCommitteeForBill(committees, bill);
    expect(committee?.id).toBe('ways-and-means');
  });
});

describe('resolveCommitteeVote', () => {
  const sponsor = makePolitician({ id: 'sponsor', partyId: 'party-a', ideology: { economic: 80, social: 80 } });

  it('passes when the sponsor is the only committee member', () => {
    const committee = { id: 'c1', name: 'Test Committee', areas: ['economic' as const], memberIds: ['sponsor'], chairId: 'sponsor' };
    const bill = proposeBill({ id: 'b1', title: 'Test', provisions: [], sponsorId: 'sponsor' });
    const result = resolveCommitteeVote(bill, committee, [sponsor], {}, {}, new SeededRng(1));
    expect(result.yes).toBe(1);
    expect(result.no).toBe(0);
    expect(result.passed).toBe(true);
  });

  it('fails when every other member is ideologically opposed', () => {
    const opponents = Array.from({ length: 5 }, (_, i) =>
      makePolitician({ id: `opp-${i}`, partyId: 'party-b', ideology: { economic: -80, social: -80 } })
    );
    const committee = {
      id: 'c1',
      name: 'Test Committee',
      areas: ['economic' as const],
      memberIds: [sponsor.id, ...opponents.map((o) => o.id)],
      chairId: sponsor.id,
    };
    const bill = proposeBill({ id: 'b1', title: 'Test', provisions: [], sponsorId: sponsor.id });
    const result = resolveCommitteeVote(bill, committee, [sponsor, ...opponents], {}, {}, new SeededRng(1));
    expect(result.passed).toBe(false);
    expect(result.no).toBeGreaterThan(result.yes);
  });

  it('only counts members actually on the committee', () => {
    const outsider = makePolitician({ id: 'outsider', ideology: { economic: -100, social: -100 } });
    const committee = { id: 'c1', name: 'Test Committee', areas: ['economic' as const], memberIds: ['sponsor'], chairId: 'sponsor' };
    const bill = proposeBill({ id: 'b1', title: 'Test', provisions: [], sponsorId: 'sponsor' });
    const result = resolveCommitteeVote(bill, committee, [sponsor, outsider], {}, {}, new SeededRng(1));
    expect(result.yes + result.no).toBe(1);
  });

  it('is deterministic given the same seed and inputs', () => {
    const members = Array.from({ length: 8 }, (_, i) => makePolitician({ id: `m-${i}`, ideology: { economic: i * 10 - 40, social: 0 } }));
    const committee = { id: 'c1', name: 'Test Committee', areas: ['economic' as const], memberIds: [sponsor.id, ...members.map((m) => m.id)], chairId: sponsor.id };
    const bill = proposeBill({ id: 'b1', title: 'Test', provisions: [], sponsorId: sponsor.id });
    const a = resolveCommitteeVote(bill, committee, [sponsor, ...members], {}, {}, new SeededRng(99));
    const b = resolveCommitteeVote(bill, committee, [sponsor, ...members], {}, {}, new SeededRng(99));
    expect(a).toEqual(b);
  });
});

describe('applyCommitteeVoteResult', () => {
  const bill: Bill = proposeBill({ id: 'b1', title: 'Test', provisions: [], sponsorId: 'sponsor' });

  it('advances a passed bill to the floor and records the result', () => {
    const result = { committeeId: 'c1', committeeName: 'Test Committee', yes: 5, no: 2, passed: true };
    const next = applyCommitteeVoteResult({ ...bill, status: 'committee' }, result);
    expect(next.status).toBe('floor');
    expect(next.committeeResult).toEqual(result);
  });

  it('kills a failed bill in committee', () => {
    const result = { committeeId: 'c1', committeeName: 'Test Committee', yes: 2, no: 5, passed: false };
    const next = applyCommitteeVoteResult({ ...bill, status: 'committee' }, result);
    expect(next.status).toBe('failed');
    expect(next.committeeResult).toEqual(result);
  });
});
