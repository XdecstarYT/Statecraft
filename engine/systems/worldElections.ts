import type { SeededRng } from '../rng';
import { clampAxis, ideologicalDistance } from '../ideology';
import { WEEKS_PER_YEAR } from '../calendar';
import { generateName } from '../../content/names/pool';
import { pickWorldPartyName } from '../../content/diplomacy/worldPartyNames';
import { computeForeignSeatCount } from '../../content/diplomacy/legislatureSeats';
import { generateDistrictVotes, resolveFPTPElection } from './elections';
import type {
  District,
  DistrictResult,
  ForeignCounterpart,
  IdeologyPosition,
  Party,
  VoterBloc,
  WorldElectionResult,
  WorldGovernment,
} from '../models/types';

/**
 * WORLD ELECTIONS — every nation in the world roster (not just the
 * player's own country) holds real, seeded-deterministic elections on its
 * own schedule, and — like the player's own legislature — those elections
 * are genuinely counted seat-by-seat across that nation's own single-member
 * districts (see initializeForeignLegislatures/resolveForeignElection
 * below), not an abstract national coin flip. Real per-seat CLAUDE.md-style
 * code, still zero runtime LLM calls, just scaled to ~194 nations instead
 * of one.
 */
export const WORLD_TERM_LENGTH_TURNS = WEEKS_PER_YEAR * 4;

/** Bounds how much recent foreign-election history the UI keeps. */
export const WORLD_ELECTION_HISTORY_LIMIT = 40;

/** Deterministically staggers each nation's first election so all ~194 don't fire in lockstep. */
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

/**
 * Splits `total` seats across the given fractional `shares` (which should
 * sum to ~1) as whole numbers that sum EXACTLY to `total` — every share is
 * floored, then the leftover seats from rounding go one-by-one to the
 * shares with the largest fractional remainder (the standard largest-
 * remainder apportionment method), so no seat is silently invented or lost
 * to rounding.
 */
function allocateSeatsByShare(total: number, shares: number[]): number[] {
  const raw = shares.map((s) => s * total);
  const floors = raw.map((r) => Math.floor(r));
  let remaining = total - floors.reduce((sum, f) => sum + f, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - floors[i] }))
    .sort((a, b) => b.frac - a.frac);
  const seats = [...floors];
  for (let k = 0; k < order.length && remaining > 0; k++, remaining--) {
    seats[order[k].i] += 1;
  }
  return seats;
}

const FOREIGN_PARTY_SEAT_SHARES = [0.42, 0.26, 0.18, 0.14];
const FOREIGN_PARTY_IDEOLOGY_JITTER = 50;

/**
 * Generates every nation's own single-member districts (count from
 * computeForeignSeatCount — real for the ~30 hand-authored major powers,
 * a documented size-correlated estimate for the rest) and a small starting
 * party roster: the recorded ruling party sits exactly at the nation's own
 * recorded ideology and starts with a plurality of seats, three rivals are
 * jittered around it the same bounded way resolveWorldElection's old
 * regime-change roll used to. Called once at game creation — from then on,
 * elections only ever reshuffle each roster's SEAT COUNTS, never spawn or
 * remove a party, so a foreign party's color/identity stays stable turn to
 * turn on the globe.
 */
