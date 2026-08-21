import type { SeededRng } from '../rng';
import { clamp, ideologicalAlignment, ideologicalDistance } from '../ideology';
import { relationshipKey } from './legislative';
import type { CabinetPortfolio, Coalition, CoalitionOffer, IdeologyPosition, Party, Politician } from '../models/types';

/** True once a single party alone holds a strict majority of the legislature's seats. */
export function hasOutrightMajority(parties: Party[]): boolean {
  const total = parties.reduce((sum, p) => sum + p.seats, 0);
  if (total <= 0) return false;
  return parties.some((p) => p.seats > total / 2);
}

export interface CoalitionMembership {
  memberPartyIds: string[];
  formateurPartyId: string;
}

/**
 * Greedily builds a governing coalition around the largest party (the
 * "formateur"): starting from the formateur, repeatedly invites whichever
 * remaining party is ideologically closest to it until a majority is
 * reached, or every party has joined (a grand coalition) if it takes that
 * many. Mirrors how real coalition talks favor compatible partners over
 * simply the next-biggest party.
 */
export function formCoalition(parties: Party[]): CoalitionMembership {
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);
  const sorted = [...parties].sort((a, b) => b.seats - a.seats);
  const formateur = sorted[0];

  const memberPartyIds = [formateur.id];
  let seats = formateur.seats;

  const remaining = [...sorted.slice(1)].sort(
    (a, b) =>
      ideologicalDistance(a.ideology, formateur.ideology) - ideologicalDistance(b.ideology, formateur.ideology)
  );

  for (const party of remaining) {
    if (seats > totalSeats / 2) break;
    memberPartyIds.push(party.id);
    seats += party.seats;
  }

  return { memberPartyIds, formateurPartyId: formateur.id };
}

/** Seat-weighted average ideology of the coalition's member parties — the government's working platform. */
export function computeCoalitionIdeology(parties: Party[], memberPartyIds: string[]): IdeologyPosition {
  const members = parties.filter((p) => memberPartyIds.includes(p.id));
  const totalSeats = members.reduce((sum, p) => sum + p.seats, 0);
  if (totalSeats <= 0) return { economic: 0, social: 0 };
  return {
    economic: members.reduce((sum, p) => sum + p.ideology.economic * p.seats, 0) / totalSeats,
    social: members.reduce((sum, p) => sum + p.ideology.social * p.seats, 0) / totalSeats,
  };
}

export interface ConfidenceVoteWeights {
  ideology: number;
  partyLine: number;
  relationship: number;
}

/**
 * Party-line loyalty (whether a member's own party actually joined the
 * coalition) dominates, same as the bill whip formula's partyLine term;
 * ideology and personal relationship with the Prime Minister nudge waverers
 * either way.
 */
export const DEFAULT_CONFIDENCE_WEIGHTS: ConfidenceVoteWeights = {
  ideology: 1.6,
  partyLine: 2.0,
  relationship: 0.6,
};

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/** Probability [0, 1) that one member backs the coalition in the confidence vote. */
export function computeConfidenceSupportProbability(
  member: Politician,
  coalitionIdeology: IdeologyPosition,
  primeMinister: Politician,
  relationships: Record<string, number>,
  isCoalitionMember: boolean,
  weights: ConfidenceVoteWeights = DEFAULT_CONFIDENCE_WEIGHTS
): number {
  const ideologyTerm = ideologicalAlignment(member.ideology, coalitionIdeology) * 2 - 1; // -1..1
  const partyLineTerm = isCoalitionMember ? 1 : -1;
  const relationshipTerm = clamp((relationships[relationshipKey(member.id, primeMinister.id)] ?? 0) / 100, -1, 1);

  const score =
    weights.ideology * ideologyTerm + weights.partyLine * partyLineTerm + weights.relationship * relationshipTerm;
  return sigmoid(score);
}

export interface ConfidenceVoteResult {
  votesFor: number;
  votesAgainst: number;
  passed: boolean;
}

/**
 * Every sitting member — not just the coalition parties' own members —
 * casts a seeded vote of confidence in the new government. A coalition
 * with a real seat majority usually holds, but individual defections
 * (an ideologically alienated member of a coalition party, or a sympathetic
 * opposition member) are real possibilities, not guaranteed by the seat
 * count alone.
 */
export function resolveConfidenceVote(
  membership: CoalitionMembership,
  politicians: Politician[],
  primeMinister: Politician,
  coalitionIdeology: IdeologyPosition,
  relationships: Record<string, number>,
  rng: SeededRng,
  weights: ConfidenceVoteWeights = DEFAULT_CONFIDENCE_WEIGHTS
): ConfidenceVoteResult {
  let votesFor = 0;
  let votesAgainst = 0;
  for (const member of politicians) {
    const isCoalitionMember = membership.memberPartyIds.includes(member.partyId);
    const probability = computeConfidenceSupportProbability(
      member,
      coalitionIdeology,
      primeMinister,
      relationships,
      isCoalitionMember,
      weights
    );
    if (rng.next() < probability) votesFor++;
    else votesAgainst++;
  }
  return { votesFor, votesAgainst, passed: votesFor > votesAgainst };
}

/**
 * The shared second half of government formation once membership is
 * already decided (whether by formCoalition's own greedy pick or by the
 * player resolving a CoalitionOffer below): picks the Prime Minister (the
 * formateur party's recorded leader) and immediately puts the government to
 * a confidence vote — one that loses starts life already 'collapsed'
 * rather than 'governing', a real and immediate stake rather than a
 * formality.
 */
