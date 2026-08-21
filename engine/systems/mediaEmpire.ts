import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import type { CulturalInstitution, IdeologyPosition, MediaOutlet } from '../models/types';

/**
 * MEDIA & CULTURE EMPIRE — beyond courting the pre-authored press (see
 * media.ts), the player can found their own outlet and grow its reach with
 * invested capability (same shape logistics/research capability already
 * uses), and fund cultural institutions whose prestige feeds a national
 * soft-power score. Soft power is applied as a small, bounded approval
 * tailwind in engine/index.ts's advanceTurn — prestige-building is felt,
 * not just displayed.
 */
export const MEDIA_OUTLET_FOUNDING_COST = 200;
export const CULTURAL_INSTITUTION_FOUNDING_COST = 150;

const STARTING_OUTLET_REACH = 0.02;
const STARTING_OUTLET_CAPABILITY = 20;
const OUTLET_REACH_GROWTH_RATE = 0.0015;
const OUTLET_INVESTMENT_AMOUNT = 15;

export function foundMediaOutlet(id: string, name: string, bias: IdeologyPosition, ownerId: string): MediaOutlet {
  return { id, name, bias, reach: STARTING_OUTLET_REACH, ownerId, investedCapability: STARTING_OUTLET_CAPABILITY };
}

/** Grows a player-owned outlet's invested capability, bounded at 100 — a one-time spend, same shape as investInResearch/investInLogistics. */
export function investInOutlet(outlet: MediaOutlet, amount: number = OUTLET_INVESTMENT_AMOUNT): MediaOutlet {
  return { ...outlet, investedCapability: Math.min(100, (outlet.investedCapability ?? 0) + amount) };
}

/** Passive per-turn reach growth scaled by invested capability. A no-op for the pre-authored starter press (no ownerId, no capability to grow). */
export function advanceOutletReach(outlet: MediaOutlet): MediaOutlet {
  if (!outlet.ownerId) return outlet;
  const growth = (outlet.investedCapability ?? 0) * OUTLET_REACH_GROWTH_RATE;
  return { ...outlet, reach: Math.min(1, outlet.reach + growth) };
}

const STARTING_PRESTIGE_MIN = 20;
const STARTING_PRESTIGE_MAX = 50;
const PRESTIGE_VOLATILITY = 2;

export function foundCulturalInstitution(
  id: string,
  name: string,
  founderId: string,
  turn: number,
  rng: SeededRng
): CulturalInstitution {
  return { id, name, founderId, turnFounded: turn, prestige: rng.nextInt(STARTING_PRESTIGE_MIN, STARTING_PRESTIGE_MAX) };
}

/** A small bounded random walk — real strategic randomness in prestige, same shape as a company's fundamentals drift. */
export function advanceInstitutionPrestige(institution: CulturalInstitution, rng: SeededRng): CulturalInstitution {
  const delta = (rng.next() - 0.5) * 2 * PRESTIGE_VOLATILITY;
  return { ...institution, prestige: clamp(institution.prestige + delta, 0, 100) };
}

const MEDIA_SOFT_POWER_WEIGHT = 140;
const INSTITUTION_SOFT_POWER_WEIGHT = 0.4;
const SOFT_POWER_PULL_RATE = 0.05;

/** What softPower is pulling toward this turn — player-owned outlet reach plus institution prestige, both diminishing via the clamp. */
export function computeSoftPowerTarget(mediaOutlets: MediaOutlet[], culturalInstitutions: CulturalInstitution[]): number {
  const mediaContribution = mediaOutlets
    .filter((o) => o.ownerId)
    .reduce((sum, o) => sum + o.reach * MEDIA_SOFT_POWER_WEIGHT, 0);
  const institutionContribution = culturalInstitutions.reduce((sum, inst) => sum + inst.prestige * INSTITUTION_SOFT_POWER_WEIGHT, 0);
  return clamp(mediaContribution + institutionContribution, 0, 100);
}

/** Sticky, decay-toward-target drift — same shape as approval/economy elsewhere, so building soft power reads as a real, gradual campaign rather than an instant jump. */
export function advanceSoftPower(current: number, mediaOutlets: MediaOutlet[], culturalInstitutions: CulturalInstitution[]): number {
  const target = computeSoftPowerTarget(mediaOutlets, culturalInstitutions);
  return clamp(current + (target - current) * SOFT_POWER_PULL_RATE, 0, 100);
}
