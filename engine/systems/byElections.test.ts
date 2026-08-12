import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Party, Politician, Scandal } from '../models/types';
import {
  BY_ELECTION_DELAY_TURNS,
  applyByElectionResult,
  computeSeatResignationProbability,
  generateReplacementPolitician,
  resolveByElection,
  rollForSeatVacancy,
  scheduleByElection,
} from './byElections';

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
  return { name: overrides.id, ideology: { economic: 0, social: 0 }, seats: 0, factions: [], ...overrides };
}

describe('computeSeatResignationProbability', () => {
  it('is zero with no unresolved hard scandal', () => {
    const politician = makePolitician({ id: 'p1' });
    expect(computeSeatResignationProbability(politician, [])).toBe(0);
  });

  it('is zero for a resolved hard scandal', () => {
    const politician = makePolitician({ id: 'p1' });
    const scandals: Scandal[] = [{ id: 's1', politicianId: 'p1', tier: 'hard', turn: 1, status: 'resolved' }];
    expect(computeSeatResignationProbability(politician, scandals)).toBe(0);
  });

  it('is zero for a soft or medium unresolved scandal', () => {
    const politician = makePolitician({ id: 'p1' });
    const scandals: Scandal[] = [{ id: 's1', politicianId: 'p1', tier: 'medium', turn: 1, status: 'unresolved' }];
    expect(computeSeatResignationProbability(politician, scandals)).toBe(0);
  });

  it('is positive for an unresolved hard scandal, higher for higher integrity', () => {
    const scandals: Scandal[] = [{ id: 's1', politicianId: 'p1', tier: 'hard', turn: 1, status: 'unresolved' }];
    const principled = makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } });
    const shameless = makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 5, integrity: 1, network: 5, mediaSavvy: 5 } });
    expect(computeSeatResignationProbability(principled, scandals)).toBeGreaterThan(computeSeatResignationProbability(shameless, scandals));
    expect(computeSeatResignationProbability(principled, scandals)).toBeGreaterThan(0);
  });
});

describe('rollForSeatVacancy', () => {
  it('never resigns the player, regardless of scandal', () => {
    const player = makePolitician({ id: 'player', isPlayer: true, attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } });
    const scandals: Scandal[] = [{ id: 's1', politicianId: 'player', tier: 'hard', turn: 1, status: 'unresolved' }];
    for (let seed = 0; seed < 50; seed++) {
      expect(rollForSeatVacancy(player, scandals, new SeededRng(seed))).toBe(false);
    }
  });

  it('never resigns with no qualifying scandal', () => {
    const politician = makePolitician({ id: 'p1' });
    for (let seed = 0; seed < 50; seed++) {
      expect(rollForSeatVacancy(politician, [], new SeededRng(seed))).toBe(false);
    }
  });

  it('sometimes resigns with an unresolved hard scandal, across enough seeds', () => {
    const politician = makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } });
    const scandals: Scandal[] = [{ id: 's1', politicianId: 'p1', tier: 'hard', turn: 1, status: 'unresolved' }];
    let resigned = false;
    for (let seed = 0; seed < 300 && !resigned; seed++) {
      if (rollForSeatVacancy(politician, scandals, new SeededRng(seed))) resigned = true;
    }
    expect(resigned).toBe(true);
  });
});

describe('scheduleByElection', () => {
  it('schedules resolution BY_ELECTION_DELAY_TURNS after the vacancy', () => {
    const be = scheduleByElection('party-a', 'p1', 10, 'be-1');
    expect(be.resolutionTurn).toBe(10 + BY_ELECTION_DELAY_TURNS);
    expect(be.resolved).toBe(false);
    expect(be.vacatedTurn).toBe(10);
  });
});

describe('resolveByElection', () => {
  it('is deterministic given the same seed', () => {
    const parties = [makeParty({ id: 'a', seats: 10 }), makeParty({ id: 'b', seats: 5 })];
    const x = resolveByElection(parties, new SeededRng(1));
    const y = resolveByElection(parties, new SeededRng(1));
    expect(x).toBe(y);
  });

  it('favors the larger party across many seeds without guaranteeing it every time', () => {
    const parties = [makeParty({ id: 'big', seats: 90 }), makeParty({ id: 'small', seats: 10 })];
    let bigWins = 0;
    const trials = 200;
    for (let seed = 0; seed < trials; seed++) {
      if (resolveByElection(parties, new SeededRng(seed)) === 'big') bigWins++;
    }
    expect(bigWins).toBeGreaterThan(trials * 0.6);
    expect(bigWins).toBeLessThan(trials);
  });
});

describe('generateReplacementPolitician', () => {
  it('assigns the new politician to the given party with jittered-but-nearby ideology', () => {
    const party = makeParty({ id: 'party-a', ideology: { economic: 40, social: -20 } });
    const politician = generateReplacementPolitician(party, 'seat-1', new SeededRng(1));
    expect(politician.partyId).toBe('party-a');
    expect(politician.isPlayer).toBe(false);
    expect(Math.abs(politician.ideology.economic - 40)).toBeLessThanOrEqual(15);
    expect(Math.abs(politician.ideology.social - -20)).toBeLessThanOrEqual(15);
  });

  it('is deterministic given the same seed', () => {
    const party = makeParty({ id: 'party-a' });
    const a = generateReplacementPolitician(party, 'seat-1', new SeededRng(5));
    const b = generateReplacementPolitician(party, 'seat-1', new SeededRng(5));
    expect(a).toEqual(b);
  });
});

describe('applyByElectionResult', () => {
  it('adds a seat and a new politician to the winning party', () => {
    const parties = [makeParty({ id: 'a', seats: 10 }), makeParty({ id: 'b', seats: 5 })];
    const politicians = [makePolitician({ id: 'x', partyId: 'a' })];
    const byElection = scheduleByElection('a', 'gone', 1, 'be-1');
    const { politicians: nextPoliticians, parties: nextParties } = applyByElectionResult(
      politicians,
      parties,
      byElection,
      'b',
      new SeededRng(1)
    );
    expect(nextParties.find((p) => p.id === 'b')!.seats).toBe(6);
    expect(nextParties.find((p) => p.id === 'a')!.seats).toBe(10);
    expect(nextPoliticians).toHaveLength(2);
    expect(nextPoliticians[1].partyId).toBe('b');
  });
});
