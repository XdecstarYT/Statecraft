import { clamp } from '../ideology';
import type { SeededRng } from '../rng';
import type { CovertOperationType, EconomyDelta, MilitaryProfile } from '../models/types';

/**
 * A real spectrum of rising ambition: each operation type trades a bigger
 * potential payoff for a higher baseline detection risk and a harsher
 * penalty if the world traces it back to the player. Damage figures are
 * flat point reductions on the counterpart's MilitaryProfile fields;
 * relationBonusOnSuccess (coup only) reflects a friendlier government
 * taking power, applied independently of whether the operation was traced.
 */
export interface CovertOperationConfig {
  baseDetectionChance: number;
  budgetCost: number;
  counterpartStrengthDamage: number;
  counterpartTechDamage: number;
  techGainOnSuccess: number;
  relationBonusOnSuccess: number;
  relationPenaltyIfDetected: number;
}

export const COVERT_OPERATION_CONFIGS: Record<CovertOperationType, CovertOperationConfig> = {
  espionage: {
    baseDetectionChance: 0.1,
    budgetCost: -0.1,
    counterpartStrengthDamage: 0,
    counterpartTechDamage: 0,
    techGainOnSuccess: 2,
    relationBonusOnSuccess: 0,
    relationPenaltyIfDetected: -25,
  },
  sabotage: {
    baseDetectionChance: 0.25,
    budgetCost: -0.3,
    counterpartStrengthDamage: 8,
    counterpartTechDamage: 0,
    techGainOnSuccess: 0,
    relationBonusOnSuccess: 0,
    relationPenaltyIfDetected: -40,
  },
  destabilize: {
    baseDetectionChance: 0.3,
    budgetCost: -0.4,
    counterpartStrengthDamage: 4,
    counterpartTechDamage: 4,
    techGainOnSuccess: 0,
    relationBonusOnSuccess: 0,
    relationPenaltyIfDetected: -45,
  },
  coup: {
    baseDetectionChance: 0.45,
    budgetCost: -0.8,
    counterpartStrengthDamage: 25,
    counterpartTechDamage: 0,
    techGainOnSuccess: 0,
    relationBonusOnSuccess: 40,
    relationPenaltyIfDetected: -70,
  },
};

/**
 * 0.5 baseline, rising with the player's own intelligence-agency strength
 * — a well-funded agency executes cleaner operations, capped short of a
 * sure thing.
 */
export function computeOperationSuccessChance(intelligenceCapability: number): number {
  return clamp(0.5 + clamp(intelligenceCapability, 0, 100) / 200, 0.2, 0.9);
}

/**
 * Detection risk falls as the player's own tradecraft improves and rises
 * against a counterpart with a more sophisticated security apparatus
 * (approximated by their military tech level, the same proxy used
 * elsewhere for a nation's overall technical sophistication).
 */
export function computeOperationDetectionChance(
  type: CovertOperationType,
  intelligenceCapability: number,
  counterpartTechLevel: number
): number {
  const config = COVERT_OPERATION_CONFIGS[type];
  const capabilityFactor = 1 - clamp(intelligenceCapability, 0, 100) / 150; // 1 .. ~0.33
  const counterDefenseFactor = 0.6 + clamp(counterpartTechLevel, 0, 100) / 200; // 0.6 .. 1.1
  return clamp(config.baseDetectionChance * capabilityFactor * counterDefenseFactor, 0.03, 0.9);
}

export interface CovertOperationOutcome {
  success: boolean;
  detected: boolean;
  economyEffect: EconomyDelta;
  counterpartMilitaryDelta: Partial<MilitaryProfile>;
  relationDelta: number;
  techGain: number;
}

/**
 * Resolves one covert operation: success and detection are independent
 * seeded rolls, so a clean success, a traced success, an untraced failure,
 * and a traced failure are all real outcomes. The operation's running cost
 * always lands regardless of how it went; the intended damage/gain only
 * lands on success; the relation swing combines a detection penalty (if
 * traced) with a success bonus (coup only, if it landed) — both can apply
 * at once, since a coup that succeeds but gets traced back still installs
 * a friendlier government even as the world condemns the interference.
 */
export function attemptCovertOperation(
  type: CovertOperationType,
  intelligenceCapability: number,
  counterpartMilitary: MilitaryProfile,
  rng: SeededRng
): CovertOperationOutcome {
  const config = COVERT_OPERATION_CONFIGS[type];
  const successChance = computeOperationSuccessChance(intelligenceCapability);
  const detectionChance = computeOperationDetectionChance(type, intelligenceCapability, counterpartMilitary.techLevel);

  const success = rng.next() < successChance;
  const detected = rng.next() < detectionChance;

  const counterpartMilitaryDelta: Partial<MilitaryProfile> = success
    ? {
        strength: config.counterpartStrengthDamage === 0 ? 0 : -config.counterpartStrengthDamage,
        techLevel: config.counterpartTechDamage === 0 ? 0 : -config.counterpartTechDamage,
      }
    : {};

  let relationDelta = 0;
  if (detected) relationDelta += config.relationPenaltyIfDetected;
  if (success) relationDelta += config.relationBonusOnSuccess;

  return {
    success,
    detected,
    economyEffect: { budgetBalance: config.budgetCost },
    counterpartMilitaryDelta,
    relationDelta,
    techGain: success ? config.techGainOnSuccess : 0,
  };
}

/** Applies a covert operation's military delta to a counterpart's profile, floored at a token minimum rather than going negative. */
export function applyCovertMilitaryDelta(
  military: MilitaryProfile,
  delta: Partial<MilitaryProfile>
): MilitaryProfile {
  return {
    ...military,
    strength: Math.max(1, military.strength + (delta.strength ?? 0)),
    techLevel: Math.max(1, military.techLevel + (delta.techLevel ?? 0)),
  };
}

export type IntelligenceInvestmentTier = 'modest' | 'major';

export interface IntelligenceInvestmentConfig {
  budgetCost: number;
  capabilityGain: number;
}

export const INTELLIGENCE_INVESTMENT_TIERS: Record<IntelligenceInvestmentTier, IntelligenceInvestmentConfig> = {
  modest: { budgetCost: -0.2, capabilityGain: 8 },
  major: { budgetCost: -0.6, capabilityGain: 20 },
};

export interface IntelligenceInvestmentResult {
  capability: number;
  economyEffect: EconomyDelta;
}

/** Grows the player's own intelligence-agency capability at a real, immediate budget cost — the only way it rises. */
export function investInIntelligence(
  capability: number,
  tier: IntelligenceInvestmentTier
): IntelligenceInvestmentResult {
  const config = INTELLIGENCE_INVESTMENT_TIERS[tier];
  return {
    capability: clamp(capability + config.capabilityGain, 0, 100),
    economyEffect: { budgetBalance: config.budgetCost },
  };
}
