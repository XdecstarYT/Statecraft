import { SeededRng } from '../rng';
import { MAX_IDEOLOGICAL_DISTANCE, ideologicalDistance } from '../ideology';
import type { District, IdeologyPosition, Party } from '../models/types';

/**
 * FIRST PAST THE POST
 */

export interface DistrictResult {
  districtId: string;
  votesByParty: Record<string, number>;
}

/** Highest vote count wins the district's single seat. Ties favor the party listed first. */
export function resolveFPTPDistrict(result: DistrictResult): string {
  let winner: string | null = null;
  let max = -1;
  for (const [partyId, votes] of Object.entries(result.votesByParty)) {
    if (votes > max) {
      max = votes;
      winner = partyId;
    }
  }
  if (winner === null) {
    throw new Error(`District ${result.districtId} has no recorded votes`);
  }
  return winner;
}

/** Aggregates per-district FPTP wins into total seats won per party. */
export function resolveFPTPElection(
  results: DistrictResult[]
): Record<string, number> {
  const seats: Record<string, number> = {};
  for (const result of results) {
    const winner = resolveFPTPDistrict(result);
    seats[winner] = (seats[winner] ?? 0) + 1;
  }
  return seats;
}

/**
 * Generates a plausible vote split for one district from each party's
 * national standing (current seat share, as a stand-in for polling support)
 * plus per-district random noise. Deterministic given the RNG's state.
 */
export function generateDistrictVotes(
  district: District,
  parties: Party[],
  turnout: number,
  rng: SeededRng
): DistrictResult {
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);
  const votesByParty: Record<string, number> = {};

  for (const party of parties) {
    const baseShare = totalSeats > 0 ? party.seats / totalSeats : 1 / parties.length;
    const noise = (rng.next() - 0.5) * 0.3; // +/- 15 points of district-level swing
    const share = Math.max(0.01, baseShare + noise);
    votesByParty[party.id] = Math.round(share * turnout);
  }

  return { districtId: district.id, votesByParty };
}

/**
 * PARTY-LIST PR (D'HONDT)
 */

export interface PartyVoteShare {
  partyId: string;
  votes: number;
}

/**
 * Allocates `totalSeats` by repeatedly awarding the next seat to whichever
 * eligible party has the highest votes/(seatsWonSoFar + 1) quotient.
 * Parties below `thresholdFraction` of the total vote are excluded entirely.
 */
export function allocateSeatsDHondt(
  partyVotes: PartyVoteShare[],
  totalSeats: number,
  thresholdFraction = 0
): Record<string, number> {
  const totalVotes = partyVotes.reduce((sum, p) => sum + p.votes, 0);
  const eligible = partyVotes.filter(
    (p) => totalVotes === 0 || p.votes / totalVotes >= thresholdFraction
  );

  const seatsWon: Record<string, number> = {};
  for (const p of partyVotes) seatsWon[p.partyId] = 0;

  for (let seat = 0; seat < totalSeats; seat++) {
    let bestPartyId: string | null = null;
    let bestQuotient = -1;

    for (const p of eligible) {
      const quotient = p.votes / (seatsWon[p.partyId] + 1);
      if (quotient > bestQuotient) {
        bestQuotient = quotient;
        bestPartyId = p.partyId;
      }
    }

    if (bestPartyId === null) break; // no eligible party has any votes left to award
    seatsWon[bestPartyId] += 1;
  }

  return seatsWon;
}

/** Generates each party's national vote total from current seat share plus noise. */
export function generateNationalVotes(
  parties: Party[],
  turnout: number,
  rng: SeededRng
): PartyVoteShare[] {
  const totalSeats = parties.reduce((sum, p) => sum + p.seats, 0);
  return parties.map((party) => {
    const baseShare = totalSeats > 0 ? party.seats / totalSeats : 1 / parties.length;
    const noise = (rng.next() - 0.5) * 0.2; // +/- 10 points of national swing
    const share = Math.max(0.005, baseShare + noise);
    return { partyId: party.id, votes: Math.round(share * turnout) };
  });
}

/** The candidate/party with the most votes. Ties favor whichever is listed first. */
export function pickHighestVoteGetter(votes: PartyVoteShare[]): string {
  if (votes.length === 0) {
    throw new Error('Cannot pick a winner from an empty vote list');
  }
  let winner = votes[0];
  for (const v of votes.slice(1)) {
    if (v.votes > winner.votes) winner = v;
  }
  return winner.partyId;
}

