import type { ProcessedGoodType, RawResourceType } from '../../engine/models/types';

/**
 * Base market prices, per unit, in abstract currency units. Raw resources
 * are deliberately priced well below the finished goods they refine into
 * (see recipes.ts's input quantities) — exporting raw ore is always worth
 * less than processing it first, a real incentive to build the factory
 * chain rather than just mine and dump.
 */
export const RAW_RESOURCE_BASE_PRICES: Record<RawResourceType, number> = {
  iron_ore: 2,
  coal: 1.5,
  crude_oil: 3,
  copper_ore: 2.5,
  timber: 1,
  bauxite: 2,
  natural_gas: 2.5,
  gold_ore: 40,
  grain: 1,
  rare_earth_minerals: 15,
  stone: 0.5,
};

export const PROCESSED_GOOD_BASE_PRICES: Record<ProcessedGoodType, number> = {
  steel: 8,
  refined_fuel: 6,
  copper_wire: 7,
  lumber: 3,
  aluminum: 9,
  electronics: 35,
  processed_food: 4,
  jewelry: 120,
  machinery: 25,
  chemicals: 12,
};
