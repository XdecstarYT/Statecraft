import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import type { ProcessedGoodType, RawResourceType } from '../models/types';

/**
 * MARKET — prices drift each turn around a base price according to real
 * supply pressure (how much of the national stockpile is sitting unsold
 * relative to a reference level) plus a touch of seeded noise, so flooding
 * the market with a resource measurably depresses what the next unit sells
 * for, and scarcity measurably raises it.
 */

export type MarketGoodType = RawResourceType | ProcessedGoodType;

const MIN_PRICE_MULTIPLIER = 0.4;
const MAX_PRICE_MULTIPLIER = 1.8;
const SUPPLY_PRESSURE_STRENGTH = 1.0;
const PRICE_NOISE_RANGE = 0.05;
export const REFERENCE_STOCKPILE = 500;

/** Multiplier on the base price purely from how much stock is on hand relative to a reference level — high stock pushes it down, scarcity pushes it up. */
export function computeSupplyPressureMultiplier(
  stockpileLevel: number,
  referenceLevel: number = REFERENCE_STOCKPILE
): number {
  const ratio = stockpileLevel / referenceLevel;
  return clamp(1 + SUPPLY_PRESSURE_STRENGTH * (1 - ratio), MIN_PRICE_MULTIPLIER, MAX_PRICE_MULTIPLIER);
}

/** One turn's price for a single good: base price scaled by supply pressure, plus a touch of seeded noise. */
export function updateMarketPrice(
  basePrice: number,
  stockpileLevel: number,
  rng: SeededRng,
  referenceLevel: number = REFERENCE_STOCKPILE
): number {
  const multiplier = computeSupplyPressureMultiplier(stockpileLevel, referenceLevel);
  const noise = 1 + (rng.next() * 2 - 1) * PRICE_NOISE_RANGE;
  return Math.max(0.01, basePrice * multiplier * noise);
}

/** Recomputes every price in the market from current stockpile totals — call once per turn. */
export function updateAllMarketPrices(
  basePrices: Record<MarketGoodType, number>,
  stockpileLevels: Partial<Record<MarketGoodType, number>>,
  rng: SeededRng
): Record<MarketGoodType, number> {
  const updated = {} as Record<MarketGoodType, number>;
  for (const good of Object.keys(basePrices) as MarketGoodType[]) {
    updated[good] = updateMarketPrice(basePrices[good], stockpileLevels[good] ?? 0, rng);
  }
  return updated;
}

export interface SaleResult {
  unitsSold: number;
  revenue: number;
}

/** Sells up to `requestedUnits` from a stockpile at the current price — capped by whatever's actually on hand. */
export function sellFromStockpile(requestedUnits: number, availableUnits: number, price: number): SaleResult {
  const unitsSold = clamp(Math.min(requestedUnits, availableUnits), 0, availableUnits);
  return { unitsSold, revenue: unitsSold * price };
}
