import type { SeededRng } from '../rng';
import { clampAxis, ideologicalDistance } from '../ideology';
import { WEEKS_PER_YEAR } from '../calendar';
import { generateName } from '../../content/names/pool';
import { pickWorldPartyName } from '../../content/diplomacy/worldPartyNames';
import type { ForeignCounterpart, IdeologyPosition, WorldElectionResult, WorldGovernment } from '../models/types';

/**
 * WORLD ELECTIONS — every nation in the world roster (not just the
 * player's own country) holds real, seeded-deterministic elections on its
 * own schedule. Deliberately much lighter-weight than the player's own
 * legislature: no district/party-roster simulation for 193 nations, just
 * an approval-driven incumbent-retention roll that can hand power to a
 * fresh (ideologically jittered) party, exactly the kind of real-code,
 * no-runtime-LLM abstraction CLAUDE.md calls for.
 */
export const WORLD_TERM_LENGTH_TURNS = WEEKS_PER_YEAR * 4;

/** Bounds how much recent foreign-election history the UI keeps. */
export const WORLD_ELECTION_HISTORY_LIMIT = 40;

/** Deterministically staggers each nation's first election so all ~193 don't fire in lockstep. */
function staggerOffset(counterpartId: string): number {
  let hash = 0;
  for (let i = 0; i < counterpartId.length; i++) hash = (hash * 31 + counterpartId.charCodeAt(i)) >>> 0;
  return hash % WORLD_TERM_LENGTH_TURNS;
}

export function initializeWorldGovernments(counterparts: ForeignCounterpart[], rng: SeededRng): WorldGovernment[] {
  return counterparts.map((c) => ({
    counterpartId: c.id,
    rulingPartyName: pickWorldPartyName(c.ideology, rng),
    leaderName: generateName(rng),
    approval: 40 + rng.nextInt(0, 30),
    nextElectionTurn: 1 + staggerOffset(c.id),
    lastElectionTurn: null,
    termsServed: 0,
  }));
}

/** A small bounded random walk each turn — some governments drift more or less popular independent of anything the player does. */
export function driftApproval(gov: WorldGovernment, rng: SeededRng): WorldGovernment {
  const delta = (rng.next() - 0.5) * 4;
  return { ...gov, approval: Math.max(5, Math.min(95, gov.approval + delta)) };
}

const INCUMBENT_RETENTION_BASE = 0.5;

/** 0..1 — centered on 50% approval, moving roughly 1% per point of approval away from 50. */
export function computeIncumbentRetentionProbability(gov: WorldGovernment): number {
  return Math.max(0.05, Math.min(0.95, INCUMBENT_RETENTION_BASE + (gov.approval - 50) / 100));
}

/**
 * Resolves one nation's election: the incumbent is retained on a
 * probability roll weighted by their approval, or an opposition party
 * takes over with an ideology jittered around the old one (same bounded
 * jitter shape as generatePoliticians) — a real regime change that can
 * measurably shift where that nation sits ideologically, not just a
 * cosmetic name swap.
 */
