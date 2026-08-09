import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import type { CorruptionTier } from '../models/types';

/**
 * PERSONAL WEALTH & CONFLICT-OF-INTEREST — corrupt acts don't just bank
 * favors and dent the budget, they personally enrich the actor. That
 * wealth is a standing liability: the further it runs past what a
 * legislator's salary could plausibly explain, the greater the ongoing
 * chance a conflict-of-interest scandal breaks on its own, independent of
 * any single corrupt act's own detection roll.
 */

export const BASE_PERSONAL_WEALTH = 50;

export const WEALTH_TIER_GAIN: Record<CorruptionTier, number> = {
  soft: 5,
  medium: 15,
  hard: 40,
};

export const WEALTH_SCANDAL_THRESHOLD = 200;

const MAX_WEALTH_SCANDAL_CHANCE_PER_TURN = 0.15;

/** 0..1 — the ongoing per-turn risk of an unprompted conflict-of-interest scandal, given standing wealth. Zero at or below the threshold. */
export function computeConflictOfInterestRisk(wealth: number, threshold: number = WEALTH_SCANDAL_THRESHOLD): number {
  if (wealth <= threshold || threshold <= 0) return 0;
  return clamp((wealth - threshold) / threshold, 0, 1) * MAX_WEALTH_SCANDAL_CHANCE_PER_TURN;
}

/** Rolls the seeded dice for whether standing wealth alone triggers a scandal this turn. */
export function rollForWealthScandal(wealth: number, rng: SeededRng, threshold: number = WEALTH_SCANDAL_THRESHOLD): boolean {
  return rng.next() < computeConflictOfInterestRisk(wealth, threshold);
}
