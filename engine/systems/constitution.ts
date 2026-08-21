import type { SeededRng } from '../rng';
import { DEFAULT_WHIP_WEIGHTS, MAX_FAVORS, computeSupportProbability, relationshipKey, type WhipWeights } from './legislative';
import type { AmendmentChange, Country, ConstitutionalAmendment, HouseRules, Politician, WhipStance } from '../models/types';

/**
 * CONSTITUTIONAL REFORM — the player can propose a real amendment to one of
 * the country's own founding rules (electoral system, legislative term
 * length, a house rule, or the regime type itself). It clears the same
 * whip-count math a bill's floor vote uses, just at a much higher bar: a
 * two-thirds supermajority rather than a simple majority. A passed
 * amendment is then actually applied to the live Country/HouseRules —
 * nothing here is cosmetic.
 */
export const AMENDMENT_SUPERMAJORITY_THRESHOLD = 2 / 3;

export function proposeAmendment(
  amendment: Omit<ConstitutionalAmendment, 'status' | 'whipCount'>
): ConstitutionalAmendment {
  return { ...amendment, status: 'proposed', whipCount: {} };
}

export interface AmendmentVoteResult {
  yes: number;
  no: number;
  passed: boolean;
  finalWhipCount: Record<string, WhipStance>;
}

/**
 * Resolves the supermajority vote: the sponsor always votes yes, every
 * other member's vote rolls against the same ideology/relationship/favor
 * support-probability model an ordinary floor vote uses (see
 * legislative.ts's computeSupportProbability) — a supermajority is
 * genuinely hard to assemble, not a coin flip with a higher number
 * attached.
 */
export function resolveAmendmentVote(
  amendment: ConstitutionalAmendment,
  politicians: Politician[],
  relationships: Record<string, number>,
  favorBank: Record<string, number>,
  rng: SeededRng,
  weights: WhipWeights = DEFAULT_WHIP_WEIGHTS,
  threshold: number = AMENDMENT_SUPERMAJORITY_THRESHOLD
): AmendmentVoteResult {
  const sponsor = politicians.find((p) => p.id === amendment.sponsorId);
  if (!sponsor) {
    throw new Error(`Sponsor "${amendment.sponsorId}" not found among politicians`);
  }

  const finalWhipCount: Record<string, WhipStance> = {};
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
    finalWhipCount[member.id] = vote;
    if (vote === 'yes') yes++;
    else no++;
  }

  const total = yes + no;
  const passed = total > 0 && yes / total >= threshold;
  return { yes, no, passed, finalWhipCount };
}

export function applyAmendmentVoteResult(
  amendment: ConstitutionalAmendment,
  result: AmendmentVoteResult,
  turn: number
): ConstitutionalAmendment {
  return {
    ...amendment,
    status: result.passed ? 'passed' : 'failed',
    whipCount: result.finalWhipCount,
    votesFor: result.yes,
    votesAgainst: result.no,
    turnResolved: turn,
  };
}

export interface AmendmentApplication {
  country: Country;
  houseRules: HouseRules;
  /** Only populated for a 'term_length' change — the caller (engine/index.ts) owns the actual GameState.legislativeTermLengthTurns field. */
  termLengthTurns?: number;
}

/**
 * Applies a passed amendment's concrete change to the live country/house
 * rules. A no-op (returns the inputs unchanged) if the amendment's own
 * payload is malformed for its declared type — callers only invoke this
 * after confirming `status === 'passed'`.
 */
export function applyAmendmentChange(country: Country, houseRules: HouseRules, change: AmendmentChange): AmendmentApplication {
  switch (change.type) {
    case 'electoral_system':
      if (!change.electoralSystem) return { country, houseRules };
      return {
        country: { ...country, legislature: { ...country.legislature, electoralSystem: change.electoralSystem } },
        houseRules,
      };
    case 'regime_type':
      if (!change.regimeType) return { country, houseRules };
      return { country: { ...country, regimeType: change.regimeType }, houseRules };
    case 'house_rule':
      if (!change.houseRule || change.houseRuleValue === undefined) return { country, houseRules };
      return { country, houseRules: { ...houseRules, [change.houseRule]: change.houseRuleValue } };
    case 'term_length':
      if (!change.termLengthTurns || change.termLengthTurns <= 0) return { country, houseRules };
      return { country, houseRules, termLengthTurns: change.termLengthTurns };
    default:
      return { country, houseRules };
  }
}

/** A short, player-facing label for an amendment's change — used by the UI and by proposal flavor. */
export function describeAmendmentChange(change: AmendmentChange): string {
  switch (change.type) {
    case 'electoral_system':
      return `Switch the electoral system to ${change.electoralSystem === 'PR_DHONDT' ? "party-list PR (D'Hondt)" : 'first-past-the-post'}`;
    case 'regime_type':
      return `Change the regime type to ${change.regimeType?.replace('-', ' ')}`;
    case 'house_rule':
      return `Set house rule "${change.houseRule}" to ${change.houseRuleValue ? 'on' : 'off'}`;
    case 'term_length':
      return `Set the legislative term length to ${change.termLengthTurns} weeks`;
    default:
      return 'Unknown constitutional change';
  }
}
