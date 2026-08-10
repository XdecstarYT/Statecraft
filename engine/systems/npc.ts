import type { SeededRng } from '../rng';
import { clamp, ideologicalAlignment } from '../ideology';
import { relationshipKey } from './legislative';
import { computeMediaSkill } from './campaign';
import type { Bill, Coalition, CorruptionTier, Party, Politician, ScandalResponse, WhipStance } from '../models/types';

/**
 * Rule-based NPC decision-making — no LLM calls, just the same kind of
 * weighted/deterministic logic the rest of the engine uses. NPCs only ever
 * lock in a stance when the case is clear-cut (strongly aligned allies,
 * clearly hostile opponents); anything in between is deliberately left
 * 'undecided' so the existing probability-weighted whip roll still governs
 * genuinely contested votes.
 */

const ALIGNED_THRESHOLD = 0.6;
const OPPOSED_THRESHOLD = 0.4;
const HOSTILE_RELATIONSHIP = -20;

/**
 * A rival party opposing the government (the player) whips its members
 * harder than it would against a fellow backbencher's bill — real party
 * discipline, not independent judgment. Both the alignment bar and the
 * relationship bar are looser than the ordinary opposed-vote case.
 */
const OPPOSITION_ALIGNMENT_THRESHOLD = 0.5;
const OPPOSITION_RELATIONSHIP_THRESHOLD = 0;

/**
 * Coalition partners lean toward the government's bills even across party
 * lines — this bonus nudges their effective alignment up without ever
 * fully overriding deep ideological distance.
 */
const COALITION_DISCIPLINE_BONUS = 0.15;

export interface NpcStanceOptions {
  /** Added to the member's ideological alignment with the sponsor — coalition partners get a boost. */
  coalitionBonus?: number;
  /** Whether the sponsor is the player (government) — opposition parties whip harder against government bills. */
  coordinatedOpposition?: boolean;
}

export function decideNpcStance(
  member: Politician,
  sponsor: Politician,
  relationshipScore: number,
  options: NpcStanceOptions = {}
): WhipStance {
  if (member.id === sponsor.id) return 'yes';

  const alignment = clamp(ideologicalAlignment(member.ideology, sponsor.ideology) + (options.coalitionBonus ?? 0), 0, 1);
  const sameParty = member.partyId === sponsor.partyId;
  const isCoalitionAlly = !sameParty && (options.coalitionBonus ?? 0) > 0;

  if ((sameParty || isCoalitionAlly) && alignment >= ALIGNED_THRESHOLD) return 'yes';
  if (!sameParty && options.coordinatedOpposition) {
    if (alignment <= OPPOSITION_ALIGNMENT_THRESHOLD && relationshipScore <= OPPOSITION_RELATIONSHIP_THRESHOLD) return 'no';
  }
  if (!sameParty && alignment <= OPPOSED_THRESHOLD && relationshipScore <= HOSTILE_RELATIONSHIP) return 'no';
  return 'undecided';
}

/**
 * How much a coalition partnership should nudge a cross-party member's
 * effective alignment with the sponsor — 0 outside of an active coalition,
 * or when the member and sponsor already share a party (that path is
 * already covered by same-party alignment).
 */
export function computeCoalitionDisciplineBonus(
  member: Politician,
  sponsor: Politician,
  coalition: Coalition | null
): number {
  if (!coalition || member.partyId === sponsor.partyId) return 0;
  const bothInCoalition =
    coalition.memberPartyIds.includes(member.partyId) && coalition.memberPartyIds.includes(sponsor.partyId);
  return bothInCoalition ? COALITION_DISCIPLINE_BONUS : 0;
}

/**
 * Applies decideNpcStance for every NPC member who doesn't already have a
 * locked stance on the bill (a player-locked stance is never overwritten).
 * Coalition partners get a discipline bonus toward the sponsor's line, and
 * when the sponsor is the player, opposition parties whip harder against
 * the government than they would against one of their own peers.
 */
