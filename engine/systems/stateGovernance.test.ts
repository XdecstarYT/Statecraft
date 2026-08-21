import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Party, Province, StateGovernment, VoterBloc } from '../models/types';
import {
  STATE_LEGISLATURE_SEATS,
  STATE_TERM_LENGTH_TURNS,
  computeNationalRulingPartyId,
  driftFederalTension,
  driftStateApproval,
  initializeStateGovernments,
  resolveStateElection,
  runStateGovernanceTurn,
} from './stateGovernance';

function makeProvince(overrides: Partial<Province> & { id: string }): Province {
  return { name: overrides.id, districtIds: [], weight: 1, ...overrides };
}

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
    federalTension: 20,
    ...overrides,
  };
}

function makeParties(seatShares: number[] = [42, 26, 18, 14]): Party[] {
  const ideologies = [
    { economic: 0, social: 0 },
    { economic: 40, social: 30 },
    { economic: -40, social: -30 },
    { economic: 10, social: -50 },
  ];
  return seatShares.map((seats, i) => ({
    id: `party-${i + 1}`,
    name: i === 0 ? 'Ruling Party' : `Opposition ${i}`,
    ideology: ideologies[i],
    seats,
    factions: [{ name: 'Core', ideologyOffset: 0, size: seats }],
  }));
}

const TEST_VOTER_BLOCS: VoterBloc[] = [
  { id: 'bloc-a', name: 'Bloc A', size: 0.5, ideology: { economic: 20, social: 10 }, persuadability: 0.6, issueSalience: [] },
  { id: 'bloc-b', name: 'Bloc B', size: 0.5, ideology: { economic: -20, social: -10 }, persuadability: 0.6, issueSalience: [] },
];

describe('initializeStateGovernments', () => {
  const provinces = [makeProvince({ id: 'north' }), makeProvince({ id: 'south' })];

  it('creates one government per province', () => {
    const govs = initializeStateGovernments(provinces, makeParties(), new SeededRng(1));
    expect(govs).toHaveLength(2);
    expect(govs.map((g) => g.provinceId)).toEqual(['north', 'south']);
  });

  it('is deterministic given the same seed', () => {
    const a = initializeStateGovernments(provinces, makeParties(), new SeededRng(42));
    const b = initializeStateGovernments(provinces, makeParties(), new SeededRng(42));
    expect(a).toEqual(b);
  });

  it('staggers provinces to different first election turns', () => {
    const many = Array.from({ length: 20 }, (_, i) => makeProvince({ id: `province-${i}` }));
    const govs = initializeStateGovernments(many, makeParties(), new SeededRng(1));
    const uniqueTurns = new Set(govs.map((g) => g.nextElectionTurn));
    expect(uniqueTurns.size).toBeGreaterThan(1);
    for (const g of govs) {
      expect(g.nextElectionTurn).toBeGreaterThanOrEqual(1);
      expect(g.nextElectionTurn).toBeLessThanOrEqual(STATE_TERM_LENGTH_TURNS);
    }
  });

  it('only assigns parties that actually exist', () => {
    const parties = makeParties();
    const govs = initializeStateGovernments(provinces, parties, new SeededRng(3));
    for (const g of govs) {
      expect(parties.map((p) => p.id)).toContain(g.partyId);
    }
  });
});

describe('driftStateApproval', () => {
  it('stays within 5..95 bounds', () => {
    let gov = makeGov({ provinceId: 'north', approval: 94 });
    const rng = new SeededRng(1);
    for (let i = 0; i < 200; i++) {
      gov = driftStateApproval(gov, rng);
      expect(gov.approval).toBeGreaterThanOrEqual(5);
      expect(gov.approval).toBeLessThanOrEqual(95);
    }
  });
});

describe('resolveStateElection', () => {
  it('a party holding a much larger seat share tends to keep leading more often than not, across many seeds', () => {
    const province = makeProvince({ id: 'north', districtIds: ['north-d1', 'north-d2', 'north-d3'] });
    let retained = 0;
    const trials = 100;
    for (let seed = 0; seed < trials; seed++) {
      const parties = makeParties([70, 10, 10, 10]);
      const gov = makeGov({ provinceId: 'north', partyId: 'party-1', approval: 60, nextElectionTurn: 10 });
      const { result } = resolveStateElection(province, gov, parties, TEST_VOTER_BLOCS, {}, new SeededRng(seed));
      if (result.incumbentPartyRetained) retained++;
    }
    expect(retained).toBeGreaterThan(trials / 2);
  });

  it('advances nextElectionTurn by a full term either way', () => {
    const province = makeProvince({ id: 'north' });
    const parties = makeParties();
    const gov = makeGov({ provinceId: 'north', nextElectionTurn: 10 });
    const { government } = resolveStateElection(province, gov, parties, TEST_VOTER_BLOCS, {}, new SeededRng(1));
    expect(government.nextElectionTurn).toBe(10 + STATE_TERM_LENGTH_TURNS);
    expect(government.lastElectionTurn).toBe(10);
  });

  it('keeps the same governor when the incumbent party is retained', () => {
    const province = makeProvince({ id: 'north', districtIds: ['north-d1', 'north-d2'] });
    const parties = makeParties([70, 10, 10, 10]);
    const gov = makeGov({ provinceId: 'north', partyId: 'party-1', governorName: 'Incumbent Gov', approval: 90, nextElectionTurn: 10 });
    const { result, government } = resolveStateElection(province, gov, parties, TEST_VOTER_BLOCS, {}, new SeededRng(1));
    expect(result.incumbentPartyRetained).toBe(true);
    expect(government.governorName).toBe('Incumbent Gov');
  });

  it('elects a new governor and resets approval on a regime change', () => {
    const province = makeProvince({ id: 'north', districtIds: ['north-d1', 'north-d2'] });
    const gov = makeGov({ provinceId: 'north', partyId: 'party-1', governorName: 'Weak Gov', approval: 5, nextElectionTurn: 10 });
    let sawChange = false;
    for (let seed = 0; seed < 100 && !sawChange; seed++) {
      const parties = makeParties([10, 70, 10, 10]);
      const { result, government } = resolveStateElection(province, gov, parties, TEST_VOTER_BLOCS, {}, new SeededRng(seed));
      if (!result.incumbentPartyRetained) {
        sawChange = true;
        expect(government.governorName).not.toBe('Weak Gov');
        expect(government.termsServed).toBe(1);
      }
    }
    expect(sawChange).toBe(true);
  });

  it('is deterministic given the same seed and inputs', () => {
    const province = makeProvince({ id: 'north', districtIds: ['north-d1', 'north-d2'] });
    const parties = makeParties();
    const gov = makeGov({ provinceId: 'north', approval: 30, nextElectionTurn: 10 });
    const a = resolveStateElection(province, gov, parties, TEST_VOTER_BLOCS, {}, new SeededRng(99));
    const b = resolveStateElection(province, gov, parties, TEST_VOTER_BLOCS, {}, new SeededRng(99));
    expect(a).toEqual(b);
  });
});

