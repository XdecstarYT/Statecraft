import type { SeededRng } from '../rng';
import { clamp, ideologicalAlignment } from '../ideology';
import { relationshipKey } from './legislative';
import type { LeadershipChallenge, Politician } from '../models/types';

/** Below this partyElite approval, a challenge becomes possible; the further under, the likelier. */
export const LEADERSHIP_CHALLENGE_THRESHOLD = 35;
const LEADERSHIP_CHALLENGE_BASE_CHANCE = 0.25;
const LEADERSHIP_CHALLENGE_MAX_CHANCE = 0.6;

/** 0 at/above the threshold, rising toward LEADERSHIP_CHALLENGE_MAX_CHANCE the further underwater the incumbent's standing is. */
export function computeChallengeChance(partyEliteApproval: number): number {
  if (partyEliteApproval >= LEADERSHIP_CHALLENGE_THRESHOLD) return 0;
  const deficit = (LEADERSHIP_CHALLENGE_THRESHOLD - partyEliteApproval) / LEADERSHIP_CHALLENGE_THRESHOLD;
  return Math.min(LEADERSHIP_CHALLENGE_MAX_CHANCE, LEADERSHIP_CHALLENGE_BASE_CHANCE * (1 + deficit));
}

/**
 * The most credible rival to front a challenge: the incumbent's own
 * party-mate with the strongest combination of charisma, network, and
 * intellect (a small random jitter keeps ties from always resolving the
 * same way seat-order would suggest).
 */
