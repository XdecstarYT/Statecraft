import { describe, expect, it } from 'vitest';
import type { CrimeState } from '../models/types';
import {
  POLICING_FUNDING_CONFIG,
  advanceCrimeRate,
  advanceIncarcerationRate,
  advanceOrganizedCrimeInfluence,
  computeCrimeApprovalImpact,
  computeCrimeTarget,
  computeIncarcerationTarget,
  computeOrganizedCrimeEconomyEffect,
  computePolicingBudgetEffect,
  setPolicingFunding,
} from './publicSafety';

function makeCrime(overrides: Partial<CrimeState> = {}): CrimeState {
  return { crimeRate: 30, incarcerationRate: 15, policingFunding: 'standard', organizedCrimeInfluence: 0, ...overrides };
}

describe('setPolicingFunding', () => {
  it('updates only the funding tier', () => {
    const crime = makeCrime();
    const next = setPolicingFunding(crime, 'aggressive');
    expect(next.policingFunding).toBe('aggressive');
    expect(next.crimeRate).toBe(crime.crimeRate);
  });
});

describe('computeCrimeTarget', () => {
  it('rises with poverty and unemployment', () => {
    const low = computeCrimeTarget(5, 3, 'standard');
    const high = computeCrimeTarget(40, 15, 'standard');
    expect(high).toBeGreaterThan(low);
  });

  it('aggressive policing yields a lower target than minimal for the same conditions', () => {
    const aggressive = computeCrimeTarget(30, 10, 'aggressive');
    const minimal = computeCrimeTarget(30, 10, 'minimal');
    expect(aggressive).toBeLessThan(minimal);
  });

  it('is bounded to 0..100', () => {
    expect(computeCrimeTarget(1000, 1000, 'minimal')).toBeLessThanOrEqual(100);
    expect(computeCrimeTarget(0, 0, 'aggressive')).toBeGreaterThanOrEqual(0);
  });
});

describe('advanceCrimeRate', () => {
  it('moves toward a higher target under poverty/unemployment pressure', () => {
    const crime = makeCrime({ crimeRate: 10, policingFunding: 'minimal' });
    const next = advanceCrimeRate(crime, 50, 15);
    expect(next.crimeRate).toBeGreaterThan(10);
  });

  it('moves down when policing is aggressive and conditions are mild', () => {
    const crime = makeCrime({ crimeRate: 50, policingFunding: 'aggressive' });
    const next = advanceCrimeRate(crime, 5, 2);
    expect(next.crimeRate).toBeLessThan(50);
  });
});

describe('computeIncarcerationTarget / advanceIncarcerationRate', () => {
  it('aggressive policing incarcerates more than minimal for the same crime rate', () => {
    expect(computeIncarcerationTarget(50, 'aggressive')).toBeGreaterThan(computeIncarcerationTarget(50, 'minimal'));
  });

  it('advanceIncarcerationRate moves toward that target', () => {
    const crime = makeCrime({ crimeRate: 60, incarcerationRate: 0, policingFunding: 'standard' });
    const next = advanceIncarcerationRate(crime);
    expect(next.incarcerationRate).toBeGreaterThan(0);
  });
});

describe('advanceOrganizedCrimeInfluence', () => {
  it('grows with high crime and unresolved scandals under minimal policing', () => {
    const crime = makeCrime({ crimeRate: 80, policingFunding: 'minimal', organizedCrimeInfluence: 10 });
    const next = advanceOrganizedCrimeInfluence(crime, 3);
    expect(next.organizedCrimeInfluence).toBeGreaterThan(10);
  });

  it('shrinks under aggressive policing when crime and scandals are low', () => {
    const crime = makeCrime({ crimeRate: 5, policingFunding: 'aggressive', organizedCrimeInfluence: 20 });
    const next = advanceOrganizedCrimeInfluence(crime, 0);
    expect(next.organizedCrimeInfluence).toBeLessThan(20);
  });

  it('never leaves 0..100 bounds', () => {
    const low = advanceOrganizedCrimeInfluence(makeCrime({ organizedCrimeInfluence: 0, policingFunding: 'aggressive' }), 0);
    expect(low.organizedCrimeInfluence).toBeGreaterThanOrEqual(0);
    const high = advanceOrganizedCrimeInfluence(makeCrime({ organizedCrimeInfluence: 100, crimeRate: 100 }), 50);
    expect(high.organizedCrimeInfluence).toBeLessThanOrEqual(100);
  });
});

describe('computeOrganizedCrimeEconomyEffect', () => {
  it('is zero at zero influence and a real drag at high influence', () => {
    expect(computeOrganizedCrimeEconomyEffect(0).budgetBalance).toBeCloseTo(0, 5);
    expect(computeOrganizedCrimeEconomyEffect(100).budgetBalance).toBeLessThan(0);
  });
});

describe('computePolicingBudgetEffect', () => {
  it('aggressive costs more than minimal', () => {
    const minimal = computePolicingBudgetEffect('minimal').budgetBalance!;
    const aggressive = computePolicingBudgetEffect('aggressive').budgetBalance!;
    expect(aggressive).toBeLessThan(minimal);
  });

  it('matches the tier config table', () => {
    expect(computePolicingBudgetEffect('standard').budgetBalance).toBe(POLICING_FUNDING_CONFIG.standard.budgetCostPerTurn);
  });
});

describe('computeCrimeApprovalImpact', () => {
  it('is positive when crime is well below baseline', () => {
    expect(computeCrimeApprovalImpact(makeCrime({ crimeRate: 5, policingFunding: 'standard' }))).toBeGreaterThan(0);
  });

  it('is negative when crime is well above baseline', () => {
    expect(computeCrimeApprovalImpact(makeCrime({ crimeRate: 90, policingFunding: 'standard' }))).toBeLessThan(0);
  });

  it('aggressive policing adds a small negative friction even at the same crime rate', () => {
    const standard = computeCrimeApprovalImpact(makeCrime({ crimeRate: 30, policingFunding: 'standard' }));
    const aggressive = computeCrimeApprovalImpact(makeCrime({ crimeRate: 30, policingFunding: 'aggressive' }));
    expect(aggressive).toBeLessThan(standard);
  });

  it('is bounded even at extreme crime rates', () => {
    expect(computeCrimeApprovalImpact(makeCrime({ crimeRate: 0 }))).toBeLessThanOrEqual(8);
    expect(computeCrimeApprovalImpact(makeCrime({ crimeRate: 1000 }))).toBeGreaterThanOrEqual(-8.5);
  });
});
