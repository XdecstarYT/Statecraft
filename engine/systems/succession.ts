import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import { relationshipKey } from './legislative';
import type { Party, Politician, Scandal } from '../models/types';

/**
 * TERM LIMITS, SUCCESSION & IMPEACHMENT — the head of government (a
 * coalition's Prime Minister, or a majority party's recorded leader) can be
 * forced out three ways: running out their allotted terms, losing a
 * supermajority impeachment vote, or (elsewhere, via leadership.ts)
 * losing an intra-party leadership challenge. All three funnel into the
 * same succession math here: the party picks its strongest remaining
 * member to take over, not a coin flip.
 */

export const MAX_HEAD_OF_GOVERNMENT_TERMS = 2;

export function isTermLimited(
  politicianId: string,
  termsServed: Record<string, number>,
  maxTerms: number = MAX_HEAD_OF_GOVERNMENT_TERMS
): boolean {
  return (termsServed[politicianId] ?? 0) >= maxTerms;
}

export function recordTermServed(
  termsServed: Record<string, number>,
  politicianId: string
): Record<string, number> {
  return { ...termsServed, [politicianId]: (termsServed[politicianId] ?? 0) + 1 };
}

/**
 * Ranks a candidate successor by network (organizational reach) and
 * integrity (party elites trust a clean pair of hands after a forced
 * exit), plus how well they personally got along with the outgoing
 * leader — a bitter internal rival is a worse pick than a loyal
 * lieutenant even with identical stats.
 */
function successorScore(candidate: Politician, outgoingLeaderId: string, relationships: Record<string, number>): number {
  const relationship = relationships[relationshipKey(candidate.id, outgoingLeaderId)] ?? 0;
  return candidate.attributes.network * 0.5 + candidate.attributes.integrity * 0.3 + relationship * 0.2;
}

/**
 * Picks the party's next leader from its remaining members, ranked by
 * successorScore. Returns null if the party has nobody left to promote
 * (a one-member party losing its only member, effectively).
 */
export function selectSuccessor(
  party: Party,
  outgoingLeaderId: string,
  politicians: Politician[],
  relationships: Record<string, number>
): Politician | null {
  const candidates = politicians.filter((p) => p.partyId === party.id && p.id !== outgoingLeaderId);
  if (candidates.length === 0) return null;
  return candidates.reduce((best, candidate) =>
    successorScore(candidate, outgoingLeaderId, relationships) > successorScore(best, outgoingLeaderId, relationships)
      ? candidate
      : best
  );
}

/**
 * IMPEACHMENT — a supermajority (2/3 by default) vote of the whole
 * legislature to remove the sitting head of government. Support tracks
 * how deep the target's integrity/scandal problem runs and each member's
 * own relationship with them — a popular, clean leader is functionally
 * impossible to remove even if the player tries; a deeply scandalized one
 * is a real, live threat.
 */
export const IMPEACHMENT_THRESHOLD = 2 / 3;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** 0..1 — how serious the target's unresolved scandal record is right now. */
export function computeUnresolvedScandalSeverity(targetId: string, scandals: Scandal[]): number {
  const unresolved = scandals.filter((s) => s.politicianId === targetId && s.status === 'unresolved');
  if (unresolved.length === 0) return 0;
  const tierWeight: Record<Scandal['tier'], number> = { soft: 0.2, medium: 0.5, hard: 1 };
  const total = unresolved.reduce((sum, s) => sum + tierWeight[s.tier], 0);
  return clamp(total / 2, 0, 1);
}

export function computeImpeachmentSupportProbability(
  member: Politician,
  target: Politician,
  relationships: Record<string, number>,
  scandalSeverity: number
): number {
  const relationshipTerm = -clamp((relationships[relationshipKey(member.id, target.id)] ?? 0) / 100, -1, 1);
  const integrityTerm = (60 - target.attributes.integrity) / 60; // low integrity -> more removable
  const scandalTerm = scandalSeverity * 2 - 1; // -1 (clean) .. 1 (deeply scandalized)
  const score = 1.4 * scandalTerm + 0.8 * integrityTerm + 0.6 * relationshipTerm - 1.2; // biased toward acquittal by default
  return sigmoid(score);
}

export interface ImpeachmentResult {
  votesFor: number;
  votesAgainst: number;
  totalCount: number;
  requiredCount: number;
  passed: boolean;
}

export function resolveImpeachmentVote(
  target: Politician,
  politicians: Politician[],
  relationships: Record<string, number>,
  scandals: Scandal[],
  rng: SeededRng,
  threshold: number = IMPEACHMENT_THRESHOLD
): ImpeachmentResult {
  const scandalSeverity = computeUnresolvedScandalSeverity(target.id, scandals);
  let votesFor = 0;
  for (const member of politicians) {
    if (member.id === target.id) continue;
    const probability = computeImpeachmentSupportProbability(member, target, relationships, scandalSeverity);
    if (rng.next() < probability) votesFor++;
  }
  const totalCount = politicians.length - 1;
  const requiredCount = Math.ceil(totalCount * threshold);
  const votesAgainst = totalCount - votesFor;
  return { votesFor, votesAgainst, totalCount, requiredCount, passed: votesFor >= requiredCount };
}
