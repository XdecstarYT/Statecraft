import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import type { Country, EconomyState, MilitaryProfile, Party, Province, SecessionistMovement } from '../models/types';

/**
 * SECESSION & INDEPENDENCE — regions build separatist sentiment from
 * national grievance (unemployment, low approval), which the player can
 * defuse with autonomy concessions, put to a referendum, or suppress by
 * force. A passed referendum or a lost suppression both end in the same
 * place: the region actually leaves, seats and all.
 */

const GRIEVANCE_UNEMPLOYMENT_WEIGHT = 0.6;
const GRIEVANCE_APPROVAL_WEIGHT = 0.5;
const GRIEVANCE_COHESION_WEIGHT = 0.5;
const DEFAULT_CULTURAL_COHESION = 70;

/**
 * How aggrieved the nation is right now, 0..1 — high unemployment, low
 * public approval, and weak national cultural cohesion all feed
 * separatist sentiment. A fractured, low-cohesion nation runs a higher
 * baseline secession risk even with a healthy economy and approval.
 */
export function computeNationalGrievance(
  economy: EconomyState,
  publicApproval: number,
  culturalCohesion: number = DEFAULT_CULTURAL_COHESION
): number {
  const unemploymentTerm = clamp(economy.unemployment / 15, 0, 1);
  const approvalTerm = clamp((60 - publicApproval) / 60, 0, 1);
  const cohesionTerm = clamp((70 - culturalCohesion) / 70, 0, 1);
  return clamp(
    unemploymentTerm * GRIEVANCE_UNEMPLOYMENT_WEIGHT +
      approvalTerm * GRIEVANCE_APPROVAL_WEIGHT +
      cohesionTerm * GRIEVANCE_COHESION_WEIGHT,
    0,
    1
  );
}

const SENTIMENT_SPAWN_BASE_CHANCE = 0.04;

/**
 * Rolls whether a brand-new movement appears this turn, in a province
 * that doesn't already have one — likelier the more aggrieved the nation
 * is, but never a sure thing even at maximum grievance.
 */
export function rollForNewMovement(
  provinces: Province[],
  existing: SecessionistMovement[],
  grievance: number,
  turn: number,
  rng: SeededRng
): SecessionistMovement | null {
  const eligible = provinces.filter((p) => !existing.some((m) => m.provinceId === p.id));
  if (eligible.length === 0) return null;

  const chance = SENTIMENT_SPAWN_BASE_CHANCE * (0.4 + grievance * 1.6);
  if (rng.next() >= chance) return null;

  const province = rng.pick(eligible);
  return {
    provinceId: province.id,
    provinceName: province.name,
    sentiment: 20 + rng.next() * 15,
    status: 'agitating',
    turnStarted: turn,
  };
}

const SENTIMENT_DRIFT_RATE = 0.15;

/** An agitating movement's sentiment drifts toward a target set by national grievance — sticky, not noisy. Resolved movements never change. */
export function advanceMovementSentiment(movement: SecessionistMovement, grievance: number): SecessionistMovement {
  if (movement.status !== 'agitating') return movement;
  const target = grievance * 100;
  const sentiment = clamp(movement.sentiment + (target - movement.sentiment) * SENTIMENT_DRIFT_RATE, 0, 100);
  return { ...movement, sentiment };
}

export const REFERENDUM_MIN_SENTIMENT = 55;

export interface ReferendumResult {
  passed: boolean;
  yesShare: number;
}

/** A real vote sampled around the movement's own sentiment with seeded noise — not a guaranteed outcome even at high sentiment. */
export function resolveReferendum(movement: SecessionistMovement, rng: SeededRng): ReferendumResult {
  const noise = (rng.next() - 0.5) * 20;
  const yesShare = clamp(movement.sentiment + noise, 0, 100) / 100;
  return { passed: yesShare > 0.5, yesShare };
}

const AUTONOMY_SENTIMENT_RELIEF = 30;

/** A real concession — devolving power measurably cools a movement, but doesn't erase it outright. */
export function grantAutonomy(movement: SecessionistMovement): SecessionistMovement {
  return { ...movement, sentiment: clamp(movement.sentiment - AUTONOMY_SENTIMENT_RELIEF, 0, 100) };
}

export interface SuppressionResult {
  success: boolean;
  movement: SecessionistMovement;
}

const REBEL_BASE_STRENGTH = 20;
const REBEL_SENTIMENT_SCALE = 0.6;
const SUPPRESSION_NOISE_RANGE = 20;
const SUPPRESSION_SENTIMENT_RELIEF = 60;

/**
 * A one-shot internal conflict, not a multi-turn war: the player's
 * effective military strength against a rebel strength scaled by how
 * deep the movement's sentiment runs. Success crushes the movement (a
 * real, lasting sentiment hit, not zero); failure ends in the region
 * actually winning its independence.
 */
export function resolveSuppression(
  movement: SecessionistMovement,
  playerMilitary: MilitaryProfile,
  rng: SeededRng
): SuppressionResult {
  const playerStrength = playerMilitary.strength * (0.5 + playerMilitary.techLevel / 200);
  const rebelStrength = REBEL_BASE_STRENGTH + movement.sentiment * REBEL_SENTIMENT_SCALE;
  const noise = (rng.next() - 0.5) * SUPPRESSION_NOISE_RANGE;
  const success = playerStrength + noise > rebelStrength;

  return {
    success,
    movement: success
      ? { ...movement, sentiment: clamp(movement.sentiment - SUPPRESSION_SENTIMENT_RELIEF, 0, 100), status: 'suppressed' }
      : { ...movement, status: 'independent' },
  };
}

/**
 * The actual territorial split: removes the province's districts (and
 * thus seats) from the country, and shrinks every party's seat count
 * proportionally to the share of the legislature it held — an
 * approximation (the engine doesn't track which party held which
 * district after the initial election), but a real, felt cost rather
 * than a cosmetic one.
 */
export function secedeProvince(
  country: Country,
  parties: Party[],
  province: Province
): { country: Country; parties: Party[] } {
  const { legislature } = country;
  const remainingDistricts = legislature.districts.filter((d) => !province.districtIds.includes(d.id));
  const seatsLost =
    legislature.districts.length > 0
      ? province.districtIds.length
      : Math.round(legislature.totalSeats * province.weight);
  const oldTotalSeats = legislature.totalSeats;
  const newTotalSeats = Math.max(0, oldTotalSeats - seatsLost);

  const updatedParties = parties.map((p) => {
    const share = oldTotalSeats > 0 ? p.seats / oldTotalSeats : 0;
    const lost = Math.round(share * seatsLost);
    return { ...p, seats: Math.max(0, p.seats - lost) };
  });

  return {
    country: {
      ...country,
      legislature: { ...legislature, districts: remainingDistricts, totalSeats: newTotalSeats },
    },
    parties: updatedParties,
  };
}
