import { clamp } from '../ideology';
import type { CrimeState, EconomyDelta, PolicingFundingTier } from '../models/types';

/**
 * CRIME & PUBLIC SAFETY — crime rate drifts (sticky, not instant — same
 * shape as economy/approval elsewhere) toward a target driven by real
 * poverty and unemployment, pulled down by whichever policing tier is
 * funded. Aggressive policing suppresses crime fastest and incarcerates
 * more for the same crime level, but carries both a real ongoing budget
 * cost and a small ongoing approval friction — a felt tradeoff, not a free
 * lunch. Organized crime entrenches itself when crime runs high and
 * scandals go unresolved, and once entrenched it quietly drags the budget.
 */

interface PolicingConfig {
  budgetCostPerTurn: number;
  crimeTargetModifier: number;
  incarcerationMultiplier: number;
  approvalFriction: number;
  organizedCrimeDecay: number;
}

export const POLICING_FUNDING_CONFIG: Record<PolicingFundingTier, PolicingConfig> = {
  minimal: { budgetCostPerTurn: 0, crimeTargetModifier: 1.3, incarcerationMultiplier: 0.6, approvalFriction: 0, organizedCrimeDecay: 0 },
  standard: { budgetCostPerTurn: -0.15, crimeTargetModifier: 1.0, incarcerationMultiplier: 1.0, approvalFriction: 0, organizedCrimeDecay: 0.5 },
  aggressive: { budgetCostPerTurn: -0.35, crimeTargetModifier: 0.6, incarcerationMultiplier: 1.5, approvalFriction: -0.3, organizedCrimeDecay: 2 },
};

export function setPolicingFunding(crime: CrimeState, tier: PolicingFundingTier): CrimeState {
  return { ...crime, policingFunding: tier };
}

const CRIME_FROM_POVERTY_WEIGHT = 0.6;
const CRIME_FROM_UNEMPLOYMENT_WEIGHT = 2;

/** Where crime rate is headed given real poverty/unemployment pressure and the current policing tier. */
export function computeCrimeTarget(povertyRate: number, unemployment: number, tier: PolicingFundingTier): number {
  const base = povertyRate * CRIME_FROM_POVERTY_WEIGHT + unemployment * CRIME_FROM_UNEMPLOYMENT_WEIGHT;
  return clamp(base * POLICING_FUNDING_CONFIG[tier].crimeTargetModifier, 0, 100);
}

const CRIME_DECAY_RATE = 0.08;

function moveToward(current: number, target: number, rate: number): number {
  return current + (target - current) * rate;
}

export function advanceCrimeRate(crime: CrimeState, povertyRate: number, unemployment: number): CrimeState {
  const target = computeCrimeTarget(povertyRate, unemployment, crime.policingFunding);
  return { ...crime, crimeRate: clamp(moveToward(crime.crimeRate, target, CRIME_DECAY_RATE), 0, 100) };
}

const INCARCERATION_BASE_SCALE = 0.5;
const INCARCERATION_DECAY_RATE = 0.08;

/** Aggressive policing incarcerates more people for the same crime rate than a lighter-touch approach would. */
export function computeIncarcerationTarget(crimeRate: number, tier: PolicingFundingTier): number {
  return clamp(crimeRate * INCARCERATION_BASE_SCALE * POLICING_FUNDING_CONFIG[tier].incarcerationMultiplier, 0, 100);
}

export function advanceIncarcerationRate(crime: CrimeState): CrimeState {
  const target = computeIncarcerationTarget(crime.crimeRate, crime.policingFunding);
  return { ...crime, incarcerationRate: clamp(moveToward(crime.incarcerationRate, target, INCARCERATION_DECAY_RATE), 0, 100) };
}

const ORGANIZED_CRIME_GROWTH_PER_CRIME_POINT = 0.03;
const ORGANIZED_CRIME_GROWTH_PER_SCANDAL = 1.5;

/** A real, deterministic ratchet: high crime and unresolved scandals let organized crime dig in; only sustained (not minimal) policing pushes it back. */
export function advanceOrganizedCrimeInfluence(crime: CrimeState, unresolvedScandalCount: number): CrimeState {
  const growth = crime.crimeRate * ORGANIZED_CRIME_GROWTH_PER_CRIME_POINT + unresolvedScandalCount * ORGANIZED_CRIME_GROWTH_PER_SCANDAL;
  const decay = POLICING_FUNDING_CONFIG[crime.policingFunding].organizedCrimeDecay;
  return { ...crime, organizedCrimeInfluence: clamp(crime.organizedCrimeInfluence + growth - decay, 0, 100) };
}

const MAX_ORGANIZED_CRIME_BUDGET_DRAG = 1.0;

/** Entrenched organized crime quietly taxes the budget — skimming, extortion, lost revenue. */
export function computeOrganizedCrimeEconomyEffect(organizedCrimeInfluence: number): EconomyDelta {
  return { budgetBalance: -(organizedCrimeInfluence / 100) * MAX_ORGANIZED_CRIME_BUDGET_DRAG };
}

/** The real, ongoing per-turn cost of whichever policing tier is funded. */
export function computePolicingBudgetEffect(tier: PolicingFundingTier): EconomyDelta {
  return { budgetBalance: POLICING_FUNDING_CONFIG[tier].budgetCostPerTurn };
}

const CRIME_APPROVAL_BASELINE = 30;
const MAX_CRIME_APPROVAL_IMPACT = 8;

/** Bounded approval impact: crime below baseline reads as safety and lifts approval; above it drags approval down. Aggressive policing's controversy is folded in as a small constant friction. */
export function computeCrimeApprovalImpact(crime: CrimeState): number {
  const crimeTerm = clamp((CRIME_APPROVAL_BASELINE - crime.crimeRate) / 10, -MAX_CRIME_APPROVAL_IMPACT, MAX_CRIME_APPROVAL_IMPACT);
  return crimeTerm + POLICING_FUNDING_CONFIG[crime.policingFunding].approvalFriction;
}
