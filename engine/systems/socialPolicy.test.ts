import { describe, expect, it } from 'vitest';
import type { SocialPolicyState } from '../models/types';
import {
  advanceSocialIndicators,
  computeSocialPolicyApprovalImpact,
  computeSocialPolicyBudgetEffect,
  setEducationFunding,
  setHealthcareFunding,
  setWelfareFunding,
} from './socialPolicy';

function makeState(overrides: Partial<SocialPolicyState> = {}): SocialPolicyState {
  return {
    healthcareFunding: 'standard',
    educationFunding: 'standard',
    welfareFunding: 'standard',
    lifeExpectancy: 75,
    literacyRate: 88,
    povertyRate: 14,
    ...overrides,
  };
}

describe('setHealthcareFunding / setEducationFunding / setWelfareFunding', () => {
  it('update only their own field', () => {
    const state = makeState();
    const next = setHealthcareFunding(state, 'generous');
    expect(next.healthcareFunding).toBe('generous');
    expect(next.educationFunding).toBe('standard');
    expect(next.welfareFunding).toBe('standard');

    expect(setEducationFunding(state, 'minimal').educationFunding).toBe('minimal');
    expect(setWelfareFunding(state, 'generous').welfareFunding).toBe('generous');
  });
});

describe('advanceSocialIndicators', () => {
  it('moves life expectancy up toward a generous target', () => {
    const state = makeState({ healthcareFunding: 'generous', lifeExpectancy: 65 });
    const next = advanceSocialIndicators(state);
    expect(next.lifeExpectancy).toBeGreaterThan(65);
    expect(next.lifeExpectancy).toBeLessThan(83);
  });

  it('moves life expectancy down toward a minimal target', () => {
    const state = makeState({ healthcareFunding: 'minimal', lifeExpectancy: 83 });
    const next = advanceSocialIndicators(state);
    expect(next.lifeExpectancy).toBeLessThan(83);
  });

  it('moves poverty down under generous welfare (target runs the opposite direction from the other two)', () => {
    const state = makeState({ welfareFunding: 'generous', povertyRate: 25 });
    const next = advanceSocialIndicators(state);
    expect(next.povertyRate).toBeLessThan(25);
  });

  it('converges toward the target over many turns without overshooting', () => {
    let state = makeState({ educationFunding: 'generous', literacyRate: 50 });
    for (let i = 0; i < 200; i++) state = advanceSocialIndicators(state);
    expect(state.literacyRate).toBeCloseTo(97, 0);
  });

  it('keeps every indicator within its valid bounds', () => {
    let state = makeState({ welfareFunding: 'generous', povertyRate: 0 });
    for (let i = 0; i < 50; i++) state = advanceSocialIndicators(state);
    expect(state.povertyRate).toBeGreaterThanOrEqual(0);
  });
});

describe('computeSocialPolicyBudgetEffect', () => {
  it('is free at minimal funding across the board', () => {
    const state = makeState({ healthcareFunding: 'minimal', educationFunding: 'minimal', welfareFunding: 'minimal' });
    expect(computeSocialPolicyBudgetEffect(state).budgetBalance).toBe(0);
  });

  it('costs more at generous than minimal', () => {
    const minimal = computeSocialPolicyBudgetEffect(
      makeState({ healthcareFunding: 'minimal', educationFunding: 'minimal', welfareFunding: 'minimal' })
    ).budgetBalance!;
    const generous = computeSocialPolicyBudgetEffect(
      makeState({ healthcareFunding: 'generous', educationFunding: 'generous', welfareFunding: 'generous' })
    ).budgetBalance!;
    expect(generous).toBeLessThan(minimal);
  });
});

describe('computeSocialPolicyApprovalImpact', () => {
  it('is roughly zero at baseline outcomes', () => {
    const state = makeState({ lifeExpectancy: 75, literacyRate: 88, povertyRate: 14 });
    expect(computeSocialPolicyApprovalImpact(state)).toBeCloseTo(0, 5);
  });

  it('is positive when outcomes beat the baseline', () => {
    const state = makeState({ lifeExpectancy: 83, literacyRate: 97, povertyRate: 6 });
    expect(computeSocialPolicyApprovalImpact(state)).toBeGreaterThan(0);
  });

  it('is negative when outcomes lag the baseline', () => {
    const state = makeState({ lifeExpectancy: 65, literacyRate: 70, povertyRate: 25 });
    expect(computeSocialPolicyApprovalImpact(state)).toBeLessThan(0);
  });

  it('is bounded even at extreme values', () => {
    const state = makeState({ lifeExpectancy: 120, literacyRate: 100, povertyRate: 0 });
    expect(computeSocialPolicyApprovalImpact(state)).toBeLessThanOrEqual(10);
  });
});
