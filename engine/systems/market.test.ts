import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import {
  REFERENCE_STOCKPILE,
  computeSupplyPressureMultiplier,
  sellFromStockpile,
  updateAllMarketPrices,
  updateMarketPrice,
} from './market';
import type { MarketGoodType } from './market';

describe('computeSupplyPressureMultiplier', () => {
  it('is 1.0 exactly at the reference stockpile level', () => {
    expect(computeSupplyPressureMultiplier(REFERENCE_STOCKPILE)).toBeCloseTo(1.0, 5);
  });

  it('is above 1.0 when stock is below the reference level (scarcity raises price)', () => {
    expect(computeSupplyPressureMultiplier(0)).toBeGreaterThan(1.0);
  });

  it('is below 1.0 when stock is above the reference level (glut lowers price)', () => {
    expect(computeSupplyPressureMultiplier(REFERENCE_STOCKPILE * 3)).toBeLessThan(1.0);
  });

  it('is clamped within sane bounds even at extreme stockpile levels', () => {
    expect(computeSupplyPressureMultiplier(0)).toBeLessThanOrEqual(1.8);
    expect(computeSupplyPressureMultiplier(REFERENCE_STOCKPILE * 1000)).toBeGreaterThanOrEqual(0.4);
  });
});

describe('updateMarketPrice', () => {
  it('stays close to base price at the reference stockpile level', () => {
    const price = updateMarketPrice(10, REFERENCE_STOCKPILE, new SeededRng(1));
    expect(price).toBeGreaterThan(9);
    expect(price).toBeLessThan(11);
  });

  it('rises when stock is scarce', () => {
    const scarce = updateMarketPrice(10, 0, new SeededRng(1));
    const plentiful = updateMarketPrice(10, REFERENCE_STOCKPILE * 2, new SeededRng(1));
    expect(scarce).toBeGreaterThan(plentiful);
  });

  it('is deterministic for a fixed seed', () => {
    const a = updateMarketPrice(10, 200, new SeededRng(42));
    const b = updateMarketPrice(10, 200, new SeededRng(42));
    expect(a).toBe(b);
  });

  it('never goes to zero or negative', () => {
    const price = updateMarketPrice(0.01, REFERENCE_STOCKPILE * 1000, new SeededRng(1));
    expect(price).toBeGreaterThan(0);
  });
});

describe('updateAllMarketPrices', () => {
  it('produces a price for every base-price entry', () => {
    const basePrices = { iron_ore: 2, steel: 8 } as Record<MarketGoodType, number>;
    const stockpiles = { iron_ore: 500, steel: 100 };
    const updated = updateAllMarketPrices(basePrices, stockpiles, new SeededRng(7));
    expect(Object.keys(updated).sort()).toEqual(['iron_ore', 'steel']);
    expect(updated.iron_ore).toBeGreaterThan(0);
    expect(updated.steel).toBeGreaterThan(0);
  });

  it('defaults missing stockpile entries to zero (treated as scarce)', () => {
    const basePrices = { gold_ore: 40 } as Record<MarketGoodType, number>;
    const updated = updateAllMarketPrices(basePrices, {}, new SeededRng(7));
    expect(updated.gold_ore).toBeGreaterThan(40);
  });
});

describe('sellFromStockpile', () => {
  it('sells the full requested amount when stock is sufficient', () => {
    const result = sellFromStockpile(50, 200, 4);
    expect(result.unitsSold).toBe(50);
    expect(result.revenue).toBe(200);
  });

  it('caps units sold at whatever is actually available', () => {
    const result = sellFromStockpile(100, 30, 2);
    expect(result.unitsSold).toBe(30);
    expect(result.revenue).toBe(60);
  });

  it('sells nothing from an empty stockpile', () => {
    const result = sellFromStockpile(10, 0, 5);
    expect(result.unitsSold).toBe(0);
    expect(result.revenue).toBe(0);
  });
});