export function applyNpcStances(
  bill: Bill,
  politicians: Politician[],
  sponsor: Politician,
  relationships: Record<string, number>,
  coalition: Coalition | null = null
): Bill {
  let next = bill;
  for (const member of politicians) {
    if (member.isPlayer) continue;
    if (next.whipCount[member.id] === 'yes' || next.whipCount[member.id] === 'no') continue;
    const relationshipScore = relationships[relationshipKey(sponsor.id, member.id)] ?? 0;
    const stance = decideNpcStance(member, sponsor, relationshipScore, {
      coalitionBonus: computeCoalitionDisciplineBonus(member, sponsor, coalition),
      coordinatedOpposition: sponsor.isPlayer,
    });
    if (stance !== 'undecided') {
      next = { ...next, whipCount: { ...next.whipCount, [member.id]: stance } };
    }
  }
  return next;
}

/** Picks who sponsors the next NPC bill — weighted toward ambitious, well-connected members. */
export function selectNpcBillSponsor(politicians: Politician[], rng: SeededRng): Politician | null {
  const candidates = politicians.filter((p) => !p.isPlayer);
  if (candidates.length === 0) return null;
  const weighted = candidates.map((p) => ({
    item: p,
    weight: p.attributes.network + p.attributes.intellect,
  }));
  return rng.pickWeighted(weighted);
}

export interface BillTemplateLike {
  title: string;
  provisions: { budgetImpact: number }[];
}

/**
 * Picks a bill template whose net fiscal direction fits the sponsor's
 * economic ideology — free-market-leaning sponsors favor templates that
 * don't blow out the budget, state-leaning sponsors favor bigger spending.
 */
export function selectNpcBillTemplate<T extends BillTemplateLike>(sponsor: Politician, templates: T[], rng: SeededRng): T {
  const weighted = templates.map((template) => {
    const netImpact = template.provisions.reduce((sum, p) => sum + p.budgetImpact, 0);
    const marketLeaning = sponsor.ideology.economic >= 0;
    const fits = marketLeaning ? netImpact >= -1500 : netImpact < -1500;
    return { item: template, weight: fits ? 2 : 1 };
  });
  return rng.pickWeighted(weighted);
}

const RELATIONSHIP_AGREEMENT_DELTA = 2;

/**
 * After any floor vote resolves, warms the player's relationship with
 * everyone who voted the same way and cools it with everyone who didn't —
 * a real, emergent consequence of how the floor lines up, not just a
 * player-triggered action.
 */
export function updateRelationshipsAfterVote(
  relationships: Record<string, number>,
  playerId: string,
  finalWhipCount: Record<string, 'yes' | 'no'>
): Record<string, number> {
  const playerStance = finalWhipCount[playerId];
  if (!playerStance) return relationships;

  const next = { ...relationships };
  for (const [politicianId, stance] of Object.entries(finalWhipCount)) {
    if (politicianId === playerId) continue;
    const key = relationshipKey(playerId, politicianId);
    const delta = stance === playerStance ? RELATIONSHIP_AGREEMENT_DELTA : -RELATIONSHIP_AGREEMENT_DELTA;
    next[key] = clamp((next[key] ?? 0) + delta, -100, 100);
  }
  return next;
}

const MIN_MOMENTUM = 0.7;
const MAX_MOMENTUM = 1.3;

/**
 * Converts a party's public approval into an election vote-share
 * multiplier — closes the loop between how well a party (and its members)
 * are doing and how it fares at the ballot box.
 */
export function computePartyMomentum(approval: number): number {
  return clamp(MIN_MOMENTUM + (approval / 100) * (MAX_MOMENTUM - MIN_MOMENTUM), MIN_MOMENTUM, MAX_MOMENTUM);
}

/**
 * Every party gets real momentum from its members' average public
 * approval, not just the player's — a rival party governing well (or
 * badly) should show up at the ballot box too, not just you.
 */
