import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import type { CoupAttempt, CoupInstigator, CoupOutcome, EmergencyPowersStatus } from '../models/types';

/**
 * COUPS, JUNTAS & EMERGENCY POWERS — a real, rare instability track built
 * from signal already present elsewhere in the engine (unrest.ts's
 * pressure formula, the player's own military strength, public approval)
 * rather than an arbitrary doom clock. Risk is capped well short of
 * certainty even in the worst case — this is meant to punish sustained
 * neglect, not to ambush a player having one bad week.
 */

const UNREST_WEIGHT = 0.4;
const MILITARY_WEIGHT = 0.3;
const LEGITIMACY_WEIGHT = 0.3;
const EMERGENCY_POWERS_RISK: Record<EmergencyPowersStatus, number> = {
  none: 0,
  state_of_emergency: 0.05,
  martial_law: 0.1,
};
const MAX_COUP_RISK = 0.6;

/**
 * 0..MAX_COUP_RISK — the classic danger combination is a strong military
 * paired with a weak, unpopular civilian government under real unrest
 * pressure; a strong military under a popular, stable government contributes
 * comparatively little risk on its own.
 */
export function computeCoupRisk(
  unrestPressure: number,
  militaryStrength: number,
  publicApproval: number,
  emergencyPowers: EmergencyPowersStatus
): number {
  const unrestTerm = clamp(unrestPressure, 0, 1) * UNREST_WEIGHT;
  const militaryTerm = clamp(militaryStrength / 100, 0, 1) * MILITARY_WEIGHT;
  const legitimacyTerm = clamp((50 - publicApproval) / 50, 0, 1) * LEGITIMACY_WEIGHT;
  return clamp(unrestTerm + militaryTerm + legitimacyTerm + EMERGENCY_POWERS_RISK[emergencyPowers], 0, MAX_COUP_RISK);
}

/** Rolls whether an attempt actually happens this turn, given the current risk level. */
export function rollForCoupAttempt(risk: number, rng: SeededRng): boolean {
  return rng.next() < risk;
}

/** Which faction moves — weighted by whichever risk factor is currently most acute. */
export function selectCoupInstigator(
  unrestPressure: number,
  militaryStrength: number,
  publicApproval: number,
  rng: SeededRng
): CoupInstigator {
  const entries: { item: CoupInstigator; weight: number }[] = [
    { item: 'military', weight: Math.max(0.01, militaryStrength) },
    { item: 'rival_party', weight: Math.max(0.01, 100 - publicApproval) },
    { item: 'popular_uprising', weight: Math.max(0.01, unrestPressure * 100) },
  ];
  return rng.pickWeighted(entries);
}

const COUP_SUCCESS_BASE = 0.3;

/** Success favors a strong military and punishes low public approval — a genuinely popular government is harder to overthrow cleanly. */
export function computeCoupSuccessProbability(militaryStrength: number, publicApproval: number): number {
  return clamp(COUP_SUCCESS_BASE + militaryStrength / 200 - publicApproval / 200, 0.05, 0.85);
}

export function resolveCoupAttempt(
  instigator: CoupInstigator,
  militaryStrength: number,
  publicApproval: number,
  turn: number,
  id: string,
  rng: SeededRng
): CoupAttempt {
  const probability = computeCoupSuccessProbability(militaryStrength, publicApproval);
  const outcome: CoupOutcome = rng.next() < probability ? 'succeeded' : 'foiled';
  return { id, turn, outcome, instigator };
}

/**
 * EMERGENCY POWERS — real, costly player choices. Declaring either status
 * is a one-line state transition; the approval cost is the actual
 * consequence, applied by the caller the same way every other approval
 * event in this engine is.
 */

export const STATE_OF_EMERGENCY_APPROVAL_COST = -8;
export const MARTIAL_LAW_APPROVAL_COST = -18;
/** A blunt instrument: martial law suppresses unrest hard, so it meaningfully lowers coup risk from popular-uprising pressure even as it costs approval and raises baseline instability risk. */
export const MARTIAL_LAW_UNREST_SUPPRESSION = 0.5;

export function declareStateOfEmergency(): EmergencyPowersStatus {
  return 'state_of_emergency';
}

export function declareMartialLaw(): EmergencyPowersStatus {
  return 'martial_law';
}

export function liftEmergencyPowers(): EmergencyPowersStatus {
  return 'none';
}