describe('runStateGovernanceTurn', () => {
  it('leaves governments whose term is not due untouched aside from approval drift', () => {
    const provinces = [makeProvince({ id: 'north' })];
    const governments = [makeGov({ provinceId: 'north', nextElectionTurn: 500 })];
    const { governments: next, results } = runStateGovernanceTurn(
      provinces,
      governments,
      makeParties(),
      TEST_VOTER_BLOCS,
      {},
      10,
      new SeededRng(1)
    );
    expect(results).toHaveLength(0);
    expect(next[0].nextElectionTurn).toBe(500);
  });

  it('resolves every government whose term is due this turn', () => {
    const provinces = [makeProvince({ id: 'north' }), makeProvince({ id: 'south' })];
    const governments = [
      makeGov({ provinceId: 'north', nextElectionTurn: 10 }),
      makeGov({ provinceId: 'south', nextElectionTurn: 10 }),
    ];
    const { results, governments: next } = runStateGovernanceTurn(
      provinces,
      governments,
      makeParties(),
      TEST_VOTER_BLOCS,
      {},
      10,
      new SeededRng(1)
    );
    expect(results).toHaveLength(2);
    for (const g of next) {
      expect(g.nextElectionTurn).toBe(10 + STATE_TERM_LENGTH_TURNS);
    }
  });

  it('is deterministic given the same seed', () => {
    const provinces = [makeProvince({ id: 'north' })];
    const governments = [makeGov({ provinceId: 'north', nextElectionTurn: 10 })];
    const a = runStateGovernanceTurn(provinces, governments, makeParties(), TEST_VOTER_BLOCS, {}, 10, new SeededRng(7));
    const b = runStateGovernanceTurn(provinces, governments, makeParties(), TEST_VOTER_BLOCS, {}, 10, new SeededRng(7));
    expect(a).toEqual(b);
  });

  it('resolves a real D\'Hondt legislature seat allocation summing to STATE_LEGISLATURE_SEATS on election', () => {
    const provinces = [makeProvince({ id: 'north', districtIds: ['north-d1', 'north-d2', 'north-d3'] })];
    const governments = [makeGov({ provinceId: 'north', nextElectionTurn: 10 })];
    const { governments: next } = runStateGovernanceTurn(
      provinces,
      governments,
      makeParties(),
      TEST_VOTER_BLOCS,
      {},
      10,
      new SeededRng(1)
    );
    const totalSeats = Object.values(next[0].legislatureSeats).reduce((a, b) => a + b, 0);
    expect(totalSeats).toBe(STATE_LEGISLATURE_SEATS);
  });
});

describe('computeNationalRulingPartyId', () => {
  it('picks the party with the most seats', () => {
    const parties = makeParties([10, 70, 10, 10]);
    expect(computeNationalRulingPartyId(parties)).toBe('party-2');
  });

  it('returns empty string for an empty roster', () => {
    expect(computeNationalRulingPartyId([])).toBe('');
  });
});

describe('driftFederalTension', () => {
  it('stays within 0..100 bounds', () => {
    let gov = makeGov({ provinceId: 'north', partyId: 'party-3', federalTension: 50 });
    const rng = new SeededRng(1);
    for (let i = 0; i < 200; i++) {
      gov = driftFederalTension(gov, 'party-1', makeParties(), rng);
      expect(gov.federalTension).toBeGreaterThanOrEqual(0);
      expect(gov.federalTension).toBeLessThanOrEqual(100);
    }
  });

  it('pulls tension toward a higher target when the governing party is ideologically farther from the national ruling party', () => {
    const parties = makeParties();
    const rng = new SeededRng(1);
    let alignedGov = makeGov({ provinceId: 'aligned', partyId: 'party-1', federalTension: 20 });
    let opposedGov = makeGov({ provinceId: 'opposed', partyId: 'party-3', federalTension: 20 });
    for (let i = 0; i < 100; i++) {
      alignedGov = driftFederalTension(alignedGov, 'party-1', parties, rng);
      opposedGov = driftFederalTension(opposedGov, 'party-1', parties, rng);
    }
    expect(opposedGov.federalTension).toBeGreaterThan(alignedGov.federalTension);
  });
});
