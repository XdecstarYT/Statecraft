import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { District, ForeignCounterpart, Party, VoterBloc, WorldGovernment } from '../models/types';
import {
  WORLD_TERM_LENGTH_TURNS,
  computeRealignmentRelationDelta,
  driftApproval,
  initializeForeignLegislatures,
  initializeWorldGovernments,
  resolveForeignElection,
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

function makeDistricts(nationId: string, count: number): District[] {
  return Array.from({ length: count }, (_, i) => ({ id: `${nationId}-d${i + 1}`, name: `District ${i + 1}` }));
}

function makeParties(nationId: string, seatShares: number[] = [42, 26, 18, 14]): Party[] {
  const ideologies = [
    { economic: 0, social: 0 },
    { economic: 40, social: 30 },
    { economic: -40, social: -30 },
    { economic: 10, social: -50 },
  ];
  return seatShares.map((seats, i) => ({
    id: `${nationId}-party-${i + 1}`,
    name: i === 0 ? 'National Union' : `Opposition ${i}`,
    ideology: ideologies[i],
    seats,
    factions: [{ name: 'Core', ideologyOffset: 0, size: seats }],
  }));
}

const TEST_VOTER_BLOCS: VoterBloc[] = [
  { id: 'bloc-a', name: 'Bloc A', size: 0.5, ideology: { economic: 20, social: 10 }, persuadability: 0.6, issueSalience: [] },
  { id: 'bloc-b', name: 'Bloc B', size: 0.5, ideology: { economic: -20, social: -10 }, persuadability: 0.6, issueSalience: [] },
];

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

describe('initializeForeignLegislatures', () => {
  it('gives every nation a real district count and a 4-party roster summing to it', () => {
    const counterparts = [
      makeCounterpart({ id: 'united-states' }),
      makeCounterpart({ id: 'some-generated-nation', military: { strength: 30, personnel: 40, techLevel: 30 } }),
    ];
    const governments = initializeWorldGovernments(counterparts, new SeededRng(1));
    const { districts, parties } = initializeForeignLegislatures(counterparts, governments, new SeededRng(1));

    expect(districts['united-states']).toHaveLength(435);
    expect(parties['united-states']).toHaveLength(4);
    const usSeatSum = parties['united-states'].reduce((sum, p) => sum + p.seats, 0);
    expect(usSeatSum).toBe(435);

    expect(districts['some-generated-nation'].length).toBeGreaterThan(0);
    const genSeatSum = parties['some-generated-nation'].reduce((sum, p) => sum + p.seats, 0);
    expect(genSeatSum).toBe(districts['some-generated-nation'].length);
  });

  it("the ruling party's name matches the recorded government's rulingPartyName", () => {
    const counterparts = [makeCounterpart({ id: 'alpha' })];
    const governments = initializeWorldGovernments(counterparts, new SeededRng(1));
    const { parties } = initializeForeignLegislatures(counterparts, governments, new SeededRng(1));
    expect(parties['alpha'][0].name).toBe(governments[0].rulingPartyName);
  });

  it('is deterministic given the same seed', () => {
    const counterparts = [makeCounterpart({ id: 'alpha' }), makeCounterpart({ id: 'beta' })];
    const governments = initializeWorldGovernments(counterparts, new SeededRng(1));
    const a = initializeForeignLegislatures(counterparts, governments, new SeededRng(5));
    const b = initializeForeignLegislatures(counterparts, governments, new SeededRng(5));
    expect(a).toEqual(b);
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

describe('resolveForeignElection', () => {
  it('a party holding a much larger seat share tends to keep leading more often than not, across many seeds', () => {
    const counterpart = makeCounterpart({ id: 'alpha' });
    const districts = makeDistricts('alpha', 60);
    let leaderRetained = 0;
    const trials = 100;
    for (let seed = 0; seed < trials; seed++) {
      const parties = makeParties('alpha', [42, 6, 6, 6]);
      const gov = makeGov({ counterpartId: 'alpha', approval: 60, nextElectionTurn: 10 });
      const { result } = resolveForeignElection(counterpart, gov, districts, parties, TEST_VOTER_BLOCS, new SeededRng(seed));
      if (result.incumbentReturned) leaderRetained++;
    }
    expect(leaderRetained).toBeGreaterThan(trials / 2);
  });

  it('advances nextElectionTurn by a full term either way', () => {
    const counterpart = makeCounterpart({ id: 'alpha' });
    const districts = makeDistricts('alpha', 40);
    const parties = makeParties('alpha');
    const gov = makeGov({ counterpartId: 'alpha', nextElectionTurn: 10 });
    const { government } = resolveForeignElection(counterpart, gov, districts, parties, TEST_VOTER_BLOCS, new SeededRng(1));
    expect(government.nextElectionTurn).toBe(10 + WORLD_TERM_LENGTH_TURNS);
    expect(government.lastElectionTurn).toBe(10);
  });

  it('district results exactly cover every district and seats sum to the district count', () => {
    const counterpart = makeCounterpart({ id: 'alpha' });
    const districts = makeDistricts('alpha', 50);
    const parties = makeParties('alpha');
    const gov = makeGov({ counterpartId: 'alpha', nextElectionTurn: 10 });
    const { districtResults, parties: updatedParties } = resolveForeignElection(
      counterpart,
      gov,
      districts,
      parties,
      TEST_VOTER_BLOCS,
      new SeededRng(3)
    );
    expect(districtResults).toHaveLength(50);
    expect(districtResults.map((r) => r.districtId).sort()).toEqual(districts.map((d) => d.id).sort());
    expect(updatedParties.reduce((sum, p) => sum + p.seats, 0)).toBe(50);
  });

  it('keeps party ids/identities stable — an election reshuffles seat counts, never spawns or removes a party', () => {
    const counterpart = makeCounterpart({ id: 'alpha' });
    const districts = makeDistricts('alpha', 40);
    const parties = makeParties('alpha');
    const gov = makeGov({ counterpartId: 'alpha', nextElectionTurn: 10 });
    const { parties: updatedParties } = resolveForeignElection(counterpart, gov, districts, parties, TEST_VOTER_BLOCS, new SeededRng(4));
    expect(updatedParties.map((p) => p.id)).toEqual(parties.map((p) => p.id));
    expect(updatedParties.map((p) => p.name)).toEqual(parties.map((p) => p.name));
  });

  it('keeps the same ideology when a dominant, popular incumbent is retained', () => {
    const counterpart = makeCounterpart({ id: 'alpha', ideology: { economic: 20, social: -10 } });
    const districts = makeDistricts('alpha', 40);
    const parties = makeParties('alpha', [70, 10, 10, 10]);
    const gov = makeGov({ counterpartId: 'alpha', approval: 90, nextElectionTurn: 10 });
    const { counterpart: nextCounterpart, result } = resolveForeignElection(
      counterpart,
      gov,
      districts,
      parties,
      TEST_VOTER_BLOCS,
      new SeededRng(1)
    );
    expect(result.incumbentReturned).toBe(true);
    expect(nextCounterpart.ideology).toEqual(counterpart.ideology);
    expect(result.newPartyName).toBe(result.previousPartyName);
  });

  it('jitters ideology and swaps the ruling party on a regime change', () => {
    const counterpart = makeCounterpart({ id: 'alpha', ideology: { economic: 20, social: -10 } });
    const districts = makeDistricts('alpha', 40);
    const gov = makeGov({ counterpartId: 'alpha', approval: 5, nextElectionTurn: 10 });
    let sawChange = false;
    for (let seed = 0; seed < 100 && !sawChange; seed++) {
      const parties = makeParties('alpha', [10, 70, 10, 10]);
      const { counterpart: nextCounterpart, result } = resolveForeignElection(
        counterpart,
        gov,
        districts,
        parties,
        TEST_VOTER_BLOCS,
        new SeededRng(seed)
      );
      if (!result.incumbentReturned) {
        sawChange = true;
        expect(nextCounterpart.ideology).not.toEqual(counterpart.ideology);
        expect(result.newPartyName).not.toBe(result.previousPartyName);
      }
    }
    expect(sawChange).toBe(true);
  });

  it('is deterministic given the same seed and inputs', () => {
    const counterpart = makeCounterpart({ id: 'alpha' });
    const districts = makeDistricts('alpha', 40);
    const parties = makeParties('alpha');
    const gov = makeGov({ counterpartId: 'alpha', approval: 30, nextElectionTurn: 10 });
    const a = resolveForeignElection(counterpart, gov, districts, parties, TEST_VOTER_BLOCS, new SeededRng(99));
    const b = resolveForeignElection(counterpart, gov, districts, parties, TEST_VOTER_BLOCS, new SeededRng(99));
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
    const foreignDistricts = { alpha: makeDistricts('alpha', 40) };
    const foreignParties = { alpha: makeParties('alpha') };
    const { governments: next, results } = runWorldElectionsTurn(
      counterparts,
      governments,
      {},
      foreignDistricts,
      foreignParties,
      TEST_VOTER_BLOCS,
      playerIdeology,
      10,
      new SeededRng(1)
    );
    expect(results).toHaveLength(0);
    expect(next[0].nextElectionTurn).toBe(500);
  });

  it('resolves every government whose term is due this turn, producing real district results for each', () => {
    const counterparts = [makeCounterpart({ id: 'alpha' }), makeCounterpart({ id: 'beta' })];
    const governments = [
      makeGov({ counterpartId: 'alpha', nextElectionTurn: 10 }),
      makeGov({ counterpartId: 'beta', nextElectionTurn: 10 }),
    ];
    const foreignDistricts = { alpha: makeDistricts('alpha', 40), beta: makeDistricts('beta', 30) };
    const foreignParties = { alpha: makeParties('alpha'), beta: makeParties('beta') };
    const { results, foreignDistrictResults, foreignParties: updatedParties } = runWorldElectionsTurn(
      counterparts,
      governments,
      {},
      foreignDistricts,
      foreignParties,
      TEST_VOTER_BLOCS,
      playerIdeology,
      10,
      new SeededRng(1)
    );
    expect(results).toHaveLength(2);
    expect(foreignDistrictResults['alpha']).toHaveLength(40);
    expect(foreignDistrictResults['beta']).toHaveLength(30);
    expect(updatedParties['alpha'].reduce((sum, p) => sum + p.seats, 0)).toBe(40);
  });

  it('is deterministic given the same seed', () => {
    const counterparts = [makeCounterpart({ id: 'alpha' })];
    const governments = [makeGov({ counterpartId: 'alpha', nextElectionTurn: 10 })];
    const foreignDistricts = { alpha: makeDistricts('alpha', 40) };
    const foreignParties = { alpha: makeParties('alpha') };
    const a = runWorldElectionsTurn(
      counterparts,
      governments,
      {},
      foreignDistricts,
      foreignParties,
      TEST_VOTER_BLOCS,
      playerIdeology,
      10,
      new SeededRng(7)
    );
    const b = runWorldElectionsTurn(
      counterparts,
      governments,
      {},
      foreignDistricts,
      foreignParties,
      TEST_VOTER_BLOCS,
      playerIdeology,
      10,
      new SeededRng(7)
    );
    expect(a).toEqual(b);
  });
});
