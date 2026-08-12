import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { CareerState, Party } from '../models/types';
import {
  CAREER_STARTING_AGE,
  CITIZEN_INITIATIVE_COST,
  EDUCATION_TRACKS,
  JOB_LISTINGS,
  advanceCareerTurn,
  applyForJob,
  attemptCitizenInitiative,
  attemptLocalRace,
  attemptNationalNomination,
  attemptRegionalRace,
  buildGraduationPayload,
  canApplyForJob,
  canAttemptRegionalRace,
  canGovernLocally,
  canProposeCitizenInitiative,
  canStartEducation,
  computeCareerAge,
  computeCareerStage,
  computeNominationProbability,
  computePersonalAppeal,
  createCareer,
  doLocalGovernance,
  doPartyWork,
  foundOwnParty,
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

describe('foundOwnParty', () => {
  it('sets partyId, records the founded party, and grants full standing', () => {
    const state = foundOwnParty(makeCareer({ ideology: { economic: 30, social: -20 } }), 'my-party', 'My Party');
    expect(state.partyId).toBe('my-party');
    expect(state.foundedParty).not.toBeNull();
    expect(state.foundedParty!.ideology).toEqual({ economic: 30, social: -20 });
    expect(state.partyStanding).toBe(100);
    expect(computeCareerStage(state)).toBe('party_volunteer');
  });

  it('does nothing if already committed to a party', () => {
    const joined = joinParty(makeCareer(), 'party-a');
    const state = foundOwnParty(joined, 'my-party', 'My Party');
    expect(state.partyId).toBe('party-a');
    expect(state.foundedParty).toBeNull();
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

  it('rises further with a strong civic record', () => {
    const attrs = { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 };
    const noRecord = computePersonalAppeal(attrs, 50, 0);
    const strongRecord = computePersonalAppeal(attrs, 50, 100);
    expect(strongRecord).toBeGreaterThan(noRecord);
  });
});

describe('citizen initiatives', () => {
  it('are available immediately — no party or seat required', () => {
    const state = makeCareer({ money: 100, partyId: null, localSeatWon: false });
    expect(canProposeCitizenInitiative(state)).toBe(true);
  });

  it('refuses without enough money', () => {
    const state = makeCareer({ money: CITIZEN_INITIATIVE_COST - 1 });
    expect(canProposeCitizenInitiative(state)).toBe(false);
    const { outcome } = attemptCitizenInitiative(state, 'Too Poor to Petition', { economic: 0, social: 0 }, new SeededRng(1));
    expect(outcome).toBeNull();
  });

  it('deducts the filing cost regardless of outcome', () => {
    const state = makeCareer({ money: 500 });
    const { state: after } = attemptCitizenInitiative(state, 'Test Petition', { economic: 0, social: 0 }, new SeededRng(3));
    expect(after.money).toBe(500 - CITIZEN_INITIATIVE_COST);
  });

  it('is deterministic for a given rng state', () => {
    const state = makeCareer({ money: 500 });
    const a = attemptCitizenInitiative(state, 'Test Petition', { economic: 20, social: -10 }, new SeededRng(7));
    const b = attemptCitizenInitiative(state, 'Test Petition', { economic: 20, social: -10 }, new SeededRng(7));
    expect(a).toEqual(b);
  });

  it('records the petition and raises civic record on a pass', () => {
    const state = makeCareer({
      money: 10_000,
      attributes: { charisma: 10, intellect: 8, integrity: 8, network: 10, mediaSavvy: 10 },
      civicRecord: 20,
    });
    const rng = new SeededRng(2);
    let before = state;
    let after = state;
    let passed = false;
    for (let i = 0; i < 30 && !passed; i++) {
      before = after;
      const result = attemptCitizenInitiative(after, `Petition ${i}`, { economic: 0, social: 0 }, rng);
      after = result.state;
      passed = result.outcome!.passed;
    }
    expect(passed).toBe(true);
    expect(after.civicRecord).toBeGreaterThan(before.civicRecord);
    expect(after.citizenInitiatives.some((r) => r.passed)).toBe(true);
  });

  it('records the petition and lowers civic record on a fail', () => {
    const state = makeCareer({
      money: 10_000,
      attributes: { charisma: 1, intellect: 3, integrity: 3, network: 1, mediaSavvy: 1 },
      civicRecord: 20,
    });
    const rng = new SeededRng(6);
    let before = state;
    let after = state;
    let failed = false;
    for (let i = 0; i < 30 && !failed; i++) {
      before = after;
      const result = attemptCitizenInitiative(after, `Petition ${i}`, { economic: 100, social: 100 }, rng);
      after = result.state;
      failed = !result.outcome!.passed;
    }
    expect(failed).toBe(true);
    expect(after.civicRecord).toBeLessThan(before.civicRecord);
    expect(after.citizenInitiatives.some((r) => !r.passed)).toBe(true);
  });

  it('a well-organized candidate passes petitions far more often than a disorganized one over many trials', () => {
    const strong = makeCareer({ money: 10_000, attributes: { charisma: 10, intellect: 8, integrity: 8, network: 10, mediaSavvy: 10 } });
    const weak = makeCareer({ money: 10_000, attributes: { charisma: 1, intellect: 3, integrity: 3, network: 1, mediaSavvy: 1 } });

    const rngStrong = new SeededRng(9);
    const rngWeak = new SeededRng(9);
    let strongPasses = 0;
    let weakPasses = 0;
    for (let i = 0; i < 100; i++) {
      if (attemptCitizenInitiative(strong, `P${i}`, { economic: 0, social: 0 }, rngStrong).outcome!.passed) strongPasses++;
      if (attemptCitizenInitiative(weak, `P${i}`, { economic: 0, social: 0 }, rngWeak).outcome!.passed) weakPasses++;
    }
    expect(strongPasses).toBeGreaterThan(weakPasses);
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

describe('attemptRegionalRace', () => {
  it('refuses without a local seat first, even with plenty of money', () => {
    const state = makeCareer({ money: 10_000, localSeatWon: false });
    expect(canAttemptRegionalRace(state)).toBe(false);
    const { outcome } = attemptRegionalRace(state, ['Rival'], new SeededRng(1));
    expect(outcome).toBeNull();
  });

  it('refuses without enough campaign money, even with a local seat', () => {
    const state = makeCareer({ money: 10, localSeatWon: true });
    expect(canAttemptRegionalRace(state)).toBe(false);
    const { outcome } = attemptRegionalRace(state, ['Rival'], new SeededRng(1));
    expect(outcome).toBeNull();
  });

  it('is deterministic for a given rng state', () => {
    const state = makeCareer({ money: 500, localSeatWon: true });
    const a = attemptRegionalRace(state, ['Rival A', 'Rival B'], new SeededRng(5));
    const b = attemptRegionalRace(state, ['Rival A', 'Rival B'], new SeededRng(5));
    expect(a).toEqual(b);
  });

  it('records the race and marks regionalSeatWon on a win, advancing the stage', () => {
    const state = makeCareer({
      money: 100_000,
      localSeatWon: true,
      attributes: { charisma: 10, intellect: 10, integrity: 10, network: 10, mediaSavvy: 10 },
      partyStanding: 100,
    });
    const rng = new SeededRng(2);
    let won = false;
    let after = state;
    for (let i = 0; i < 100 && !won; i++) {
      const result = attemptRegionalRace(after, ['R1', 'R2'], rng);
      after = result.state;
      won = result.outcome!.won;
    }
    expect(won).toBe(true);
    expect(after.regionalSeatWon).toBe(true);
    expect(after.regionalRaceHistory.length).toBeGreaterThan(0);
    expect(computeCareerStage(after)).toBe('regional_officeholder');
  });
});

describe('doLocalGovernance', () => {
  it('refuses without holding any elected seat', () => {
    const state = makeCareer({ localSeatWon: false, regionalSeatWon: false });
    expect(canGovernLocally(state)).toBe(false);
    const { outcome } = doLocalGovernance(state, new SeededRng(1));
    expect(outcome).toBeNull();
  });

  it('is available once a local seat is held', () => {
    const state = makeCareer({ localSeatWon: true });
    expect(canGovernLocally(state)).toBe(true);
    const { outcome } = doLocalGovernance(state, new SeededRng(1));
    expect(outcome).not.toBeNull();
  });

  it('is deterministic for a given rng state', () => {
    const state = makeCareer({ localSeatWon: true });
    const a = doLocalGovernance(state, new SeededRng(9));
    const b = doLocalGovernance(state, new SeededRng(9));
    expect(a).toEqual(b);
  });

  it('moves civic record and stays within [0, 100]', () => {
    const state = makeCareer({ localSeatWon: true, civicRecord: 50 });
    const { state: after, outcome } = doLocalGovernance(state, new SeededRng(3));
    expect(after.civicRecord).toBe(state.civicRecord + outcome!.civicRecordDelta);
    expect(after.civicRecord).toBeGreaterThanOrEqual(0);
    expect(after.civicRecord).toBeLessThanOrEqual(100);
  });

  it('a more capable governor gets strong outcomes far more often than a weak one over many trials', () => {
    const capable = makeCareer({ localSeatWon: true, attributes: { charisma: 5, intellect: 10, integrity: 10, network: 10, mediaSavvy: 5 } });
    const inept = makeCareer({ localSeatWon: true, attributes: { charisma: 5, intellect: 1, integrity: 1, network: 1, mediaSavvy: 5 } });

    const rngCapable = new SeededRng(13);
    const rngInept = new SeededRng(13);
    let capableStrong = 0;
    let ineptStrong = 0;
    for (let i = 0; i < 100; i++) {
      if (doLocalGovernance(capable, rngCapable).outcome!.outcome === 'strong') capableStrong++;
      if (doLocalGovernance(inept, rngInept).outcome!.outcome === 'strong') ineptStrong++;
    }
    expect(capableStrong).toBeGreaterThan(ineptStrong);
  });
});

describe('officeholder stipend in advanceCareerTurn', () => {
  it('pays no stipend without a seat', () => {
    const state = makeCareer({ money: 100, localSeatWon: false, regionalSeatWon: false, jobId: null });
    const after = advanceCareerTurn(state, PARTIES);
    expect(after.money).toBe(100);
  });

  it('pays a local stipend while holding only a local seat', () => {
    const state = makeCareer({ money: 100, localSeatWon: true, regionalSeatWon: false, jobId: null });
    const after = advanceCareerTurn(state, PARTIES);
    expect(after.money).toBeGreaterThan(100);
  });

  it('pays a larger stipend once holding a regional seat instead of stacking both', () => {
    const localOnly = advanceCareerTurn(makeCareer({ money: 100, localSeatWon: true, regionalSeatWon: false, jobId: null }), PARTIES);
    const regional = advanceCareerTurn(makeCareer({ money: 100, localSeatWon: true, regionalSeatWon: true, jobId: null }), PARTIES);
    expect(regional.money).toBeGreaterThan(localOnly.money);
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

  it('rises with a stronger civic record, all else equal', () => {
    const noRecord = makeCareer({ civicRecord: 0 });
    const strongRecord = makeCareer({ civicRecord: 100 });
    expect(computeNominationProbability(strongRecord)).toBeGreaterThan(computeNominationProbability(noRecord));
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

  it('decays civic record a little each turn without reinforcement, even with no party', () => {
    let state = makeCareer({ partyId: null, civicRecord: 50 });
    state = advanceCareerTurn(state, PARTIES);
    expect(state.civicRecord).toBeLessThan(50);
    expect(state.civicRecord).toBeGreaterThan(40);
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
    expect(payload!.founderPartyDefinition).toBeNull();
  });

  it('carries the founded party definition when the career founded its own party', () => {
    let state = foundOwnParty(makeCareer(), 'my-party', 'My Party');
    state = { ...state, nominationHistory: [{ turn: 5, selected: true, probability: 0.9 }] };
    const payload = buildGraduationPayload(state);
    expect(payload!.founderPartyDefinition).not.toBeNull();
    expect(payload!.founderPartyDefinition!.id).toBe('my-party');
  });
});
