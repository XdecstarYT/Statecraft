import { SeededRng } from '../rng';
import { MAX_IDEOLOGICAL_DISTANCE, ideologicalDistance } from '../ideology';
import type { Bill, BillProvision, EconomyDelta, Politician, WhipStance } from '../models/types';

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
  /** Weight on the aggregate interest-group lobbying pressure term (see lobbying.ts). */
  lobbying: number;
  /** Weight on the per-member faction-discipline term (see factions.ts's computeFactionTerm). */
  faction: number;
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
  lobbying: 0.7,
  faction: 0.5,
};

/**
 * Computes the probability [0, 1) that `member` votes yes on a bill sponsored
 * by `sponsor`, per the whip-count formula in CLAUDE.md §5. `lobbyingPressure`
 * is the bill-level aggregate from engine/systems/lobbying.ts's
 * computeLobbyingPressure — a single term shared by every undecided member
 * rather than a per-member one, since interest groups lobby the chamber as a
 * whole rather than individual members. `factionTerm` is this specific
 * member's faction-discipline term from engine/systems/factions.ts's
 * computeFactionTerm — 0 (its default) for content without defined
 * factions, so callers that don't pass it get identical behavior to before
 * factions existed.
 */
export function computeSupportProbability(
  member: Politician,
  sponsor: Politician,
  relationshipScore: number,
  favorBankScore: number,
  weights: WhipWeights = DEFAULT_WHIP_WEIGHTS,
  maxFavors: number = MAX_FAVORS,
  lobbyingPressure = 0,
  factionTerm = 0
): number {
  const distance = ideologicalDistance(member.ideology, sponsor.ideology);
  // 1 (perfectly aligned) .. -1 (maximally opposed)
  const ideologyTerm = 1 - (2 * distance) / MAX_IDEOLOGICAL_DISTANCE;
  // -1 (hostile) .. 1 (close ally)
  const relationshipTerm = Math.max(-1, Math.min(1, relationshipScore / 100));
  const partyLineTerm = member.partyId === sponsor.partyId ? 1 : -1;
  // 0 (no favors owed) .. 1 (fully banked)
  const favorsTerm = maxFavors > 0 ? Math.max(0, Math.min(1, favorBankScore / maxFavors)) : 0;
  // -1 (chamber-wide lobbying against) .. 1 (chamber-wide lobbying for)
  const lobbyingTerm = Math.max(-1, Math.min(1, lobbyingPressure));
  // -1 (faction defects from sponsor) .. 1 (faction & its leader are bought in)
  const factionTermClamped = Math.max(-1, Math.min(1, factionTerm));

  const supportScore =
    weights.ideology * ideologyTerm +
    weights.relationship * relationshipTerm +
    weights.partyLine * partyLineTerm +
    weights.favors * favorsTerm +
    weights.lobbying * lobbyingTerm +
    weights.faction * factionTermClamped;

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
  weights: WhipWeights = DEFAULT_WHIP_WEIGHTS,
  lobbyingPressure = 0,
  factionTerms: Record<string, number> = {}
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
        weights,
        MAX_FAVORS,
        lobbyingPressure,
        factionTerms[member.id] ?? 0
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
  weights: WhipWeights = DEFAULT_WHIP_WEIGHTS,
  lobbyingPressure = 0,
  factionTerms: Record<string, number> = {}
): FloorVoteResult {
  assertStatus(bill, 'floor');
  if (bill.filibustered) {
    throw new Error(`Bill "${bill.id}" is filibustered — cloture must succeed before the floor vote can resolve`);
  }
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
        weights,
        MAX_FAVORS,
        lobbyingPressure,
        factionTerms[member.id] ?? 0
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

/**
 * BILL AMENDMENTS — provisions can be reworked while a bill is still in
 * drafting or committee, so a sponsor can trade away or add provisions to
 * chase votes before the floor vote locks anything in. Amending after a
 * bill reaches the floor isn't allowed — that's what the vote is for.
 */
function assertAmendable(bill: Bill) {
  if (bill.status !== 'drafting' && bill.status !== 'committee') {
    throw new Error(
      `Bill "${bill.id}" can only be amended while drafting or in committee, but is "${bill.status}"`
    );
  }
}

export function addBillProvision(bill: Bill, provision: BillProvision): Bill {
  assertAmendable(bill);
  return { ...bill, provisions: [...bill.provisions, provision] };
}

export function removeBillProvision(bill: Bill, provisionId: string): Bill {
  assertAmendable(bill);
  return { ...bill, provisions: bill.provisions.filter((p) => p.id !== provisionId) };
}

export function amendBillProvision(
  bill: Bill,
  provisionId: string,
  updates: Partial<Omit<BillProvision, 'id'>>
): Bill {
  assertAmendable(bill);
  return {
    ...bill,
    provisions: bill.provisions.map((p) => (p.id === provisionId ? { ...p, ...updates } : p)),
  };
}

/**
 * FILIBUSTER & CLOTURE — a minority can stall a floor vote indefinitely
 * once invoked; only a supermajority cloture vote can break it and let the
 * real floor vote proceed. Cloture reuses the same support-probability
 * model as the floor vote itself (a member's likely cloture vote tracks
 * their likely bill vote), so it costs real political capital to model
 * separately from just whipping harder.
 */
export const CLOTURE_THRESHOLD = 0.6;

export function invokeFilibuster(bill: Bill): Bill {
  assertStatus(bill, 'floor');
  return { ...bill, filibustered: true };
}

export interface ClotureResult {
  succeeded: boolean;
  yesCount: number;
  totalCount: number;
  requiredCount: number;
}

export function attemptCloture(
  bill: Bill,
  politicians: Politician[],
  relationships: Record<string, number>,
  favorBank: Record<string, number>,
  rng: SeededRng,
  weights: WhipWeights = DEFAULT_WHIP_WEIGHTS,
  lobbyingPressure = 0,
  threshold: number = CLOTURE_THRESHOLD,
  factionTerms: Record<string, number> = {}
): { bill: Bill; result: ClotureResult } {
  assertStatus(bill, 'floor');
  const sponsor = politicians.find((p) => p.id === bill.sponsorId);
  if (!sponsor) {
    throw new Error(`Sponsor "${bill.sponsorId}" not found among politicians`);
  }

  let yesCount = 0;
  for (const member of politicians) {
    const existing = bill.whipCount[member.id];
    let votesYes: boolean;
    if (existing === 'yes' || existing === 'no') {
      votesYes = existing === 'yes';
    } else if (member.id === sponsor.id) {
      votesYes = true;
    } else {
      const relationshipScore = relationships[relationshipKey(sponsor.id, member.id)] ?? 0;
      const favorBankScore = favorBank[member.id] ?? 0;
      const probability = computeSupportProbability(
        member,
        sponsor,
        relationshipScore,
        favorBankScore,
        weights,
        MAX_FAVORS,
        lobbyingPressure,
        factionTerms[member.id] ?? 0
      );
      votesYes = resolveVote(probability, rng) === 'yes';
    }
    if (votesYes) yesCount++;
  }

  const totalCount = politicians.length;
  const requiredCount = Math.ceil(totalCount * threshold);
  const succeeded = yesCount >= requiredCount;

  return {
    bill: succeeded ? { ...bill, filibustered: false } : bill,
    result: { succeeded, yesCount, totalCount, requiredCount },
  };
}

/**
 * Provisions carry a flavor-scale budgetImpact (thousands of currency
 * units, roughly). This converts a bill's net fiscal direction into a real
 * EconomyState-scale delta so passing a law actually moves the economy
 * instead of just displaying numbers. Deficit spending gives a small
 * short-term growth boost; net savings/austerity gives a small drag —
 * no free lunches, per CLAUDE.md's economy spec.
 */
const BUDGET_IMPACT_SCALE = 10_000;

export function computeBillEconomyEffect(bill: Bill): EconomyDelta {
  const netImpact = bill.provisions.reduce((sum, p) => sum + p.budgetImpact, 0);
  const budgetBalance = netImpact / BUDGET_IMPACT_SCALE;
  const gdpGrowth = -netImpact / (BUDGET_IMPACT_SCALE * 4);
  return { budgetBalance, gdpGrowth };
}

/**
 * Same net-fiscal-direction math as computeBillEconomyEffect, sign-flipped
 * into "how much this bill invests in its own category" — positive for a
 * net-spending bill, negative for a net-savings/austerity one. Consumed by
 * engine/index.ts's applyBillCategoryEffect to size the bill's nudge to
 * whichever specific system its category maps to (crime, pollution, life
 * expectancy, ...), same no-free-lunch shape as the economy effect: real
 * spending helps the domain, cuts hurt it.
 */
export function computeBillDomainMagnitude(bill: Bill): number {
  const netImpact = bill.provisions.reduce((sum, p) => sum + p.budgetImpact, 0);
  return -netImpact / BUDGET_IMPACT_SCALE;
}
