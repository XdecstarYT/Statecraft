import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Party, Politician } from '../models/types';
import {
  DEFAULT_CONFIDENCE_WEIGHTS,
  computeCoalitionIdeology,
  computeCoalitionOffers,
  computeConfidenceSupportProbability,
  formCoalition,
  formGovernment,
  hasOutrightMajority,
  resolveCoalitionOffer,
  resolveConfidenceVote,
} from './coalition';

function makeParty(overrides: Partial<Party> & { id: string }): Party {
  return {
    name: overrides.id,
    ideology: { economic: 0, social: 0 },
    seats: 0,
    factions: [],
    ...overrides,
  };
}

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

describe('hasOutrightMajority', () => {
  it('is true when one party holds more than half the seats', () => {
    const parties = [makeParty({ id: 'a', seats: 51 }), makeParty({ id: 'b', seats: 49 })];
    expect(hasOutrightMajority(parties)).toBe(true);
  });

  it('is false when no party clears half', () => {
    const parties = [makeParty({ id: 'a', seats: 40 }), makeParty({ id: 'b', seats: 35 }), makeParty({ id: 'c', seats: 25 })];
    expect(hasOutrightMajority(parties)).toBe(false);
  });

  it('is false with zero total seats', () => {
    expect(hasOutrightMajority([makeParty({ id: 'a', seats: 0 })])).toBe(false);
  });
});

describe('formCoalition', () => {
  it('the formateur is always the largest party', () => {
    const parties = [
      makeParty({ id: 'a', seats: 30, ideology: { economic: 0, social: 0 } }),
      makeParty({ id: 'b', seats: 45, ideology: { economic: 10, social: 10 } }),
      makeParty({ id: 'c', seats: 25, ideology: { economic: -50, social: -50 } }),
    ];
    const { formateurPartyId } = formCoalition(parties);
    expect(formateurPartyId).toBe('b');
  });

  it('reaches a real majority of total seats', () => {
    const parties = [
      makeParty({ id: 'a', seats: 40, ideology: { economic: 0, social: 0 } }),
      makeParty({ id: 'b', seats: 35, ideology: { economic: 5, social: 5 } }),
      makeParty({ id: 'c', seats: 25, ideology: { economic: -80, social: -80 } }),
    ];
    const { memberPartyIds } = formCoalition(parties);
    const total = parties.reduce((sum, p) => sum + p.seats, 0);
    const seats = parties.filter((p) => memberPartyIds.includes(p.id)).reduce((sum, p) => sum + p.seats, 0);
    expect(seats).toBeGreaterThan(total / 2);
  });

  it('prefers an ideologically closer smaller partner over a more distant larger one', () => {
    const parties = [
      makeParty({ id: 'formateur', seats: 40, ideology: { economic: 50, social: 50 } }),
      makeParty({ id: 'close', seats: 15, ideology: { economic: 55, social: 55 } }),
      makeParty({ id: 'far-but-bigger', seats: 30, ideology: { economic: -80, social: -80 } }),
    ];
    const { memberPartyIds } = formCoalition(parties);
    expect(memberPartyIds).toContain('close');
  });

  it('a single party takes itself alone when it already has a majority', () => {
    const parties = [makeParty({ id: 'a', seats: 60 }), makeParty({ id: 'b', seats: 40 })];
    const { memberPartyIds } = formCoalition(parties);
    expect(memberPartyIds).toEqual(['a']);
  });
});

describe('computeCoalitionIdeology', () => {
  it('is the seat-weighted average of member parties', () => {
    const parties = [
      makeParty({ id: 'a', seats: 60, ideology: { economic: 100, social: 0 } }),
      makeParty({ id: 'b', seats: 40, ideology: { economic: -100, social: 0 } }),
    ];
    const ideology = computeCoalitionIdeology(parties, ['a', 'b']);
    expect(ideology.economic).toBeCloseTo(20, 5); // 60*100 + 40*-100 = 2000 / 100 = 20
  });

  it('ignores non-member parties', () => {
    const parties = [
      makeParty({ id: 'a', seats: 50, ideology: { economic: 100, social: 0 } }),
      makeParty({ id: 'b', seats: 50, ideology: { economic: -100, social: 0 } }),
    ];
    const ideology = computeCoalitionIdeology(parties, ['a']);
    expect(ideology.economic).toBe(100);
  });
});