export function resolveWorldElection(
  counterpart: ForeignCounterpart,
  gov: WorldGovernment,
  rng: SeededRng
): { government: WorldGovernment; counterpart: ForeignCounterpart; result: WorldElectionResult } {
  const turn = gov.nextElectionTurn;
  const retained = rng.next() < computeIncumbentRetentionProbability(gov);

  if (retained) {
    const government: WorldGovernment = {
      ...gov,
      lastElectionTurn: turn,
      nextElectionTurn: turn + WORLD_TERM_LENGTH_TURNS,
      termsServed: gov.termsServed + 1,
      approval: Math.max(30, Math.min(70, gov.approval)),
    };
    return {
      government,
      counterpart,
      result: {
        counterpartId: counterpart.id,
        turn,
        incumbentReturned: true,
        previousPartyName: gov.rulingPartyName,
        newPartyName: gov.rulingPartyName,
        newLeaderName: gov.leaderName,
        ideologyShift: { economic: 0, social: 0 },
      },
    };
  }

  const jitter = () => (rng.next() - 0.5) * 40;
  const newIdeology: IdeologyPosition = {
    economic: clampAxis(counterpart.ideology.economic + jitter()),
    social: clampAxis(counterpart.ideology.social + jitter()),
  };
  const newPartyName = pickWorldPartyName(newIdeology, rng);
  const newLeaderName = generateName(rng);

  const government: WorldGovernment = {
    counterpartId: gov.counterpartId,
    rulingPartyName: newPartyName,
    leaderName: newLeaderName,
    approval: 45 + rng.nextInt(0, 20),
    lastElectionTurn: turn,
    nextElectionTurn: turn + WORLD_TERM_LENGTH_TURNS,
    termsServed: 1,
  };

  return {
    government,
    counterpart: { ...counterpart, ideology: newIdeology },
    result: {
      counterpartId: counterpart.id,
      turn,
      incumbentReturned: false,
      previousPartyName: gov.rulingPartyName,
      newPartyName,
      newLeaderName,
      ideologyShift: {
        economic: newIdeology.economic - counterpart.ideology.economic,
        social: newIdeology.social - counterpart.ideology.social,
      },
    },
  };
}

/**
 * How a foreign leadership change nudges the player's relationship with
 * them: growing ideologically closer to the player's own country warms
 * relations a little, growing apart cools them — bounded and deterministic,
 * not a random swing independent of the ideology shift that just happened.
 */
export function computeRealignmentRelationDelta(
  oldIdeology: IdeologyPosition,
  newIdeology: IdeologyPosition,
  playerIdeology: IdeologyPosition
): number {
  const distanceBefore = ideologicalDistance(oldIdeology, playerIdeology);
  const distanceAfter = ideologicalDistance(newIdeology, playerIdeology);
  const improvement = distanceBefore - distanceAfter;
  return Math.max(-10, Math.min(10, improvement / 10));
}

export interface WorldElectionsTurnResult {
  counterparts: ForeignCounterpart[];
  governments: WorldGovernment[];
  foreignRelations: Record<string, number>;
  results: WorldElectionResult[];
}

/**
 * Runs one turn of world elections: drifts every government's approval,
 * resolves any nation whose term is up this turn, and applies the
 * ideological-realignment relation nudge for any resulting regime change.
 */
export function runWorldElectionsTurn(
  counterparts: ForeignCounterpart[],
  governments: WorldGovernment[],
  foreignRelations: Record<string, number>,
  playerIdeology: IdeologyPosition,
  turn: number,
  rng: SeededRng
): WorldElectionsTurnResult {
  let nextCounterparts = counterparts;
  let nextRelations = foreignRelations;
  const results: WorldElectionResult[] = [];

  const nextGovernments = governments.map((gov) => driftApproval(gov, rng)).map((gov) => {
    if (gov.nextElectionTurn !== turn) return gov;
    const counterpart = nextCounterparts.find((c) => c.id === gov.counterpartId);
    if (!counterpart) return gov;

    const oldIdeology = counterpart.ideology;
    const { government, counterpart: updatedCounterpart, result } = resolveWorldElection(counterpart, gov, rng);
    nextCounterparts = nextCounterparts.map((c) => (c.id === updatedCounterpart.id ? updatedCounterpart : c));
    results.push(result);

    if (!result.incumbentReturned) {
      const delta = computeRealignmentRelationDelta(oldIdeology, updatedCounterpart.ideology, playerIdeology);
      const current = nextRelations[counterpart.id] ?? 0;
      nextRelations = { ...nextRelations, [counterpart.id]: Math.max(-100, Math.min(100, current + delta)) };
    }

    return government;
  });

  return { counterparts: nextCounterparts, governments: nextGovernments, foreignRelations: nextRelations, results };
}
