import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { CareerState, Party } from '../models/types';
import {
  CAREER_STARTING_AGE,
  EDUCATION_TRACKS,
  JOB_LISTINGS,
  advanceCareerTurn,
  applyForJob,
  attemptLocalRace,
  attemptNationalNomination,
  buildGraduationPayload,
  canApplyForJob,
  canStartEducation,
  computeCareerAge,
  computeCareerStage,
  computeNominationProbability,
  computePersonalAppeal,
  createCareer,
  doPartyWork,
  isGraduated,
  joinParty,
  startEducation,
} from './career';

const PARTY_A: Party = { id: 'party-a', name: 'Party A', ideology: { economic: 60, social: 60 }, seats: 10, factions: [] };
const PARTIES = [PARTY_A];

function makeCareer(overrides: Partial<CareerState> = {}): CareerState {
  const rng = new SeededRng(1);
  return { ...createCareer(1, rng, 'Test Candidate', 'kastoria'), ...overrides };
}

describe('createCareer', () => {
  it('starts at age 17 with low attributes, no party, and a small bank', () => {
    const state = makeCareer();
    expect(computeCareerAge(state.turn)).toBe(CAREER_STARTING_AGE);
    expect(state.partyId).toBeNull();
    expect(state.stage).toBe('student');
    expect(state.money).toBeGreaterThan(0);
    for (const value of Object.values(state.attributes)) {
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThan(6);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = createCareer(42, new SeededRng(42), 'A', 'kastoria');
    const b = createCareer(42, new SeededRng(42), 'A', 'kastoria');
    expect(a).toEqual(b);
  });
});

describe('computeCareerAge', () => {
  it('advances by a quarter-year per turn', () => {
    expect(computeCareerAge(4)).toBe(CAREER_STARTING_AGE + 1);
    expect(computeCareerAge(8)).toBe(CAREER_STARTING_AGE + 2);
  });
});

describe('education', () => {
  it('cannot start law school without the state_university prerequisite', () => {
    const state = makeCareer();
    expect(canStartEducation(state, 'law_school')).toBe(false);
    expect(canStartEducation(state, 'state_university')).toBe(true);
  });

  it('can start law school once state_university is completed', () => {
    const state = makeCareer({ completedEducationTracks: ['state_university'] });
    expect(canStartEducation(state, 'law_school')).toBe(true);
  });

  it('cannot start a second track while one is already in progress', () => {
    const state = startEducation(makeCareer(), 'community_college');
    expect(state.educationTrack).toBe('community_college');
    expect(canStartEducation(state, 'trade_apprenticeship')).toBe(false);
    const unchanged = startEducation(state, 'trade_apprenticeship');
    expect(unchanged.educationTrack).toBe('community_college');
  });

  it('advancing through a full track raises attributes, spends money, and completes it', () => {
    let state = startEducation(makeCareer({ money: 200 }), 'community_college');
    const config = EDUCATION_TRACKS.community_college;
    const startingIntellect = state.attributes.intellect;

    for (let i = 0; i < config.durationTurns; i++) {
      state = advanceCareerTurn(state, PARTIES);
    }

    expect(state.educationTrack).toBeNull();
    expect(state.completedEducationTracks).toContain('community_college');
    expect(state.attributes.intellect).toBeGreaterThan(startingIntellect);
    expect(state.money).toBeLessThan(200);
  });
});

describe('jobs', () => {
  it('gates jobs on education and party membership', () => {
    const state = makeCareer();
    expect(canApplyForJob(state, 'paralegal')).toBe(false);
    expect(canApplyForJob(state, 'campaign_intern')).toBe(false);
    expect(canApplyForJob(state, 'retail_clerk')).toBe(true);
  });

  it('unlocks once the requirement is met', () => {
    const educated = makeCareer({ completedEducationTracks: ['state_university'] });
    expect(canApplyForJob(educated, 'paralegal')).toBe(true);

    const partyMember = joinParty(makeCareer(), 'party-a');
    expect(canApplyForJob(partyMember, 'campaign_intern')).toBe(true);
  });

  it('does nothing if the job is not actually available', () => {
    const state = applyForJob(makeCareer(), 'paralegal');
    expect(state.jobId).toBeNull();
  });

  it('a held job pays income and grows attributes each turn', () => {
    let state = applyForJob(makeCareer({ money: 0 }), 'retail_clerk');
    const startingCharisma = state.attributes.charisma;
    state = advanceCareerTurn(state, PARTIES);
    const job = JOB_LISTINGS.find((j) => j.id === 'retail_clerk')!;
    expect(state.money).toBe(job.incomePerTurn);
    expect(state.attributes.charisma).toBeGreaterThan(startingCharisma);
  });
});

describe('joinParty', () => {
  it('sets the party and a small starting standing', () => {
    const state = joinParty(makeCareer(), 'party-a');
    expect(state.partyId).toBe('party-a');
    expect(state.partyStanding).toBeGreaterThan(0);
    expect(computeCareerStage(state)).toBe('party_volunteer');
  });

  it('does not switch parties once already joined', () => {
    const state = joinParty(joinParty(makeCareer(), 'party-a'), 'party-b');
    expect(state.partyId).toBe('party-a');
  });
});

describe('doPartyWork', () => {
  it('is a no-op with no party', () => {
    const { state, outcome } = doPartyWork(makeCareer(), new SeededRng(1));
    expect(state.partyStanding).toBe(0);
    expect(outcome.standingDelta).toBe(0);
  });

  it('is deterministic for a given rng state', () => {
    const base = joinParty(makeCareer(), 'party-a');
    const a = doPartyWork(base, new SeededRng(7));
    const b = doPartyWork(base, new SeededRng(7));
    expect(a).toEqual(b);
  });

  it('a more skilled organizer lands strong outcomes more often over many trials', () => {
    const skilled = joinParty(
      makeCareer({ attributes: { charisma: 9, intellect: 5, integrity: 9, network: 9, mediaSavvy: 5 } }),
      'party-a'
    );
    const unskilled = joinParty(
      makeCareer({ attributes: { charisma: 1, intellect: 5, integrity: 1, network: 1, mediaSavvy: 5 } }),
      'party-a'
    );
    const rngSkilled = new SeededRng(3);
    const rngUnskilled = new SeededRng(3);
    let skilledStrong = 0;
    let unskilledStrong = 0;
    let s = skilled;
    let u = unskilled;
    for (let i = 0; i < 300; i++) {
      const rs = doPartyWork(s, rngSkilled);
      s = rs.state;
      if (rs.outcome.outcome === 'strong') skilledStrong++;
      const ru = doPartyWork(u, rngUnskilled);
      u = ru.state;
      if (ru.outcome.outcome === 'strong') unskilledStrong++;
    }
    expect(skilledStrong).toBeGreaterThan(unskilledStrong);
  });

  it('clamps standing to [0, 100]', () => {
    const state = joinParty(makeCareer({ partyStanding: 99 }), 'party-a');
    const { state: after } = doPartyWork(state, new SeededRng(1));
    expect(after.partyStanding).toBeLessThanOrEqual(100);
  });
});

describe('computePersonalAppeal', () => {
  it('rises with both attributes and party standing', () => {
    const low = computePersonalAppeal({ charisma: 1, intellect: 1, integrity: 1, network: 1, mediaSavvy: 1 }, 0);
    const high = computePersonalAppeal({ charisma: 10, intellect: 10, integrity: 10, network: 10, mediaSavvy: 10 }, 100);
    expect(high).toBeGreaterThan(low);
  });

  it('stays within [0.05, 1]', () => {
    expect(computePersonalAppeal({ charisma: 1, intellect: 1, integrity: 1, network: 1, mediaSavvy: 1 }, 0)).toBeGreaterThanOrEqual(0.05);
    expect(computePersonalAppeal({ charisma: 10, intellect: 10, integrity: 10, network: 10, mediaSavvy: 10 }, 100)).toBeLessThanOrEqual(1);
  });
});

describe('attemptLocalRace', () => {
  it('refuses to run without enough campaign money', () => {
    const state = makeCareer({ money: 10 });
    const { outcome } = attemptLocalRace(state, ['Rival One'], new SeededRng(1));
    expect(outcome).toBeNull();
  });

  it('is deterministic for a given rng state', () => {
    const state = makeCareer({ money: 200 });
    const a = attemptLocalRace(state, ['Rival A', 'Rival B'], new SeededRng(5));
    const b = attemptLocalRace(state, ['Rival A', 'Rival B'], new SeededRng(5));
    expect(a).toEqual(b);
  });

  it('a strong, well-organized candidate wins far more often than a weak one over many trials', () => {
    const strong = makeCareer({
      money: 10_000,
      attributes: { charisma: 10, intellect: 8, integrity: 8, network: 10, mediaSavvy: 9 },
      partyStanding: 90,
      ideology: { economic: 0, social: 0 },
    });
    const weak = makeCareer({
      money: 10_000,
      attributes: { charisma: 1, intellect: 3, integrity: 3, network: 1, mediaSavvy: 1 },
      partyStanding: 0,
      ideology: { economic: 0, social: 0 },
    });

    const rngStrong = new SeededRng(11);
    const rngWeak = new SeededRng(11);
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 100; i++) {
      if (attemptLocalRace(strong, ['R1', 'R2'], rngStrong).outcome!.won) strongWins++;
      if (attemptLocalRace(weak, ['R1', 'R2'], rngWeak).outcome!.won) weakWins++;
    }
    expect(strongWins).toBeGreaterThan(weakWins);
  });

  it('records the race and marks localSeatWon on a win', () => {
    const state = makeCareer({
      money: 10_000,
      attributes: { charisma: 10, intellect: 10, integrity: 10, network: 10, mediaSavvy: 10 },
      partyStanding: 100,
    });
    const rng = new SeededRng(1);
    let won = false;
    let after = state;
    for (let i = 0; i < 50 && !won; i++) {
      const result = attemptLocalRace(after, ['R1'], rng);
      after = result.state;
      won = result.outcome!.won;
    }
    expect(won).toBe(true);
    expect(after.localSeatWon).toBe(true);
    expect(after.localRaceHistory.length).toBeGreaterThan(0);
    expect(computeCareerStage(after)).toBe('local_officeholder');
  });
});

