import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Endorser, Politician } from '../models/types';
import { attemptEndorsement, computeEndorsementProbability } from './endorsements';

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

function makeEndorser(overrides: Partial<Endorser> = {}): Endorser {
  return { id: 'e1', name: 'Test Endorser', type: 'celebrity', ideology: { economic: 0, social: 0 }, prominence: 50, ...overrides };
}

describe('computeEndorsementProbability', () => {
  it('is high when ideologies match closely', () => {
    const politician = makePolitician({ ideology: { economic: 50, social: 50 } });
    const endorser = makeEndorser({ ideology: { economic: 50, social: 50 } });
    expect(computeEndorsementProbability(endorser, politician)).toBeGreaterThan(0.8);
  });

  it('is low when ideologies are opposed', () => {
    const politician = makePolitician({ ideology: { economic: -100, social: -100 } });
    const endorser = makeEndorser({ ideology: { economic: 100, social: 100 } });
    expect(computeEndorsementProbability(endorser, politician)).toBeLessThan(0.2);
  });

  it('never reaches exactly 0 or 1', () => {
    const politician = makePolitician({ ideology: { economic: -100, social: -100 } });
    const opposedEndorser = makeEndorser({ ideology: { economic: 100, social: 100 } });
    const alignedEndorser = makeEndorser({ ideology: { economic: -100, social: -100 } });
    expect(computeEndorsementProbability(opposedEndorser, politician)).toBeGreaterThan(0);
    expect(computeEndorsementProbability(alignedEndorser, politician)).toBeLessThan(1);
  });
});

describe('attemptEndorsement', () => {
  it('is deterministic given the same rng state', () => {
    const politician = makePolitician();
    const endorser = makeEndorser();
    const a = attemptEndorsement(endorser, politician, new SeededRng(3));
    const b = attemptEndorsement(endorser, politician, new SeededRng(3));
    expect(a).toEqual(b);
  });

  it('a well-aligned endorser succeeds far more often than an opposed one', () => {
    const politician = makePolitician({ ideology: { economic: 60, social: 60 } });
    const aligned = makeEndorser({ ideology: { economic: 60, social: 60 } });
    const opposed = makeEndorser({ ideology: { economic: -60, social: -60 } });
    let alignedSuccess = 0;
    let opposedSuccess = 0;
    const trials = 300;
    for (let seed = 0; seed < trials; seed++) {
      if (attemptEndorsement(aligned, politician, new SeededRng(seed)).success) alignedSuccess++;
      if (attemptEndorsement(opposed, politician, new SeededRng(seed)).success) opposedSuccess++;
    }
    expect(alignedSuccess).toBeGreaterThan(opposedSuccess);
  });

  it('failure always carries zero approval impact', () => {
    const politician = makePolitician();
    const endorser = makeEndorser({ ideology: { economic: -100, social: -100 } });
    for (let seed = 0; seed < 100; seed++) {
      const result = attemptEndorsement(endorser, politician, new SeededRng(seed));
      if (!result.success) expect(result.approvalImpact).toBe(0);
    }
  });

  it('success impact scales with prominence', () => {
    const politician = makePolitician();
    const minor = makeEndorser({ prominence: 10 });
    const major = makeEndorser({ prominence: 90 });
    let minorImpact = 0;
    let majorImpact = 0;
    for (let seed = 0; seed < 200 && (minorImpact === 0 || majorImpact === 0); seed++) {
      const minorResult = attemptEndorsement(minor, politician, new SeededRng(seed));
      if (minorResult.success) minorImpact = minorResult.approvalImpact;
      const majorResult = attemptEndorsement(major, politician, new SeededRng(seed));
      if (majorResult.success) majorImpact = majorResult.approvalImpact;
    }
    expect(majorImpact).toBeGreaterThan(minorImpact);
  });
});
