import { clamp } from '../ideology';
import type { EconomyDelta, SocialFundingTier, SocialPolicyState } from '../models/types';

/**
 * HEALTHCARE, EDUCATION & WELFARE — three independently-set funding tiers,
 * each carrying a real ongoing budget cost and implying a target for its
 * outcome indicator (life expectancy, literacy, poverty). Indicators move
 * toward that target a little each turn — sticky, not instant, same shape
 * as economy/approval drift elsewhere in the engine — and in turn feed a
 * bounded approval impact back to the player.
 */

interface FundingConfig {
  budgetCostPerTurn: number;
  target: number;
}

export const HEALTHCARE_FUNDING_CONFIG: Record<SocialFundingTier, FundingConfig> = {
  minimal: { budgetCostPerTurn: 0, target: 65 },
  standard: { budgetCostPerTurn: -0.15, target: 75 },
  generous: { budgetCostPerTurn: -0.35, target: 83 },
};

export const EDUCATION_FUNDING_CONFIG: Record<SocialFundingTier, FundingConfig> = {
  minimal: { budgetCostPerTurn: 0, target: 70 },
  standard: { budgetCostPerTurn: -0.15, target: 88 },
  generous: { budgetCostPerTurn: -0.35, target: 97 },
};

/** Poverty targets run the opposite direction — generous welfare implies a *lower* poverty rate. */
export const WELFARE_FUNDING_CONFIG: Record<SocialFundingTier, FundingConfig> = {
  minimal: { budgetCostPerTurn: 0, target: 25 },
  standard: { budgetCostPerTurn: -0.15, target: 14 },
  generous: { budgetCostPerTurn: -0.35, target: 6 },
};

export function setHealthcareFunding(state: SocialPolicyState, tier: SocialFundingTier): SocialPolicyState {
  return { ...state, healthcareFunding: tier };
}

export function setEducationFunding(state: SocialPolicyState, tier: SocialFundingTier): SocialPolicyState {
  return { ...state, educationFunding: tier };
}

export function setWelfareFunding(state: SocialPolicyState, tier: SocialFundingTier): SocialPolicyState {
  return { ...state, welfareFunding: tier };
}

const INDICATOR_DECAY_RATE = 0.08;

function moveToward(current: number, target: number, rate: number): number {
  return current + (target - current) * rate;
}

/** Nudges every outcome indicator toward whatever its current funding tier implies. */
export function advanceSocialIndicators(state: SocialPolicyState): SocialPolicyState {
  return {
    ...state,
    lifeExpectancy: clamp(
      moveToward(state.lifeExpectancy, HEALTHCARE_FUNDING_CONFIG[state.healthcareFunding].target, INDICATOR_DECAY_RATE),
      0,
      120
    ),
    literacyRate: clamp(
      moveToward(state.literacyRate, EDUCATION_FUNDING_CONFIG[state.educationFunding].target, INDICATOR_DECAY_RATE),
      0,
      100
    ),
    povertyRate: clamp(
      moveToward(state.povertyRate, WELFARE_FUNDING_CONFIG[state.welfareFunding].target, INDICATOR_DECAY_RATE),
      0,
      100
    ),
  };
}

/** The real, ongoing per-turn budget cost of the three funding tiers combined. */
export function computeSocialPolicyBudgetEffect(state: SocialPolicyState): EconomyDelta {
  return {
    budgetBalance:
      HEALTHCARE_FUNDING_CONFIG[state.healthcareFunding].budgetCostPerTurn +
      EDUCATION_FUNDING_CONFIG[state.educationFunding].budgetCostPerTurn +
      WELFARE_FUNDING_CONFIG[state.welfareFunding].budgetCostPerTurn,
  };
}

const APPROVAL_BASELINE = { lifeExpectancy: 75, literacyRate: 88, povertyRate: 14 };
const MAX_APPROVAL_IMPACT = 10;

/** A bounded approval-impact figure the caller can push as a decaying approval event — positive when outcomes beat the baseline, negative when they lag it. */
export function computeSocialPolicyApprovalImpact(state: SocialPolicyState): number {
  const healthTerm = (state.lifeExpectancy - APPROVAL_BASELINE.lifeExpectancy) / 10;
  const educationTerm = (state.literacyRate - APPROVAL_BASELINE.literacyRate) / 10;
  const povertyTerm = (APPROVAL_BASELINE.povertyRate - state.povertyRate) / 10;
  return clamp((healthTerm + educationTerm + povertyTerm) * 2, -MAX_APPROVAL_IMPACT, MAX_APPROVAL_IMPACT);
}