export function initializeForeignLegislatures(
  counterparts: ForeignCounterpart[],
  governments: WorldGovernment[],
  rng: SeededRng
): { districts: Record<string, District[]>; parties: Record<string, Party[]> } {
  const districts: Record<string, District[]> = {};
  const parties: Record<string, Party[]> = {};

  for (const counterpart of counterparts) {
    const seatCount = computeForeignSeatCount(counterpart);
    districts[counterpart.id] = Array.from({ length: seatCount }, (_, i) => ({
      id: `${counterpart.id}-d${i + 1}`,
      name: `District ${i + 1}`,
    }));

    const gov = governments.find((g) => g.counterpartId === counterpart.id);
    const jitter = () => (rng.next() - 0.5) * FOREIGN_PARTY_IDEOLOGY_JITTER;
    const ideologies: IdeologyPosition[] = [
      counterpart.ideology,
      { economic: clampAxis(counterpart.ideology.economic + jitter()), social: clampAxis(counterpart.ideology.social + jitter()) },
      { economic: clampAxis(counterpart.ideology.economic + jitter()), social: clampAxis(counterpart.ideology.social + jitter()) },
      { economic: clampAxis(counterpart.ideology.economic + jitter()), social: clampAxis(counterpart.ideology.social + jitter()) },
    ];
    const seatCounts = allocateSeatsByShare(seatCount, FOREIGN_PARTY_SEAT_SHARES);

    parties[counterpart.id] = ideologies.map((ideology, i) => {
      const seats = seatCounts[i];
      const name = i === 0 ? gov?.rulingPartyName ?? pickWorldPartyName(ideology, rng) : pickWorldPartyName(ideology, rng);
      return {
        id: `${counterpart.id}-party-${i + 1}`,
        name,
        ideology,
        seats,
        factions: [{ name: 'Core', ideologyOffset: 0, size: seats }],
      };
    });
  }

  return { districts, parties };
}

/** A small bounded random walk each turn — some governments drift more or less popular independent of anything the player does. */
export function driftApproval(gov: WorldGovernment, rng: SeededRng): WorldGovernment {
  const delta = (rng.next() - 0.5) * 4;
  return { ...gov, approval: Math.max(5, Math.min(95, gov.approval + delta)) };
}

const FOREIGN_ELECTION_TURNOUT = 0.65;
const INCUMBENT_APPROVAL_MOMENTUM_SCALE = 400;
const LEADER_SHARE_APPROVAL_SCALE = 150;

export interface ForeignElectionResolution {
  government: WorldGovernment;
  counterpart: ForeignCounterpart;
  parties: Party[];
  districtResults: DistrictResult[];
  result: WorldElectionResult;
}

/**
 * Resolves one nation's election for real: every one of its own districts
 * gets a genuine generateDistrictVotes roll (same engine the player's own
 * FPTP elections use), seeded by each party's current seat share plus a
 * small nudge for the sitting ruling party from its own recorded approval,
 * and tallied with the same resolveFPTPElection every other FPTP race in
 * this engine uses. "Incumbent returned" and the resulting approval/
 * ideology shift are DERIVED from that real seat outcome, not rolled
 * independently of it.
 */
