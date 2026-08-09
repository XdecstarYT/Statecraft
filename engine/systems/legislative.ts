import { SeededRng } from '../rng';
import { MAX_IDEOLOGICAL_DISTANCE, ideologicalDistance } from '../ideology';
import type { Bill, Politician, WhipStance } from '../models/types';

export function relationshipKey(idA: string, idB: string): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

export const MAX_FAVORS = 10;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export interface WhipWeights {
  ideology: number;
  relationship: number;
  partyLine: number;
  favors: number;
}

/**
 * Ideology is weighted heaviest on purpose: relationship and favors can move
 * a member's support meaningfully, but a member on the opposite end of the
 * ideology axes from the bill's sponsor should never be pushed past a
 * coin-flip by favors and goodwill alone. See legislative.test.ts for the
 * invariant this is tuned against.
 */
export const DEFAULT_WHIP_WEIGHTS: WhipWeights = {
  ideology: 2.5,
  relationship: 0.8,
  partyLine: 1.0,
  favors: 0.6,
};

/**
 * Computes the probability [0, 1) that `member` votes yes on a bill sponsored
 * by `sponsor`, per the whip-count formula in CLAUDE.md §5.
 */
export function computeSupportProbability(
  member: Politician,
  sponsor: Politician,
  relationshipScore: number,
  favorBankScore: number,
  weights: WhipWeights = DEFAULT_WHIP_WEIGHTS,
  maxFavors: number = MAX_FAVORS
): number {
  const distance = ideologicalDistance(member.ideology, sponsor.ideology);
  // 1 (perfectly aligned) .. -1 (maximally opposed)
  const ideologyTerm = 1 - (2 * distance) / MAX_IDEOLOGICAL_DISTANCE;
  // -1 (hostile) .. 1 (close ally)
  const relationshipTerm = Math.max(-1, Math.min(1, relationshipScore / 100));
  const partyLineTerm = member.partyId === sponsor.partyId ? 1 : -1;
  // 0 (no favors owed) .. 1 (fully banked)
  const favorsTerm = maxFavors > 0 ? Math.max(0, Math.min(1, favorBankScore / maxFavors)) : 0;

  const supportScore =
    weights.ideology * ideologyTerm +
    weights.relationship * relationshipTerm +
    weights.partyLine * partyLineTerm +
    weights.favors * favorsTerm;

  return sigmoid(supportScore);
}

/** Rolls the seeded dice for one member's vote given their support probability. */
export function resolveVote(probability: number, rng: SeededRng): 'yes' | 'no' {
  return rng.next() < probability ? 'yes' : 'no';
}

/**
 * BILL LIFECYCLE
 */

export function proposeBill(
  bill: Omit<Bill, 'status' | 'whipCount'>
): Bill {
  return { ...bill, status: 'drafting', whipCount: {} };
}

function assertStatus(bill: Bill, expected: Bill['status']) {
  if (bill.status !== expected) {
    throw new Error(
      `Bill "${bill.id}" must be in status "${expected}" for this action, but is "${bill.status}"`
    );
  }
}

export function advanceToCommittee(bill: Bill): Bill {
  assertStatus(bill, 'drafting');
  return { ...bill, status: 'committee' };
}

export function advanceToFloor(bill: Bill): Bill {
  assertStatus(bill, 'committee');
  return { ...bill, status: 'floor' };
}

export function setWhipStance(
  bill: Bill,
  politicianId: string,
  stance: WhipStance
): Bill {
  return { ...bill, whipCount: { ...bill.whipCount, [politicianId]: stance } };
}

/**
 * The player-visible whip count: locked-in yes/no stances plus a projected
 * support probability for everyone still undecided. Consumes no RNG — this
 * is a read-only poll, not a vote.
 */
export interface WhipProjection {
  politicianId: string;
  stance: WhipStance;
  /** Projected probability of a "yes" if the floor vote were held now. */
  projectedProbability: number;
}

export function pollWhipCount(
  bill: Bill,
  politicians: Politician[],
  relationships: Record<string, number>,
  favorBank: Record<string, number>,
  weights: WhipWeights = DEFAULT_WHIP_WEIGHTS
): WhipProjection[] {
  const sponsor = politicians.find((p) => p.id === bill.sponsorId);
  if (!sponsor) {
    throw new Error(`Sponsor "${bill.sponsorId}" not found among politicians`);
  }

  return politicians
    .filter((p) => p.id !== sponsor.id)
    .map((member) => {
      const stance = bill.whipCount[member.id] ?? 'undecided';
      if (stance === 'yes' || stance === 'no') {
        return { politicianId: member.id, stance, projectedProbability: stance === 'yes' ? 1 : 0 };
      }
      const relationshipScore = relationships[relationshipKey(sponsor.id, member.id)] ?? 0;
      const favorBankScore = favorBank[member.id] ?? 0;
      const projectedProbability = computeSupportProbability(
        member,
        sponsor,
        relationshipScore,
        favorBankScore,
        weights
      );
      return { politicianId: member.id, stance: 'undecided' as const, projectedProbability };
    });
}

export interface FloorVoteResult {
  yes: number;
  no: number;
  passed: boolean;
  finalWhipCount: Record<string, 'yes' | 'no'>;
}

/**
 * Resolves the floor vote: locked-in yes/no stances stand, every remaining
 * undecided member's vote is rolled against their support probability, and
 * the bill passes on simple majority of votes cast (regime threshold rules
 * beyond simple majority are a Phase 2+ concern).
 */
export function resolveFloorVote(
  bill: Bill,
  politicians: Politician[],
  relationships: Record<string, number>,
  favorBank: Record<string, number>,
  rng: SeededRng,
  weights: WhipWeights = DEFAULT_WHIP_WEIGHTS
): FloorVoteResult {
  assertStatus(bill, 'floor');
  const sponsor = politicians.find((p) => p.id === bill.sponsorId);
  if (!sponsor) {
    throw new Error(`Sponsor "${bill.sponsorId}" not found among politicians`);
  }

  const finalWhipCount: Record<string, 'yes' | 'no'> = {};
  let yes = 0;
  let no = 0;

  for (const member of politicians) {
    const existing = bill.whipCount[member.id];
    let vote: 'yes' | 'no';

    if (existing === 'yes' || existing === 'no') {
      vote = existing;
    } else if (member.id === sponsor.id) {
      vote = 'yes';
    } else {
      const relationshipScore = relationships[relationshipKey(sponsor.id, member.id)] ?? 0;
      const favorBankScore = favorBank[member.id] ?? 0;
      const probability = computeSupportProbability(
        member,
        sponsor,
        relationshipScore,
        favorBankScore,
        weights
      );
      vote = resolveVote(probability, rng);
    }

    finalWhipCount[member.id] = vote;
    if (vote === 'yes') yes++;
    else no++;
  }

  return { yes, no, passed: yes > no, finalWhipCount };
}

export function applyFloorVoteResult(bill: Bill, result: FloorVoteResult): Bill {
  return {
    ...bill,
    status: result.passed ? 'passed' : 'failed',
    whipCount: result.finalWhipCount,
  };
}
