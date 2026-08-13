import type { SeededRng } from '../rng';
import { WEEKS_PER_YEAR } from '../calendar';
import { generateName } from '../../content/names/pool';
import { computeEffectiveDistrictLean, computeDistrictLean, computeIdeologicalVoteShares } from './elections';
import type { IdeologyPosition, Party, Province, StateElectionResult, StateGovernment, VoterBloc } from '../models/types';

/**
 * STATE / PROVINCE GOVERNANCE — every province a country's legislature
 * reports election night by (see getProvinces in electionNight.ts) also
 * elects its own governor, on its own staggered schedule, independent of
 * the national legislature. Same real-math shape as the foreign-nation
 * elections in worldElections.ts: a governor's party is derived from a real
 * ideological/incumbency vote model blended over the province's own member
 * districts, not an abstract coin flip. Zero runtime LLM calls.
 */
export const STATE_TERM_LENGTH_TURNS = WEEKS_PER_YEAR * 2;

/** Bounds how much recent gubernatorial-election history the UI keeps. */
export const STATE_ELECTION_HISTORY_LIMIT = 40;

/** Deterministically staggers each province's first election so they don't all fire in lockstep. */
function staggerOffset(provinceId: string): number {
  let hash = 0;
  for (let i = 0; i < provinceId.length; i++) hash = (hash * 31 + provinceId.charCodeAt(i)) >>> 0;
  return hash % STATE_TERM_LENGTH_TURNS;
}

function pickPartyWeightedBySeats(parties: Party[], rng: SeededRng): string {
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);
  if (totalSeats <= 0) return parties[0]?.id ?? 'unaffiliated';
  let roll = rng.next() * totalSeats;
  for (const party of parties) {
    roll -= party.seats;
    if (roll <= 0) return party.id;
  }
  return parties[parties.length - 1].id;
}

export function initializeStateGovernments(provinces: Province[], parties: Party[], rng: SeededRng): StateGovernment[] {
  return provinces.map((province) => ({
    provinceId: province.id,
    provinceName: province.name,
    governorName: generateName(rng),
    partyId: pickPartyWeightedBySeats(parties, rng),
    approval: 40 + rng.nextInt(0, 30),
    nextElectionTurn: 1 + staggerOffset(province.id),
    lastElectionTurn: null,
    termsServed: 0,
  }));
}

/** A small bounded random walk each turn — some governors drift more or less popular independent of the player. */
export function driftStateApproval(gov: StateGovernment, rng: SeededRng): StateGovernment {
  const delta = (rng.next() - 0.5) * 4;
  return { ...gov, approval: Math.max(5, Math.min(95, gov.approval + delta)) };
}

/**
 * A province's persistent ideological character: the average of its member
 * districts' own effective lean (see elections.ts). PR provinces carry no
 * districtIds, so they fall back to a stable hash-derived lean off the
 * province's own id — same shape computeDistrictLean already gives a
 * district, just keyed by province id instead.
 */
function computeProvinceLean(province: Province, districtLeanDrift: Record<string, IdeologyPosition>): IdeologyPosition {
  if (province.districtIds.length === 0) return computeDistrictLean(province.id);
  const leans = province.districtIds.map((id) => computeEffectiveDistrictLean(id, districtLeanDrift));
  return {
    economic: leans.reduce((sum, l) => sum + l.economic, 0) / leans.length,
    social: leans.reduce((sum, l) => sum + l.social, 0) / leans.length,
  };
}

const GOVERNOR_RACE_IDEOLOGY_WEIGHT = 0.6;
const GOVERNOR_RACE_NOISE_SPREAD = 0.15;
const INCUMBENT_APPROVAL_MOMENTUM_SCALE = 400;

/**
 * Resolves one province's gubernatorial race for real: blends each party's
 * ideological fit with the province's own voters (weighted by the province's
 * district-derived lean) with its current national seat standing (a stand-in
 * for statewide name recognition/machine strength), plus a small incumbency
 * nudge from the sitting governor's own approval and per-party noise.
 * Deterministic given the RNG's state.
 */