/**
 * TWO-ROUND RUNOFF
 */

/** Returns the outright winner if they cleared the majority threshold, otherwise null. */
export function getMajorityWinner(
  votes: PartyVoteShare[],
  majorityThreshold = 0.5
): string | null {
  const total = votes.reduce((sum, v) => sum + v.votes, 0);
  if (total === 0) return null;
  const leader = votes.reduce((best, v) => (v.votes > best.votes ? v : best), votes[0]);
  return leader.votes / total > majorityThreshold ? leader.partyId : null;
}

/** The top two vote-getters from the first round, who advance to a runoff. */
export function getRunoffPair(votes: PartyVoteShare[]): [string, string] | null {
  if (votes.length < 2) return null;
  const sorted = [...votes].sort((a, b) => b.votes - a.votes);
  return [sorted[0].partyId, sorted[1].partyId];
}

/** The winner of a head-to-head runoff round: whoever has more votes between the two. */
export function resolveRunoffRound(votes: PartyVoteShare[]): string {
  return pickHighestVoteGetter(votes);
}

/**
 * SINGLE TRANSFERABLE VOTE (STV)
 */

export interface RankedBallot {
  /** Candidate/party IDs, most preferred first. */
  ranking: string[];
}

/** Minimum votes needed to guarantee election: floor(validVotes / (seats + 1)) + 1. */
export function droopQuota(totalValidVotes: number, seats: number): number {
  return Math.floor(totalValidVotes / (seats + 1)) + 1;
}

export interface StvResult {
  /** Winners in the order they were elected. */
  elected: string[];
  quota: number;
}

/**
 * Resolves a multi-seat STV race using the Droop quota and fractional
 * (Gregory-method) surplus transfer: a candidate who clears quota has their
 * excess ballot weight passed on to next preferences at surplus/count; if no
 * one clears quota, the last-place candidate is eliminated and their ballots
 * transfer at full weight. Ties (for both election and elimination) favor
 * whichever candidate was listed first in `candidateIds`.
 */
export function resolveSTV(
  ballots: RankedBallot[],
  candidateIds: string[],
  seats: number
): StvResult {
  const quota = droopQuota(ballots.length, seats);
  const elected: string[] = [];
  const active = new Set(candidateIds);

  const states = ballots.map((b) => ({ ranking: b.ranking, weight: 1, pointer: 0 }));

  const currentChoice = (ballot: (typeof states)[number]): string | null => {
    for (let i = ballot.pointer; i < ballot.ranking.length; i++) {
      if (active.has(ballot.ranking[i])) {
        ballot.pointer = i;
        return ballot.ranking[i];
      }
    }
    return null;
  };

  while (elected.length < seats && active.size > 0) {
    if (active.size <= seats - elected.length) {
      // Not enough remaining candidates to keep contesting — seat them all.
      for (const c of candidateIds) if (active.has(c)) elected.push(c);
      break;
    }

    const tally = new Map<string, number>();
    for (const c of candidateIds) if (active.has(c)) tally.set(c, 0);
    for (const ballot of states) {
      const choice = currentChoice(ballot);
      if (choice) tally.set(choice, (tally.get(choice) ?? 0) + ballot.weight);
    }

    let winner: string | null = null;
    let winnerVotes = -1;
    for (const c of candidateIds) {
      const v = tally.get(c);
      if (v !== undefined && v >= quota && v > winnerVotes) {
        winner = c;
        winnerVotes = v;
      }
    }

    if (winner) {
      elected.push(winner);
      active.delete(winner);
      const surplusRatio = winnerVotes > 0 ? Math.max(0, (winnerVotes - quota) / winnerVotes) : 0;
      for (const ballot of states) {
        if (ballot.ranking[ballot.pointer] === winner) {
          ballot.weight *= surplusRatio;
          ballot.pointer += 1;
        }
      }
      continue;
    }

    let loser: string | null = null;
    let loserVotes = Infinity;
    for (const c of candidateIds) {
      const v = tally.get(c);
      if (v !== undefined && v < loserVotes) {
        loserVotes = v;
        loser = c;
      }
    }
    if (loser) active.delete(loser);
  }

  return { elected, quota };
}

/**
 * MIXED-MEMBER PROPORTIONAL (MMP)
 */