describe('computeConfidenceSupportProbability', () => {
  const pm = makePolitician({ id: 'pm', partyId: 'party-a' });
  const coalitionIdeology = { economic: 50, social: 50 };

  it('favors a coalition-party member over an identically-positioned opposition member', () => {
    const coalitionMember = makePolitician({ id: 'm1', ideology: { economic: 50, social: 50 } });
    const pIn = computeConfidenceSupportProbability(coalitionMember, coalitionIdeology, pm, {}, true);
    const pOut = computeConfidenceSupportProbability(coalitionMember, coalitionIdeology, pm, {}, false);
    expect(pIn).toBeGreaterThan(pOut);
  });

  it('always returns a probability in (0, 1)', () => {
    const member = makePolitician({ id: 'm1', ideology: { economic: -100, social: 100 } });
    const p = computeConfidenceSupportProbability(member, coalitionIdeology, pm, {}, false, DEFAULT_CONFIDENCE_WEIGHTS);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe('resolveConfidenceVote', () => {
  it('is deterministic given the same starting rng state', () => {
    const pm = makePolitician({ id: 'pm', partyId: 'party-a' });
    const members = [pm, ...Array.from({ length: 10 }, (_, i) => makePolitician({ id: `m${i}`, partyId: i % 2 === 0 ? 'party-a' : 'party-b' }))];
    const membership = { memberPartyIds: ['party-a'], formateurPartyId: 'party-a' };
    const resultA = resolveConfidenceVote(membership, members, pm, { economic: 0, social: 0 }, {}, new SeededRng(5));
    const resultB = resolveConfidenceVote(membership, members, pm, { economic: 0, social: 0 }, {}, new SeededRng(5));
    expect(resultA).toEqual(resultB);
  });

  it('an overwhelming ideologically-aligned coalition majority passes', () => {
    const pm = makePolitician({ id: 'pm', partyId: 'party-a', ideology: { economic: 40, social: 40 } });
    const members = [
      pm,
      ...Array.from({ length: 20 }, (_, i) => makePolitician({ id: `m${i}`, partyId: 'party-a', ideology: { economic: 40, social: 40 } })),
    ];
    const membership = { memberPartyIds: ['party-a'], formateurPartyId: 'party-a' };
    const result = resolveConfidenceVote(membership, members, pm, { economic: 40, social: 40 }, {}, new SeededRng(1));
    expect(result.passed).toBe(true);
  });
});

describe('formGovernment', () => {
  it('assembles a coalition, names a real Prime Minister, and resolves a confidence vote', () => {
    const parties = [
      makeParty({ id: 'a', seats: 40, ideology: { economic: 20, social: 20 } }),
      makeParty({ id: 'b', seats: 35, ideology: { economic: 25, social: 25 } }),
      makeParty({ id: 'c', seats: 25, ideology: { economic: -80, social: -80 } }),
    ];
    const politicians = [
      makePolitician({ id: 'leader-a', partyId: 'a', ideology: { economic: 20, social: 20 } }),
      makePolitician({ id: 'leader-b', partyId: 'b', ideology: { economic: 25, social: 25 } }),
      makePolitician({ id: 'leader-c', partyId: 'c', ideology: { economic: -80, social: -80 } }),
      ...Array.from({ length: 30 }, (_, i) =>
        makePolitician({ id: `m${i}`, partyId: i % 3 === 0 ? 'a' : i % 3 === 1 ? 'b' : 'c', ideology: { economic: 15, social: 15 } })
      ),
    ];
    const partyLeaderId = { a: 'leader-a', b: 'leader-b', c: 'leader-c' };
    const coalition = formGovernment(parties, politicians, partyLeaderId, {}, 10, new SeededRng(1));

    expect(coalition.formateurPartyId).toBe('a');
    expect(coalition.primeMinisterId).toBe('leader-a');
    expect(coalition.memberPartyIds).toContain('a');
    expect(coalition.seatsHeld).toBeGreaterThan(coalition.totalSeats / 2);
    expect(['governing', 'collapsed']).toContain(coalition.status);
    expect(coalition.confidenceVotesFor + coalition.confidenceVotesAgainst).toBe(politicians.length);
  });

  it('throws if the formateur party has no recorded leader', () => {
    const parties = [makeParty({ id: 'a', seats: 100 })];
    const politicians = [makePolitician({ id: 'm1', partyId: 'a' })];
    expect(() => formGovernment(parties, politicians, {}, {}, 1, new SeededRng(1))).toThrow();
  });
});

describe('computeCoalitionOffers', () => {
  it('returns no offers when one party holds an outright majority', () => {
    const parties = [makeParty({ id: 'a', seats: 60 }), makeParty({ id: 'player', seats: 40 })];
    expect(computeCoalitionOffers(parties, 'player')).toEqual([]);
  });

  it('returns no offers when the player party holds no seats', () => {
    const parties = [makeParty({ id: 'a', seats: 40 }), makeParty({ id: 'b', seats: 35 }), makeParty({ id: 'player', seats: 0 })];
    expect(computeCoalitionOffers(parties, 'player')).toEqual([]);
  });

  it('returns no offers when the player party is itself the natural formateur', () => {
    const parties = [makeParty({ id: 'player', seats: 45 }), makeParty({ id: 'b', seats: 35 }), makeParty({ id: 'c', seats: 20 })];
    expect(computeCoalitionOffers(parties, 'player')).toEqual([]);
  });

  it('offers "join" and "opposition" when the player is pivotal to a hung parliament', () => {
    const parties = [
      makeParty({ id: 'formateur', seats: 40, ideology: { economic: 10, social: 10 } }),
      makeParty({ id: 'player', seats: 15, ideology: { economic: 15, social: 15 } }),
      makeParty({ id: 'c', seats: 30, ideology: { economic: -50, social: -50 } }),
      makeParty({ id: 'd', seats: 15, ideology: { economic: -40, social: -40 } }),
    ];
    const offers = computeCoalitionOffers(parties, 'player');
    expect(offers.map((o) => o.id)).toEqual(['join', 'opposition']);
    const joinOffer = offers.find((o) => o.id === 'join')!;
    expect(joinOffer.memberPartyIds).toContain('player');
    expect(joinOffer.memberPartyIds).toContain('formateur');
    expect(joinOffer.offeredPortfolio).not.toBeNull();
    const oppositionOffer = offers.find((o) => o.id === 'opposition')!;
    expect(oppositionOffer.memberPartyIds).not.toContain('player');
  });

  it('the join offer always reaches a majority of the full chamber', () => {
    const parties = [
      makeParty({ id: 'formateur', seats: 38, ideology: { economic: 5, social: 5 } }),
      makeParty({ id: 'player', seats: 20, ideology: { economic: 8, social: 8 } }),
      makeParty({ id: 'c', seats: 22, ideology: { economic: -60, social: -60 } }),
      makeParty({ id: 'd', seats: 20, ideology: { economic: -55, social: -55 } }),
    ];
    const offers = computeCoalitionOffers(parties, 'player');
    const joinOffer = offers.find((o) => o.id === 'join')!;
    expect(joinOffer.seatsHeld).toBeGreaterThan(joinOffer.totalSeats / 2);
  });
});

describe('resolveCoalitionOffer', () => {
  it('forms a government from the chosen offer, with the formateur party leader as PM', () => {
    const parties = [
      makeParty({ id: 'formateur', seats: 40, ideology: { economic: 10, social: 10 } }),
      makeParty({ id: 'player', seats: 15, ideology: { economic: 15, social: 15 } }),
      makeParty({ id: 'c', seats: 30, ideology: { economic: -50, social: -50 } }),
    ];
    const politicians = [
      makePolitician({ id: 'leader-formateur', partyId: 'formateur', ideology: { economic: 10, social: 10 } }),
      makePolitician({ id: 'leader-player', partyId: 'player', ideology: { economic: 15, social: 15 } }),
      makePolitician({ id: 'leader-c', partyId: 'c', ideology: { economic: -50, social: -50 } }),
    ];
    const partyLeaderId = { formateur: 'leader-formateur', player: 'leader-player', c: 'leader-c' };
    const offers = computeCoalitionOffers(parties, 'player');
    const joinOffer = offers.find((o) => o.id === 'join')!;

    const coalition = resolveCoalitionOffer(joinOffer, parties, politicians, partyLeaderId, {}, 10, new SeededRng(1));
    expect(coalition.formateurPartyId).toBe('formateur');
    expect(coalition.primeMinisterId).toBe('leader-formateur');
    expect(coalition.memberPartyIds).toContain('player');
  });

  it('forms an opposition government excluding the player party when that offer is chosen', () => {
    const parties = [
      makeParty({ id: 'formateur', seats: 40, ideology: { economic: 10, social: 10 } }),
      makeParty({ id: 'player', seats: 15, ideology: { economic: 15, social: 15 } }),
      makeParty({ id: 'c', seats: 30, ideology: { economic: -50, social: -50 } }),
    ];
    const politicians = [
      makePolitician({ id: 'leader-formateur', partyId: 'formateur', ideology: { economic: 10, social: 10 } }),
      makePolitician({ id: 'leader-player', partyId: 'player', ideology: { economic: 15, social: 15 } }),
      makePolitician({ id: 'leader-c', partyId: 'c', ideology: { economic: -50, social: -50 } }),
    ];
    const partyLeaderId = { formateur: 'leader-formateur', player: 'leader-player', c: 'leader-c' };
    const offers = computeCoalitionOffers(parties, 'player');
    const oppositionOffer = offers.find((o) => o.id === 'opposition')!;

    const coalition = resolveCoalitionOffer(oppositionOffer, parties, politicians, partyLeaderId, {}, 10, new SeededRng(1));
    expect(coalition.memberPartyIds).not.toContain('player');
  });
});
