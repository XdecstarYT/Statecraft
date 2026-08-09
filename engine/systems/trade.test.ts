import { describe, expect, it } from 'vitest';
import type { EconomyState, TradeProfile } from '../models/types';
import {
  cancelTradeDeal,
  computeNationalTradeBalance,
  computeTradeDealEconomyEffect,
  proposeTradeDeal,
  setTariff,
  signTradeDeal,
} from './trade';

const BASE_ECONOMY: EconomyState = {
  gdpGrowth: 2,
  inflation: 3,
  unemployment: 5,
  debtToGdp: 50,
  budgetBalance: 0,
  pendingEffects: [],
};

describe('proposeTradeDeal', () => {
  it('starts in "proposed" status with the tariff clamped to 0..1', () => {
    const deal = proposeTradeDeal('d1', 'rival', 'energy', 100, 1.5);
    expect(deal.status).toBe('proposed');
    expect(deal.tariff).toBe(1);
  });
});

describe('computeTradeDealEconomyEffect', () => {
  it('importing (positive volume) boosts growth and costs budget', () => {
    const deal = proposeTradeDeal('d1', 'rival', 'technology', 100, 0);
    const effect = computeTradeDealEconomyEffect(deal);
    expect(effect.gdpGrowth).toBeGreaterThan(0);
    expect(effect.budgetBalance).toBeLessThan(0);
  });

  it('exporting (negative volume) boosts the budget and drags growth a little', () => {
    const deal = proposeTradeDeal('d1', 'rival', 'technology', -100, 0);
    const effect = computeTradeDealEconomyEffect(deal);
    expect(effect.budgetBalance).toBeGreaterThan(0);
    expect(effect.gdpGrowth).toBeLessThan(0);
  });

  it('a tariff always shrinks the magnitude of the effect', () => {
    const noTariff = computeTradeDealEconomyEffect(proposeTradeDeal('d1', 'rival', 'energy', 100, 0));
    const withTariff = computeTradeDealEconomyEffect(proposeTradeDeal('d2', 'rival', 'energy', 100, 0.5));
    expect(Math.abs(withTariff.gdpGrowth!)).toBeLessThan(Math.abs(noTariff.gdpGrowth!));
  });

  it('a full 100% tariff reduces the effect to zero', () => {
    const deal = proposeTradeDeal('d1', 'rival', 'energy', 100, 1);
    const effect = computeTradeDealEconomyEffect(deal);
    expect(effect.gdpGrowth).toBeCloseTo(0, 10);
  });

  it('higher-value commodities move the economy more for the same volume', () => {
    const techEffect = computeTradeDealEconomyEffect(proposeTradeDeal('d1', 'rival', 'technology', 100, 0));
    const foodEffect = computeTradeDealEconomyEffect(proposeTradeDeal('d2', 'rival', 'food', 100, 0));
    expect(techEffect.gdpGrowth!).toBeGreaterThan(foodEffect.gdpGrowth!);
  });
});

describe('signTradeDeal', () => {
  it('moves the deal to "active" and queues its economic effect with a delay', () => {
    const deal = proposeTradeDeal('d1', 'rival', 'energy', 100, 0);
    const { deal: signed, economy } = signTradeDeal(deal, BASE_ECONOMY);
    expect(signed.status).toBe('active');
    expect(economy.pendingEffects).toHaveLength(1);
    expect(economy.budgetBalance).toBe(BASE_ECONOMY.budgetBalance);
  });

  it('throws if the deal is not in "proposed" status', () => {
    const deal = { ...proposeTradeDeal('d1', 'rival', 'energy', 100, 0), status: 'active' as const };
    expect(() => signTradeDeal(deal, BASE_ECONOMY)).toThrow();
  });
});

describe('setTariff', () => {
  it('updates and clamps the tariff', () => {
    const deal = proposeTradeDeal('d1', 'rival', 'energy', 100, 0);
    expect(setTariff(deal, 0.3).tariff).toBe(0.3);
    expect(setTariff(deal, -1).tariff).toBe(0);
    expect(setTariff(deal, 5).tariff).toBe(1);
  });
});

describe('cancelTradeDeal', () => {
  it('sets status to cancelled', () => {
    const deal = proposeTradeDeal('d1', 'rival', 'energy', 100, 0);
    expect(cancelTradeDeal(deal).status).toBe('cancelled');
  });

  it('is idempotent', () => {
    const deal = cancelTradeDeal(proposeTradeDeal('d1', 'rival', 'energy', 100, 0));
    expect(cancelTradeDeal(deal).status).toBe('cancelled');
  });
});

describe('computeNationalTradeBalance', () => {
  it('is production minus consumption per commodity', () => {
    const trade: TradeProfile = {
      production: { energy: 100, food: 50, minerals: 30, manufactured: 20, technology: 10 },
      consumption: { energy: 40, food: 60, minerals: 30, manufactured: 50, technology: 5 },
    };
    const balance = computeNationalTradeBalance(trade);
    expect(balance.energy).toBe(60);
    expect(balance.food).toBe(-10);
    expect(balance.minerals).toBe(0);
    expect(balance.manufactured).toBe(-30);
    expect(balance.technology).toBe(5);
  });
});
