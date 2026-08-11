import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { ForeignCounterpart, WorldGovernment } from '../models/types';
import {
  WORLD_TERM_LENGTH_TURNS,
  computeIncumbentRetentionProbability,
  computeRealignmentRelationDelta,
  driftApproval,
  initializeWorldGovernments,
  resolveWorldElection,
  runWorldElectionsTurn,
} from './worldElections';

function makeCounterpart(overrides: Partial<ForeignCounterpart> & { id: string }): ForeignCounterpart {
  return {
    name: overrides.id,
    region: 'Test Region',
    ideology: { economic: 0, social: 0 },
    military: { strength: 50, personnel: 100, techLevel: 50 },
    trade: {
      production: { energy: 40, food: 40, minerals: 40, manufactured: 40, technology: 20 },
      consumption: { energy: 45, food: 45, minerals: 35, manufactured: 45, technology: 25 },
    },
    location: { lat: 0, lng: 0 },
    ...overrides,
  };
}

function makeGov(overrides: Partial<WorldGovernment> & { counterpartId: string }): WorldGovernment {
  return {
    rulingPartyName: 'National Union',
    leaderName: 'Test Leader',
    approval: 50,
    nextElectionTurn: 100,
    lastElectionTurn: null,
    termsServed: 0,
    ...overrides,
  };
}

describe('initializeWorldGovernments', () => {
  const counterparts = [makeCounterpart({ id: 'alpha' }), makeCounterpart({ id: 'beta' })];

  it('creates one government per counterpart', () => {
    const govs = initializeWorldGovernments(counterparts, new SeededRng(1));
    expect(govs).toHaveLength(2);
    expect(govs.map((g) => g.counterpartId)).toEqual(['alpha', 'beta']);
  });

  it('is deterministic given the same seed', () => {
    const a = initializeWorldGovernments(counterparts, new SeededRng(42));
    const b = initializeWorldGovernments(counterparts, new SeededRng(42));
    expect(a).toEqual(b);
  });

  it('staggers nations to different first election turns', () => {
    const many = Array.from({ length: 20 }, (_, i) => makeCounterpart({ id: `nation-${i}` }));
    const govs = initializeWorldGovernments(many, new SeededRng(1));
    const uniqueTurns = new Set(govs.map((g) => g.nextElectionTurn));
    expect(uniqueTurns.size).toBeGreaterThan(1);
    for (const g of govs) {
      expect(g.nextElectionTurn).toBeGreaterThanOrEqual(1);
      expect(g.nextElectionTurn).toBeLessThanOrEqual(WORLD_TERM_LENGTH_TURNS);
    }
  });
});

describe('driftApproval', () => {
  it('stays within 5..95 bounds', () => {
    let gov = makeGov({ counterpartId: 'a', approval: 94 });
    const rng = new SeededRng(1);
    for (let i = 0; i < 200; i++) {
      gov = driftApproval(gov, rng);
      expect(gov.approval).toBeGreaterThanOrEqual(5);
      expect(gov.approval).toBeLessThanOrEqual(95);
    }
  });
});

describe('computeIncumbentRetentionProbability', () => {
  it('is higher for a more popular government', () => {
    expect(computeIncumbentRetentionProbability(makeGov({ counterpartId: 'a', approval: 80 }))).toBeGreaterThan(
      computeIncumbentRetentionProbability(makeGov({ counterpartId: 'a', approval: 20 }))
    );
  });

  it('stays within 0.05..0.95', () => {
    expect(computeIncumbentRetentionProbability(makeGov({ counterpartId: 'a', approval: 0 }))).toBeGreaterThanOrEqual(0.05);
    expect(computeIncumbentRetentionProbability(makeGov({ counterpartId: 'a', approval: 100 }))).toBeLessThanOrEqual(0.95);
  });
});