export function formGovernmentFromMembership(
  membership: CoalitionMembership,
  parties: Party[],
  politicians: Politician[],
  partyLeaderId: Record<string, string>,
  relationships: Record<string, number>,
  turn: number,
  rng: SeededRng
): Coalition {
  const { memberPartyIds, formateurPartyId } = membership;
  const primeMinisterId = partyLeaderId[formateurPartyId];
  const primeMinister = politicians.find((p) => p.id === primeMinisterId);
  if (!primeMinister) {
    throw new Error(`No recorded leader for formateur party "${formateurPartyId}"`);
  }

  const coalitionIdeology = computeCoalitionIdeology(parties, memberPartyIds);
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);
  const seatsHeld = parties
    .filter((p) => memberPartyIds.includes(p.id))
    .reduce((sum, p) => sum + p.seats, 0);

  const result = resolveConfidenceVote(membership, politicians, primeMinister, coalitionIdeology, relationships, rng);

  return {
    id: `coalition-${turn}`,
    memberPartyIds,
    formateurPartyId,
    primeMinisterId,
    seatsHeld,
    totalSeats,
    status: result.passed ? 'governing' : 'collapsed',
    confidenceVotesFor: result.votesFor,
    confidenceVotesAgainst: result.votesAgainst,
    formedTurn: turn,
  };
}

/**
 * The full post-election government-formation pipeline: assembles the
 * coalition via formCoalition's own greedy pick, then hands off to
 * formGovernmentFromMembership. This is the auto-resolve path used
 * whenever there's no real player choice to make (see computeCoalitionOffers
 * for when there is).
 */
export function formGovernment(
  parties: Party[],
  politicians: Politician[],
  partyLeaderId: Record<string, string>,
  relationships: Record<string, number>,
  turn: number,
  rng: SeededRng
): Coalition {
  return formGovernmentFromMembership(formCoalition(parties), parties, politicians, partyLeaderId, relationships, turn, rng);
}

const OFFER_PORTFOLIO_BY_RANK: CabinetPortfolio[] = ['finance', 'foreignAffairs', 'justice', 'defense'];

/**
 * COALITION NEGOTIATION — when no party holds an outright majority and the
 * player's own party isn't the natural formateur (the largest party), the
 * player is genuinely pivotal to how government forms: they can join the
 * formateur's coalition (for a real cabinet portfolio, roughly scaled to
 * their party's seat rank within it) or decline and let the rest of
 * parliament govern without them — a real choice with a real outcome,
 * rather than the greedy auto-pick silently deciding for them. Returns an
 * empty list whenever there's nothing to negotiate (an outright majority
 * exists, the player's party holds no seats, or the player's party is
 * itself the natural formateur and already leads by default).
 */
export function computeCoalitionOffers(parties: Party[], playerPartyId: string): CoalitionOffer[] {
  if (hasOutrightMajority(parties)) return [];
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);
  if (totalSeats <= 0) return [];
  const playerParty = parties.find((p) => p.id === playerPartyId);
  if (!playerParty || playerParty.seats <= 0) return [];

  const sorted = [...parties].sort((a, b) => b.seats - a.seats);
  const naturalFormateur = sorted[0];
  if (naturalFormateur.id === playerPartyId) return [];

  const joinMembers = [naturalFormateur.id, playerPartyId];
  let joinSeats = parties.filter((p) => joinMembers.includes(p.id)).reduce((sum, p) => sum + p.seats, 0);
  const joinRemaining = sorted
    .filter((p) => !joinMembers.includes(p.id))
    .sort((a, b) => ideologicalDistance(a.ideology, naturalFormateur.ideology) - ideologicalDistance(b.ideology, naturalFormateur.ideology));
  for (const party of joinRemaining) {
    if (joinSeats > totalSeats / 2) break;
    joinMembers.push(party.id);
    joinSeats += party.seats;
  }

  const joinRank = [...parties]
    .filter((p) => joinMembers.includes(p.id))
    .sort((a, b) => b.seats - a.seats)
    .findIndex((p) => p.id === playerPartyId);
  const offeredPortfolio = OFFER_PORTFOLIO_BY_RANK[Math.min(Math.max(joinRank, 0), OFFER_PORTFOLIO_BY_RANK.length - 1)];

  const oppositionParties = parties.filter((p) => p.id !== playerPartyId);
  const oppositionFormation = formCoalition(oppositionParties);
  const oppositionSeats = parties
    .filter((p) => oppositionFormation.memberPartyIds.includes(p.id))
    .reduce((sum, p) => sum + p.seats, 0);

  return [
    {
      id: 'join',
      label: `Join a coalition led by ${naturalFormateur.id}`,
      memberPartyIds: joinMembers,
      formateurPartyId: naturalFormateur.id,
      seatsHeld: joinSeats,
      totalSeats,
      offeredPortfolio,
    },
    {
      id: 'opposition',
      label: 'Decline and sit in opposition',
      memberPartyIds: oppositionFormation.memberPartyIds,
      formateurPartyId: oppositionFormation.formateurPartyId,
      seatsHeld: oppositionSeats,
      totalSeats,
      offeredPortfolio: null,
    },
  ];
}

/** Resolves the player's chosen CoalitionOffer into a real Coalition via the same confidence-vote pipeline as the auto-resolve path. */
export function resolveCoalitionOffer(
  offer: CoalitionOffer,
  parties: Party[],
  politicians: Politician[],
  partyLeaderId: Record<string, string>,
  relationships: Record<string, number>,
  turn: number,
  rng: SeededRng
): Coalition {
  return formGovernmentFromMembership(
    { memberPartyIds: offer.memberPartyIds, formateurPartyId: offer.formateurPartyId },
    parties,
    politicians,
    partyLeaderId,
    relationships,
    turn,
    rng
  );
}
