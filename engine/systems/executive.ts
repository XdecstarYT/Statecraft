import type { SeededRng } from '../rng';
import { DEFAULT_WHIP_WEIGHTS, MAX_FAVORS, computeSupportProbability, relationshipKey, type WhipWeights } from './legislative';
import type { Bill, Country, ExecutiveOrder, Politician } from '../models/types';

/**
 * EXECUTIVE POWERS — presidential/semi-presidential regimes (see
 * Country.regimeType) give the player, as head of state, real leverage a
 * parliamentary premier doesn't have: a bill that clears the floor vote
 * doesn't become law until they sign it, a veto can be overridden by the
 * same two-thirds supermajority a constitutional amendment needs (see
 * constitution.ts), and — independent of the legislature entirely — a
 * bounded, cooldown-gated executive order.
 */

/** Parliamentary heads of government answer to the floor vote directly — no separate signature step. */
export function requiresExecutiveSignature(country: Country): boolean {
  return country.regimeType !== 'parliamentary';
}

/** A bill that just cleared the floor vote, awaiting the executive's decision. */
export function sendToExecutiveReview(bill: Bill): Bill {
  return { ...bill, status: 'awaiting_signature', vetoStatus: 'none' };
}

export function signBill(bill: Bill): Bill {
  return { ...bill, status: 'passed', vetoStatus: 'none' };
}

export function vetoBill(bill: Bill): Bill {
  return { ...bill, status: 'vetoed', vetoStatus: 'vetoed' };
}

export const VETO_OVERRIDE_THRESHOLD = 2 / 3;

export interface VetoOverrideResult {
  yes: number;
  no: number;
  passed: boolean;
}

/**
 * Resolves a veto-override vote: the bill's original sponsor still
 * champions it and always votes yes, everyone else rolls against the same
 * support-probability model an ordinary floor vote uses, and it needs the
 * same two-thirds bar a constitutional amendment does — overriding a veto
 * is meant to be genuinely hard.
 */
export function resolveVetoOverride(
  bill: Bill,
  politicians: Politician[],
  relationships: Record<string, number>,
  favorBank: Record<string, number>,
  rng: SeededRng,
  weights: WhipWeights = DEFAULT_WHIP_WEIGHTS,
  threshold: number = VETO_OVERRIDE_THRESHOLD
): VetoOverrideResult {
  const sponsor = politicians.find((p) => p.id === bill.sponsorId);
  if (!sponsor) {
    throw new Error(`Sponsor "${bill.sponsorId}" not found among politicians`);
  }

  let yes = 0;
  let no = 0;
  for (const member of politicians) {
    let vote: 'yes' | 'no';
    if (member.id === sponsor.id) {
      vote = 'yes';
    } else {
      const relationshipScore = relationships[relationshipKey(sponsor.id, member.id)] ?? 0;
      const favorBankScore = favorBank[member.id] ?? 0;
      const probability = computeSupportProbability(member, sponsor, relationshipScore, favorBankScore, weights, MAX_FAVORS, 0, 0);
      vote = rng.next() < probability ? 'yes' : 'no';
    }
    if (vote === 'yes') yes++;
    else no++;
  }

  const total = yes + no;
  return { yes, no, passed: total > 0 && yes / total >= threshold };
}

export function applyVetoOverrideResult(bill: Bill, result: VetoOverrideResult): Bill {
  return result.passed ? { ...bill, status: 'passed', vetoStatus: 'overridden' } : { ...bill, vetoStatus: 'sustained' };
}

/**
 * EXECUTIVE ORDERS — a real, unilateral action the legislature has no say
 * in, at the cost of a long cooldown so it can't substitute for actually
 * building a legislative coalition.
 */
export const EXECUTIVE_ORDER_COOLDOWN_TURNS = 12;

export function canIssueExecutiveOrder(country: Country, turn: number, lastExecutiveOrderTurn: number | null): boolean {
  if (country.regimeType === 'parliamentary') return false;
  if (lastExecutiveOrderTurn === null) return true;
  return turn - lastExecutiveOrderTurn >= EXECUTIVE_ORDER_COOLDOWN_TURNS;
}

export function issueExecutiveOrder(order: Omit<ExecutiveOrder, 'turnIssued'>, turn: number): ExecutiveOrder {
  return { ...order, turnIssued: turn };
}
