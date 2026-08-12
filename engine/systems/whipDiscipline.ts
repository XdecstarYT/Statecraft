import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import { relationshipKey } from './legislative';
import type { BackbenchRebellion, Bill, PartyWhip, Party, Politician } from '../models/types';

/**
 * WHIP DISCIPLINE & BACKBENCH REBELLIONS — deliberately observational
 * rather than a rework of legislative.ts's whip-count formula: rebellion
 * is detected from a floor vote's already-resolved outcome (real signal,
 * zero risk to the heavily-tested core vote math), and the whip's real
 * lever is the existing relationships map — enforcing discipline nudges a
 * rebel's relationship with their own party leader, which the whip formula
 * already consumes via relationshipTerm. No new formula, no new weight,
 * just reusing what's already there.
 */

export const DEFAULT_PARTY_LOYALTY = 60;

export function getPartyLoyalty(partyLoyalty: Record<string, number>, politicianId: string): number {
  return partyLoyalty[politicianId] ?? DEFAULT_PARTY_LOYALTY;
}

/** One whip per party — the member with the strongest network/charisma combination, tie-broken by id for determinism. Content-free, computed at game creation like assignFactionLeaders. */
export function assignPartyWhips(politicians: Politician[], parties: Party[]): PartyWhip[] {
  const whips: PartyWhip[] = [];
  for (const party of parties) {
    const members = politicians.filter((p) => p.partyId === party.id);
    if (members.length === 0) continue;
    const whip = [...members].sort(
      (a, b) =>
        b.attributes.network + b.attributes.charisma - (a.attributes.network + a.attributes.charisma) ||
        (a.id < b.id ? -1 : 1)
    )[0];
    whips.push({ partyId: party.id, politicianId: whip.id, disciplineScore: 60 });
  }
  return whips;
}

const REBELLION_THRESHOLD = 0.25;
const MIN_PARTY_SIZE_FOR_REBELLION = 4;

/**
 * Scans one party's own members' recorded votes on a just-resolved floor
 * vote for a large-enough defection from the party's own majority stance.
 * Pure and RNG-free — the defection itself already happened inside
 * legislative.ts's resolveFloorVote; this only recognizes it. Returns null
 * when the party is too small to meaningfully have a "backbench", or the
 * defection share doesn't clear the threshold.
 */
export function detectRebellion(
  bill: Bill,
  finalWhipCount: Record<string, 'yes' | 'no'>,
  politicians: Politician[],
  party: Party,
  turn: number,
  rebellionId: string
): BackbenchRebellion | null {
  const members = politicians.filter((p) => p.partyId === party.id && p.id !== bill.sponsorId);
  if (members.length < MIN_PARTY_SIZE_FOR_REBELLION) return null;

  const votes = members.map((m) => finalWhipCount[m.id]).filter((v): v is 'yes' | 'no' => v !== undefined);
  if (votes.length < MIN_PARTY_SIZE_FOR_REBELLION) return null;

  const yesCount = votes.filter((v) => v === 'yes').length;
  const majorityStance: 'yes' | 'no' = yesCount >= votes.length / 2 ? 'yes' : 'no';
  const rebelIds = members.filter((m) => finalWhipCount[m.id] !== undefined && finalWhipCount[m.id] !== majorityStance).map((m) => m.id);

  if (rebelIds.length / votes.length < REBELLION_THRESHOLD) return null;

  return { id: rebellionId, billId: bill.id, partyId: party.id, rebelIds, turn };
}

const REBELLION_DISCIPLINE_PENALTY_PER_REBEL = 4;
const REBELLION_DISCIPLINE_PENALTY_BASE = 6;

/** A bigger rebellion costs the whip more standing than a token defection. */
export function applyRebellionToWhip(whip: PartyWhip, rebellion: BackbenchRebellion): PartyWhip {
  const penalty = REBELLION_DISCIPLINE_PENALTY_BASE + rebellion.rebelIds.length * REBELLION_DISCIPLINE_PENALTY_PER_REBEL;
  return { ...whip, disciplineScore: clamp(whip.disciplineScore - penalty, 0, 100) };
}

