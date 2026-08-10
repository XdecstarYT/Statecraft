import type { RawResourceType } from '../../engine/models/types';

/**
 * Pre-authored raw resource definitions — abundanceWeight drives how
 * often a deposit of this type is generated (see engine/systems/mining.ts's
 * generateResourceDeposits), never picked at runtime from nothing.
 */
export interface RawResourceDefinition {
  id: RawResourceType;
  name: string;
  /** Relative frequency when generating deposits — higher is more common. */
  abundanceWeight: number;
}

export const RAW_RESOURCES: RawResourceDefinition[] = [
  { id: 'iron_ore', name: 'Iron Ore', abundanceWeight: 14 },
  { id: 'coal', name: 'Coal', abundanceWeight: 14 },
  { id: 'crude_oil', name: 'Crude Oil', abundanceWeight: 9 },
  { id: 'copper_ore', name: 'Copper Ore', abundanceWeight: 11 },
  { id: 'timber', name: 'Timber', abundanceWeight: 13 },
  { id: 'bauxite', name: 'Bauxite', abundanceWeight: 8 },
  { id: 'natural_gas', name: 'Natural Gas', abundanceWeight: 9 },
  { id: 'gold_ore', name: 'Gold Ore', abundanceWeight: 4 },
  { id: 'grain', name: 'Grain', abundanceWeight: 15 },
  { id: 'rare_earth_minerals', name: 'Rare Earth Minerals', abundanceWeight: 3 },
  { id: 'stone', name: 'Stone', abundanceWeight: 10 },
];
