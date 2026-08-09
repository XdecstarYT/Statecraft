import { describe, expect, it } from 'vitest';
import type { Bill, EconomyState, GameState, Politician, Scandal } from '../models/types';
import { WEEKS_PER_YEAR } from '../calendar';
import {
  computeLegacyBreakdown,
  computeLegacySummary,
  determineLeadingVictoryPath,
  scoreContemporaryVerdict,
  scoreHistoriansVerdict,
  scoreNationalPrestige,
  scorePartyDominance,
  scorePersonalPower,
} from './legacy';

const BASELINE_ECONOMY: EconomyState = {
  gdpGrowth: 2,
  inflation: 3,
  unemployment: 5,
  debtToGdp: 60,
  budgetBalance: -2,
  pendingEffects: [],
};

function makePlayer(overrides: Partial<Politician> = {}): Politician {
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

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 1,
    rngState: 1,
    turn: 1,
    country: {
      id: 'c',
      name: 'Test Country',
      regimeType: 'parliamentary',
      legislature: { name: 'Assembly', electoralSystem: 'FPTP', districts: [], totalSeats: 0, prThreshold: 0 },
    },
    politicians: [makePlayer()],
    parties: [{ id: 'party-a', name: 'Party A', ideology: { economic: 0, social: 0 }, seats: 5, factions: [] }],
    bills: [],
    economy: BASELINE_ECONOMY,
    relationships: {},
    favorBank: {},
    voterBlocs: [],
    mediaOutlets: [],
    scandals: [],
    foreignCounterparts: [],
    foreignRelations: {},
    playerMilitary: { strength: 40, personnel: 100, techLevel: 50 },
    treaties: [],
    tradeDeals: [],
    wars: [],
    electionNight: null,
    cabinet: [],
    nextElectionTurn: 999,
    interestGroups: [],
    partyLeaderId: {},
    leadershipChallenge: null,
    eventLog: [],
    difficulty: 'standard',
    startingEconomy: BASELINE_ECONOMY,
    ...overrides,
  };
}

describe('computeLegacyBreakdown', () => {
  it('converts turn count into years using WEEKS_PER_YEAR', () => {
    const b = computeLegacyBreakdown(makeState({ turn: WEEKS_PER_YEAR * 2 }));
    expect(b.yearsInPower).toBeCloseTo(2, 5);
  });

  it('counts only the player\'s own passed bills', () => {
    const bills: Bill[] = [
      { id: 'b1', title: 'A', provisions: [], sponsorId: 'player', status: 'passed', whipCount: {} },
      { id: 'b2', title: 'B', provisions: [], sponsorId: 'player', status: 'failed', whipCount: {} },
      { id: 'b3', title: 'C', provisions: [], sponsorId: 'someone-else', status: 'passed', whipCount: {} },
    ];
    const b = computeLegacyBreakdown(makeState({ bills }));
    expect(b.billsPassed).toBe(1);
  });

  it('computes party seat share against the total legislature', () => {
    const parties = [
      { id: 'party-a', name: 'A', ideology: { economic: 0, social: 0 }, seats: 15, factions: [] },
      { id: 'party-b', name: 'B', ideology: { economic: 0, social: 0 }, seats: 35, factions: [] },
    ];
    const b = computeLegacyBreakdown(makeState({ parties }));
    expect(b.partySeatShare).toBeCloseTo(0.3, 5);
  });

  it('computes the economy delta relative to the starting baseline', () => {
    const economy: EconomyState = { ...BASELINE_ECONOMY, gdpGrowth: 4, unemployment: 3, debtToGdp: 50 };
    const b = computeLegacyBreakdown(makeState({ economy, startingEconomy: BASELINE_ECONOMY }));
    expect(b.economyDelta.gdpGrowth).toBeCloseTo(2, 5); // grew from 2 to 4
    expect(b.economyDelta.unemployment).toBeCloseTo(2, 5); // fell from 5 to 3 (improvement)
    expect(b.economyDelta.debtToGdp).toBeCloseTo(10, 5); // fell from 60 to 50 (improvement)
  });

  it('averages foreign relations across all counterparts', () => {
    const b = computeLegacyBreakdown(makeState({ foreignRelations: { a: 40, b: -20, c: 10 } }));
    expect(b.averageForeignRelations).toBeCloseTo(10, 5);
  });
});

