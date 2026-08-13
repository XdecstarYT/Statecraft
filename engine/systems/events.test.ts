import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { GameState, Politician } from '../models/types';
import {
  applyCrisisEvent,
  computeEventWeight,
  getPlayerApproval,
  hasActiveScandal,
  isEconomyFragile,
  rollForEvent,
  type CrisisEventDef,
} from './events';

function makePlayer(approvalPublic = 50): Politician {
  return {
    id: 'player',
    name: 'Alex Varga',
    isPlayer: true,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: approvalPublic, base: 50, partyElite: 50 },
    approvalEvents: [],
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    seed: 1,
    rngState: 1,
    turn: 10,
    country: {
      id: 'c',
      name: 'Test Country',
      regimeType: 'parliamentary',
      legislature: { name: 'Assembly', electoralSystem: 'FPTP', districts: [], totalSeats: 0, prThreshold: 0 },
    },
    politicians: [makePlayer()],
    parties: [],
    bills: [],
    economy: { gdpGrowth: 2, inflation: 3, unemployment: 5, debtToGdp: 60, budgetBalance: -2, pendingEffects: [] },
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
    intelligenceCapability: 20,
    covertOperations: [],
    coalition: null,
    secessionistMovements: [],
    ballotInitiatives: [],
    termsServed: {},
    protests: [],
    endorsers: [],
    endorsements: [],
    pollingFirms: [],
    polls: [],
    personalWealth: {},
    activeSummit: null,
    activeDilemma: null,
    milestones: [],
    houseRules: { disableTermLimits: false, doubleEventFrequency: false, noCorruption: false },
    resourceDeposits: [],
    mines: [],
    factories: [],
    logisticsNetwork: { capability: 20 },
    rawResourceStockpile: {} as GameState['rawResourceStockpile'],
    stateGoodsStockpile: {} as GameState['stateGoodsStockpile'],
    privateGoodsStockpile: {} as GameState['privateGoodsStockpile'],
    marketPrices: {} as GameState['marketPrices'],
    court: { seats: [] },
    judicialReviewCases: [],
    research: { capability: 20, accumulatedPoints: 0, unlockedTechIds: [] },
    demographics: { population: 5000, naturalGrowthRate: 0.05, netMigrationRate: 0, policy: 'restricted' },
    socialPolicy: {
      healthcareFunding: 'standard',
      educationFunding: 'standard',
      welfareFunding: 'standard',
      lifeExpectancy: 75,
      literacyRate: 88,
      povertyRate: 14,
    },
    companies: [],
    crime: { crimeRate: 25, incarcerationRate: 12, policingFunding: 'standard', organizedCrimeInfluence: 5 },
    environment: { pollutionIndex: 15, renewableShare: 20, energyPolicy: 'balanced', greenInvestmentCapability: 20 },
    infrastructure: { transport: 55, power: 60, water: 65, digital: 45 },
    socialMedia: { posts: [], followerCount: 1000 },
    movements: [],
    eventLog: [],
    difficulty: 'standard',
    startingEconomy: { gdpGrowth: 2, inflation: 3, unemployment: 5, debtToGdp: 60, budgetBalance: -2, pendingEffects: [] },
    playerPromises: [],
    committees: [],
    factionLeaderId: {},
    worldGovernments: [],
    worldElectionHistory: [],
    pendingCoalitionOffers: null,
    byElections: [],
    districtLeanDrift: {},
    donors: [],
    campaignFunds: 0,
    journalists: [],
    thinkTanks: [],
    overtonWindow: { economic: 0, social: 0 },
    partyWhips: [],
    partyLoyalty: {},
    rebellions: [],
    tribunalCases: [],
    sanctionsRegimes: [],
    dynasties: [],
    emergencyPowers: 'none',
    coupHistory: [],
    juntaControl: false,
    foreignDistricts: {},
    foreignParties: {},
    foreignDistrictResults: {},
    ...overrides,
  };
}

