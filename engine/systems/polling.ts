import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import type { Party, Politician, PollingFirm, PollResult } from '../models/types';

/**
 * POLLING FIRMS — a real margin-of-error calculation (the standard 95%
 * confidence-interval formula for a sampled proportion), not a flat "+/- a
 * few points" fudge. Each firm also carries a persistent house-effect
 * bias and a reliability rating that adds extra jitter beyond pure
 * sampling error — smaller, cheaper firms are noisier than their sample
 * size alone would suggest, exactly like real pollster house effects.
 */

/** The standard 95% confidence-interval margin of error for a sampled proportion. */
export function computeMarginOfError(proportion: number, sampleSize: number): number {
  const p = clamp(proportion, 0, 1);
  const n = Math.max(1, sampleSize);
  const variance = (p * (1 - p)) / n;
  return 1.96 * Math.sqrt(variance) * 100;
}

function samplePoll(
  firm: PollingFirm,
  trueValue: number,
  turn: number,
  subjectId: string,
  subjectLabel: string,
  kind: PollResult['kind'],
  rng: SeededRng
): PollResult {
  const biasedTrue = clamp(trueValue + firm.houseBias, 0, 100);
  const moe = computeMarginOfError(biasedTrue / 100, firm.sampleSize);
  const reliabilityPenalty = (1 - firm.reliability) * moe;
  const noise = (rng.next() - 0.5) * 2 * (moe + reliabilityPenalty);
  const sampledValue = clamp(biasedTrue + noise, 0, 100);

  return {
    id: `poll-${firm.id}-${kind}-${subjectId}-${turn}`,
    firmId: firm.id,
    turn,
    subjectId,
    subjectLabel,
    kind,
    sampledValue,
    marginOfError: moe,
    trueValue,
  };
}

/** Commissions a poll of a politician's public approval. */
export function commissionApprovalPoll(firm: PollingFirm, politician: Politician, turn: number, rng: SeededRng): PollResult {
  return samplePoll(firm, politician.approval.public, turn, politician.id, politician.name, 'approval', rng);
}

/** Commissions a poll of a party's current support (its share of legislature seats, as a proxy for vote share). */
export function commissionPartyPoll(firm: PollingFirm, party: Party, parties: Party[], turn: number, rng: SeededRng): PollResult {
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);
  const trueValue = totalSeats > 0 ? (party.seats / totalSeats) * 100 : 0;
  return samplePoll(firm, trueValue, turn, party.id, party.name, 'party_support', rng);
}
