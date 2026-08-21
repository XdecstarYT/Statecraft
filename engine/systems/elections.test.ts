import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import {
  allocateSeatsDHondt,
  computeBlocPartyShares,
  computeDistrictLean,
  computeEffectiveDistrictLean,
  computeIdeologicalVoteShares,
  droopQuota,
  redistrict,
  generateDistrictVotes,
  generateNationalVotes,
  generatePrimaryVotes,
  generateRankedBallots,
  getMajorityWinner,
  getRunoffPair,
  resolveFPTPDistrict,
  resolveFPTPElection,
  resolveMMP,
  resolvePrimary,
  resolveRunoffRound,
  resolveSTV,
  type DistrictResult,
  type PartyVoteShare,
  type RankedBallot,
} from './elections';
import type { Party, VoterBloc } from '../models/types';

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

  it('scales a party\'s national vote share by its momentum multiplier', () => {
    const parties = [party('A', 5), party('B', 5)];
    const neutral = generateNationalVotes(parties, 100000, new SeededRng(11));
    const boosted = generateNationalVotes(parties, 100000, new SeededRng(11), { A: 1.3 });
    const aNeutral = neutral.find((v) => v.partyId === 'A')!.votes;
    const aBoosted = boosted.find((v) => v.partyId === 'A')!.votes;
    expect(aBoosted).toBeGreaterThan(aNeutral);
    // B's votes are untouched since it wasn't given a momentum entry.
    expect(boosted.find((v) => v.partyId === 'B')!.votes).toBe(neutral.find((v) => v.partyId === 'B')!.votes);
  });

  it('scales a party\'s district vote share by its momentum multiplier', () => {
    const parties = [party('A', 5), party('B', 5)];
    const district = { id: 'd1', name: 'District 1' };
    const neutral = generateDistrictVotes(district, parties, 10000, new SeededRng(22));
    const dampened = generateDistrictVotes(district, parties, 10000, new SeededRng(22), { A: 0.7 });
    expect(dampened.votesByParty.A).toBeLessThan(neutral.votesByParty.A);
  });
});

const bloc = (id: string, size: number, economic: number, social: number): VoterBloc => ({
  id,
  name: id,
  size,
  ideology: { economic, social },
  persuadability: 0.5,
  issueSalience: [],
});

describe('computeDistrictLean', () => {
  it('is deterministic for the same district id', () => {
    expect(computeDistrictLean('district-7')).toEqual(computeDistrictLean('district-7'));
  });

  it('differs between distinct district ids (not a constant)', () => {
    const leanA = computeDistrictLean('district-1');
    const leanB = computeDistrictLean('district-2');
    expect(leanA).not.toEqual(leanB);
  });

  it('stays within the documented bound on both axes', () => {
    for (const id of ['a', 'b', 'district-99', 'northgate', 'rivermouth']) {
      const lean = computeDistrictLean(id);
      expect(Math.abs(lean.economic)).toBeLessThanOrEqual(22);
      expect(Math.abs(lean.social)).toBeLessThanOrEqual(22);
    }
  });
});

describe('redistrict', () => {
  const ids = ['district-1', 'district-2', 'district-3'];

  it('is deterministic given the same seed and starting drift', () => {
    const a = redistrict(ids, {}, new SeededRng(1));
    const b = redistrict(ids, {}, new SeededRng(1));
    expect(a).toEqual(b);
  });

  it('nudges every district, not just some', () => {
    const drift = redistrict(ids, {}, new SeededRng(5));
    for (const id of ids) {
      expect(drift[id]).toBeDefined();
    }
  });

  it('accumulates on top of existing drift rather than replacing it', () => {
    const once = redistrict(ids, {}, new SeededRng(1));
    const twice = redistrict(ids, once, new SeededRng(2));
    // Two passes should generally move further from zero than one, for at least one district.
    const movedFurther = ids.some(
      (id) => Math.abs(twice[id].economic) + Math.abs(twice[id].social) >= Math.abs(once[id].economic) + Math.abs(once[id].social)
    );
    expect(movedFurther).toBe(true);
  });

  it('never exceeds the documented max drift bound after many passes', () => {
    let drift: Record<string, { economic: number; social: number }> = {};
    const rng = new SeededRng(3);
    for (let i = 0; i < 50; i++) {
      drift = redistrict(ids, drift, rng);
    }
    for (const id of ids) {
      expect(Math.abs(drift[id].economic)).toBeLessThanOrEqual(18);
      expect(Math.abs(drift[id].social)).toBeLessThanOrEqual(18);
    }
  });
});

