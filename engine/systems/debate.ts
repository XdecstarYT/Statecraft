import type { SeededRng } from '../rng';
import type { Politician } from '../models/types';

/**
 * PRE-ELECTION DEBATES — a real head-to-head between candidates, scored
 * from charisma, intellect, and media savvy plus seeded noise, not a
 * guaranteed win for whoever has the best stats. The winner's public
 * approval gets a real boost; everyone else takes a smaller hit.
 */

function computeDebateSkill(politician: Politician): number {
  const { charisma, intellect, mediaSavvy } = politician.attributes;
  return charisma * 0.4 + intellect * 0.35 + mediaSavvy * 0.25;
}

const DEBATE_NOISE_RANGE = 20;

export interface DebateParticipantResult {
  politicianId: string;
  score: number;
}

export interface DebateResult {
  participants: DebateParticipantResult[];
  winnerId: string;
}

/** Resolves a debate among 2+ participants. Each participant's score is their skill plus real seeded noise. */
export function resolveDebate(participants: Politician[], rng: SeededRng): DebateResult {
  if (participants.length < 2) {
    throw new Error('A debate needs at least two participants');
  }
  const scored = participants.map((p) => ({
    politicianId: p.id,
    score: computeDebateSkill(p) + (rng.next() - 0.5) * DEBATE_NOISE_RANGE,
  }));
  const winner = scored.reduce((best, r) => (r.score > best.score ? r : best));
  return { participants: scored, winnerId: winner.politicianId };
}

export const DEBATE_WINNER_APPROVAL_BONUS = 9;
export const DEBATE_LOSER_APPROVAL_PENALTY = -4;
