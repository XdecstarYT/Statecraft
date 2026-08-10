import { clamp } from '../ideology';
import type { EconomyDelta, LogisticsNetwork } from '../models/types';

/**
 * LOGISTICS — a single investable national capability that determines what
 * fraction of everything extracted this turn actually reaches a factory or
 * the market instead of being lost in transit. Domestic shipments are
 * always more efficient than foreign ones; foreign shipments are further
 * degraded by poor relations with the source nation, and cut off entirely
 * during an active war with them — a real, felt consequence of foreign
 * extraction rather than a free lunch.
 */

export type LogisticsInvestmentTier = 'modest' | 'major';

export interface LogisticsInvestmentConfig {
  budgetCost: number;
  capabilityGain: number;
}

export const LOGISTICS_INVESTMENT_TIERS: Record<LogisticsInvestmentTier, LogisticsInvestmentConfig> = {
  modest: { budgetCost: -0.25, capabilityGain: 8 },
  major: { budgetCost: -0.75, capabilityGain: 22 },
};

export interface LogisticsInvestmentResult {
  network: LogisticsNetwork;
  economyEffect: EconomyDelta;
}

export function investInLogistics(
  network: LogisticsNetwork,
  tier: LogisticsInvestmentTier
): LogisticsInvestmentResult {
  const config = LOGISTICS_INVESTMENT_TIERS[tier];
  return {
    network: { capability: clamp(network.capability + config.capabilityGain, 0, 100) },
    economyEffect: { budgetBalance: config.budgetCost },
  };
}

const MIN_DOMESTIC_EFFICIENCY = 0.5;
const FOREIGN_EFFICIENCY_MULTIPLIER = 0.6;
const MIN_RELATION_FACTOR = 0.1;

/** 0.5..1.0 — how much of a domestic shipment survives transit, scaling with invested capability. */
export function computeDomesticEfficiency(network: LogisticsNetwork): number {
  return clamp(MIN_DOMESTIC_EFFICIENCY + network.capability / 200, 0, 1);
}

/**
 * Always worse than the domestic figure even at full relations and
 * capability (customs, distance, foreign infrastructure you don't
 * control), and scales down further with poor relations — though never
 * to a hard zero from relations alone, only an active war does that.
 */
export function computeForeignEfficiency(network: LogisticsNetwork, relation: number, atWar: boolean): number {
  if (atWar) return 0;
  const domestic = computeDomesticEfficiency(network);
  const relationFactor = clamp((relation + 100) / 200, MIN_RELATION_FACTOR, 1);
  return domestic * FOREIGN_EFFICIENCY_MULTIPLIER * relationFactor;
}

export function computeShipmentEfficiency(
  locationType: 'domestic' | 'foreign',
  network: LogisticsNetwork,
  relation: number,
  atWar: boolean
): number {
  return locationType === 'domestic'
    ? computeDomesticEfficiency(network)
    : computeForeignEfficiency(network, relation, atWar);
}

/** Applies transit efficiency to a raw extracted amount — what actually lands in the national stockpile this turn. */
export function shipResource(extracted: number, efficiency: number): number {
  return extracted * efficiency;
}
