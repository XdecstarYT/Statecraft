import { describe, expect, it } from 'vitest';
import type { Party, Politician } from '../models/types';
import {
  computeFactionTerm,
  computeFactionTerms,
  factionKey,
  findMemberFaction,
  assignFactionLeaders,
} from './factions';

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

describe('findMemberFaction', () => {
  const party = makeParty({
    id: 'party-a',
    ideology: { economic: 0, social: 0 },
    factions: [
      { name: 'Left Wing', ideologyOffset: -20, size: 5 },
      { name: 'Right Wing', ideologyOffset: 20, size: 5 },
    ],
  });

  it('matches a member to the closest faction by economic offset', () => {
    const leftLeaning = makePolitician({ id: 'p1', ideology: { economic: -18, social: 0 } });
    const rightLeaning = makePolitician({ id: 'p2', ideology: { economic: 22, social: 0 } });
    expect(findMemberFaction(leftLeaning, party)?.name).toBe('Left Wing');
    expect(findMemberFaction(rightLeaning, party)?.name).toBe('Right Wing');
  });

  it('returns undefined for a party with no defined factions', () => {
    const noFactionParty = makeParty({ id: 'party-b' });
    const member = makePolitician({ id: 'p1', partyId: 'party-b' });
    expect(findMemberFaction(member, noFactionParty)).toBeUndefined();
  });
});

describe('assignFactionLeaders', () => {
  const party = makeParty({
    id: 'party-a',
    factions: [{ name: 'Only Wing', ideologyOffset: 0, size: 3 }],
  });

  it('picks the highest-network member of each faction as its leader', () => {
    const politicians = [
      makePolitician({ id: 'low', attributes: { charisma: 5, intellect: 5, integrity: 5, network: 2, mediaSavvy: 5 } }),
      makePolitician({ id: 'high', attributes: { charisma: 5, intellect: 5, integrity: 5, network: 9, mediaSavvy: 5 } }),
    ];
    const leaders = assignFactionLeaders(politicians, [party]);
    expect(leaders[factionKey('party-a', 'Only Wing')]).toBe('high');
  });

  it('omits factions with no matching members', () => {
    const emptyFactionParty = makeParty({
      id: 'party-b',
      factions: [{ name: 'Ghost Wing', ideologyOffset: 0, size: 0 }],
    });
    const leaders = assignFactionLeaders([], [emptyFactionParty]);
    expect(leaders[factionKey('party-b', 'Ghost Wing')]).toBeUndefined();
  });

  it('is deterministic given the same input', () => {
    const politicians = [
      makePolitician({ id: 'a', attributes: { charisma: 5, intellect: 5, integrity: 5, network: 7, mediaSavvy: 5 } }),
      makePolitician({ id: 'b', attributes: { charisma: 5, intellect: 5, integrity: 5, network: 7, mediaSavvy: 5 } }),
    ];
    const first = assignFactionLeaders(politicians, [party]);
    const second = assignFactionLeaders(politicians, [party]);
    expect(first).toEqual(second);
  });
});

describe('computeFactionTerm', () => {
  const party = makeParty({
    id: 'party-a',
    ideology: { economic: 0, social: 0 },
    factions: [
      { name: 'Left Wing', ideologyOffset: -80, size: 5 },
      { name: 'Right Wing', ideologyOffset: 80, size: 5 },
    ],
  });
  const sponsor = makePolitician({ id: 'sponsor', partyId: 'party-a', ideology: { economic: 80, social: 0 } });

  it('returns 0 for a party with no defined factions', () => {
    const noFactionParty = makeParty({ id: 'party-b' });
    const member = makePolitician({ id: 'm1', partyId: 'party-b' });
    expect(computeFactionTerm(member, sponsor, noFactionParty, {}, {}, {})).toBe(0);
  });

  it('is positive for a member whose wing is ideologically close to the sponsor', () => {
    const alignedMember = makePolitician({ id: 'right-member', partyId: 'party-a', ideology: { economic: 75, social: 0 } });
    const term = computeFactionTerm(alignedMember, sponsor, party, {}, {}, {});
    expect(term).toBeGreaterThan(0);
  });

  it('is negative for a member whose wing is ideologically opposed to the sponsor', () => {
    const opposedMember = makePolitician({ id: 'left-member', partyId: 'party-a', ideology: { economic: -75, social: 0 } });
    const term = computeFactionTerm(opposedMember, sponsor, party, {}, {}, {});
    expect(term).toBeLessThan(0);
  });

  it('rises when the faction leader has been courted via relationship and favors, even for an ideologically opposed wing', () => {
    const opposedMember = makePolitician({ id: 'left-member', partyId: 'party-a', ideology: { economic: -75, social: 0 } });
    const leaderId = 'left-leader';
    const factionLeaderId = { [factionKey('party-a', 'Left Wing')]: leaderId };

    const uncourted = computeFactionTerm(opposedMember, sponsor, party, {}, {}, factionLeaderId);
    const courted = computeFactionTerm(
      opposedMember,
      sponsor,
      party,
      { [[sponsor.id, leaderId].sort().join(':')]: 90 },
      { [leaderId]: 10 },
      factionLeaderId
    );
    expect(courted).toBeGreaterThan(uncourted);
  });

  it('does not double-count the leader courting their own vote', () => {
    const leaderId = 'left-leader';
    const leaderAsMember = makePolitician({ id: leaderId, partyId: 'party-a', ideology: { economic: -75, social: 0 } });
    const factionLeaderId = { [factionKey('party-a', 'Left Wing')]: leaderId };
    const term = computeFactionTerm(
      leaderAsMember,
      sponsor,
      party,
      { [[sponsor.id, leaderId].sort().join(':')]: 90 },
      { [leaderId]: 10 },
      factionLeaderId
    );
    // Only the cohesion half applies to the leader's own term — no self-referential leader-disposition boost.
    const cohesionOnly = computeFactionTerm(leaderAsMember, sponsor, party, {}, {}, {});
    expect(term).toBe(cohesionOnly);
  });
});

describe('computeFactionTerms', () => {
  const party = makeParty({
    id: 'party-a',
    factions: [{ name: 'Only Wing', ideologyOffset: 0, size: 2 }],
  });
  const sponsor = makePolitician({ id: 'sponsor', partyId: 'party-a' });
  const member = makePolitician({ id: 'member', partyId: 'party-a' });

  it('computes a term for every non-sponsor politician and skips the sponsor', () => {
    const terms = computeFactionTerms([sponsor, member], sponsor, [party], {}, {}, {});
    expect(terms.sponsor).toBeUndefined();
    expect(terms.member).toBeDefined();
  });
});