describe('computeNominationProbability / attemptNationalNomination', () => {
  it('rises with party standing, a won local seat, and strong attributes', () => {
    const weak = makeCareer({ partyStanding: 0, localSeatWon: false, attributes: { charisma: 1, intellect: 1, integrity: 1, network: 1, mediaSavvy: 1 } });
    const strong = makeCareer({ partyStanding: 100, localSeatWon: true, attributes: { charisma: 10, intellect: 10, integrity: 10, network: 10, mediaSavvy: 10 } });
    expect(computeNominationProbability(strong)).toBeGreaterThan(computeNominationProbability(weak));
  });

  it('stays within [0.02, 0.95]', () => {
    const weak = makeCareer({ partyStanding: 0, attributes: { charisma: 1, intellect: 1, integrity: 1, network: 1, mediaSavvy: 1 } });
    const strong = makeCareer({ partyStanding: 100, localSeatWon: true, attributes: { charisma: 10, intellect: 10, integrity: 10, network: 10, mediaSavvy: 10 } });
    expect(computeNominationProbability(weak)).toBeGreaterThanOrEqual(0.02);
    expect(computeNominationProbability(strong)).toBeLessThanOrEqual(0.95);
  });

  it('refuses without a party', () => {
    const { outcome } = attemptNationalNomination(makeCareer(), new SeededRng(1));
    expect(outcome.selected).toBe(false);
    expect(outcome.probability).toBe(0);
  });

  it('a very strong candidate gets selected within a handful of attempts', () => {
    const state = joinParty(
      makeCareer({ partyStanding: 100, localSeatWon: true, attributes: { charisma: 10, intellect: 10, integrity: 10, network: 10, mediaSavvy: 10 } }),
      'party-a'
    );
    const rng = new SeededRng(4);
    let after = state;
    let selected = false;
    for (let i = 0; i < 20 && !selected; i++) {
      const result = attemptNationalNomination(after, rng);
      after = result.state;
      selected = result.outcome.selected;
    }
    expect(selected).toBe(true);
    expect(isGraduated(after)).toBe(true);
    expect(computeCareerStage(after)).toBe('graduated');
  });
});

