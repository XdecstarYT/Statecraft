import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Politician } from '../models/types';
import {
  attemptPressConference,
  attemptPressInterview,
  attemptRally,
  computeMediaSkill,
  computeRallySkill,
  computeTopicSkill,
} from './campaign';

function makePolitician(overrides: Partial<Politician> = {}): Politician {
  return {
    id: 'player',
    name: 'Alex Varga',
    isPlayer: true,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

describe('computeMediaSkill / computeRallySkill', () => {
  it('is 0.5 at the midpoint attribute values (5+5 of 20)', () => {
    const p = makePolitician();
    expect(computeMediaSkill(p)).toBeCloseTo(0.5, 5);
    expect(computeRallySkill(p)).toBeCloseTo(0.5, 5);
  });

  it('scales toward 1 with maxed attributes and 0 with minimum ones', () => {
    const gifted = makePolitician({ attributes: { charisma: 10, intellect: 5, integrity: 5, network: 10, mediaSavvy: 10 } });
    const untalented = makePolitician({ attributes: { charisma: 1, intellect: 5, integrity: 5, network: 1, mediaSavvy: 1 } });
    expect(computeMediaSkill(gifted)).toBeGreaterThan(computeMediaSkill(untalented));
    expect(computeRallySkill(gifted)).toBeGreaterThan(computeRallySkill(untalented));
  });
});

describe('attemptPressInterview / attemptRally', () => {
  it('is deterministic given the same rng state', () => {
    const p = makePolitician();
    const a = attemptPressInterview(p, new SeededRng(10));
    const b = attemptPressInterview(p, new SeededRng(10));
    expect(a).toEqual(b);
  });

  it('a highly skilled politician lands "strong" far more often than a poor one', () => {
    const gifted = makePolitician({ attributes: { charisma: 10, intellect: 5, integrity: 5, network: 5, mediaSavvy: 10 } });
    const untalented = makePolitician({ attributes: { charisma: 1, intellect: 5, integrity: 5, network: 5, mediaSavvy: 1 } });

    let giftedStrong = 0;
    let untalentedStrong = 0;
    const trials = 1000;
    for (let seed = 0; seed < trials; seed++) {
      if (attemptPressInterview(gifted, new SeededRng(seed)).outcome === 'strong') giftedStrong++;
      if (attemptPressInterview(untalented, new SeededRng(seed)).outcome === 'strong') untalentedStrong++;
    }
    expect(giftedStrong).toBeGreaterThan(untalentedStrong);
  });

  it('even a maxed-out politician can still gaffe (skill never eliminates risk)', () => {
    const gifted = makePolitician({ attributes: { charisma: 10, intellect: 5, integrity: 5, network: 10, mediaSavvy: 10 } });
    let sawGaffe = false;
    for (let seed = 0; seed < 500 && !sawGaffe; seed++) {
      if (attemptPressInterview(gifted, new SeededRng(seed)).outcome === 'gaffe') sawGaffe = true;
      if (attemptRally(gifted, new SeededRng(seed)).outcome === 'gaffe') sawGaffe = true;
    }
    expect(sawGaffe).toBe(true);
  });

  it('even the least talented politician can still land a "strong" outcome', () => {
    const untalented = makePolitician({ attributes: { charisma: 1, intellect: 5, integrity: 5, network: 1, mediaSavvy: 1 } });
    let sawStrong = false;
    for (let seed = 0; seed < 500 && !sawStrong; seed++) {
      if (attemptPressInterview(untalented, new SeededRng(seed)).outcome === 'strong') sawStrong = true;
    }
    expect(sawStrong).toBe(true);
  });

  it('gaffe always carries a negative approval impact, strong always positive', () => {
    const p = makePolitician();
    for (let seed = 0; seed < 200; seed++) {
      const interview = attemptPressInterview(p, new SeededRng(seed));
      if (interview.outcome === 'gaffe') expect(interview.approvalImpact).toBeLessThan(0);
      if (interview.outcome === 'strong') expect(interview.approvalImpact).toBeGreaterThan(0);

      const rally = attemptRally(p, new SeededRng(seed));
      if (rally.outcome === 'gaffe') expect(rally.approvalImpact).toBeLessThan(0);
      if (rally.outcome === 'strong') expect(rally.approvalImpact).toBeGreaterThan(0);
    }
  });
});

describe('computeTopicSkill / attemptPressConference', () => {
  it('rewards different attribute profiles on different topics', () => {
    const intellectual = makePolitician({ attributes: { charisma: 1, intellect: 10, integrity: 5, network: 5, mediaSavvy: 10 } });
    const charismatic = makePolitician({ attributes: { charisma: 10, intellect: 1, integrity: 5, network: 5, mediaSavvy: 10 } });
    expect(computeTopicSkill(intellectual, 'economy')).toBeGreaterThan(computeTopicSkill(charismatic, 'economy'));
    expect(computeTopicSkill(charismatic, 'social_policy')).toBeGreaterThan(computeTopicSkill(intellectual, 'social_policy'));
  });

  it('a high-integrity politician handles scandal defense better than a low-integrity one', () => {
    const clean = makePolitician({ attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } });
    const dirty = makePolitician({ attributes: { charisma: 5, intellect: 5, integrity: 1, network: 5, mediaSavvy: 5 } });
    expect(computeTopicSkill(clean, 'scandal_defense')).toBeGreaterThan(computeTopicSkill(dirty, 'scandal_defense'));
  });

  it('is deterministic given the same rng state', () => {
    const p = makePolitician();
    const a = attemptPressConference(p, 'economy', new SeededRng(5));
    const b = attemptPressConference(p, 'economy', new SeededRng(5));
    expect(a).toEqual(b);
  });

  it('carries higher stakes than a plain press interview', () => {
    const p = makePolitician({ attributes: { charisma: 10, intellect: 10, integrity: 10, network: 10, mediaSavvy: 10 } });
    let sawBiggerGaffe = false;
    for (let seed = 0; seed < 500 && !sawBiggerGaffe; seed++) {
      const conf = attemptPressConference(p, 'economy', new SeededRng(seed));
      if (conf.outcome === 'gaffe') {
        expect(conf.approvalImpact).toBeLessThan(-10);
        sawBiggerGaffe = true;
      }
    }
    expect(sawBiggerGaffe).toBe(true);
  });
});