export function resolveForeignElection(
  counterpart: ForeignCounterpart,
  gov: WorldGovernment,
  districts: District[],
  parties: Party[],
  voterBlocs: VoterBloc[],
  rng: SeededRng
): ForeignElectionResolution {
  const turn = gov.nextElectionTurn;
  const totalSeats = Math.max(1, districts.length);
  const oldLeader = [...parties].sort((a, b) => b.seats - a.seats)[0];

  const momentum: Record<string, number> = {};
  for (const party of parties) {
    const seatShare = party.seats / totalSeats;
    const approvalNudge = party.id === oldLeader.id ? (gov.approval - 50) / INCUMBENT_APPROVAL_MOMENTUM_SCALE : 0;
    momentum[party.id] = seatShare + approvalNudge;
  }

  const districtResults: DistrictResult[] = districts.map((district) =>
    generateDistrictVotes(district, parties, FOREIGN_ELECTION_TURNOUT, rng, momentum, voterBlocs)
  );
  const seatsWon = resolveFPTPElection(districtResults);
  const updatedParties = parties.map((party) => {
    const seats = seatsWon[party.id] ?? 0;
    return { ...party, seats, factions: [{ name: 'Core', ideologyOffset: 0, size: seats }] };
  });
  const newLeader = [...updatedParties].sort((a, b) => b.seats - a.seats)[0];
  const incumbentReturned = newLeader.id === oldLeader.id;

  const oldLeaderShare = oldLeader.seats / totalSeats;
  const newLeaderShare = newLeader.seats / totalSeats;
  const approvalDelta = (newLeaderShare - oldLeaderShare) * LEADER_SHARE_APPROVAL_SCALE;
  const baseApproval = incumbentReturned ? gov.approval : 45;
  const nextApproval = Math.max(20, Math.min(80, baseApproval + approvalDelta));

  const oldIdeology = counterpart.ideology;
  const newIdeology = incumbentReturned ? oldIdeology : newLeader.ideology;
  const newLeaderName = incumbentReturned ? gov.leaderName : generateName(rng);

  const government: WorldGovernment = {
    ...gov,
    rulingPartyName: newLeader.name,
    leaderName: newLeaderName,
    approval: nextApproval,
    lastElectionTurn: turn,
    nextElectionTurn: turn + WORLD_TERM_LENGTH_TURNS,
    termsServed: incumbentReturned ? gov.termsServed + 1 : 1,
  };

  return {
    government,
    counterpart: { ...counterpart, ideology: newIdeology },
    parties: updatedParties,
    districtResults,
    result: {
      counterpartId: counterpart.id,
      turn,
      incumbentReturned,
      previousPartyName: oldLeader.name,
      newPartyName: newLeader.name,
      newLeaderName,
      ideologyShift: {
        economic: newIdeology.economic - oldIdeology.economic,
        social: newIdeology.social - oldIdeology.social,
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
  foreignParties: Record<string, Party[]>;
  /** Only nations that actually held an election this turn — caller merges into its own persistent map. */
  foreignDistrictResults: Record<string, DistrictResult[]>;
  results: WorldElectionResult[];
}

/**
 * Runs one turn of world elections: drifts every government's approval,
 * and for any nation whose term is up this turn, resolves a real per-
 * district election (resolveForeignElection) and applies the ideological-
 * realignment relation nudge for any resulting regime change.
 */
export function runWorldElectionsTurn(
  counterparts: ForeignCounterpart[],
  governments: WorldGovernment[],
  foreignRelations: Record<string, number>,
  foreignDistricts: Record<string, District[]>,
  foreignParties: Record<string, Party[]>,
  voterBlocs: VoterBloc[],
  playerIdeology: IdeologyPosition,
  turn: number,
  rng: SeededRng
): WorldElectionsTurnResult {
  let nextCounterparts = counterparts;
  let nextRelations = foreignRelations;
  let nextForeignParties = foreignParties;
  const foreignDistrictResults: Record<string, DistrictResult[]> = {};
  const results: WorldElectionResult[] = [];

  const nextGovernments = governments.map((gov) => driftApproval(gov, rng)).map((gov) => {
    if (gov.nextElectionTurn !== turn) return gov;
    const counterpart = nextCounterparts.find((c) => c.id === gov.counterpartId);
    const districts = foreignDistricts[gov.counterpartId];
    const parties = nextForeignParties[gov.counterpartId];
    if (!counterpart || !districts || !parties || districts.length === 0 || parties.length === 0) return gov;

    const oldIdeology = counterpart.ideology;
    const resolved = resolveForeignElection(counterpart, gov, districts, parties, voterBlocs, rng);
    nextCounterparts = nextCounterparts.map((c) => (c.id === resolved.counterpart.id ? resolved.counterpart : c));
    nextForeignParties = { ...nextForeignParties, [gov.counterpartId]: resolved.parties };
    foreignDistrictResults[gov.counterpartId] = resolved.districtResults;
    results.push(resolved.result);

    if (!resolved.result.incumbentReturned) {
      const delta = computeRealignmentRelationDelta(oldIdeology, resolved.counterpart.ideology, playerIdeology);
      const current = nextRelations[counterpart.id] ?? 0;
      nextRelations = { ...nextRelations, [counterpart.id]: Math.max(-100, Math.min(100, current + delta)) };
    }

    return resolved.government;
  });

  return {
    counterparts: nextCounterparts,
    governments: nextGovernments,
    foreignRelations: nextRelations,
    foreignParties: nextForeignParties,
    foreignDistrictResults,
    results,
  };
}
