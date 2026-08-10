import type { SeededRng } from '../rng';
import { clamp, ideologicalAlignment } from '../ideology';
import type { Endorser, Politician } from '../models/types';

/**
 * ENDORSEMENTS — celebrities, unions, and newspapers back a candidate
 * based on real ideological fit (the same alignment math opinion.ts uses
 * for voter blocs), not a coin flip. A won endorsement's approval swing
 * scales with the endorser's prominence, so a major newspaper matters far
 * more than a minor one.
 */

const MIN_PROBABILITY = 0.05;
const MAX_PROBABILITY = 0.9;

/** 0..1 probability the endorser backs this politician, driven by ideological alignment. */
export function computeEndorsementProbability(endorser: Endorser, politician: Politician): number {
  const alignment = ideologicalAlignment(endorser.ideology, politician.ideology);
  return clamp(alignment, MIN_PROBABILITY, MAX_PROBABILITY);
}

export interface EndorsementAttemptResult {
  success: boolean;
  approvalImpact: number;
}

const PROMINENCE_TO_APPROVAL_SCALE = 8;

/** Rolls whether the endorser backs the politician. A success carries a real, prominence-scaled approval bump; failure carries none. */
export function attemptEndorsement(
  endorser: Endorser,
  politician: Politician,
  rng: SeededRng
): EndorsementAttemptResult {
  const probability = computeEndorsementProbability(endorser, politician);
  const success = rng.next() < probability;
  return { success, approvalImpact: success ? (endorser.prominence / 100) * PROMINENCE_TO_APPROVAL_SCALE : 0 };
}