function resolveGovernorRace(
  province: Province,
  gov: StateGovernment,
  parties: Party[],
  voterBlocs: VoterBloc[],
  districtLeanDrift: Record<string, IdeologyPosition>,
  rng: SeededRng
): string {
  const lean = computeProvinceLean(province, districtLeanDrift);
  const ideologicalShares = voterBlocs.length > 0 ? computeIdeologicalVoteShares(parties, voterBlocs, lean) : null;
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);

  let bestPartyId = parties[0]?.id ?? gov.partyId;
  let bestShare = -Infinity;
  for (const party of parties) {
    const incumbencyShare = totalSeats > 0 ? party.seats / totalSeats : 1 / parties.length;
    const baseShare = ideologicalShares
      ? GOVERNOR_RACE_IDEOLOGY_WEIGHT * ideologicalShares[party.id] + (1 - GOVERNOR_RACE_IDEOLOGY_WEIGHT) * incumbencyShare
      : incumbencyShare;
    const incumbencyBonus = party.id === gov.partyId ? (gov.approval - 50) / INCUMBENT_APPROVAL_MOMENTUM_SCALE : 0;
    const noise = (rng.next() - 0.5) * GOVERNOR_RACE_NOISE_SPREAD;
    const share = Math.max(0.01, baseShare + incumbencyBonus + noise);
    if (share > bestShare) {
      bestShare = share;
      bestPartyId = party.id;
    }
  }
  return bestPartyId;
}

export interface StateElectionResolution {
  government: StateGovernment;
  result: StateElectionResult;
}

export function resolveStateElection(
  province: Province,
  gov: StateGovernment,
  parties: Party[],
  voterBlocs: VoterBloc[],
  districtLeanDrift: Record<string, IdeologyPosition>,
  rng: SeededRng
): StateElectionResolution {
  const turn = gov.nextElectionTurn;
  const winningPartyId = resolveGovernorRace(province, gov, parties, voterBlocs, districtLeanDrift, rng);
  const incumbentPartyRetained = winningPartyId === gov.partyId;

  const government: StateGovernment = {
    ...gov,
    partyId: winningPartyId,
    governorName: incumbentPartyRetained ? gov.governorName : generateName(rng),
    approval: Math.max(20, Math.min(80, incumbentPartyRetained ? gov.approval : 45)),
    lastElectionTurn: turn,
    nextElectionTurn: turn + STATE_TERM_LENGTH_TURNS,
    termsServed: incumbentPartyRetained ? gov.termsServed + 1 : 1,
  };

  return {
    government,
    result: {
      provinceId: province.id,
      provinceName: province.name,
      turn,
      incumbentPartyRetained,
      previousPartyId: gov.partyId,
      newPartyId: winningPartyId,
      newGovernorName: government.governorName,
    },
  };
}

export interface StateGovernanceTurnResult {
  governments: StateGovernment[];
  results: StateElectionResult[];
}

/**
 * Runs one turn of state governance: drifts every governor's approval, and
 * for any province whose term is up this turn, resolves a real governor
 * race. Same shape as runWorldElectionsTurn in worldElections.ts.
 */
export function runStateGovernanceTurn(
  provinces: Province[],
  governments: StateGovernment[],
  parties: Party[],
  voterBlocs: VoterBloc[],
  districtLeanDrift: Record<string, IdeologyPosition>,
  turn: number,
  rng: SeededRng
): StateGovernanceTurnResult {
  const results: StateElectionResult[] = [];
  const provincesById = new Map(provinces.map((p) => [p.id, p]));

  const nextGovernments = governments.map((gov) => driftStateApproval(gov, rng)).map((gov) => {
    if (gov.nextElectionTurn !== turn) return gov;
    const province = provincesById.get(gov.provinceId);
    if (!province || parties.length === 0) return gov;

    const resolved = resolveStateElection(province, gov, parties, voterBlocs, districtLeanDrift, rng);
    results.push(resolved.result);
    return resolved.government;
  });

  return { governments: nextGovernments, results };
}
