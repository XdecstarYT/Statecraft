import type { SeededRng } from '../rng';
import { clamp, ideologicalAlignment } from '../ideology';
import type { CorruptionTier, Donor, IdeologyPosition, PoliticianAttributes } from '../models/types';

/**
 * CAMPAIGN FINANCE & DONORS — money in politics, modeled honestly: donors
 * give more the closer they are to the player ideologically and the
 * warmer their disposition, big checks are courtable the same way
 * interest groups and think tanks are, and taking money quietly (rather
 * than through disclosed channels) is a real corruption exposure, not a
 * free lunch. Disposition decays like every other courted relationship in
 * this engine (see lobbying.ts's decayGroupDispositions).
 */

const DISPOSITION_DECAY_RATE = 0.05;

export function computeDonorAlignment(donor: Donor, subjectIdeology: IdeologyPosition): number {
  return ideologicalAlignment(donor.ideology, subjectIdeology);
}

export interface CourtDonorOutcome {
  success: boolean;
  dispositionDelta: number;
}

/** Courting a donor directly — meetings, policy briefings, a personal ask. An already-warm donor is easier to move further, same as any other courted relationship. */
export function courtDonor(donor: Donor, playerAttributes: PoliticianAttributes, rng: SeededRng): CourtDonorOutcome {
  const chance = 0.35 + (playerAttributes.network + playerAttributes.charisma) / 80 + donor.disposition / 500;
  const success = rng.next() < chance;
  const dispositionDelta = success ? rng.nextInt(10, 22) : rng.nextInt(-6, 2);
  return { success, dispositionDelta };
}

export function applyCourtDonorOutcome(donor: Donor, outcome: CourtDonorOutcome): Donor {
  return { ...donor, disposition: clamp(donor.disposition + outcome.dispositionDelta, -100, 100) };
}

export function decayDonorDispositions(donors: Donor[]): Donor[] {
  return donors.map((donor) => ({ ...donor, disposition: donor.disposition * (1 - DISPOSITION_DECAY_RATE) }));
}

export interface DonationOutcome {
  amount: number;
}

const SOLICITATION_MIN_DISPOSITION = 10;

/**
 * A disclosed, legal contribution — scales with the donor's wealth,
 * disposition, and ideological alignment. Returns a zero amount (not an
 * error) when the donor isn't warm enough yet to give anything, so callers
 * can always safely apply the result.
 */
export function solicitDonation(donor: Donor, playerIdeology: IdeologyPosition, rng: SeededRng): DonationOutcome {
  if (donor.disposition < SOLICITATION_MIN_DISPOSITION) return { amount: 0 };
  const alignment = computeDonorAlignment(donor, playerIdeology);
  const warmth = clamp(donor.disposition / 100, 0, 1);
  const base = donor.wealth * (0.4 + 0.6 * alignment) * (0.3 + 0.7 * warmth);
  const amount = Math.round(base * (0.8 + rng.next() * 0.4));
  return { amount: Math.max(0, amount) };
}

export interface DarkMoneyOutcome {
  amount: number;
  detected: boolean;
}

const DARK_MONEY_MIN_DISPOSITION = 50;
const DARK_MONEY_MULTIPLIER = 2.2;
/** The corruption tier a dark-money offer should be logged as if detected — 'hard', same severity class as any other major illicit act. */
export const DARK_MONEY_TIER: CorruptionTier = 'hard';

/**
 * An undisclosed, off-the-books contribution — a much bigger check than any
 * legal solicitation, from a donor warm enough to trust the arrangement,
 * but a real corruption exposure: detection uses the same tier math as
 * engine/systems/corruption.ts (a 'hard'-tier act), scaled by the player's
 * own integrity and any active investigative scrutiny.
 */
export function acceptDarkMoneyOffer(
  donor: Donor,
  playerIdeology: IdeologyPosition,
  playerIntegrity: number,
  investigativePressure: number,
  rng: SeededRng
): DarkMoneyOutcome | null {
  if (donor.disposition < DARK_MONEY_MIN_DISPOSITION) return null;
  const alignment = computeDonorAlignment(donor, playerIdeology);
  const amount = Math.round(donor.wealth * DARK_MONEY_MULTIPLIER * (0.4 + 0.6 * alignment) * (0.8 + rng.next() * 0.4));

  const integrityFactor = (10 - clamp(playerIntegrity, 1, 10)) / 10;
  const baseChance = 0.2;
  const detectionChance = clamp(baseChance + integrityFactor * 0.25 + clamp(investigativePressure, 0, 1) * 0.3, 0, 0.95);
  const detected = rng.next() < detectionChance;

  return { amount: Math.max(0, amount), detected };
}

const AD_BLITZ_DIMINISHING_SCALE = 40;
const AD_BLITZ_MAX_IMPACT = 18;

/**
 * Spending campaign funds on advertising: unlike a free press interview or
 * rally, this is a guaranteed positive approval move — no gaffe risk — but
 * with real diminishing returns (a sqrt curve), so doubling the spend never
 * doubles the effect. Deterministic: money buys a sure thing, skill buys
 * upside.
 */
export function computeAdBlitzImpact(amountSpent: number): number {
  if (amountSpent <= 0) return 0;
  return Math.min(AD_BLITZ_MAX_IMPACT, AD_BLITZ_DIMINISHING_SCALE * Math.sqrt(amountSpent) / 100);
}

export function runAdBlitz(campaignFunds: number, amountToSpend: number): { fundsSpent: number; approvalImpact: number } {
  const fundsSpent = clamp(amountToSpend, 0, campaignFunds);
  return { fundsSpent, approvalImpact: computeAdBlitzImpact(fundsSpent) };
}
