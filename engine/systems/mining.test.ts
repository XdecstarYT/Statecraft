import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Mine, ResourceDeposit } from '../models/types';
import {
  MAX_MINE_TIER,
  MINE_UPGRADE_COST,
  buildMine,
  computeExtractionRate,
  computeMineOperatingCost,
  extractFromMine,
  generateResourceDeposits,
  isDepositExhausted,
  upgradeMine,
  type RawResourceWeight,
} from './mining';

const RESOURCES: RawResourceWeight[] = [
  { id: 'iron_ore', abundanceWeight: 10 },
  { id: 'coal', abundanceWeight: 10 },
  { id: 'gold_ore', abundanceWeight: 1 },
];

function makeDeposit(overrides: Partial<ResourceDeposit> = {}): ResourceDeposit {
  return {
    id: 'd1',
    resource: 'iron_ore',
    locationId: 'province-1',
    locationType: 'domestic',
    richness: 100,
    remainingReserves: 1000,
    ...overrides,
  };
}

function makeMine(overrides: Partial<Mine> = {}): Mine {
  return { id: 'm1', depositId: 'd1', ownership: 'state', tier: 1, turnBuilt: 1, ...overrides };
}

describe('generateResourceDeposits', () => {
  it('gives every domestic location at least one deposit', () => {
    const deposits = generateResourceDeposits(['p1', 'p2', 'p3'], [], RESOURCES, new SeededRng(1));
    for (const p of ['p1', 'p2', 'p3']) {
      expect(deposits.some((d) => d.locationId === p)).toBe(true);
    }
  });

  it('marks domestic deposits as domestic and foreign as foreign', () => {
    const deposits = generateResourceDeposits(['p1'], Array.from({ length: 20 }, (_, i) => `nation-${i}`), RESOURCES, new SeededRng(2));
    const domestic = deposits.filter((d) => d.locationId === 'p1');
    expect(domestic.every((d) => d.locationType === 'domestic')).toBe(true);
    const foreign = deposits.filter((d) => d.locationType === 'foreign');
    expect(foreign.length).toBeGreaterThan(0);
    expect(foreign.length).toBeLessThan(20);
  });

  it('does not guarantee every foreign nation a deposit', () => {
    const deposits = generateResourceDeposits([], Array.from({ length: 30 }, (_, i) => `nation-${i}`), RESOURCES, new SeededRng(3));
    expect(deposits.length).toBeLessThan(30);
  });

  it('is deterministic for a fixed seed', () => {
    const a = generateResourceDeposits(['p1', 'p2'], ['n1', 'n2'], RESOURCES, new SeededRng(9));
    const b = generateResourceDeposits(['p1', 'p2'], ['n1', 'n2'], RESOURCES, new SeededRng(9));
    expect(a).toEqual(b);
  });

  it('returns nothing given no locations', () => {
    expect(generateResourceDeposits([], [], RESOURCES, new SeededRng(1))).toEqual([]);
  });

  it('assigns unique ids to every deposit', () => {
    const deposits = generateResourceDeposits(['p1', 'p2', 'p3', 'p4'], ['n1', 'n2', 'n3'], RESOURCES, new SeededRng(5));
    const ids = deposits.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('computeExtractionRate', () => {
  it('scales with mine tier', () => {
    const deposit = makeDeposit({ richness: 100 });
    const tier1 = computeExtractionRate(makeMine({ tier: 1 }), deposit);
    const tier3 = computeExtractionRate(makeMine({ tier: 3 }), deposit);
    expect(tier3).toBe(tier1 * 3);
  });

  it('scales with deposit richness', () => {
    const mine = makeMine({ tier: 1 });
    const rich = computeExtractionRate(mine, makeDeposit({ richness: 100 }));
    const poor = computeExtractionRate(mine, makeDeposit({ richness: 50 }));
    expect(rich).toBe(poor * 2);
  });
});

describe('buildMine / upgradeMine', () => {
  it('builds a fresh tier-1 mine', () => {
    const mine = buildMine('m1', 'd1', 'private', 5);
    expect(mine.tier).toBe(1);
    expect(mine.ownership).toBe('private');
    expect(mine.turnBuilt).toBe(5);
  });

  it('upgrades increase tier up to the max', () => {
    let mine = buildMine('m1', 'd1', 'state', 1);
    mine = upgradeMine(mine);
    expect(mine.tier).toBe(2);
    mine = upgradeMine(mine);
    expect(mine.tier).toBe(MAX_MINE_TIER);
    mine = upgradeMine(mine);
    expect(mine.tier).toBe(MAX_MINE_TIER);
  });

  it('upgrade costs are defined for every tier above 1', () => {
    expect(MINE_UPGRADE_COST[2]).toBeGreaterThan(0);
    expect(MINE_UPGRADE_COST[3]).toBeGreaterThan(MINE_UPGRADE_COST[2]);
  });
});

describe('extractFromMine', () => {
  it('extracts the full rate when reserves are plentiful', () => {
    const mine = makeMine({ tier: 1 });
    const deposit = makeDeposit({ richness: 100, remainingReserves: 1000 });
    const { extracted, deposit: after } = extractFromMine(mine, deposit);
    expect(extracted).toBe(computeExtractionRate(mine, deposit));
    expect(after.remainingReserves).toBe(1000 - extracted);
  });

  it('caps extraction at whatever reserves remain', () => {
    const mine = makeMine({ tier: 3 });
    const deposit = makeDeposit({ richness: 100, remainingReserves: 5 });
    const { extracted, deposit: after } = extractFromMine(mine, deposit);
    expect(extracted).toBe(5);
    expect(after.remainingReserves).toBe(0);
  });

  it('extracts nothing from an exhausted deposit', () => {
    const mine = makeMine();
    const deposit = makeDeposit({ remainingReserves: 0 });
    const { extracted } = extractFromMine(mine, deposit);
    expect(extracted).toBe(0);
  });
});

describe('isDepositExhausted', () => {
  it('is false with reserves remaining', () => {
    expect(isDepositExhausted(makeDeposit({ remainingReserves: 1 }))).toBe(false);
  });

  it('is true at zero reserves', () => {
    expect(isDepositExhausted(makeDeposit({ remainingReserves: 0 }))).toBe(true);
  });
});

describe('computeMineOperatingCost', () => {
  it('scales with tier', () => {
    const tier1 = computeMineOperatingCost(makeMine({ tier: 1 }));
    const tier3 = computeMineOperatingCost(makeMine({ tier: 3 }));
    expect(tier3).toBe(tier1 * 3);
  });
});