describe('individual score functions', () => {
  it('are all bounded to 0..100', () => {
    const extreme = computeLegacyBreakdown(
      makeState({
        turn: WEEKS_PER_YEAR * 50,
        politicians: [makePlayer({ approval: { public: 100, base: 100, partyElite: 100 } })],
        scandals: Array.from({ length: 20 }, (_, i): Scandal => ({
          id: `s${i}`,
          politicianId: 'player',
          tier: 'hard',
          turn: 1,
          status: 'unresolved',
        })),
      })
    );
    expect(scorePersonalPower(extreme)).toBeGreaterThanOrEqual(0);
    expect(scorePersonalPower(extreme)).toBeLessThanOrEqual(100);
    expect(scorePartyDominance(extreme)).toBeGreaterThanOrEqual(0);
    expect(scorePartyDominance(extreme)).toBeLessThanOrEqual(100);
    expect(scoreNationalPrestige(extreme)).toBeGreaterThanOrEqual(0);
    expect(scoreNationalPrestige(extreme)).toBeLessThanOrEqual(100);
    expect(scoreContemporaryVerdict(extreme)).toBeGreaterThanOrEqual(0);
    expect(scoreContemporaryVerdict(extreme)).toBeLessThanOrEqual(100);
    expect(scoreHistoriansVerdict(extreme)).toBeGreaterThanOrEqual(0);
    expect(scoreHistoriansVerdict(extreme)).toBeLessThanOrEqual(100);
  });

  it('scorePersonalPower rises with years in power and approval', () => {
    const short = computeLegacyBreakdown(makeState({ turn: 1 }));
    const long = computeLegacyBreakdown(makeState({ turn: WEEKS_PER_YEAR * 3 }));
    expect(scorePersonalPower(long)).toBeGreaterThan(scorePersonalPower(short));
  });

  it('scorePersonalPower is penalized by unresolved and hard scandals', () => {
    const clean = computeLegacyBreakdown(makeState());
    const scandalous = computeLegacyBreakdown(
      makeState({
        scandals: [{ id: 's1', politicianId: 'player', tier: 'hard', turn: 1, status: 'unresolved' }],
      })
    );
    expect(scorePersonalPower(scandalous)).toBeLessThan(scorePersonalPower(clean));
  });

  it('scorePartyDominance rises with seat share', () => {
    const minority = computeLegacyBreakdown(
      makeState({
        parties: [
          { id: 'party-a', name: 'A', ideology: { economic: 0, social: 0 }, seats: 5, factions: [] },
          { id: 'party-b', name: 'B', ideology: { economic: 0, social: 0 }, seats: 45, factions: [] },
        ],
      })
    );
    const majority = computeLegacyBreakdown(
      makeState({
        parties: [
          { id: 'party-a', name: 'A', ideology: { economic: 0, social: 0 }, seats: 45, factions: [] },
          { id: 'party-b', name: 'B', ideology: { economic: 0, social: 0 }, seats: 5, factions: [] },
        ],
      })
    );
    expect(scorePartyDominance(majority)).toBeGreaterThan(scorePartyDominance(minority));
  });

  it('scoreNationalPrestige rises when the economy improves on the baseline', () => {
    const worse = computeLegacyBreakdown(
      makeState({ economy: { ...BASELINE_ECONOMY, gdpGrowth: -2, unemployment: 10 } })
    );
    const better = computeLegacyBreakdown(
      makeState({ economy: { ...BASELINE_ECONOMY, gdpGrowth: 5, unemployment: 2 } })
    );
    expect(scoreNationalPrestige(better)).toBeGreaterThan(scoreNationalPrestige(worse));
  });
});

describe('contemporary vs historians verdicts can diverge', () => {
  it('a popular-but-corrupt run scores far better with contemporaries than with historians', () => {
    const popularButCorrupt = computeLegacyBreakdown(
      makeState({
        politicians: [makePlayer({ approval: { public: 90, base: 80, partyElite: 80 } })],
        economy: { ...BASELINE_ECONOMY, gdpGrowth: 2.2 },
        scandals: Array.from({ length: 4 }, (_, i): Scandal => ({
          id: `s${i}`,
          politicianId: 'player',
          tier: 'hard',
          turn: 1,
          status: 'resolved',
          response: 'deny',
        })),
      })
    );

    const contemporary = scoreContemporaryVerdict(popularButCorrupt);
    const historians = scoreHistoriansVerdict(popularButCorrupt);
    expect(contemporary).toBeGreaterThan(historians + 20);
  });

  it('an unpopular-but-clean, strong economy can score better with historians than with the public', () => {
    const strugglingButClean = computeLegacyBreakdown(
      makeState({
        politicians: [makePlayer({ approval: { public: 25, base: 40, partyElite: 40 } })],
        economy: { ...BASELINE_ECONOMY, gdpGrowth: 6, unemployment: 1, debtToGdp: 20 },
        scandals: [],
      })
    );
    const contemporary = scoreContemporaryVerdict(strugglingButClean);
    const historians = scoreHistoriansVerdict(strugglingButClean);
    expect(historians).toBeGreaterThan(contemporary);
  });
});

describe('computeLegacySummary / determineLeadingVictoryPath', () => {
  it('bundles the breakdown with all five scores', () => {
    const summary = computeLegacySummary(makeState());
    expect(summary.breakdown).toBeDefined();
    expect(typeof summary.personalPower).toBe('number');
    expect(typeof summary.partyDominance).toBe('number');
    expect(typeof summary.nationalPrestige).toBe('number');
    expect(typeof summary.contemporaryVerdict).toBe('number');
    expect(typeof summary.historiansVerdict).toBe('number');
  });

  it('picks whichever axis currently scores highest', () => {
    const dominant = computeLegacySummary(
      makeState({
        parties: [
          { id: 'party-a', name: 'A', ideology: { economic: 0, social: 0 }, seats: 49, factions: [] },
          { id: 'party-b', name: 'B', ideology: { economic: 0, social: 0 }, seats: 1, factions: [] },
        ],
      })
    );
    expect(determineLeadingVictoryPath(dominant)).toBe('party_dominance');
  });

  it('is deterministic for the same state', () => {
    const state = makeState({ turn: 30 });
    expect(computeLegacySummary(state)).toEqual(computeLegacySummary(state));
  });
});
