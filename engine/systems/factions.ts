import { MAX_IDEOLOGICAL_DISTANCE, clampAxis, ideologicalDistance } from '../ideology';
import type { Faction, IdeologyPosition, Party, Politician } from '../models/types';
import { MAX_FAVORS } from './legislative';

/** Key identifying one faction within one party — distinct from a bare faction name, since two parties can happen to name a wing the same thing. */
export function factionKey(partyId: string, factionName: string): string {
  return `${partyId}:${factionName}`;
}

function relationshipKeyLocal(idA: string, idB: string): string {
  return idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
}

/**
 * The faction within `member`'s own party whose ideological wing (the
 * party's baseline economic position plus that faction's offset) sits
 * closest to the member's own generated economic-axis ideology. Politicians
 * are generated with ideology jittered around their party's position (see
 * engine/index.ts's generatePoliticians), so this recovers a real,
 * deterministic faction membership from that existing jitter rather than
 * requiring a separately-stored field that could drift out of sync.
 * Returns undefined for parties that define no factions.
 */
export function findMemberFaction(member: Politician, party: Party): Faction | undefined {
  if (party.factions.length === 0) return undefined;
  const memberOffset = member.ideology.economic - party.ideology.economic;
  return [...party.factions].sort(
    (a, b) => Math.abs(a.ideologyOffset - memberOffset) - Math.abs(b.ideologyOffset - memberOffset)
  )[0];
}

/**
 * Deterministically picks one representative leader per defined faction —
 * the member with the highest network attribute (tiebroken by id for
 * stability), same shape as engine/index.ts's partyLeaderId but one level
 * more granular. A faction leader is a separate negotiation target from the
 * party leader: courting them (relationship/favors) sways their whole wing,
 * not just themselves — see computeFactionTerm.
 */
export function assignFactionLeaders(politicians: Politician[], parties: Party[]): Record<string, string> {
  const leaders: Record<string, string> = {};
  for (const party of parties) {
    for (const faction of party.factions) {
      const members = politicians.filter(
        (p) => p.partyId === party.id && findMemberFaction(p, party)?.name === faction.name
      );
      if (members.length === 0) continue;
      const leader = [...members].sort(
        (a, b) => b.attributes.network - a.attributes.network || (a.id < b.id ? -1 : 1)
      )[0];
      leaders[factionKey(party.id, faction.name)] = leader.id;
    }
  }
  return leaders;
}

/**
 * A per-member -1..1 term for the whip-count formula (see legislative.ts's
 * computeSupportProbability) capturing real faction discipline:
 *
 *  - "cohesion": how the member's own wing's ideological position (party
 *    baseline + faction offset, not the member's own noisy jitter) reads
 *    against the sponsor — factional wings move together even when
 *    individual jitter would suggest otherwise.
 *  - "leader disposition": whether the player has actually courted that
 *    faction's specific leader (via relationship or favors) independently
 *    of the member's own relationship with the sponsor — winning over a
 *    faction leader is meant to sway their whole bloc, distinct from
 *    winning over the party leader.
 *
 * Returns 0 (neutral, no effect on the formula) for members whose party
 * defines no factions, preserving old behavior exactly for content that
 * hasn't been given factional structure.
 */
export function computeFactionTerm(
  member: Politician,
  sponsor: Politician,
  memberParty: Party | undefined,
  relationships: Record<string, number>,
  favorBank: Record<string, number>,
  factionLeaderId: Record<string, string>
): number {
  if (!memberParty) return 0;
  const faction = findMemberFaction(member, memberParty);
  if (!faction) return 0;

  const factionIdeology: IdeologyPosition = {
    economic: clampAxis(memberParty.ideology.economic + faction.ideologyOffset),
    social: memberParty.ideology.social,
  };
  const distance = ideologicalDistance(factionIdeology, sponsor.ideology);
  const cohesionTerm = 1 - (2 * distance) / MAX_IDEOLOGICAL_DISTANCE;

  const leaderId = factionLeaderId[factionKey(memberParty.id, faction.name)];
  let leaderDispositionTerm = 0;
  if (leaderId && leaderId !== member.id && leaderId !== sponsor.id) {
    const leaderRelationship = relationships[relationshipKeyLocal(sponsor.id, leaderId)] ?? 0;
    const leaderFavors = favorBank[leaderId] ?? 0;
    leaderDispositionTerm =
      Math.max(-1, Math.min(1, leaderRelationship / 100)) * 0.5 +
      Math.max(0, Math.min(1, leaderFavors / MAX_FAVORS)) * 0.5;
  } else if (leaderId === member.id) {
    // The faction leader's own vote is already governed by their personal
    // relationship/favor terms in the main formula — the leader-disposition
    // term exists to sway *other* members of the bloc, not double-count the
    // leader's own stance.
    leaderDispositionTerm = 0;
  }

  return Math.max(-1, Math.min(1, 0.5 * cohesionTerm + 0.5 * leaderDispositionTerm));
}

/**
 * Precomputes computeFactionTerm for every member against one sponsor —
 * the shape resolveFloorVote/pollWhipCount/attemptCloture/resolveCommitteeVote
 * consume, so those functions don't need to depend on factions.ts directly.
 */
export function computeFactionTerms(
  politicians: Politician[],
  sponsor: Politician,
  parties: Party[],
  relationships: Record<string, number>,
  favorBank: Record<string, number>,
  factionLeaderId: Record<string, string>
): Record<string, number> {
  const terms: Record<string, number> = {};
  for (const member of politicians) {
    if (member.id === sponsor.id) continue;
    const memberParty = parties.find((p) => p.id === member.partyId);
    terms[member.id] = computeFactionTerm(member, sponsor, memberParty, relationships, favorBank, factionLeaderId);
  }
  return terms;
}
