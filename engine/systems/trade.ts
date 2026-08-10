import { clamp } from '../ideology';
import { applyImmediateEffect, queuePolicyEffect } from './economy';
import { adjustRelation } from './diplomacy';
import type { CommodityType, EconomyDelta, EconomyState, TradeDeal, TradeProfile } from '../models/types';

export const TRADE_DEAL_SIGNING_DELAY_TURNS = 2;

/** volume: units/turn flowing FROM the counterpart TO the player's country. Negative means the player exports instead. */
export function proposeTradeDeal(
  id: string,
  counterpartId: string,
  commodity: CommodityType,
  volume: number,
  tariff = 0
): TradeDeal {
  return {
    id,
    counterpartId,
    commodity,
    volume,
    tariff: clamp(tariff, 0, 1),
    status: 'proposed',
  };
}

/** Per-unit value of a commodity, in EconomyState-scale terms — refined goods are worth more per unit than raw ones. */
const COMMODITY_UNIT_VALUE: Record<CommodityType, number> = {
  energy: 0.015,
  food: 0.012,
  minerals: 0.014,
  manufactured: 0.02,
  technology: 0.03,
};

/**
 * A tariff always eats into the deal's real economic benefit (friction),
 * regardless of which direction goods are flowing — no free lunches.
 * Importing boosts growth (more goods available) at a budget cost (paying
 * for them); exporting boosts the budget (revenue) at a small growth cost
 * (goods leaving the economy).
 */
export function computeTradeDealEconomyEffect(deal: TradeDeal): EconomyDelta {
  const unitValue = COMMODITY_UNIT_VALUE[deal.commodity];
  const friction = 1 - clamp(deal.tariff, 0, 1);
  const netValue = deal.volume * unitValue * friction;

  if (deal.volume >= 0) {
    return { gdpGrowth: netValue, budgetBalance: -netValue * 0.4 };
  }
  return { budgetBalance: -netValue * 0.6, gdpGrowth: netValue * 0.15 };
}

function assertStatus(deal: TradeDeal, expected: TradeDeal['status']) {
  if (deal.status !== expected) {
    throw new Error(`Trade deal "${deal.id}" must be "${expected}" for this action, but is "${deal.status}"`);
  }
}

const RELATION_BONUS_PER_UNIT_VOLUME = 0.05;
const MAX_SIGNING_RELATION_BONUS = 8;

/** Bigger deals build more goodwill on signing, capped so no single deal dominates the relationship. */
export function computeTradeDealRelationBonus(deal: TradeDeal): number {
  return clamp(Math.abs(deal.volume) * RELATION_BONUS_PER_UNIT_VOLUME, 0, MAX_SIGNING_RELATION_BONUS);
}

/**
 * Signing queues the deal's economic effect with a short delay — a trade
 * deal doesn't move GDP the week it's inked — and gives relations an
 * immediate, deal-size-scaled bump: a real economic partnership is itself
 * a form of goodwill, not just an economic lever.
 */
export function signTradeDeal(
  deal: TradeDeal,
  economy: EconomyState,
  relations: Record<string, number>
): { deal: TradeDeal; economy: EconomyState; relations: Record<string, number> } {
  assertStatus(deal, 'proposed');
  const effect = computeTradeDealEconomyEffect(deal);
  return {
    deal: { ...deal, status: 'active' },
    economy: queuePolicyEffect(economy, effect, TRADE_DEAL_SIGNING_DELAY_TURNS),
    relations: adjustRelation(relations, deal.counterpartId, computeTradeDealRelationBonus(deal)),
  };
}

/** Changes an active deal's tariff — takes effect on its next queued effect, not retroactively. */
export function setTariff(deal: TradeDeal, tariff: number): TradeDeal {
  return { ...deal, tariff: clamp(tariff, 0, 1) };
}

export function cancelTradeDeal(deal: TradeDeal): TradeDeal {
  if (deal.status === 'cancelled') return deal;
  return { ...deal, status: 'cancelled' };
}

export const EMBARGO_RELATION_PENALTY = -35;
export const EMBARGO_ECONOMY_EFFECT: EconomyDelta = { budgetBalance: -0.2, gdpGrowth: -0.1 };

/**
 * A sharper break than a plain sanction: cancels every deal (proposed or
 * active) with the target and costs both relations and the economy
 * immediately — severing real trade ties, not just posturing.
 */
export function imposeEmbargo(
  counterpartId: string,
  tradeDeals: TradeDeal[],
  economy: EconomyState,
  relations: Record<string, number>
): { tradeDeals: TradeDeal[]; economy: EconomyState; relations: Record<string, number> } {
  return {
    tradeDeals: tradeDeals.map((d) => (d.counterpartId === counterpartId ? cancelTradeDeal(d) : d)),
    economy: applyImmediateEffect(economy, EMBARGO_ECONOMY_EFFECT),
    relations: adjustRelation(relations, counterpartId, EMBARGO_RELATION_PENALTY),
  };
}

/** production - consumption per commodity: positive means the country has a surplus to export, negative a deficit to import. */
export function computeNationalTradeBalance(trade: TradeProfile): Record<CommodityType, number> {
  const balance: Partial<Record<CommodityType, number>> = {};
  for (const commodity of Object.keys(trade.production) as CommodityType[]) {
    balance[commodity] = trade.production[commodity] - trade.consumption[commodity];
  }
  return balance as Record<CommodityType, number>;
}