export interface EnforceDisciplineOutcome {
  success: boolean;
  disciplineDelta: number;
  loyaltyDelta: number;
  /** Applied to relationships[relationshipKey(partyLeaderId, rebelId)] — the real mechanical hook back into the whip-count formula. */
  relationshipDelta: number;
}

/**
 * The whip privately confronts a rebel: success chance rises with the
 * whip's own discipline score and falls with the rebel's integrity (a
 * principled holdout is harder to bring back in line than one who folds
 * under pressure).
 */
export function enforceWhipDiscipline(whip: PartyWhip, rebelIntegrity: number, rng: SeededRng): EnforceDisciplineOutcome {
  const chance = clamp(0.3 + whip.disciplineScore / 200 - rebelIntegrity / 40, 0.05, 0.9);
  const success = rng.next() < chance;
  if (success) {
    return { success, disciplineDelta: 4, loyaltyDelta: rng.nextInt(8, 16), relationshipDelta: rng.nextInt(6, 14) };
  }
  return { success, disciplineDelta: -2, loyaltyDelta: rng.nextInt(-10, -2), relationshipDelta: rng.nextInt(-8, -1) };
}

export function applyEnforceDisciplineToWhip(whip: PartyWhip, outcome: EnforceDisciplineOutcome): PartyWhip {
  return { ...whip, disciplineScore: clamp(whip.disciplineScore + outcome.disciplineDelta, 0, 100) };
}

export interface RebellionProcessingResult {
  rebellions: BackbenchRebellion[];
  partyWhips: PartyWhip[];
  relationships: Record<string, number>;
}

const REBELLION_RELATIONSHIP_PENALTY_PER_REBEL = 3;
const REBELLION_RELATIONSHIP_PENALTY_BASE = 5;

/**
 * The single call-site shape both engine/index.ts (NPC bills) and
 * ui/store.ts (player bills) reuse: scans every party for a rebellion
 * against this just-resolved floor vote, dings the offending party's whip,
 * and cools the relationship between the whip and each rebel — the real
 * mechanical hook back into legislative.ts's own relationshipTerm.
 */
export function processFloorVoteRebellions(
  bill: Bill,
  finalWhipCount: Record<string, 'yes' | 'no'>,
  politicians: Politician[],
  parties: Party[],
  partyWhips: PartyWhip[],
  relationships: Record<string, number>,
  turn: number
): RebellionProcessingResult {
  let rebellions: BackbenchRebellion[] = [];
  let nextPartyWhips = partyWhips;
  let nextRelationships = relationships;

  for (const party of parties) {
    const rebellion = detectRebellion(bill, finalWhipCount, politicians, party, turn, `rebellion-${turn}-${bill.id}-${party.id}`);
    if (!rebellion) continue;
    rebellions = [...rebellions, rebellion];

    const whip = nextPartyWhips.find((w) => w.partyId === party.id);
    if (!whip) continue;
    nextPartyWhips = nextPartyWhips.map((w) => (w.partyId === party.id ? applyRebellionToWhip(w, rebellion) : w));

    const penalty = REBELLION_RELATIONSHIP_PENALTY_BASE + rebellion.rebelIds.length * REBELLION_RELATIONSHIP_PENALTY_PER_REBEL;
    for (const rebelId of rebellion.rebelIds) {
      if (rebelId === whip.politicianId) continue;
      const key = relationshipKey(whip.politicianId, rebelId);
      nextRelationships = { ...nextRelationships, [key]: clamp((nextRelationships[key] ?? 0) - penalty, -100, 100) };
    }
  }

  return { rebellions, partyWhips: nextPartyWhips, relationships: nextRelationships };
}