export function computeAllPartyMomentum(
  politicians: Politician[],
  parties: Party[]
): Record<string, number> {
  const momentum: Record<string, number> = {};
  for (const party of parties) {
    const members = politicians.filter((p) => p.partyId === party.id);
    if (members.length === 0) continue;
    const avgApproval = members.reduce((sum, p) => sum + p.approval.public, 0) / members.length;
    momentum[party.id] = computePartyMomentum(avgApproval);
  }
  return momentum;
}

const STRATEGIC_LEADER_BOOST = 1.05;
const STRATEGIC_LONGSHOT_PENALTY = 0.95;
/** Within this many points of seat share of the leader still counts as "in real contention". */
const COMPETITIVE_SEAT_SHARE_GAP = 0.15;

/**
 * Layers a strategic-targeting multiplier on top of computeAllPartyMomentum:
 * parties within real contention for the lead pour resources in and get a
 * small edge, while clear also-rans hold back and get a small penalty —
 * real parties don't campaign as hard for seats they have no shot at. This
 * only ever nudges the existing approval-driven momentum, never overrides
 * it: a party's ordering by momentum among equally-competitive rivals is
 * always governed by how well it's actually governing.
 */
export function computeStrategicMomentum(
  politicians: Politician[],
  parties: Party[]
): Record<string, number> {
  const baseMomentum = computeAllPartyMomentum(politicians, parties);
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);
  if (totalSeats <= 0) return baseMomentum;

  const shares = new Map(parties.map((p) => [p.id, p.seats / totalSeats]));
  const leaderShare = Math.max(...shares.values());

  const strategic: Record<string, number> = {};
  for (const [partyId, base] of Object.entries(baseMomentum)) {
    const gap = leaderShare - (shares.get(partyId) ?? 0);
    const multiplier = gap <= COMPETITIVE_SEAT_SHARE_GAP ? STRATEGIC_LEADER_BOOST : STRATEGIC_LONGSHOT_PENALTY;
    strategic[partyId] = clamp(base * multiplier, MIN_MOMENTUM, MAX_MOMENTUM);
  }
  return strategic;
}

/**
 * Picks who fronts the next NPC campaign action — weighted toward
 * politicians who are actually good at it (charisma/media savvy/network),
 * same spirit as selectNpcBillSponsor.
 */
export function selectNpcCampaigner(politicians: Politician[], rng: SeededRng): Politician | null {
  const candidates = politicians.filter((p) => !p.isPlayer);
  if (candidates.length === 0) return null;
  const weighted = candidates.map((p) => ({
    item: p,
    weight: p.attributes.charisma + p.attributes.mediaSavvy + p.attributes.network,
  }));
  return rng.pickWeighted(weighted);
}

const SMEAR_ALIGNMENT_THRESHOLD = 0.45;
const SMEAR_HOSTILE_RELATIONSHIP = -10;

/**
 * Whether `attacker` is positioned to run a smear campaign against
 * `target` this turn — an opportunistic rival move, not something just
 * anyone attempts: the target needs a live scandal to point to, and the
 * attacker needs to actually be a real ideological and personal rival,
 * not just any NPC in the chamber.
 */
export function canSmearCampaign(
  attacker: Politician,
  target: Politician,
  relationshipScore: number,
  targetHasActiveScandal: boolean
): boolean {
  if (!targetHasActiveScandal || attacker.id === target.id) return false;
  const alignment = ideologicalAlignment(attacker.ideology, target.ideology);
  return alignment <= SMEAR_ALIGNMENT_THRESHOLD && relationshipScore <= SMEAR_HOSTILE_RELATIONSHIP;
}

/**
 * Picks who among the rivals eligible per canSmearCampaign actually
 * launches the attack this turn — weighted toward whoever has the
 * strongest media chops, same spirit as selectNpcCampaigner. Returns null
 * when nobody currently qualifies.
 */