describe('advanceCareerTurn', () => {
  it('drifts ideology toward the joined party over successive turns', () => {
    let state = joinParty(makeCareer({ ideology: { economic: -50, social: -50 } }), 'party-a');
    const startingDistance = Math.abs(state.ideology.economic - PARTY_A.ideology.economic);
    for (let i = 0; i < 10; i++) {
      state = advanceCareerTurn(state, PARTIES);
    }
    const endingDistance = Math.abs(state.ideology.economic - PARTY_A.ideology.economic);
    expect(endingDistance).toBeLessThan(startingDistance);
  });

  it('decays party standing a little each turn without reinforcement', () => {
    let state = joinParty(makeCareer({ partyStanding: 50 }), 'party-a');
    state = advanceCareerTurn(state, PARTIES);
    expect(state.partyStanding).toBeLessThan(50);
    expect(state.partyStanding).toBeGreaterThan(40);
  });

  it('increments the turn counter', () => {
    const state = advanceCareerTurn(makeCareer(), PARTIES);
    expect(state.turn).toBe(1);
  });
});

describe('buildGraduationPayload', () => {
  it('is null before graduation', () => {
    expect(buildGraduationPayload(makeCareer())).toBeNull();
  });

  it('carries forward name, rounded attributes, ideology, party, and country once graduated', () => {
    const graduated: CareerState = {
      ...makeCareer({
        partyId: 'party-a',
        partyStanding: 80,
        attributes: { charisma: 7.6, intellect: 6.2, integrity: 8.9, network: 5.1, mediaSavvy: 4.4 },
        ideology: { economic: 30, social: -10 },
      }),
      nominationHistory: [{ turn: 10, selected: true, probability: 0.7 }],
    };
    const payload = buildGraduationPayload(graduated);
    expect(payload).not.toBeNull();
    expect(payload!.playerName).toBe('Test Candidate');
    expect(payload!.playerAttributes.charisma).toBe(8);
    expect(payload!.playerPartyId).toBe('party-a');
    expect(payload!.countryOptionId).toBe('kastoria');
    expect(payload!.standingBonus).toBeCloseTo(0.8, 5);
  });
});
