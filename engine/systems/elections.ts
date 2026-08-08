import { SeededRng } from '../rng';
import type { District, Party } from '../models/types';

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
