import { clamp } from '../ideology';
import type { SeededRng } from '../rng';
import type { CorruptionTier, ScandalResponse } from '../models/types';

/**
 * A real spectrum of rising risk and reward: each tier trades a bigger
 * payoff (favor banked with the target, budget impact) for a higher chance
 * of getting caught and a harsher hit if it happens.
 */
export interface CorruptionTierConfig {
  baseDetectionChance: number;
  severityMultiplier: number;
  favorGain: number;
  budgetImpact: number;
}

export const CORRUPTION_TIERS: Record<CorruptionTier, CorruptionTierConfig> = {
  // budgetImpact is in the same units as EconomyState.budgetBalance (percentage points of GDP).
  soft: { baseDetectionChance: 0.08, severityMultiplier: 1, favorGain: 2, budgetImpact: -0.05 },
  medium: { baseDetectionChance: 0.18, severityMultiplier: 2, favorGain: 4, budgetImpact: -0.15 },
  hard: { baseDetectionChance: 0.35, severityMultiplier: 4, favorGain: 8, budgetImpact: -0.4 },
};

/**
 * Detection chance rises for careless (low-Integrity) actors and under
 * active scrutiny (an investigative journalist, a hostile committee).
 * `actorIntegrity` is the 1-10 attribute scale; `investigativePressure` is
 * 0 (no scrutiny) .. 1 (actively being investigated); `detectionMultiplier`
 * (from the difficulty setting) scales the whole result.
 */
export function computeDetectionChance(
  tier: CorruptionTier,
  actorIntegrity: number,
  investigativePressure: number,
  detectionMultiplier = 1
): number {
  const base = CORRUPTION_TIERS[tier].baseDetectionChance;
  const integrityFactor = (10 - clamp(actorIntegrity, 1, 10)) / 10;
  const chance = (base + integrityFactor * 0.25 + clamp(investigativePressure, 0, 1) * 0.3) * detectionMultiplier;
  return clamp(chance, 0, 0.95);
}

export interface CorruptionAttemptResult {
  detected: boolean;
  favorGain: number;
  budgetImpact: number;
}

/** Rolls the seeded dice for whether a corrupt act gets caught. */
export function attemptCorruptionAction(
  tier: CorruptionTier,
  actorIntegrity: number,
  investigativePressure: number,
  rng: SeededRng,
  detectionMultiplier = 1
): CorruptionAttemptResult {
  const config = CORRUPTION_TIERS[tier];
  const chance = computeDetectionChance(tier, actorIntegrity, investigativePressure, detectionMultiplier);
  const detected = rng.next() < chance;
  return { detected, favorGain: config.favorGain, budgetImpact: config.budgetImpact };
}

/**
 * How the player handles being confronted changes the severity: admitting
 * fault draws a smaller, shorter-lived hit than denying and later being
 * proven wrong; scapegoating splits the difference but risks the target's
 * relationship.
 */
const RESPONSE_MULTIPLIER: Record<ScandalResponse, number> = {
  admit: 0.6,
  scapegoat: 0.85,
  deny: 1.3,
};

/** Negative public-approval impact of a discovered corrupt act, tier and response scaled. */
export function computeScandalSeverity(tier: CorruptionTier, response: ScandalResponse): number {
  const base = -8 * CORRUPTION_TIERS[tier].severityMultiplier;
  return base * RESPONSE_MULTIPLIER[response];
}
