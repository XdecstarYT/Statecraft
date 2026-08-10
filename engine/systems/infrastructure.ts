import { clamp } from '../ideology';
import type { EconomyDelta, InfrastructureCategory, InfrastructureState } from '../models/types';

/**
 * PUBLIC INFRASTRUCTURE — four independently-investable categories that
 * decay a little on their own every turn without upkeep spending (nothing
 * maintains itself for free), and whose average quality is a real, if
 * modest, tailwind or drag on economic productivity and public approval.
 */

export type InfrastructureInvestmentTier = 'modest' | 'major';

interface InfrastructureInvestmentConfig {
  budgetCost: number;
  gain: number;
}

export const INFRASTRUCTURE_INVESTMENT_TIERS: Record<InfrastructureInvestmentTier, InfrastructureInvestmentConfig> = {
  modest: { budgetCost: -0.2, gain: 10 },
  major: { budgetCost: -0.6, gain: 25 },
};

export interface InfrastructureInvestmentResult {
  infrastructure: InfrastructureState;
  economyEffect: EconomyDelta;
}

/** Invests in a single category — the other three are untouched. */
export function investInInfrastructure(
  infrastructure: InfrastructureState,
  category: InfrastructureCategory,
  tier: InfrastructureInvestmentTier
): InfrastructureInvestmentResult {
  const config = INFRASTRUCTURE_INVESTMENT_TIERS[tier];
  return {
    infrastructure: { ...infrastructure, [category]: clamp(infrastructure[category] + config.gain, 0, 100) },
    economyEffect: { budgetBalance: config.budgetCost },
  };
}

const DECAY_PER_TURN = 0.6;

/** Every category quietly crumbles a little each turn without fresh investment — real upkeep, not a one-time purchase. */
export function advanceInfrastructureDecay(infrastructure: InfrastructureState): InfrastructureState {
  return {
    transport: clamp(infrastructure.transport - DECAY_PER_TURN, 0, 100),
    power: clamp(infrastructure.power - DECAY_PER_TURN, 0, 100),
    water: clamp(infrastructure.water - DECAY_PER_TURN, 0, 100),
    digital: clamp(infrastructure.digital - DECAY_PER_TURN, 0, 100),
  };
}

function computeAverageQuality(infrastructure: InfrastructureState): number {
  return (infrastructure.transport + infrastructure.power + infrastructure.water + infrastructure.digital) / 4;
}

const NEUTRAL_INFRASTRUCTURE_QUALITY = 50;
const MAX_INFRASTRUCTURE_GDP_EFFECT = 0.5;

/** Above-neutral infrastructure is a real productivity tailwind; crumbling infrastructure is a real drag. */
export function computeInfrastructureEconomyEffect(infrastructure: InfrastructureState): EconomyDelta {
  const avg = computeAverageQuality(infrastructure);
  return { gdpGrowth: ((avg - NEUTRAL_INFRASTRUCTURE_QUALITY) / NEUTRAL_INFRASTRUCTURE_QUALITY) * MAX_INFRASTRUCTURE_GDP_EFFECT };
}

const MAX_INFRASTRUCTURE_APPROVAL_IMPACT = 6;

/** Bounded approval impact from how the public actually experiences infrastructure quality day to day. */
export function computeInfrastructureApprovalImpact(infrastructure: InfrastructureState): number {
  const avg = computeAverageQuality(infrastructure);
  return clamp((avg - NEUTRAL_INFRASTRUCTURE_QUALITY) / 10, -MAX_INFRASTRUCTURE_APPROVAL_IMPACT, MAX_INFRASTRUCTURE_APPROVAL_IMPACT);
}
