import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import {
  allocateSeatsDHondt,
  generateDistrictVotes,
  generateNationalVotes,
  resolveFPTPDistrict,
  resolveFPTPElection,
  type DistrictResult,
} from './elections';
import type { Party } from '../models/types';

const party = (id: string, seats: number): Party => ({
  id,
  name: id,
  ideology: { economic: 0, social: 0 },
  seats,
  factions: [],
});

describe('resolveFPTPDistrict', () => {
  it('awards the seat to the highest vote count', () => {
    const result: DistrictResult = {
      districtId: 'd1',
      votesByParty: { A: 1200, B: 1500, C: 900 },
    };
    expect(resolveFPTPDistrict(result)).toBe('B');
  });

  it('breaks ties by first-listed party', () => {
    const result: DistrictResult = {
      districtId: 'd1',
      votesByParty: { A: 1000, B: 1000 },
    };
    expect(resolveFPTPDistrict(result)).toBe('A');
  });

  it('throws when a district has no votes', () => {
    expect(() =>
      resolveFPTPDistrict({ districtId: 'd1', votesByParty: {} })
    ).toThrow();
  });
});

describe('resolveFPTPElection', () => {
  it('sums district wins per party across the whole election', () => {
    const results: DistrictResult[] = [
      { districtId: 'd1', votesByParty: { A: 100, B: 50 } },
      { districtId: 'd2', votesByParty: { A: 40, B: 90 } },
      { districtId: 'd3', votesByParty: { A: 70, B: 60 } },
    ];
    expect(resolveFPTPElection(results)).toEqual({ A: 2, B: 1 });
  });

  it('total seats awarded equals number of districts', () => {
    const results: DistrictResult[] = Array.from({ length: 12 }, (_, i) => ({
      districtId: `d${i}`,
      votesByParty: { A: i, B: 12 - i, C: 5 },
    }));
    const seats = resolveFPTPElection(results);
    const total = Object.values(seats).reduce((a, b) => a + b, 0);
    expect(total).toBe(12);
  });
});

describe('allocateSeatsDHondt', () => {
  it('matches the textbook D’Hondt worked example', () => {
    // Classic example: A=100000 B=80000 C=30000 D=20000, 8 seats.
    // Expected: A=4, B=3, C=1, D=0.
    const votes = [
      { partyId: 'A', votes: 100000 },
      { partyId: 'B', votes: 80000 },
      { partyId: 'C', votes: 30000 },
      { partyId: 'D', votes: 20000 },
    ];
    expect(allocateSeatsDHondt(votes, 8)).toEqual({ A: 4, B: 3, C: 1, D: 0 });
  });

  it('allocates exactly totalSeats when parties have votes', () => {
    const votes = [
      { partyId: 'A', votes: 41000 },
      { partyId: 'B', votes: 29000 },
      { partyId: 'C', votes: 17000 },
      { partyId: 'D', votes: 13000 },
    ];
    const seats = allocateSeatsDHondt(votes, 20);
    const total = Object.values(seats).reduce((a, b) => a + b, 0);
    expect(total).toBe(20);
  });

  it('excludes parties below the vote-share threshold', () => {
    const votes = [
      { partyId: 'A', votes: 90 },
      { partyId: 'B', votes: 6 },
      { partyId: 'C', votes: 4 },
    ];
    // B and C are each below 5% of the 100-vote total.
    const seats = allocateSeatsDHondt(votes, 10, 0.05);
    expect(seats.B).toBe(0);
    expect(seats.C).toBe(0);
    expect(seats.A).toBe(10);
  });

  it('gives a single party all seats when it holds all the votes', () => {
    const votes = [
      { partyId: 'A', votes: 500 },
      { partyId: 'B', votes: 0 },
    ];
    expect(allocateSeatsDHondt(votes, 5)).toEqual({ A: 5, B: 0 });
  });

  it('is a pure function of its inputs (no hidden randomness)', () => {
    const votes = [
      { partyId: 'A', votes: 12345 },
      { partyId: 'B', votes: 6789 },
      { partyId: 'C', votes: 4321 },
    ];
    const first = allocateSeatsDHondt(votes, 15);
    const second = allocateSeatsDHondt(votes, 15);
    expect(first).toEqual(second);
  });
});

describe('generateDistrictVotes / generateNationalVotes', () => {
  it('is deterministic for a given rng state', () => {
    const parties = [party('A', 6), party('B', 4)];
    const rngA = new SeededRng(555);
    const rngB = new SeededRng(555);

    const districtA = generateDistrictVotes(
      { id: 'd1', name: 'District 1' },
      parties,
      10000,
      rngA
    );
    const districtB = generateDistrictVotes(
      { id: 'd1', name: 'District 1' },
      parties,
      10000,
      rngB
    );
    expect(districtA).toEqual(districtB);
  });

  it('produces non-negative vote totals for every party', () => {
    const parties = [party('A', 1), party('B', 1), party('C', 8)];
    const rng = new SeededRng(2024);
    const votes = generateNationalVotes(parties, 50000, rng);
    for (const v of votes) {
      expect(v.votes).toBeGreaterThanOrEqual(0);
    }
  });
});
