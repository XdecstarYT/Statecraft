import type { Factory, ManufacturingRecipe, RawResourceType } from '../models/types';

/**
 * MANUFACTURING — factories convert raw resources into one finished good
 * per recipe. Throughput is capped by two independent things each turn:
 * the factory's own tier (built capacity) and whatever's actually in the
 * national raw-resource stockpile (real supply — a factory can be fully
 * built out and still sit idle on a bad logistics turn).
 */

export const MAX_FACTORY_TIER = 3;

export function buildFactory(
  id: string,
  locationId: string,
  locationType: Factory['locationType'],
  recipeId: string,
  ownership: Factory['ownership'],
  turn: number
): Factory {
  return { id, locationId, locationType, recipeId, ownership, tier: 1, turnBuilt: turn };
}

export function upgradeFactory(factory: Factory): Factory {
  return { ...factory, tier: Math.min(MAX_FACTORY_TIER, factory.tier + 1) };
}

/** How many batches/turn this factory's built-out capacity allows, ignoring supply. */
export function computeCapacityBatches(factory: Factory, recipe: ManufacturingRecipe): number {
  return factory.tier * recipe.batchesPerTurnAtTier1;
}

/** How many batches the currently-available stockpile can actually supply, bottlenecked by the scarcest input. */
export function computeSupplyBatches(
  recipe: ManufacturingRecipe,
  availableStockpile: Record<RawResourceType, number>
): number {
  let maxBatches = Infinity;
  for (const input of recipe.inputs) {
    const available = availableStockpile[input.resource] ?? 0;
    maxBatches = Math.min(maxBatches, Math.floor(available / input.unitsPerBatch));
  }
  return Number.isFinite(maxBatches) ? Math.max(0, maxBatches) : 0;
}

export interface FactoryProcessResult {
  batchesRun: number;
  consumed: Partial<Record<RawResourceType, number>>;
  outputProduced: number;
}

/**
 * Resolves one factory's turn: runs as many batches as capacity and real
 * available supply both allow (whichever is smaller), consuming inputs
 * and producing output accordingly. A factory with no supply this turn
 * simply runs zero batches — no backlog, no debt, just idle capacity.
 */
export function processFactoryTurn(
  factory: Factory,
  recipe: ManufacturingRecipe,
  availableStockpile: Record<RawResourceType, number>
): FactoryProcessResult {
  const batchesRun = Math.min(computeCapacityBatches(factory, recipe), computeSupplyBatches(recipe, availableStockpile));

  const consumed: Partial<Record<RawResourceType, number>> = {};
  for (const input of recipe.inputs) {
    consumed[input.resource] = input.unitsPerBatch * batchesRun;
  }

  return { batchesRun, consumed, outputProduced: batchesRun * recipe.outputUnitsPerBatch };
}

/** Same wealth-scale units as mining.ts's build/upgrade costs — see the note there on how ownership routes this to budget vs personal wealth. */
export const FACTORY_BUILD_COST = 80;
export const FACTORY_UPGRADE_COST: Record<number, number> = { 2: 110, 3: 190 };

/** Per-turn upkeep, scales with tier — same wealth-scale units as the build cost. */
export function computeFactoryOperatingCost(factory: Factory): number {
  return factory.tier * 8;
}
