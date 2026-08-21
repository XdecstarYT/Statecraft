import type { SeededRng } from '../rng';
import { clamp, ideologicalAlignment } from '../ideology';
import type { IdeologyPosition, Journalist, PoliticianAttributes } from '../models/types';

/**
 * MEDIA ECOSYSTEM & DISINFORMATION — named journalists sit between the
 * player and the outlet-level bias/framing in media.ts: they can be
 * courted for rapport, dig up real exposés when scrutiny is high, and are
 * the audience a disinformation campaign has to get past. Nothing here
 * fabricates a "fake news" event out of thin air — every outcome is a
 * seeded roll against real, visible inputs (credibility, scrutiny, the
 * player's own attributes and integrity).
 */

const DISPOSITION_DECAY_RATE = 0.05;

export function computeJournalistAlignment(journalist: Journalist, subjectIdeology: IdeologyPosition): number {
  return ideologicalAlignment(journalist.ideology, subjectIdeology);
}

export interface CourtJournalistOutcome {
  success: boolean;
  dispositionDelta: number;
}

/** Courting a journalist — access, exclusives, a relationship built over time. An already-warm journalist is easier to move further. */
export function courtJournalist(
  journalist: Journalist,
  playerAttributes: PoliticianAttributes,
  rng: SeededRng
): CourtJournalistOutcome {
  const chance = 0.3 + (playerAttributes.charisma + playerAttributes.mediaSavvy) / 80 + journalist.disposition / 500;
  const success = rng.next() < chance;
  const dispositionDelta = success ? rng.nextInt(8, 20) : rng.nextInt(-8, 1);
  return { success, dispositionDelta };
}

export function applyCourtJournalistOutcome(journalist: Journalist, outcome: CourtJournalistOutcome): Journalist {
  return { ...journalist, disposition: clamp(journalist.disposition + outcome.dispositionDelta, -100, 100) };
}

export function decayJournalistDispositions(journalists: Journalist[]): Journalist[] {
  return journalists.map((j) => ({ ...j, disposition: j.disposition * (1 - DISPOSITION_DECAY_RATE) }));
}

const SCRUTINY_RISE_RATE = 0.15;
const SCRUTINY_DECAY_RATE = 0.1;

/**
 * Scrutiny rises toward a pressure ceiling (driven by how much there
 * genuinely is to dig into — active scandals, corruption exposure) and
 * decays toward 0 otherwise. A friendly disposition damps how fast scrutiny
 * can rise, the same way a courted relationship softens coverage in
 * media.ts's classifyFrame.
 */
export function driftJournalistScrutiny(journalist: Journalist, pressureCeiling: number): Journalist {
  const dispositionDamping = 1 - clamp(journalist.disposition / 200, 0, 0.5);
  const target = clamp(pressureCeiling, 0, 1) * dispositionDamping;
  const rate = target > journalist.scrutiny ? SCRUTINY_RISE_RATE : SCRUTINY_DECAY_RATE;
  return { ...journalist, scrutiny: clamp(journalist.scrutiny + (target - journalist.scrutiny) * rate, 0, 1) };
}

export interface InvestigationOutcome {
  found: boolean;
}

/**
 * A journalist digs into the player: chance scales with the journalist's
 * own scrutiny and credibility against the target's integrity (a genuinely
 * clean politician has less to find). Consumes the RNG only when scrutiny
 * is non-trivial — a journalist paying no attention never randomly stumbles
 * onto anything.
 */
export function rollInvestigation(journalist: Journalist, targetIntegrity: number, rng: SeededRng): InvestigationOutcome {
  if (journalist.scrutiny <= 0) return { found: false };
  const integrityFactor = (10 - clamp(targetIntegrity, 1, 10)) / 10;
  const chance = clamp(journalist.scrutiny * (0.3 + journalist.credibility / 200) + integrityFactor * 0.2, 0, 0.9);
  return { found: rng.next() < chance };
}

export type DisinformationOutcomeTier = 'landed' | 'exposed' | 'backfired';

export interface DisinformationOutcome {
  outcome: DisinformationOutcomeTier;
  /** Applied to the target's public approval (negative) or, on backfire, to the player's own. */
  approvalImpact: number;
}

/**
 * Spreading a false narrative: skill is media savvy blended with a little
 * charisma, opposed by the strongest scrutiny among the outlets currently
 * paying attention (a quiet press landscape is much easier to fool than
 * one already digging). Three tiers: it lands and damages the target, it
 * gets fact-checked and simply fizzles, or it's traced back and backfires
 * on the player — the tail risk that keeps this from being a free action.
 */
export function launchDisinformationCampaign(
  playerAttributes: PoliticianAttributes,
  journalists: Journalist[],
  rng: SeededRng
): DisinformationOutcome {
  const skill = clamp((playerAttributes.mediaSavvy * 2 + playerAttributes.charisma) / 30, 0, 1);
  const maxScrutiny = journalists.length === 0 ? 0 : Math.max(...journalists.map((j) => j.scrutiny));
  const pLanded = clamp(0.45 + skill * 0.3 - maxScrutiny * 0.35, 0.05, 0.85);
  const pBackfired = clamp(0.15 + maxScrutiny * 0.35 - skill * 0.15, 0.03, 0.6);
  const roll = rng.next();

  if (roll < pLanded) return { outcome: 'landed', approvalImpact: -(8 + rng.next() * 10) };
  if (roll < 1 - pBackfired) return { outcome: 'exposed', approvalImpact: 0 };
  return { outcome: 'backfired', approvalImpact: -(10 + rng.next() * 12) };
}