describe('isEconomyFragile', () => {
  it('is false for a healthy economy', () => {
    expect(isEconomyFragile({ gdpGrowth: 2, inflation: 3, unemployment: 5, debtToGdp: 60, budgetBalance: -2, pendingEffects: [] })).toBe(false);
  });

  it('is true when growth is negative', () => {
    expect(isEconomyFragile({ gdpGrowth: -1, inflation: 3, unemployment: 5, debtToGdp: 60, budgetBalance: -2, pendingEffects: [] })).toBe(true);
  });

  it('is true when unemployment or debt is high', () => {
    expect(isEconomyFragile({ gdpGrowth: 2, inflation: 3, unemployment: 12, debtToGdp: 60, budgetBalance: -2, pendingEffects: [] })).toBe(true);
    expect(isEconomyFragile({ gdpGrowth: 2, inflation: 3, unemployment: 5, debtToGdp: 120, budgetBalance: -2, pendingEffects: [] })).toBe(true);
  });
});

describe('hasActiveScandal / getPlayerApproval', () => {
  it('detects an unresolved scandal', () => {
    const state = makeState({ scandals: [{ id: 's1', politicianId: 'player', tier: 'soft', turn: 1, status: 'unresolved' }] });
    expect(hasActiveScandal(state)).toBe(true);
  });

  it('ignores resolved scandals', () => {
    const state = makeState({ scandals: [{ id: 's1', politicianId: 'player', tier: 'soft', turn: 1, status: 'resolved' }] });
    expect(hasActiveScandal(state)).toBe(false);
  });

  it('reads the player politician\'s public approval', () => {
    const state = makeState({ politicians: [makePlayer(22)] });
    expect(getPlayerApproval(state)).toBe(22);
  });
});

describe('computeEventWeight', () => {
  const economicShock: CrisisEventDef = {
    id: 'recession',
    category: 'economic_shock',
    title: 'Recession Fears',
    description: 'desc',
    baseWeight: 10,
  };
  const scandalFollowUp: CrisisEventDef = {
    id: 'followup',
    category: 'scandal',
    title: 'Follow-up Investigation',
    description: 'desc',
    baseWeight: 10,
  };
  const unrest: CrisisEventDef = {
    id: 'unrest',
    category: 'civil_unrest',
    title: 'Protests',
    description: 'desc',
    baseWeight: 10,
  };

  it('weights economic-shock events higher when the economy is fragile', () => {
    const healthy = makeState({ economy: { gdpGrowth: 2, inflation: 3, unemployment: 5, debtToGdp: 60, budgetBalance: -2, pendingEffects: [] } });
    const fragile = makeState({ economy: { gdpGrowth: -1, inflation: 3, unemployment: 5, debtToGdp: 60, budgetBalance: -2, pendingEffects: [] } });
    expect(computeEventWeight(economicShock, fragile)).toBeGreaterThan(computeEventWeight(economicShock, healthy));
  });

  it('weights scandal follow-ups higher when a scandal is active', () => {
    const clean = makeState();
    const scandalous = makeState({ scandals: [{ id: 's1', politicianId: 'player', tier: 'medium', turn: 1, status: 'unresolved' }] });
    expect(computeEventWeight(scandalFollowUp, scandalous)).toBeGreaterThan(computeEventWeight(scandalFollowUp, clean));
  });

  it('weights civil-unrest events higher when approval is low', () => {
    const popular = makeState({ politicians: [makePlayer(70)] });
    const unpopular = makeState({ politicians: [makePlayer(15)] });
    expect(computeEventWeight(unrest, unpopular)).toBeGreaterThan(computeEventWeight(unrest, popular));
  });

  it('leaves unrelated categories at their base weight', () => {
    const fragile = makeState({ economy: { gdpGrowth: -1, inflation: 3, unemployment: 5, debtToGdp: 60, budgetBalance: -2, pendingEffects: [] } });
    expect(computeEventWeight(unrest, fragile)).toBe(unrest.baseWeight);
  });

  it('weights natural-disaster events higher with more accumulated pollution', () => {
    const disaster: CrisisEventDef = { id: 'flood', category: 'natural_disaster', title: 'Flood', description: 'desc', baseWeight: 10 };
    const clean = makeState({ environment: { pollutionIndex: 0, renewableShare: 20, energyPolicy: 'balanced', greenInvestmentCapability: 20 } });
    const polluted = makeState({ environment: { pollutionIndex: 100, renewableShare: 20, energyPolicy: 'balanced', greenInvestmentCapability: 20 } });
    expect(computeEventWeight(disaster, polluted)).toBeGreaterThan(computeEventWeight(disaster, clean));
  });
});