export interface MmpResult {
  /** Each party's final seat total: constituency wins plus list seats (or overhang). */
  totalSeatsByParty: Record<string, number>;
  constituencySeats: Record<string, number>;
  listSeats: Record<string, number>;
  /** Constituency wins beyond a party's proportional entitlement — these grow the legislature. */
  overhangSeats: Record<string, number>;
  totalSeatsInLegislature: number;
}

/**
 * Resolves MMP: constituency seats are won FPTP-style, a party's overall
 * entitlement is its proportional (D'Hondt) share of `nominalTotalSeats`
 * from the list vote, and list seats top a party up to that entitlement. A
 * party that wins more constituencies than its entitlement keeps them as
 * overhang seats, growing the legislature past its nominal size.
 */
export function resolveMMP(
  constituencyResults: DistrictResult[],
  partyListVotes: PartyVoteShare[],
  nominalTotalSeats: number,
  thresholdFraction = 0
): MmpResult {
  const constituencySeats = resolveFPTPElection(constituencyResults);
  const entitlement = allocateSeatsDHondt(partyListVotes, nominalTotalSeats, thresholdFraction);

  const totalSeatsByParty: Record<string, number> = {};
  const listSeats: Record<string, number> = {};
  const overhangSeats: Record<string, number> = {};

  const partyIds = new Set([...Object.keys(constituencySeats), ...Object.keys(entitlement)]);
  for (const partyId of partyIds) {
    const constituency = constituencySeats[partyId] ?? 0;
    const ideal = entitlement[partyId] ?? 0;
    if (constituency > ideal) {
      totalSeatsByParty[partyId] = constituency;
      listSeats[partyId] = 0;
      overhangSeats[partyId] = constituency - ideal;
    } else {
      totalSeatsByParty[partyId] = ideal;
      listSeats[partyId] = ideal - constituency;
      overhangSeats[partyId] = 0;
    }
  }

  const totalSeatsInLegislature = Object.values(totalSeatsByParty).reduce((a, b) => a + b, 0);

  return { totalSeatsByParty, constituencySeats, listSeats, overhangSeats, totalSeatsInLegislature };
}

/**
 * PRIMARIES
 */

export interface PrimaryCandidate {
  id: string;
  ideology: IdeologyPosition;
}

/**
 * Generates primary vote shares against the party's base ideology rather
 * than the general electorate's — base-electorate dynamics that can diverge
 * sharply from a general election, rewarding candidates who hew closer to
 * the party's core than to the median voter.
 */
export function generatePrimaryVotes(
  candidates: PrimaryCandidate[],
  partyBaseIdeology: IdeologyPosition,
  turnout: number,
  rng: SeededRng
): PartyVoteShare[] {
  return candidates.map((candidate) => {
    const distance = ideologicalDistance(candidate.ideology, partyBaseIdeology);
    const alignment = Math.max(0.05, 1 - distance / MAX_IDEOLOGICAL_DISTANCE);
    const noise = (rng.next() - 0.5) * 0.2;
    const share = Math.max(0.01, alignment + noise);
    return { partyId: candidate.id, votes: Math.round(share * turnout) };
  });
}

export function resolvePrimary(votes: PartyVoteShare[]): string {
  return pickHighestVoteGetter(votes);
}

/**
 * Synthesizes ranked ballots for STV from a set of weighted voter groups
 * (e.g. voter blocs): each voter ranks candidates by ideological proximity,
 * with a little per-ballot jitter so a bloc's ballots aren't all identical.
 */
export function generateRankedBallots(
  voters: { ideology: IdeologyPosition; weight: number }[],
  candidateIds: string[],
  candidateIdeology: Record<string, IdeologyPosition>,
  totalBallots: number,
  rng: SeededRng
): RankedBallot[] {
  const totalWeight = voters.reduce((sum, v) => sum + v.weight, 0) || 1;
  const ballots: RankedBallot[] = [];

  for (const voter of voters) {
    const ballotCount = Math.round((voter.weight / totalWeight) * totalBallots);
    for (let i = 0; i < ballotCount; i++) {
      const scored = candidateIds.map((id) => ({
        id,
        score: ideologicalDistance(voter.ideology, candidateIdeology[id]) + rng.next() * 20,
      }));
      scored.sort((a, b) => a.score - b.score);
      ballots.push({ ranking: scored.map((s) => s.id) });
    }
  }

  return ballots;
}
