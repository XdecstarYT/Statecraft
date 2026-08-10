import { SeededRng } from '../rng';
import { MAX_IDEOLOGICAL_DISTANCE, ideologicalDistance } from '../ideology';
import type { Bill, InterestGroup, Politician } from '../models/types';

export const MAX_GROUP_INFLUENCE = 100;

/** Disposition drifts this fraction of the way back toward neutral each turn unless reinforced. */
const DISPOSITION_DECAY_RATE = 0.05;

/**
 * How strongly a group backs or opposes a bill: -1 (fully opposed) .. 1
 * (fully supportive). Driven mostly by how closely the group's ideology
 * matches the bill's sponsor (the same ideological-distance math the whip
 * formula itself uses), plus a smaller bonus/penalty for whether the bill's
 * net fiscal direction matches the group's own economic lean — a
 * free-market-leaning group favors net-savings bills, a state-directed one
 * favors net-spending bills, regardless of the sponsor's overall ideology.
 */
export function computeGroupStance(group: InterestGroup, bill: Bill, sponsor: Politician): number {
  const distance = ideologicalDistance(group.ideology, sponsor.ideology);
  const ideologyTerm = 1 - (2 * distance) / MAX_IDEOLOGICAL_DISTANCE;

  const netImpact = bill.provisions.reduce((sum, p) => sum + p.budgetImpact, 0);
  let fiscalTerm = 0;
  if (netImpact !== 0 && group.ideology.economic !== 0) {
    fiscalTerm = Math.sign(netImpact) === Math.sign(group.ideology.economic) ? 0.3 : -0.3;
  }

  return Math.max(-1, Math.min(1, 0.7 * ideologyTerm + fiscalTerm));
}

/**
 * One group's contribution to the chamber-wide lobbying pressure on a bill:
 * its ideological stance, scaled by its organizing clout, further nudged by
 * how it feels about the player specifically when the player is the
 * sponsor (a friendly group lobbies harder for a player bill than pure
 * ideology alone would predict; a hostile one holds back even if it should
 * ideologically agree).
 */
function computeGroupPressureOnBill(group: InterestGroup, bill: Bill, sponsor: Politician): number {
  const stance = computeGroupStance(group, bill, sponsor);
  const dispositionBoost = sponsor.isPlayer ? (group.disposition / 100) * 0.3 : 0;
  const weight = group.influence / MAX_GROUP_INFLUENCE;
  return weight * Math.max(-1, Math.min(1, stance + dispositionBoost));
}

/**
 * The bill-level lobbying pressure fed into the whip formula: the average
 * of every group's weighted pressure, since groups lobby the chamber as a
 * whole rather than individual members. Returns 0 (no effect) when there
 * are no interest groups at all.
 */
export function computeLobbyingPressure(groups: InterestGroup[], bill: Bill, sponsor: Politician): number {
  if (groups.length === 0) return 0;
  const total = groups.reduce((sum, g) => sum + computeGroupPressureOnBill(g, bill, sponsor), 0);
  return Math.max(-1, Math.min(1, total / groups.length));
}

export interface CourtGroupOutcome {
  success: boolean;
  dispositionDelta: number;
}

/**
 * The player spends effort courting a group directly (meetings, funding
 * pledges, endorsement asks) — success chance rises with network and
 * charisma. A failed attempt still nudges disposition, just barely and
 * sometimes negatively, since a clumsy overture can mildly irritate a group
 * that was lukewarm to begin with.
 */
export function courtInterestGroup(player: Politician, rng: SeededRng): CourtGroupOutcome {
  const chance = 0.4 + (player.attributes.network + player.attributes.charisma) / 80;
  const success = rng.next() < chance;
  const dispositionDelta = success ? rng.nextInt(8, 20) : rng.nextInt(-6, 2);
  return { success, dispositionDelta };
}

export function applyCourtOutcome(group: InterestGroup, outcome: CourtGroupOutcome): InterestGroup {
  return { ...group, disposition: Math.max(-100, Math.min(100, group.disposition + outcome.dispositionDelta)) };
}

/**
 * Every group updates its disposition toward the sponsor a little based on
 * whether the floor vote went the way the group wanted — a real feedback
 * loop, not a one-shot lobbying roll: back a bill that passes (or oppose
 * one that fails) and a group warms up; get outvoted and it cools, all
 * scaled by how much the group actually cared (its own stance strength) and
 * its organizing clout.
 */
export function applyBillOutcomeToGroups(
  groups: InterestGroup[],
  bill: Bill,
  sponsor: Politician,
  passed: boolean
): InterestGroup[] {
  return groups.map((group) => {
    const stance = computeGroupStance(group, bill, sponsor);
    const gotWhatItWanted = passed ? stance : -stance;
    const delta = gotWhatItWanted * (group.influence / MAX_GROUP_INFLUENCE) * 6;
    return { ...group, disposition: Math.max(-100, Math.min(100, group.disposition + delta)) };
  });
}

/** Applied once per turn: unreinforced relationships fade toward neutral rather than staying banked forever. */
export function decayGroupDispositions(groups: InterestGroup[]): InterestGroup[] {
  return groups.map((group) => ({
    ...group,
    disposition: group.disposition * (1 - DISPOSITION_DECAY_RATE),
  }));
}
