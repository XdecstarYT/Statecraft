import type { ManufacturingRecipe } from '../../engine/models/types';

/**
 * Pre-authored manufacturing recipes — every finished good a factory can
 * produce, and exactly which raw resources (and how much of each) one
 * batch consumes. Deliberately kept to raw-resource inputs only (no
 * finished-good intermediates) so the production chain stays one level
 * deep: mine -> factory -> market.
 */
export const MANUFACTURING_RECIPES: ManufacturingRecipe[] = [
  {
    id: 'recipe-steel',
    outputGood: 'steel',
    outputUnitsPerBatch: 10,
    inputs: [
      { resource: 'iron_ore', unitsPerBatch: 15 },
      { resource: 'coal', unitsPerBatch: 8 },
    ],
    batchesPerTurnAtTier1: 4,
  },
  {
    id: 'recipe-refined-fuel',
    outputGood: 'refined_fuel',
    outputUnitsPerBatch: 10,
    inputs: [{ resource: 'crude_oil', unitsPerBatch: 12 }],
    batchesPerTurnAtTier1: 4,
  },
  {
    id: 'recipe-copper-wire',
    outputGood: 'copper_wire',
    outputUnitsPerBatch: 8,
    inputs: [{ resource: 'copper_ore', unitsPerBatch: 10 }],
    batchesPerTurnAtTier1: 4,
  },
  {
    id: 'recipe-lumber',
    outputGood: 'lumber',
    outputUnitsPerBatch: 10,
    inputs: [{ resource: 'timber', unitsPerBatch: 12 }],
    batchesPerTurnAtTier1: 5,
  },
  {
    id: 'recipe-aluminum',
    outputGood: 'aluminum',
    outputUnitsPerBatch: 8,
    inputs: [{ resource: 'bauxite', unitsPerBatch: 14 }],
    batchesPerTurnAtTier1: 3,
  },
  {
    id: 'recipe-electronics',
    outputGood: 'electronics',
    outputUnitsPerBatch: 5,
    inputs: [
      { resource: 'copper_ore', unitsPerBatch: 6 },
      { resource: 'rare_earth_minerals', unitsPerBatch: 4 },
    ],
    batchesPerTurnAtTier1: 3,
  },
  {
    id: 'recipe-processed-food',
    outputGood: 'processed_food',
    outputUnitsPerBatch: 12,
    inputs: [{ resource: 'grain', unitsPerBatch: 15 }],
    batchesPerTurnAtTier1: 5,
  },
  {
    id: 'recipe-jewelry',
    outputGood: 'jewelry',
    outputUnitsPerBatch: 3,
    inputs: [{ resource: 'gold_ore', unitsPerBatch: 5 }],
    batchesPerTurnAtTier1: 2,
  },
  {
    id: 'recipe-machinery',
    outputGood: 'machinery',
    outputUnitsPerBatch: 6,
    inputs: [
      { resource: 'iron_ore', unitsPerBatch: 10 },
      { resource: 'copper_ore', unitsPerBatch: 5 },
    ],
    batchesPerTurnAtTier1: 3,
  },
  {
    id: 'recipe-chemicals',
    outputGood: 'chemicals',
    outputUnitsPerBatch: 7,
    inputs: [
      { resource: 'crude_oil', unitsPerBatch: 8 },
      { resource: 'natural_gas', unitsPerBatch: 6 },
    ],
    batchesPerTurnAtTier1: 3,
  },
];