export function selectSmearCampaigner(
  politicians: Politician[],
  target: Politician,
  relationships: Record<string, number>,
  targetHasActiveScandal: boolean,
  rng: SeededRng
): Politician | null {
  const eligible = politicians.filter((p) => {
    if (p.isPlayer || p.id === target.id) return false;
    const relationshipScore = relationships[relationshipKey(p.id, target.id)] ?? 0;
    return canSmearCampaign(p, target, relationshipScore, targetHasActiveScandal);
  });
  if (eligible.length === 0) return null;
  const weighted = eligible.map((p) => ({ item: p, weight: p.attributes.charisma + p.attributes.mediaSavvy }));
  return rng.pickWeighted(weighted);
}

export interface SmearCampaignOutcome {
  outcome: 'landed' | 'backfired';
  targetApprovalImpact: number;
  attackerApprovalImpact: number;
}

const SMEAR_LANDED_TARGET_IMPACT = -8;
const SMEAR_BACKFIRE_TARGET_IMPACT = -1;
const SMEAR_LANDED_ATTACKER_IMPACT = 2;
const SMEAR_BACKFIRE_ATTACKER_IMPACT = -6;
const SMEAR_MIN_BACKFIRE_CHANCE = 0.1;
const SMEAR_MAX_BACKFIRE_CHANCE = 0.35;

/**
 * Rolls the outcome of a smear campaign: a skilled attacker (high
 * charisma/media savvy) lands the hit far more often than they backfire,
 * but the tail risk of a "low blow" backlash never fully disappears —
 * same shape as the campaign.ts skill-vs-gaffe rolls.
 */
export function attemptSmearCampaign(attacker: Politician, rng: SeededRng): SmearCampaignOutcome {
  const skill = computeMediaSkill(attacker);
  const backfireChance = clamp(
    SMEAR_MAX_BACKFIRE_CHANCE - skill * (SMEAR_MAX_BACKFIRE_CHANCE - SMEAR_MIN_BACKFIRE_CHANCE),
    SMEAR_MIN_BACKFIRE_CHANCE,
    SMEAR_MAX_BACKFIRE_CHANCE
  );
  if (rng.next() < backfireChance) {
    return {
      outcome: 'backfired',
      targetApprovalImpact: SMEAR_BACKFIRE_TARGET_IMPACT,
      attackerApprovalImpact: SMEAR_BACKFIRE_ATTACKER_IMPACT,
    };
  }
  return {
    outcome: 'landed',
    targetApprovalImpact: SMEAR_LANDED_TARGET_IMPACT,
    attackerApprovalImpact: SMEAR_LANDED_ATTACKER_IMPACT,
  };
}

/**
 * Whether — and how boldly — an NPC risks a corrupt act this week. Low
 * integrity means both a higher chance of attempting anything at all and a
 * willingness to reach for a riskier tier; most NPCs, most weeks, attempt
 * nothing. Returns null when they sit this week out.
 */
export function selectNpcCorruptionTier(politician: Politician, rng: SeededRng): CorruptionTier | null {
  const boldness = (10 - clamp(politician.attributes.integrity, 1, 10)) / 10;
  if (rng.next() > 0.1 + boldness * 0.3) return null;
  if (boldness > 0.6) return rng.pick<CorruptionTier>(['medium', 'hard']);
  if (boldness > 0.3) return rng.pick<CorruptionTier>(['soft', 'medium']);
  return 'soft';
}

/**
 * The rule-based response an NPC gives when their own corruption is
 * exposed — this is their call, not the player's, so it never surfaces as
 * a player-facing choice the way the player's own scandals do. Higher
 * integrity means owning up; a well-connected operator finds someone to
 * blame; everyone else just denies it.
 */
export function decideNpcScandalResponse(politician: Politician): ScandalResponse {
  if (politician.attributes.integrity >= 7) return 'admit';
  if (politician.attributes.network >= 7) return 'scapegoat';
  return 'deny';
}
