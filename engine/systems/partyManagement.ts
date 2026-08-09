import type { SeededRng } from '../rng';
import { clamp, ideologicalDistance, MAX_IDEOLOGICAL_DISTANCE } from '../ideology';
import { relationshipKey } from './legislative';
import type { IdeologyPosition, Party, Politician } from '../models/types';

/**
 * PARTY FOUNDING — a politician can break away and found a new party
 * around their own ideology. Every other member of their old party then
 * makes an independent, seeded choice about whether to follow: a member
 * only ever defects toward a party that's genuinely closer to their own
 * views than the one they're leaving, with a warmer relationship to the
 * founder making that pull a little stronger. Nobody defects to somewhere
 * further from what they actually believe, no matter how close a friend
 * the founder is.
 */

const DEFECTION_BASE_CHANCE = 0.5;
const DEFECTION_RELATIONSHIP_WEIGHT = 0.2;

/** 0 if the new party isn't actually closer to the member's own ideology than their current one. */
export function computeDefectionProbability(
  member: Politician,
  oldParty: Party,
  newPartyIdeology: IdeologyPosition,
  relationshipToFounder: number
): number {
  const distanceToOld = ideologicalDistance(member.ideology, oldParty.ideology);
  const distanceToNew = ideologicalDistance(member.ideology, newPartyIdeology);
  if (distanceToNew >= distanceToOld) return 0;

  const pull = (distanceToOld - distanceToNew) / MAX_IDEOLOGICAL_DISTANCE;
  const relationshipTerm = clamp(relationshipToFounder / 100, -1, 1);
  return clamp(DEFECTION_BASE_CHANCE * pull * 2 + relationshipTerm * DEFECTION_RELATIONSHIP_WEIGHT, 0, 0.95);
}

export interface FoundPartyResult {
  newParty: Party;
  updatedParties: Party[];
  updatedPoliticians: Politician[];
  defectorIds: string[];
}

/**
 * The founder always leaves their old party; every other member of that
 * party rolls independently against computeDefectionProbability. Seats
 * move with the people — the old party loses one seat per defector (plus
 * the founder), the new party starts with exactly that many.
 */
export function foundParty(
  founder: Politician,
  politicians: Politician[],
  parties: Party[],
  newPartyId: string,
  newPartyName: string,
  newPartyIdeology: IdeologyPosition,
  relationships: Record<string, number>,
  rng: SeededRng
): FoundPartyResult {
  const oldParty = parties.find((p) => p.id === founder.partyId);
  if (!oldParty) {
    throw new Error(`Founder's party "${founder.partyId}" not found`);
  }

  const otherMembers = politicians.filter((p) => p.partyId === founder.partyId && p.id !== founder.id);
  const defectorIds: string[] = [];
  for (const member of otherMembers) {
    const relationshipToFounder = relationships[relationshipKey(founder.id, member.id)] ?? 0;
    const probability = computeDefectionProbability(member, oldParty, newPartyIdeology, relationshipToFounder);
    if (rng.next() < probability) defectorIds.push(member.id);
  }

  const movedIds = new Set([founder.id, ...defectorIds]);
  const updatedPoliticians = politicians.map((p) => (movedIds.has(p.id) ? { ...p, partyId: newPartyId } : p));

  const seatsMoved = movedIds.size;
  const newParty: Party = { id: newPartyId, name: newPartyName, ideology: newPartyIdeology, seats: seatsMoved, factions: [] };
  const updatedParties = [
    ...parties.map((p) => (p.id === oldParty.id ? { ...p, seats: Math.max(0, p.seats - seatsMoved) } : p)),
    newParty,
  ];

  return { newParty, updatedParties, updatedPoliticians, defectorIds };
}

/**
 * PARTY MERGERS — the reverse operation: one party's members all fold
 * into another, seats and all. Used both for player-initiated mergers and
 * (later) as the natural cleanup when a founded party never grows beyond
 * its founder.
 */
export function mergeParties(
  politicians: Politician[],
  parties: Party[],
  absorbedPartyId: string,
  survivingPartyId: string
): { updatedParties: Party[]; updatedPoliticians: Politician[] } {
  const absorbed = parties.find((p) => p.id === absorbedPartyId);
  const surviving = parties.find((p) => p.id === survivingPartyId);
  if (!absorbed || !surviving) {
    throw new Error('Both the absorbed and surviving party must exist');
  }

  const updatedPoliticians = politicians.map((p) =>
    p.partyId === absorbedPartyId ? { ...p, partyId: survivingPartyId } : p
  );
  const updatedParties = parties
    .filter((p) => p.id !== absorbedPartyId)
    .map((p) => (p.id === survivingPartyId ? { ...p, seats: p.seats + absorbed.seats } : p));

  return { updatedParties, updatedPoliticians };
}

/** Renames a party and/or repositions its ideology — a rebrand, not a founding. */
export function rebrandParty(
  parties: Party[],
  partyId: string,
  newName: string,
  newIdeology?: IdeologyPosition
): Party[] {
  return parties.map((p) => (p.id === partyId ? { ...p, name: newName, ideology: newIdeology ?? p.ideology } : p));
}
