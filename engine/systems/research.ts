import { clamp } from '../ideology';
import type { EconomyDelta, ResearchState, TechNode } from '../models/types';

/**
 * TECHNOLOGY & RESEARCH — invested capability (same investable-tier pattern
 * as military/logistics/intelligence) generates research points every turn;
 * points accumulate toward unlocking pre-authored tech-tree nodes gated by
 * prerequisites (see content/research/techTree.ts), each with a real
 * one-time economic payoff on unlock.
 */

export type ResearchInvestmentTier = 'modest' | 'major';

export interface ResearchInvestmentConfig {
  budgetCost: number;
  capabilityGain: number;
}

export const RESEARCH_INVESTMENT_TIERS: Record<ResearchInvestmentTier, ResearchInvestmentConfig> = {
  modest: { budgetCost: -0.25, capabilityGain: 8 },
  major: { budgetCost: -0.75, capabilityGain: 22 },
};

export interface ResearchInvestmentResult {
  research: ResearchState;
  economyEffect: EconomyDelta;
}

export function investInResearch(research: ResearchState, tier: ResearchInvestmentTier): ResearchInvestmentResult {
  const config = RESEARCH_INVESTMENT_TIERS[tier];
  return {
    research: { ...research, capability: clamp(research.capability + config.capabilityGain, 0, 100) },
    economyEffect: { budgetBalance: config.budgetCost },
  };
}

const BASE_POINTS_PER_TURN = 2;
const CAPABILITY_POINTS_SCALE = 0.3;

/** Research points generated this turn — a baseline trickle plus a scaling bonus from invested capability. */
export function computeResearchPointsPerTurn(research: ResearchState): number {
  return BASE_POINTS_PER_TURN + research.capability * CAPABILITY_POINTS_SCALE;
}

export function advanceResearchPoints(research: ResearchState): ResearchState {
  return { ...research, accumulatedPoints: research.accumulatedPoints + computeResearchPointsPerTurn(research) };
}

/** A tech is available once every prerequisite is already unlocked and it isn't unlocked itself already. */
export function isTechAvailable(tech: TechNode, unlockedTechIds: string[]): boolean {
  return !unlockedTechIds.includes(tech.id) && tech.prerequisites.every((p) => unlockedTechIds.includes(p));
}

export function canAffordTech(tech: TechNode, accumulatedPoints: number): boolean {
  return accumulatedPoints >= tech.cost;
}

export interface UnlockTechResult {
  research: ResearchState;
  economyEffect: EconomyDelta;
}

/** Spends the accumulated points and records the unlock — caller is responsible for checking isTechAvailable/canAffordTech first. */
export function unlockTech(research: ResearchState, tech: TechNode): UnlockTechResult {
  return {
    research: {
      ...research,
      accumulatedPoints: research.accumulatedPoints - tech.cost,
      unlockedTechIds: [...research.unlockedTechIds, tech.id],
    },
    economyEffect: tech.economyEffect,
  };
}
