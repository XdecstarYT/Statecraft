import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { LeadershipChallenge, Politician } from '../models/types';
import {
  DEFAULT_LEADERSHIP_WEIGHTS,
  LEADERSHIP_CHALLENGE_THRESHOLD,
  computeChallengeChance,
  computeChallengerSupportProbability,
  computePartyStandingSkill,
  denounceChallenger,
  rallyPartySupport,
  resolveLeadershipVote,
  rollForLeadershipChallenge,
  selectChallenger,
} from './leadership';

function makePolitician(overrides: Partial<Politician> & { id: string }): Politician {
  return {
    name: overrides.id,
    isPlayer: false,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

describe('computeChallengeChance', () => {
  it('is 0 at or above the threshold', () => {
    expect(computeChallengeChance(LEADERSHIP_CHALLENGE_THRESHOLD)).toBe(0);
    expect(computeChallengeChance(80)).toBe(0);
  });

  it('rises the further underwater the incumbent is', () => {
    const shallow = computeChallengeChance(LEADERSHIP_CHALLENGE_THRESHOLD - 5);
    const deep = computeChallengeChance(5);
    expect(deep).toBeGreaterThan(shallow);
    expect(shallow).toBeGreaterThan(0);
  });

  it('never exceeds the configured max', () => {
    expect(computeChallengeChance(0)).toBeLessThanOrEqual(0.6);
  });
});

describe('selectChallenger', () => {
  it('picks a same-party member, never the incumbent themselves', () => {
    const incumbent = makePolitician({ id: 'incumbent', partyId: 'party-a' });
    const politicians = [
      incumbent,
      makePolitician({ id: 'ally', partyId: 'party-a', attributes: { charisma: 9, intellect: 9, integrity: 5, network: 9, mediaSavvy: 5 } }),
      makePolitician({ id: 'rival-party', partyId: 'party-b', attributes: { charisma: 10, intellect: 10, integrity: 10, network: 10, mediaSavvy: 10 } }),
    ];
    const challenger = selectChallenger(incumbent, politicians, new SeededRng(1));
    expect(challenger?.id).toBe('ally');
  });

  it('returns null when there are no other party members', () => {
    const incumbent = makePolitician({ id: 'incumbent', partyId: 'party-a' });
    expect(selectChallenger(incumbent, [incumbent], new SeededRng(1))).toBeNull();
  });
});

describe('rollForLeadershipChallenge', () => {
  it('never fires when the incumbent is safely above the threshold', () => {
    const incumbent = makePolitician({ id: 'incumbent', approval: { public: 50, base: 50, partyElite: 90 } });
    const politicians = [incumbent, makePolitician({ id: 'ally', partyId: 'party-a' })];
    const rng = new SeededRng(1);
    for (let i = 0; i < 50; i++) {
      expect(rollForLeadershipChallenge(incumbent, politicians, i, rng)).toBeNull();
    }
  });

  it('can fire when the incumbent is deeply underwater', () => {
    const incumbent = makePolitician({ id: 'incumbent', approval: { public: 50, base: 50, partyElite: 5 } });
    const politicians = [incumbent, makePolitician({ id: 'ally', partyId: 'party-a' })];
    const rng = new SeededRng(7);
    let fired = false;
    for (let i = 0; i < 50; i++) {
      if (rollForLeadershipChallenge(incumbent, politicians, i, rng)) {
        fired = true;
        break;
      }
    }
    expect(fired).toBe(true);
  });

  it('the resulting challenge references real ids and starts brewing', () => {
    const incumbent = makePolitician({ id: 'incumbent', approval: { public: 50, base: 50, partyElite: 0 } });
    const politicians = [incumbent, makePolitician({ id: 'ally', partyId: 'party-a' })];
    const rng = new SeededRng(2);
    let challenge: LeadershipChallenge | null = null;
    for (let i = 0; i < 50 && !challenge; i++) {
      challenge = rollForLeadershipChallenge(incumbent, politicians, i, rng);
    }
    expect(challenge).not.toBeNull();
    expect(challenge!.incumbentId).toBe('incumbent');
    expect(challenge!.challengerId).toBe('ally');
    expect(challenge!.status).toBe('brewing');
  });
});

describe('computeChallengerSupportProbability', () => {
  const incumbent = makePolitician({ id: 'incumbent', ideology: { economic: 60, social: 60 }, approval: { public: 50, base: 50, partyElite: 70 } });
  const challenger = makePolitician({ id: 'challenger', ideology: { economic: -60, social: -60 }, approval: { public: 50, base: 50, partyElite: 20 } });

  it('favors the incumbent when a member is ideologically closer and the incumbent has strong standing', () => {
    const member = makePolitician({ id: 'member', ideology: { economic: 55, social: 55 } });
    const p = computeChallengerSupportProbability(member, incumbent, challenger, {});
    expect(p).toBeLessThan(0.5);
  });

  it('favors the challenger when a member is ideologically closer to them', () => {
    const alignedIncumbent = makePolitician({ id: 'incumbent2', ideology: { economic: 60, social: 60 }, approval: { public: 50, base: 50, partyElite: 20 } });
    const alignedChallenger = makePolitician({ id: 'challenger2', ideology: { economic: -60, social: -60 }, approval: { public: 50, base: 50, partyElite: 70 } });
    const member = makePolitician({ id: 'member', ideology: { economic: -55, social: -55 } });
    const p = computeChallengerSupportProbability(member, alignedIncumbent, alignedChallenger, {});
    expect(p).toBeGreaterThan(0.5);
  });

  it('always returns a probability in (0, 1)', () => {
    const member = makePolitician({ id: 'member', ideology: { economic: 100, social: -100 } });
    const p = computeChallengerSupportProbability(member, incumbent, challenger, {}, DEFAULT_LEADERSHIP_WEIGHTS);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe('resolveLeadershipVote', () => {
  it('excludes both candidates from the electorate', () => {
    const incumbent = makePolitician({ id: 'incumbent', partyId: 'party-a' });
    const challenger = makePolitician({ id: 'challenger', partyId: 'party-a' });
    const member = makePolitician({ id: 'member', partyId: 'party-a' });
    const challenge: LeadershipChallenge = {
      id: 'c1', partyId: 'party-a', incumbentId: 'incumbent', challengerId: 'challenger', turnCalled: 1, status: 'brewing',
    };
    const result = resolveLeadershipVote(challenge, [incumbent, challenger, member], {}, new SeededRng(1));
    expect(result.incumbentVotes + result.challengerVotes).toBe(1);
  });

  it('an overwhelmingly popular incumbent wins even against many voters', () => {
    const incumbent = makePolitician({ id: 'incumbent', partyId: 'party-a', ideology: { economic: 50, social: 50 }, approval: { public: 50, base: 50, partyElite: 95 } });
    const challenger = makePolitician({ id: 'challenger', partyId: 'party-a', ideology: { economic: -50, social: -50 }, approval: { public: 50, base: 50, partyElite: 5 } });
    const voters = Array.from({ length: 20 }, (_, i) =>
      makePolitician({ id: `m${i}`, partyId: 'party-a', ideology: { economic: 45, social: 45 } })
    );
    const challenge: LeadershipChallenge = {
      id: 'c1', partyId: 'party-a', incumbentId: 'incumbent', challengerId: 'challenger', turnCalled: 1, status: 'brewing',
    };
    const result = resolveLeadershipVote(challenge, [incumbent, challenger, ...voters], {}, new SeededRng(3));
    expect(result.winnerId).toBe('incumbent');
  });

  it('is deterministic given the same starting rng state', () => {
    const incumbent = makePolitician({ id: 'incumbent', partyId: 'party-a' });
    const challenger = makePolitician({ id: 'challenger', partyId: 'party-a' });
    const voters = Array.from({ length: 10 }, (_, i) => makePolitician({ id: `m${i}`, partyId: 'party-a' }));
    const challenge: LeadershipChallenge = {
      id: 'c1', partyId: 'party-a', incumbentId: 'incumbent', challengerId: 'challenger', turnCalled: 1, status: 'brewing',
    };
    const resultA = resolveLeadershipVote(challenge, [incumbent, challenger, ...voters], {}, new SeededRng(99));
    const resultB = resolveLeadershipVote(challenge, [incumbent, challenger, ...voters], {}, new SeededRng(99));
    expect(resultA).toEqual(resultB);
  });

  it('throws if either candidate is missing from the politician list', () => {
    const challenge: LeadershipChallenge = {
      id: 'c1', partyId: 'party-a', incumbentId: 'ghost', challengerId: 'challenger', turnCalled: 1, status: 'brewing',
    };
    expect(() => resolveLeadershipVote(challenge, [makePolitician({ id: 'challenger' })], {}, new SeededRng(1))).toThrow();
  });
});

describe('computePartyStandingSkill', () => {
  it('is higher for a politician with stronger charisma, integrity, and network', () => {
    const skilled = makePolitician({ id: 'a', attributes: { charisma: 10, intellect: 5, integrity: 10, network: 10, mediaSavvy: 5 } });
    const unskilled = makePolitician({ id: 'b', attributes: { charisma: 1, intellect: 5, integrity: 1, network: 1, mediaSavvy: 5 } });
    expect(computePartyStandingSkill(skilled)).toBeGreaterThan(computePartyStandingSkill(unskilled));
  });
});

describe('rallyPartySupport / denounceChallenger', () => {
  it('are deterministic for a given rng state', () => {
    const incumbent = makePolitician({ id: 'incumbent' });
    expect(rallyPartySupport(incumbent, new SeededRng(5))).toEqual(rallyPartySupport(incumbent, new SeededRng(5)));
    expect(denounceChallenger(incumbent, new SeededRng(5))).toEqual(denounceChallenger(incumbent, new SeededRng(5)));
  });

  it('a skilled incumbent lands a strong rally more often over many trials', () => {
    const skilled = makePolitician({ id: 'skilled', attributes: { charisma: 10, intellect: 5, integrity: 10, network: 10, mediaSavvy: 5 } });
    const unskilled = makePolitician({ id: 'unskilled', attributes: { charisma: 1, intellect: 5, integrity: 1, network: 1, mediaSavvy: 5 } });
    const rngSkilled = new SeededRng(11);
    const rngUnskilled = new SeededRng(11);
    let skilledStrong = 0;
    let unskilledStrong = 0;
    for (let i = 0; i < 500; i++) {
      if (rallyPartySupport(skilled, rngSkilled).outcome === 'strong') skilledStrong++;
      if (rallyPartySupport(unskilled, rngUnskilled).outcome === 'strong') unskilledStrong++;
    }
    expect(skilledStrong).toBeGreaterThan(unskilledStrong);
  });

  it("denounceChallenger's non-backfire impact is always negative (hurts the challenger)", () => {
    const incumbent = makePolitician({ id: 'incumbent', attributes: { charisma: 8, intellect: 5, integrity: 8, network: 8, mediaSavvy: 5 } });
    const rng = new SeededRng(21);
    for (let i = 0; i < 200; i++) {
      const outcome = denounceChallenger(incumbent, rng);
      if (outcome.outcome !== 'backfire') {
        expect(outcome.impact).toBeLessThan(0);
      } else {
        expect(outcome.impact).toBeGreaterThan(0);
      }
    }
  });
});