export function selectChallenger(
  incumbent: Politician,
  politicians: Politician[],
  rng: SeededRng
): Politician | null {
  const candidates = politicians.filter((p) => p.partyId === incumbent.partyId && p.id !== incumbent.id);
  if (candidates.length === 0) return null;
  let best = candidates[0];
  let bestScore = -Infinity;
  for (const candidate of candidates) {
    const score =
      candidate.attributes.charisma + candidate.attributes.network + candidate.attributes.intellect + rng.next() * 5;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/** Rolls whether a leadership challenge breaks out against `incumbent` this turn. Null when it doesn't. */
export function rollForLeadershipChallenge(
  incumbent: Politician,
  politicians: Politician[],
  turn: number,
  rng: SeededRng
): LeadershipChallenge | null {
  const chance = computeChallengeChance(incumbent.approval.partyElite);
  if (chance <= 0 || rng.next() >= chance) return null;
  const challenger = selectChallenger(incumbent, politicians, rng);
  if (!challenger) return null;
  return {
    id: `leadership-${incumbent.partyId}-${turn}`,
    partyId: incumbent.partyId,
    incumbentId: incumbent.id,
    challengerId: challenger.id,
    turnCalled: turn,
    status: 'brewing',
  };
}

export interface LeadershipWeights {
  ideology: number;
  relationship: number;
  standing: number;
}

/**
 * Ideology and current standing with the party elite matter most; personal
 * relationship with the voting member is real but secondary — mirrors how
 * the bill whip formula weights ideology heaviest.
 */
export const DEFAULT_LEADERSHIP_WEIGHTS: LeadershipWeights = {
  ideology: 2.0,
  relationship: 1.0,
  standing: 1.5,
};

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function candidateScore(
  member: Politician,
  candidate: Politician,
  relationships: Record<string, number>,
  weights: LeadershipWeights
): number {
  const ideologyTerm = ideologicalAlignment(member.ideology, candidate.ideology) * 2 - 1; // -1..1
  const relationshipTerm = clamp((relationships[relationshipKey(member.id, candidate.id)] ?? 0) / 100, -1, 1);
  const standingTerm = (candidate.approval.partyElite - 50) / 50; // -1..1
  return weights.ideology * ideologyTerm + weights.relationship * relationshipTerm + weights.standing * standingTerm;
}

/** Probability [0, 1) that `member` backs the challenger over the incumbent. */
export function computeChallengerSupportProbability(
  member: Politician,
  incumbent: Politician,
  challenger: Politician,
  relationships: Record<string, number>,
  weights: LeadershipWeights = DEFAULT_LEADERSHIP_WEIGHTS
): number {
  const incumbentScore = candidateScore(member, incumbent, relationships, weights);
  const challengerScore = candidateScore(member, challenger, relationships, weights);
  return sigmoid(challengerScore - incumbentScore);
}

export interface LeadershipVoteResult {
  incumbentVotes: number;
  challengerVotes: number;
  winnerId: string;
}

/**
 * Every other member of the party (the two candidates don't vote on
 * themselves) casts a seeded vote against their computed support
 * probability. Ties favor the incumbent — an open party stays with its
 * sitting leader rather than flipping on a coin flip.
 */
export function resolveLeadershipVote(
  challenge: LeadershipChallenge,
  politicians: Politician[],
  relationships: Record<string, number>,
  rng: SeededRng,
  weights: LeadershipWeights = DEFAULT_LEADERSHIP_WEIGHTS
): LeadershipVoteResult {
  const incumbent = politicians.find((p) => p.id === challenge.incumbentId);
  const challenger = politicians.find((p) => p.id === challenge.challengerId);
  if (!incumbent || !challenger) {
    throw new Error('Both the incumbent and the challenger must still be present among politicians');
  }

  const voters = politicians.filter(
    (p) => p.partyId === challenge.partyId && p.id !== incumbent.id && p.id !== challenger.id
  );

  let incumbentVotes = 0;
  let challengerVotes = 0;
  for (const voter of voters) {
    const probability = computeChallengerSupportProbability(voter, incumbent, challenger, relationships, weights);
    if (rng.next() < probability) challengerVotes++;
    else incumbentVotes++;
  }

  return {
    incumbentVotes,
    challengerVotes,
    winnerId: challengerVotes > incumbentVotes ? challenger.id : incumbent.id,
  };
}

const PARTY_STANDING_SKILL_ATTRIBUTE_SPAN = 30;

export function computePartyStandingSkill(politician: Politician): number {
  return (
    (politician.attributes.charisma + politician.attributes.integrity + politician.attributes.network) /
    PARTY_STANDING_SKILL_ATTRIBUTE_SPAN
  );
}

export type PartyActionOutcomeTier = 'strong' | 'solid' | 'backfire';

export interface PartyActionOutcome {
  outcome: PartyActionOutcomeTier;
  impact: number;
}

interface PartyActionConfig {
  strongImpact: number;
  solidImpact: number;
  backfireImpact: number;
}

function rollPartyAction(skill: number, config: PartyActionConfig, rng: SeededRng): PartyActionOutcome {
  const s = clamp(skill, 0, 1);
  const pStrong = 0.15 + s * 0.35;
  const pBackfire = 0.3 - s * 0.25;
  const roll = rng.next();
  if (roll < pStrong) return { outcome: 'strong', impact: config.strongImpact };
  if (roll < 1 - pBackfire) return { outcome: 'solid', impact: config.solidImpact };
  return { outcome: 'backfire', impact: config.backfireImpact };
}

const RALLY_PARTY_CONFIG: PartyActionConfig = { strongImpact: 14, solidImpact: 5, backfireImpact: -6 };

/**
 * The incumbent shores up support directly — calling in favors, working
 * the phones — boosting their own partyElite standing. Charisma +
 * integrity + network driven, per computePartyStandingSkill.
 */
export function rallyPartySupport(incumbent: Politician, rng: SeededRng): PartyActionOutcome {
  return rollPartyAction(computePartyStandingSkill(incumbent), RALLY_PARTY_CONFIG, rng);
}

// Impact here lands on the CHALLENGER's partyElite standing: a successful
// denouncement drags them down; a backfire (misjudging the room) actually
// earns them sympathy and a small boost instead.
const DENOUNCE_CONFIG: PartyActionConfig = { strongImpact: -16, solidImpact: -7, backfireImpact: 4 };

/** The incumbent goes on the attack against the challenger. Same skill driver as rallyPartySupport, real backfire risk. */
export function denounceChallenger(incumbent: Politician, rng: SeededRng): PartyActionOutcome {
  return rollPartyAction(computePartyStandingSkill(incumbent), DENOUNCE_CONFIG, rng);
}