describe('rollForEvent', () => {
  const defs: CrisisEventDef[] = [
    { id: 'a', category: 'natural_disaster', title: 'A', description: '', baseWeight: 1 },
    { id: 'b', category: 'security_incident', title: 'B', description: '', baseWeight: 1 },
  ];

  it('returns null when no defs are given', () => {
    expect(rollForEvent([], makeState(), new SeededRng(1))).toBeNull();
  });

  it('never fires when chance is 0', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(rollForEvent(defs, makeState(), new SeededRng(seed), 0)).toBeNull();
    }
  });

  it('always fires when chance is 1', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(rollForEvent(defs, makeState(), new SeededRng(seed), 1)).not.toBeNull();
    }
  });

  it('is deterministic for a given rng state', () => {
    const a = rollForEvent(defs, makeState(), new SeededRng(555), 0.5);
    const b = rollForEvent(defs, makeState(), new SeededRng(555), 0.5);
    expect(a).toEqual(b);
  });
});

describe('applyCrisisEvent', () => {
  it('applies the economy effect immediately', () => {
    const state = makeState();
    const def: CrisisEventDef = {
      id: 'quake',
      category: 'natural_disaster',
      title: 'Earthquake',
      description: 'A major earthquake strikes.',
      baseWeight: 1,
      economyEffect: { gdpGrowth: -1.5 },
    };
    const next = applyCrisisEvent(state, def);
    expect(next.economy.gdpGrowth).toBeCloseTo(state.economy.gdpGrowth - 1.5);
  });

  it('pushes a decaying approval event onto the player', () => {
    const state = makeState();
    const def: CrisisEventDef = {
      id: 'scandal-followup',
      category: 'scandal',
      title: 'New Allegations',
      description: 'desc',
      baseWeight: 1,
      playerApprovalEffect: -20,
    };
    const next = applyCrisisEvent(state, def);
    const player = next.politicians.find((p) => p.isPlayer)!;
    expect(player.approvalEvents).toHaveLength(1);
    expect(player.approvalEvents[0].impact).toBe(-20);
    expect(player.approval.public).toBe(state.politicians[0].approval.public); // not applied until advanceApproval runs
  });

  it('adjusts foreign relations', () => {
    const state = makeState({ foreignRelations: { nordholm: 10 } });
    const def: CrisisEventDef = {
      id: 'incident',
      category: 'international_incident',
      title: 'Border Incident',
      description: 'desc',
      baseWeight: 1,
      foreignRelationEffect: { counterpartId: 'nordholm', delta: -15 },
    };
    const next = applyCrisisEvent(state, def);
    expect(next.foreignRelations.nordholm).toBe(-5);
  });

  it('appends a log entry stamped with the current turn', () => {
    const state = makeState({ turn: 42 });
    const def: CrisisEventDef = {
      id: 'flood',
      category: 'natural_disaster',
      title: 'Flooding',
      description: 'Heavy flooding in the delta region.',
      baseWeight: 1,
    };
    const next = applyCrisisEvent(state, def);
    expect(next.eventLog).toEqual([{ turn: 42, category: 'natural_disaster', title: 'Flooding', description: 'Heavy flooding in the delta region.' }]);
  });
});