describe('computeEffectiveDistrictLean', () => {
  it('equals the base lean when there is no drift', () => {
    expect(computeEffectiveDistrictLean('district-7', {})).toEqual(computeDistrictLean('district-7'));
  });

  it('adds the drift on top of the base lean', () => {
    const base = computeDistrictLean('district-7');
    const drift = { 'district-7': { economic: 5, social: -3 } };
    const effective = computeEffectiveDistrictLean('district-7', drift);
    expect(effective.economic).toBeCloseTo(base.economic + 5);
    expect(effective.social).toBeCloseTo(base.social - 3);
  });
});

describe('computeBlocPartyShares', () => {
  it('gives the ideologically closest party the largest share', () => {
    const parties = [party('left', 0), party('right', 0)];
    parties[0].ideology = { economic: -70, social: -70 };
    parties[1].ideology = { economic: 70, social: 70 };
    const shares = computeBlocPartyShares(parties, { economic: -80, social: -80 });
    expect(shares.left).toBeGreaterThan(shares.right);
  });

  it('shares always sum to ~1 across the given parties', () => {
    const parties = [party('a', 0), party('b', 0), party('c', 0)];
    parties[0].ideology = { economic: -50, social: 0 };
    parties[1].ideology = { economic: 0, social: 0 };
    parties[2].ideology = { economic: 50, social: 0 };
    const shares = computeBlocPartyShares(parties, { economic: 20, social: -10 });
    const total = Object.values(shares).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it('every party gets a nonzero floor share, even a maximally opposed one', () => {
    const parties = [party('close', 0), party('far', 0)];
    parties[0].ideology = { economic: 0, social: 0 };
    parties[1].ideology = { economic: 100, social: 100 };
    const shares = computeBlocPartyShares(parties, { economic: -100, social: -100 });
    expect(shares.far).toBeGreaterThan(0);
  });
});

describe('computeIdeologicalVoteShares', () => {
  it('returns all zeros when there are no voter blocs to weight by', () => {
    const parties = [party('a', 5), party('b', 5)];
    const shares = computeIdeologicalVoteShares(parties, []);
    expect(shares.a).toBe(0);
    expect(shares.b).toBe(0);
  });

  it('rewards the party whose ideology actually matches the bloc mix', () => {
    const left = party('left', 5);
    left.ideology = { economic: -60, social: -40 };
    const right = party('right', 5);
    right.ideology = { economic: 60, social: 40 };
    const blocs = [bloc('progressives', 0.7, -55, -35), bloc('conservatives', 0.3, 55, 35)];
    const shares = computeIdeologicalVoteShares([left, right], blocs);
    expect(shares.left).toBeGreaterThan(shares.right);
  });

  it('a district lean shifts the outcome toward the party it favors', () => {
    const left = party('left', 5);
    left.ideology = { economic: -50, social: -50 };
    const right = party('right', 5);
    right.ideology = { economic: 50, social: 50 };
    const blocs = [bloc('centrists', 1, 0, 0)];
    const neutral = computeIdeologicalVoteShares([left, right], blocs);
    const rightLean = computeIdeologicalVoteShares([left, right], blocs, { economic: 40, social: 40 });
    expect(rightLean.right).toBeGreaterThan(neutral.right);
    expect(rightLean.left).toBeLessThan(neutral.left);
  });
});

describe('ideological blending in generateDistrictVotes / generateNationalVotes', () => {
  it('an ideologically-aligned party outpolls a misaligned one with identical seats and momentum', () => {
    const aligned = party('aligned', 5);
    aligned.ideology = { economic: -55, social: -55 };
    const misaligned = party('misaligned', 5);
    misaligned.ideology = { economic: 80, social: 80 };
    const blocs = [bloc('base', 1, -60, -60)];

    const votes = generateNationalVotes([aligned, misaligned], 200_000, new SeededRng(42), {}, blocs);
    const alignedVotes = votes.find((v) => v.partyId === 'aligned')!.votes;
    const misalignedVotes = votes.find((v) => v.partyId === 'misaligned')!.votes;
    expect(alignedVotes).toBeGreaterThan(misalignedVotes);
  });

  it('stays fully deterministic for the same rng state and blocs', () => {
    const parties = [party('a', 5), party('b', 5)];
    parties[0].ideology = { economic: -30, social: 10 };
    parties[1].ideology = { economic: 30, social: -10 };
    const blocs = [bloc('mixed', 1, 0, 0)];
    const district = { id: 'district-3', name: 'District 3' };

    const runA = generateDistrictVotes(district, parties, 10_000, new SeededRng(99), {}, blocs);
    const runB = generateDistrictVotes(district, parties, 10_000, new SeededRng(99), {}, blocs);
    expect(runA).toEqual(runB);
  });

  it('two districts with different ids can produce different results from the same inputs, via their distinct lean', () => {
    const parties = [party('a', 5), party('b', 5)];
    parties[0].ideology = { economic: -60, social: -60 };
    parties[1].ideology = { economic: 60, social: 60 };
    const blocs = [bloc('mixed', 1, 0, 0)];

    const resultA = generateDistrictVotes({ id: 'alpha', name: 'Alpha' }, parties, 10_000, new SeededRng(7), {}, blocs);
    const resultB = generateDistrictVotes({ id: 'beta', name: 'Beta' }, parties, 10_000, new SeededRng(7), {}, blocs);
    // Same rng draw, same parties/turnout — any difference must come from the district-specific lean.
    expect(resultA.votesByParty.a).not.toBe(resultB.votesByParty.a);
  });
});

describe('two-round runoff', () => {
  it('declares an outright winner who clears the majority threshold', () => {
    const votes: PartyVoteShare[] = [
      { partyId: 'A', votes: 55 },
      { partyId: 'B', votes: 30 },
      { partyId: 'C', votes: 15 },
    ];
    expect(getMajorityWinner(votes)).toBe('A');
  });

  it('requires a runoff when no candidate clears the majority threshold', () => {
    const votes: PartyVoteShare[] = [
      { partyId: 'A', votes: 40 },
      { partyId: 'B', votes: 35 },
      { partyId: 'C', votes: 25 },
    ];
    expect(getMajorityWinner(votes)).toBeNull();
    expect(getRunoffPair(votes)).toEqual(['A', 'B']);
  });

  it('resolves the runoff round by highest vote count', () => {
    const secondRound: PartyVoteShare[] = [
      { partyId: 'A', votes: 48 },
      { partyId: 'B', votes: 52 },
    ];
    expect(resolveRunoffRound(secondRound)).toBe('B');
  });
});

describe('droopQuota', () => {
  it('matches the standard formula', () => {
    expect(droopQuota(6, 2)).toBe(3); // floor(6/3)+1
    expect(droopQuota(100, 4)).toBe(21); // floor(100/5)+1
  });
});

describe('resolveSTV', () => {
  it('matches a hand-traced worked example', () => {
    // 6 ballots, 2 seats, candidates A, B, C. Quota = floor(6/3)+1 = 3.
    // 3x A>B>C, 2x B>A>C, 1x C>A>B
    // Round 1: A=3 (meets quota, elected, 0 surplus), B=2, C=1.
    // Round 2 (active {B,C}): B=2, C=1 (A's ballots carry 0 weight) -> eliminate C.
    // Only B remains for the last seat -> B elected.
    const ballots: RankedBallot[] = [
      { ranking: ['A', 'B', 'C'] },
      { ranking: ['A', 'B', 'C'] },
      { ranking: ['A', 'B', 'C'] },
      { ranking: ['B', 'A', 'C'] },
      { ranking: ['B', 'A', 'C'] },
      { ranking: ['C', 'A', 'B'] },
    ];
    const result = resolveSTV(ballots, ['A', 'B', 'C'], 2);
    expect(result.quota).toBe(3);
    expect(result.elected).toEqual(['A', 'B']);
  });

  it('elects exactly `seats` candidates whenever enough candidates stand', () => {
    const ballots: RankedBallot[] = Array.from({ length: 40 }, (_, i) => ({
      ranking: ['A', 'B', 'C', 'D', 'E'].sort(() => (i % 2 === 0 ? 1 : -1)),
    }));
    const result = resolveSTV(ballots, ['A', 'B', 'C', 'D', 'E'], 3);
    expect(result.elected).toHaveLength(3);
  });

  it('seats every remaining candidate once the field shrinks to the number of open seats', () => {
    const ballots: RankedBallot[] = [
      { ranking: ['A', 'B'] },
      { ranking: ['A', 'B'] },
      { ranking: ['B', 'A'] },
    ];
    const result = resolveSTV(ballots, ['A', 'B'], 2);
    expect(result.elected.sort()).toEqual(['A', 'B']);
  });

  it('is a pure function of its inputs', () => {
    const ballots: RankedBallot[] = [
      { ranking: ['A', 'B', 'C'] },
      { ranking: ['B', 'C', 'A'] },
      { ranking: ['C', 'A', 'B'] },
    ];
    const a = resolveSTV(ballots, ['A', 'B', 'C'], 1);
    const b = resolveSTV(ballots, ['A', 'B', 'C'], 1);
    expect(a).toEqual(b);
  });
});

describe('resolveMMP', () => {
  it('grants overhang seats when a party wins more constituencies than its list entitlement', () => {
    // Party A wins 6 of 10 constituencies but its list vote share only
    // entitles it to 4 of the nominal 10 total seats.
    const constituencyResults: DistrictResult[] = [
      ...Array.from({ length: 6 }, (_, i) => ({
        districtId: `a-win-${i}`,
        votesByParty: { A: 100, B: 20 },
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        districtId: `b-win-${i}`,
        votesByParty: { A: 20, B: 100 },
      })),
    ];
    const partyListVotes: PartyVoteShare[] = [
      { partyId: 'A', votes: 4000 },
      { partyId: 'B', votes: 6000 },
    ];

    const result = resolveMMP(constituencyResults, partyListVotes, 10);

    expect(result.constituencySeats).toEqual({ A: 6, B: 4 });
    expect(result.overhangSeats.A).toBe(2); // 6 won vs 4 entitled
    expect(result.totalSeatsByParty.A).toBe(6);
    expect(result.listSeats.B).toBe(2); // 6 entitled - 4 won
    expect(result.totalSeatsByParty.B).toBe(6);
    expect(result.totalSeatsInLegislature).toBe(12); // grew past the nominal 10
  });

  it('matches the nominal seat count when there is no overhang', () => {
    const constituencyResults: DistrictResult[] = Array.from({ length: 10 }, (_, i) => ({
      districtId: `d${i}`,
      votesByParty: i < 5 ? { A: 100, B: 20 } : { A: 20, B: 100 },
    }));
    const partyListVotes: PartyVoteShare[] = [
      { partyId: 'A', votes: 5000 },
      { partyId: 'B', votes: 5000 },
    ];
    const result = resolveMMP(constituencyResults, partyListVotes, 10);
    expect(result.totalSeatsInLegislature).toBe(10);
  });
});

describe('primaries', () => {
  it('favors candidates closer to the party base over the general-electorate median', () => {
    const partyBase = { economic: 80, social: 80 };
    const candidates = [
      { id: 'purist', ideology: { economic: 80, social: 80 } },
      { id: 'moderate', ideology: { economic: 10, social: 10 } },
    ];
    const votes = generatePrimaryVotes(candidates, partyBase, 100000, new SeededRng(1));
    const purist = votes.find((v) => v.partyId === 'purist')!;
    const moderate = votes.find((v) => v.partyId === 'moderate')!;
    expect(purist.votes).toBeGreaterThan(moderate.votes);
  });

  it('resolvePrimary picks the highest vote-getter', () => {
    const votes: PartyVoteShare[] = [
      { partyId: 'x', votes: 500 },
      { partyId: 'y', votes: 900 },
    ];
    expect(resolvePrimary(votes)).toBe('y');
  });
});

describe('generateRankedBallots', () => {
  const candidateIdeology = {
    left: { economic: -80, social: -80 },
    right: { economic: 80, social: 80 },
  };

  it('produces roughly `totalBallots` ballots, split proportionally by voter weight', () => {
    const voters = [
      { ideology: candidateIdeology.left, weight: 0.5 },
      { ideology: candidateIdeology.right, weight: 0.5 },
    ];
    const ballots = generateRankedBallots(voters, ['left', 'right'], candidateIdeology, 1000, new SeededRng(1));
    expect(ballots.length).toBeGreaterThan(950);
    expect(ballots.length).toBeLessThanOrEqual(1000);
  });

  it('ranks every candidate on every ballot', () => {
    const voters = [{ ideology: { economic: 0, social: 0 }, weight: 1 }];
    const ballots = generateRankedBallots(voters, ['left', 'right'], candidateIdeology, 20, new SeededRng(2));
    for (const ballot of ballots) {
      expect(ballot.ranking.sort()).toEqual(['left', 'right']);
    }
  });

  it('a bloc mostly ranks the ideologically closest candidate first', () => {
    const leftLeaningVoters = [{ ideology: { economic: -90, social: -90 }, weight: 1 }];
    const ballots = generateRankedBallots(leftLeaningVoters, ['left', 'right'], candidateIdeology, 200, new SeededRng(3));
    const firstChoiceLeft = ballots.filter((b) => b.ranking[0] === 'left').length;
    expect(firstChoiceLeft).toBeGreaterThan(ballots.length * 0.8);
  });

  it('feeds into resolveSTV to elect the candidate closer to the larger voter bloc', () => {
    const voters = [
      { ideology: candidateIdeology.left, weight: 0.7 },
      { ideology: candidateIdeology.right, weight: 0.3 },
    ];
    const ballots = generateRankedBallots(voters, ['left', 'right'], candidateIdeology, 500, new SeededRng(4));
    const result = resolveSTV(ballots, ['left', 'right'], 1);
    expect(result.elected).toEqual(['left']);
  });
});
