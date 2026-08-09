import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import type { EconomyDelta, EconomyState, Protest } from '../models/types';

/**
 * PROTESTS & CIVIL UNREST — a nationwide, economy-and-approval-driven
 * pressure that can spawn a protest, which drifts toward that pressure's
 * level the same "sticky" way secession sentiment does. Left unresolved
 * past a real threshold, a protest escalates into a riot with a genuine,
 * one-time economic cost — neglect has a real price, not just a cosmetic
 * status flag.
 */

const UNEMPLOYMENT_WEIGHT = 0.4;
const INFLATION_WEIGHT = 0.3;
const APPROVAL_WEIGHT = 0.4;

/** How much nationwide unrest pressure is building right now, 0..1. */
export function computeUnrestPressure(economy: EconomyState, publicApproval: number): number {
  const unemploymentTerm = clamp(economy.unemployment / 12, 0, 1);
  const inflationTerm = clamp(economy.inflation / 10, 0, 1);
  const approvalTerm = clamp((55 - publicApproval) / 55, 0, 1);
  return clamp(
    unemploymentTerm * UNEMPLOYMENT_WEIGHT + inflationTerm * INFLATION_WEIGHT + approvalTerm * APPROVAL_WEIGHT,
    0,
    1
  );
}

const PROTEST_SPAWN_BASE_CHANCE = 0.05;

/** Rolls whether a new protest breaks out this turn — only when nothing is already active. */
export function rollForProtest(
  existing: Protest[],
  pressure: number,
  causes: string[],
  turn: number,
  rng: SeededRng
): Protest | null {
  const active = existing.some((p) => p.status === 'protesting' || p.status === 'riot');
  if (active || causes.length === 0) return null;

  const chance = PROTEST_SPAWN_BASE_CHANCE * (0.3 + pressure * 1.7);
  if (rng.next() >= chance) return null;

  return {
    id: `protest-${turn}`,
    cause: rng.pick(causes),
    intensity: 15 + rng.next() * 15,
    status: 'protesting',
    turnStarted: turn,
  };
}

const INTENSITY_DRIFT_RATE = 0.2;

/** An active protest's intensity drifts toward current pressure — sticky, not noisy. Riots and quelled protests never drift. */
export function advanceProtestIntensity(protest: Protest, pressure: number): Protest {
  if (protest.status !== 'protesting') return protest;
  const target = pressure * 100;
  const intensity = clamp(protest.intensity + (target - protest.intensity) * INTENSITY_DRIFT_RATE, 0, 100);
  return { ...protest, intensity };
}

export const RIOT_ESCALATION_THRESHOLD = 85;

/** A protest left to fester past the threshold turns into a riot on its own — no player action required. */
export function checkRiotEscalation(protest: Protest): Protest {
  if (protest.status === 'protesting' && protest.intensity >= RIOT_ESCALATION_THRESHOLD) {
    return { ...protest, status: 'riot' };
  }
  return protest;
}

/** A one-time, real economic hit applied exactly once when a protest first turns into a riot. */
export const RIOT_ECONOMY_EFFECT: EconomyDelta = { gdpGrowth: -0.3, budgetBalance: -0.2 };

const CONCESSION_RELIEF = 35;
const CONCESSION_QUELL_THRESHOLD = 10;

/** A real policy concession — cools the protest by a fixed amount, fully resolving it if that brings intensity low enough. */
export function concedeToProtesters(protest: Protest): Protest {
  const intensity = clamp(protest.intensity - CONCESSION_RELIEF, 0, 100);
  return { ...protest, intensity, status: intensity <= CONCESSION_QUELL_THRESHOLD ? 'quelled' : protest.status };
}

export interface DispersalResult {
  success: boolean;
  protest: Protest;
}

const DISPERSAL_BASE_STRENGTH = 40;
const DISPERSAL_NOISE_RANGE = 30;
const FAILED_DISPERSAL_INTENSITY_BUMP = 20;

/**
 * Sends in the police/military to break up the protest by force. Success
 * quells it outright; failure escalates it straight into a riot (with the
 * same one-time economic cost as organic escalation) and makes it worse,
 * not neutral — a real risk, not a free action.
 */
export function disperseProtest(protest: Protest, policingStrength: number, rng: SeededRng): DispersalResult {
  const resistance = protest.intensity;
  const noise = (rng.next() - 0.5) * DISPERSAL_NOISE_RANGE;
  const success = policingStrength + DISPERSAL_BASE_STRENGTH + noise > resistance;

  if (success) {
    return { success: true, protest: { ...protest, status: 'quelled', intensity: 0 } };
  }
  return {
    success: false,
    protest: { ...protest, status: 'riot', intensity: clamp(protest.intensity + FAILED_DISPERSAL_INTENSITY_BUMP, 0, 100) },
  };
}