describe('resolveWorldElection', () => {
  it('retains a popular incumbent far more often than an unpopular one across many seeds', () => {
    const counterpart = makeCounterpart({ id: 'alpha' });
    let popularRetained = 0;
    let unpopularRetained = 0;
    const trials = 300;
    for (let seed = 0; seed < trials; seed++) {
      const popularGov = makeGov({ counterpartId: 'alpha', approval: 90, nextElectionTurn: 10 });
      const unpopularGov = makeGov({ counterpartId: 'alpha', approval: 10, nextElectionTurn: 10 });
      if (resolveWorldElection(counterpart, popularGov, new SeededRng(seed)).result.incumbentReturned) popularRetained++;
      if (resolveWorldElection(counterpart, unpopularGov, new SeededRng(seed)).result.incumbentReturned) unpopularRetained++;
    }
    expect(popularRetained).toBeGreaterThan(unpopularRetained);
  });

  it('advances nextElectionTurn by a full term either way', () => {
    const counterpart = makeCounterpart({ id: 'alpha' });
    const gov = makeGov({ counterpartId: 'alpha', nextElectionTurn: 10 });
    const { government } = resolveWorldElection(counterpart, gov, new SeededRng(1));
    expect(government.nextElectionTurn).toBe(10 + WORLD_TERM_LENGTH_TURNS);
    expect(government.lastElectionTurn).toBe(10);
  });

  it('keeps the same party/leader/ideology when the incumbent is retained', () => {
    const counterpart = makeCounterpart({ id: 'alpha', ideology: { economic: 20, social: -10 } });
    const gov = makeGov({ counterpartId: 'alpha', approval: 95, nextElectionTurn: 10 });
    // seed chosen so retention rolls true given ~0.95 probability
    const { counterpart: nextCounterpart, result } = resolveWorldElection(counterpart, gov, new SeededRng(2));
    expect(result.incumbentReturned).toBe(true);
    expect(nextCounterpart.ideology).toEqual(counterpart.ideology);
    expect(result.newPartyName).toBe(result.previousPartyName);
  });

  it('jitters ideology and swaps party/leader on a regime change', () => {
    const counterpart = makeCounterpart({ id: 'alpha', ideology: { economic: 20, social: -10 } });
    const gov = makeGov({ counterpartId: 'alpha', approval: 5, nextElectionTurn: 10 });
    let sawChange = false;
    for (let seed = 0; seed < 100 && !sawChange; seed++) {
      const { counterpart: nextCounterpart, result } = resolveWorldElection(counterpart, gov, new SeededRng(seed));
      if (!result.incumbentReturned) {
        sawChange = true;
        expect(nextCounterpart.ideology).not.toEqual(counterpart.ideology);
        expect(result.newLeaderName).not.toBe(gov.leaderName);
      }
    }
    expect(sawChange).toBe(true);
  });

  it('is deterministic given the same seed and inputs', () => {
    const counterpart = makeCounterpart({ id: 'alpha' });
    const gov = makeGov({ counterpartId: 'alpha', approval: 30, nextElectionTurn: 10 });
    const a = resolveWorldElection(counterpart, gov, new SeededRng(99));
    const b = resolveWorldElection(counterpart, gov, new SeededRng(99));
    expect(a).toEqual(b);
  });
});

describe('computeRealignmentRelationDelta', () => {
  const playerIdeology = { economic: 50, social: 50 };

  it('is positive when the new government is ideologically closer to the player', () => {
    const oldIdeology = { economic: -50, social: -50 };
    const newIdeology = { economic: 10, social: 10 };
    expect(computeRealignmentRelationDelta(oldIdeology, newIdeology, playerIdeology)).toBeGreaterThan(0);
  });

  it('is negative when the new government is ideologically farther from the player', () => {
    const oldIdeology = { economic: 10, social: 10 };
    const newIdeology = { economic: -50, social: -50 };
    expect(computeRealignmentRelationDelta(oldIdeology, newIdeology, playerIdeology)).toBeLessThan(0);
  });

  it('is bounded to +-10', () => {
    const oldIdeology = { economic: -100, social: -100 };
    const newIdeology = { economic: 100, social: 100 };
    const delta = computeRealignmentRelationDelta(oldIdeology, newIdeology, playerIdeology);
    expect(delta).toBeLessThanOrEqual(10);
    expect(delta).toBeGreaterThanOrEqual(-10);
  });
});

describe('runWorldElectionsTurn', () => {
  const playerIdeology = { economic: 0, social: 0 };

  it('leaves governments whose term is not due untouched aside from approval drift', () => {
    const counterparts = [makeCounterpart({ id: 'alpha' })];
    const governments = [makeGov({ counterpartId: 'alpha', nextElectionTurn: 500 })];
    const { governments: next, results } = runWorldElectionsTurn(counterparts, governments, {}, playerIdeology, 10, new SeededRng(1));
    expect(results).toHaveLength(0);
    expect(next[0].nextElectionTurn).toBe(500);
  });

  it('resolves every government whose term is due this turn', () => {
    const counterparts = [makeCounterpart({ id: 'alpha' }), makeCounterpart({ id: 'beta' })];
    const governments = [
      makeGov({ counterpartId: 'alpha', nextElectionTurn: 10 }),
      makeGov({ counterpartId: 'beta', nextElectionTurn: 10 }),
    ];
    const { results } = runWorldElectionsTurn(counterparts, governments, {}, playerIdeology, 10, new SeededRng(1));
    expect(results).toHaveLength(2);
  });

  it('is deterministic given the same seed', () => {
    const counterparts = [makeCounterpart({ id: 'alpha' })];
    const governments = [makeGov({ counterpartId: 'alpha', nextElectionTurn: 10 })];
    const a = runWorldElectionsTurn(counterparts, governments, {}, playerIdeology, 10, new SeededRng(7));
    const b = runWorldElectionsTurn(counterparts, governments, {}, playerIdeology, 10, new SeededRng(7));
    expect(a).toEqual(b);
  });
});
