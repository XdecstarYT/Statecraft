import { SeededRng } from '../rng';
import { MAX_IDEOLOGICAL_DISTANCE, clamp, ideologicalAlignment, ideologicalDistance } from '../ideology';
import type { Court, IdeologyPosition, Justice, JudicialReviewCase, Politician, WhipStance } from '../models/types';

/**
 * JUDICIARY — a real check-and-balance. The player nominates justices to a
 * fixed-size bench; the legislature confirms or rejects each nominee by a
 * whip-style probabilistic vote (ideological alignment plus integrity, the
 * same "weighted score through a sigmoid" shape as legislative.ts's own
 * whip count); once a quorum of the bench is confirmed, passed bills can be
 * challenged and struck down — likelier the further the court's median
 * ideology sits from the bill sponsor's own.
 */

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function createEmptyCourt(size: number): Court {
  return { seats: Array.from({ length: size }, () => null) };
}

export interface JusticeNominee {
  id: string;
  name: string;
  ideology: IdeologyPosition;
  /** 1..10. */
  integrity: number;
}

/** Places a nominee into the given seat, vacant or not — renominating an already-occupied seat simply replaces the sitting nominee/justice. */
export function nominateJustice(court: Court, seatIndex: number, nominee: JusticeNominee, turn: number): Court {
  const seats = court.seats.map((seat, i) =>
    i === seatIndex ? { ...nominee, status: 'nominated' as const, turnAppointed: turn, confirmationVotes: {} } : seat
  );
  return { seats };
}

export interface ConfirmationWeights {
  ideology: number;
  integrity: number;
}

export const DEFAULT_CONFIRMATION_WEIGHTS: ConfirmationWeights = {
  ideology: 2.0,
  integrity: 0.8,
};

/**
 * 0..1 — probability a given legislator votes to confirm. Ideology is
 * weighted heaviest (mirrors legislative.ts's whip count): a nominee far
 * from a member's own ideology struggles to clear a coin-flip no matter how
 * clean their record is, but integrity still buys real, if bounded, cross-
 * ideological support.
 */
export function computeConfirmationSupportProbability(
  justice: Pick<Justice, 'ideology' | 'integrity'>,
  member: Politician,
  weights: ConfirmationWeights = DEFAULT_CONFIRMATION_WEIGHTS
): number {
  const distance = ideologicalDistance(justice.ideology, member.ideology);
  const ideologyTerm = 1 - (2 * distance) / MAX_IDEOLOGICAL_DISTANCE; // 1 (aligned) .. -1 (opposed)
  const integrityTerm = (justice.integrity - 5.5) / 4.5; // roughly -1..1 across integrity 1..10

  const score = weights.ideology * ideologyTerm + weights.integrity * integrityTerm;
  return sigmoid(score);
}

export interface ConfirmationVoteResult {
  confirmed: boolean;
  yesVotes: number;
  noVotes: number;
  votes: Record<string, WhipStance>;
}

/** Resolves a full-chamber confirmation vote on the justice sitting in `seatIndex`. A simple majority confirms. */
export function resolveConfirmationVote(
  justice: Pick<Justice, 'ideology' | 'integrity'>,
  politicians: Politician[],
  rng: SeededRng,
  weights: ConfirmationWeights = DEFAULT_CONFIRMATION_WEIGHTS
): ConfirmationVoteResult {
  const votes: Record<string, WhipStance> = {};
  let yesVotes = 0;
  let noVotes = 0;
  for (const member of politicians) {
    const probability = computeConfirmationSupportProbability(justice, member, weights);
    const stance: WhipStance = rng.next() < probability ? 'yes' : 'no';
    votes[member.id] = stance;
    if (stance === 'yes') yesVotes++;
    else noVotes++;
  }
  return { confirmed: yesVotes > noVotes, yesVotes, noVotes, votes };
}

/** Applies a confirmation result to the seat: confirmed justices are seated for good; a rejected nominee leaves the seat vacant again. */
export function applyConfirmationResult(court: Court, seatIndex: number, result: ConfirmationVoteResult): Court {
  const seats = court.seats.map((seat, i) => {
    if (i !== seatIndex || !seat) return seat;
    return result.confirmed ? { ...seat, status: 'confirmed' as const, confirmationVotes: result.votes } : null;
  });
  return { seats };
}

/** The average ideology of every confirmed justice — null when nobody's been confirmed yet (nothing to compute a median against). */
export function computeCourtIdeology(court: Court): IdeologyPosition | null {
  const confirmed = court.seats.filter((s): s is Justice => s !== null && s.status === 'confirmed');
  if (confirmed.length === 0) return null;
  return {
    economic: confirmed.reduce((sum, j) => sum + j.ideology.economic, 0) / confirmed.length,
    social: confirmed.reduce((sum, j) => sum + j.ideology.social, 0) / confirmed.length,
  };
}

export const DEFAULT_COURT_QUORUM = 3;

/** Whether enough justices are confirmed for the court to hear cases at all. */
export function canHearCases(court: Court, quorum: number = DEFAULT_COURT_QUORUM): boolean {
  return court.seats.filter((s) => s?.status === 'confirmed').length >= quorum;
}

export const DEFAULT_REVIEW_CHALLENGE_CHANCE = 0.15;

/** Rolls whether a given passed bill draws a judicial challenge this turn. */
export function rollForJudicialReviewChallenge(rng: SeededRng, chance: number = DEFAULT_REVIEW_CHALLENGE_CHANCE): boolean {
  return rng.next() < chance;
}

const MIN_STRIKE_PROBABILITY = 0.05;
const MAX_STRIKE_PROBABILITY = 0.85;

/** 0..1 — never a certainty either way: even a hostile court sometimes upholds, and a friendly one sometimes doesn't. */
export function computeStrikeDownProbability(courtIdeology: IdeologyPosition, billSponsorIdeology: IdeologyPosition): number {
  const alignment = ideologicalAlignment(courtIdeology, billSponsorIdeology);
  return clamp(1 - alignment, MIN_STRIKE_PROBABILITY, MAX_STRIKE_PROBABILITY);
}

/** Resolves a pending review case to 'upheld' or 'struck_down'. */
export function resolveJudicialReview(
  reviewCase: JudicialReviewCase,
  strikeDownProbability: number,
  rng: SeededRng,
  turn: number
): JudicialReviewCase {
  const struckDown = rng.next() < strikeDownProbability;
  return { ...reviewCase, status: struckDown ? 'struck_down' : 'upheld', turnResolved: turn };
}

const RETIREMENT_CHANCE_PER_TURN = 0.01;

/** A small, ongoing per-turn chance any confirmed justice retires, vacating their seat again. Nominees awaiting confirmation are unaffected. */
export function rollForJusticeRetirements(court: Court, rng: SeededRng): Court {
  const seats = court.seats.map((seat) => {
    if (!seat || seat.status !== 'confirmed') return seat;
    return rng.next() < RETIREMENT_CHANCE_PER_TURN ? null : seat;
  });
  return { seats };
}
