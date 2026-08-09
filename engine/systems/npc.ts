import type { SeededRng } from '../rng';
import { clamp, ideologicalAlignment } from '../ideology';
import { relationshipKey } from './legislative';
import type { Bill, CorruptionTier, Party, Politician, ScandalResponse, WhipStance } from '../models/types';

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

export function decideNpcStance(
  member: Politician,
  sponsor: Politician,
  relationshipScore: number
): WhipStance {
  if (member.id === sponsor.id) return 'yes';

  const alignment = ideologicalAlignment(member.ideology, sponsor.ideology);
  const sameParty = member.partyId === sponsor.partyId;

  if (sameParty && alignment >= ALIGNED_THRESHOLD) return 'yes';
  if (!sameParty && alignment <= OPPOSED_THRESHOLD && relationshipScore <= HOSTILE_RELATIONSHIP) return 'no';
  return 'undecided';
}

/**
 * Applies decideNpcStance for every NPC member who doesn't already have a
 * locked stance on the bill (a player-locked stance is never overwritten).
 */
export function applyNpcStances(
  bill: Bill,
  politicians: Politician[],
  sponsor: Politician,
  relationships: Record<string, number>
): Bill {
  let next = bill;
  for (const member of politicians) {
    if (member.isPlayer) continue;
    if (next.whipCount[member.id] === 'yes' || next.whipCount[member.id] === 'no') continue;
    const relationshipScore = relationships[relationshipKey(sponsor.id, member.id)] ?? 0;
    const stance = decideNpcStance(member, sponsor, relationshipScore);
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
