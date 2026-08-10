import { describe, expect, it } from 'vitest';
import type { Factory, ManufacturingRecipe, RawResourceType } from '../models/types';
import {
  FACTORY_UPGRADE_COST,
  MAX_FACTORY_TIER,
  buildFactory,
  computeCapacityBatches,
  computeFactoryOperatingCost,
  computeSupplyBatches,
  processFactoryTurn,
  upgradeFactory,
} from './manufacturing';

const RECIPE: ManufacturingRecipe = {
  id: 'recipe-steel',
  outputGood: 'steel',
  outputUnitsPerBatch: 5,
  batchesPerTurnAtTier1: 4,
  inputs: [
    { resource: 'iron_ore', unitsPerBatch: 3 },
    { resource: 'coal', unitsPerBatch: 2 },
  ],
};

function makeFactory(overrides: Partial<Factory> = {}): Factory {
  return {
    id: 'f1',
    locationId: 'province-1',
    locationType: 'domestic',
    recipeId: 'recipe-steel',
    ownership: 'state',
    tier: 1,
    turnBuilt: 1,
    ...overrides,
  };
}

describe('buildFactory / upgradeFactory', () => {
  it('builds a fresh tier-1 factory', () => {
    const factory = buildFactory('f1', 'province-1', 'domestic', 'recipe-steel', 'private', 3);
    expect(factory.tier).toBe(1);
    expect(factory.ownership).toBe('private');
    expect(factory.turnBuilt).toBe(3);
    expect(factory.recipeId).toBe('recipe-steel');
  });

  it('upgrades increase tier up to the max', () => {
    let factory = buildFactory('f1', 'province-1', 'domestic', 'recipe-steel', 'state', 1);
    factory = upgradeFactory(factory);
    expect(factory.tier).toBe(2);
    factory = upgradeFactory(factory);
    expect(factory.tier).toBe(MAX_FACTORY_TIER);
    factory = upgradeFactory(factory);
    expect(factory.tier).toBe(MAX_FACTORY_TIER);
  });

  it('upgrade costs are defined for every tier above 1', () => {
    expect(FACTORY_UPGRADE_COST[2]).toBeGreaterThan(0);
    expect(FACTORY_UPGRADE_COST[3]).toBeGreaterThan(FACTORY_UPGRADE_COST[2]);
  });
});

describe('computeCapacityBatches', () => {
  it('scales with factory tier', () => {
    const tier1 = computeCapacityBatches(makeFactory({ tier: 1 }), RECIPE);
    const tier3 = computeCapacityBatches(makeFactory({ tier: 3 }), RECIPE);
    expect(tier1).toBe(4);
    expect(tier3).toBe(12);
  });
});

describe('computeSupplyBatches', () => {
  it('is bottlenecked by the scarcest input', () => {
    const stockpile: Record<RawResourceType, number> = { iron_ore: 9, coal: 100 } as Record<RawResourceType, number>;
    expect(computeSupplyBatches(RECIPE, stockpile)).toBe(3);
  });

  it('is zero when an input is entirely missing from the stockpile', () => {
    const stockpile: Record<RawResourceType, number> = { iron_ore: 100 } as Record<RawResourceType, number>;
    expect(computeSupplyBatches(RECIPE, stockpile)).toBe(0);
  });

  it('floors partial batches rather than rounding', () => {
    const stockpile: Record<RawResourceType, number> = { iron_ore: 10, coal: 10 } as Record<RawResourceType, number>;
    expect(computeSupplyBatches(RECIPE, stockpile)).toBe(3);
  });
});

describe('processFactoryTurn', () => {
  it('runs at full capacity when supply is plentiful', () => {
    const factory = makeFactory({ tier: 1 });
    const stockpile: Record<RawResourceType, number> = { iron_ore: 1000, coal: 1000 } as Record<RawResourceType, number>;
    const result = processFactoryTurn(factory, RECIPE, stockpile);
    expect(result.batchesRun).toBe(4);
    expect(result.consumed.iron_ore).toBe(12);
    expect(result.consumed.coal).toBe(8);
    expect(result.outputProduced).toBe(20);
  });

  it('caps at supply when supply is the binding constraint', () => {
    const factory = makeFactory({ tier: 3 });
    const stockpile: Record<RawResourceType, number> = { iron_ore: 6, coal: 1000 } as Record<RawResourceType, number>;
    const result = processFactoryTurn(factory, RECIPE, stockpile);
    expect(result.batchesRun).toBe(2);
    expect(result.consumed.iron_ore).toBe(6);
    expect(result.outputProduced).toBe(10);
  });

  it('runs zero batches and sits idle with no supply', () => {
    const factory = makeFactory();
    const stockpile: Record<RawResourceType, number> = { iron_ore: 0, coal: 0 } as Record<RawResourceType, number>;
    const result = processFactoryTurn(factory, RECIPE, stockpile);
    expect(result.batchesRun).toBe(0);
    expect(result.outputProduced).toBe(0);
    expect(result.consumed.iron_ore).toBe(0);
  });
});

describe('computeFactoryOperatingCost', () => {
  it('scales with tier', () => {
    const tier1 = computeFactoryOperatingCost(makeFactory({ tier: 1 }));
    const tier3 = computeFactoryOperatingCost(makeFactory({ tier: 3 }));
    expect(tier3).toBe(tier1 * 3);
  });
});
