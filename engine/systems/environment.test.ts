import { describe, expect, it } from 'vitest';
import type { EnvironmentState, Factory, Mine } from '../models/types';
import {
  GREEN_INVESTMENT_TIERS,
  advancePollutionIndex,
  advanceRenewableShare,
  computeDisasterRiskMultiplier,
  computeIndustrialEmissions,
  computePollutionEconomyEffect,
  investInGreenInfrastructure,
  setEnergyPolicy,
} from './environment';

function makeEnvironment(overrides: Partial<EnvironmentState> = {}): EnvironmentState {
  return { pollutionIndex: 20, renewableShare: 20, energyPolicy: 'balanced', greenInvestmentCapability: 0, ...overrides };
}

function makeMine(overrides: Partial<Mine> = {}): Mine {
  return { id: 'm1', depositId: 'd1', ownership: 'state', tier: 1, turnBuilt: 1, ...overrides };
}

function makeFactory(overrides: Partial<Factory> = {}): Factory {
  return { id: 'f1', locationId: 'p1', locationType: 'domestic', recipeId: 'recipe-steel', ownership: 'state', tier: 1, turnBuilt: 1, ...overrides };
}

describe('computeIndustrialEmissions', () => {
  it('is zero with no mines or factories', () => {
    expect(computeIndustrialEmissions([], [])).toBe(0);
  });

  it('scales with tier and count', () => {
    const low = computeIndustrialEmissions([makeMine({ tier: 1 })], []);
    const high = computeIndustrialEmissions([makeMine({ tier: 3 })], [makeFactory({ tier: 3 })]);
    expect(high).toBeGreaterThan(low);
  });
});

describe('advancePollutionIndex', () => {
  it('rises with real emissions', () => {
    const environment = makeEnvironment({ pollutionIndex: 20, renewableShare: 0 });
    const next = advancePollutionIndex(environment, 50);
    expect(next.pollutionIndex).toBeGreaterThan(20);
  });

  it('rises less when renewable share is higher, for the same emissions', () => {
    const lowRenewable = advancePollutionIndex(makeEnvironment({ pollutionIndex: 20, renewableShare: 0 }), 50);
    const highRenewable = advancePollutionIndex(makeEnvironment({ pollutionIndex: 20, renewableShare: 100 }), 50);
    expect(highRenewable.pollutionIndex).toBeLessThan(lowRenewable.pollutionIndex);
  });

  it('slowly decays on its own with zero emissions', () => {
    const environment = makeEnvironment({ pollutionIndex: 20 });
    const next = advancePollutionIndex(environment, 0);
    expect(next.pollutionIndex).toBeLessThan(20);
  });

  it('stays within 0..100 bounds', () => {
    const high = advancePollutionIndex(makeEnvironment({ pollutionIndex: 99 }), 1000);
    expect(high.pollutionIndex).toBeLessThanOrEqual(100);
    const low = advancePollutionIndex(makeEnvironment({ pollutionIndex: 0 }), 0);
    expect(low.pollutionIndex).toBeGreaterThanOrEqual(0);
  });
});

describe('setEnergyPolicy', () => {
  it('updates only the policy field', () => {
    const environment = makeEnvironment();
    const next = setEnergyPolicy(environment, 'renewable_focus');
    expect(next.energyPolicy).toBe('renewable_focus');
    expect(next.renewableShare).toBe(environment.renewableShare);
  });
});

describe('advanceRenewableShare', () => {
  it('rises toward a renewable-focus target', () => {
    const environment = makeEnvironment({ renewableShare: 10, energyPolicy: 'renewable_focus' });
    const next = advanceRenewableShare(environment);
    expect(next.renewableShare).toBeGreaterThan(10);
  });

  it('falls toward a fossil-heavy target', () => {
    const environment = makeEnvironment({ renewableShare: 90, energyPolicy: 'fossil_heavy' });
    const next = advanceRenewableShare(environment);
    expect(next.renewableShare).toBeLessThan(90);
  });

  it('moves faster with more invested green capability', () => {
    const slow = advanceRenewableShare(makeEnvironment({ renewableShare: 0, energyPolicy: 'renewable_focus', greenInvestmentCapability: 0 }));
    const fast = advanceRenewableShare(makeEnvironment({ renewableShare: 0, energyPolicy: 'renewable_focus', greenInvestmentCapability: 100 }));
    expect(fast.renewableShare).toBeGreaterThan(slow.renewableShare);
  });
});

describe('investInGreenInfrastructure', () => {
  it('major tier costs more and gains more than modest', () => {
    expect(GREEN_INVESTMENT_TIERS.major.budgetCost).toBeLessThan(GREEN_INVESTMENT_TIERS.modest.budgetCost);
    expect(GREEN_INVESTMENT_TIERS.major.capabilityGain).toBeGreaterThan(GREEN_INVESTMENT_TIERS.modest.capabilityGain);
  });

  it('raises capability and carries a real budget cost', () => {
    const { environment, economyEffect } = investInGreenInfrastructure(makeEnvironment({ greenInvestmentCapability: 20 }), 'modest');
    expect(environment.greenInvestmentCapability).toBeGreaterThan(20);
    expect(economyEffect.budgetBalance).toBeLessThan(0);
  });

  it('caps capability at 100', () => {
    const { environment } = investInGreenInfrastructure(makeEnvironment({ greenInvestmentCapability: 95 }), 'major');
    expect(environment.greenInvestmentCapability).toBeLessThanOrEqual(100);
  });
});

describe('computePollutionEconomyEffect', () => {
  it('is a real growth drag at high pollution and near-zero at none', () => {
    expect(computePollutionEconomyEffect(0).gdpGrowth).toBeCloseTo(0, 5);
    expect(computePollutionEconomyEffect(100).gdpGrowth).toBeLessThan(0);
  });
});

describe('computeDisasterRiskMultiplier', () => {
  it('is exactly 1 at zero pollution', () => {
    expect(computeDisasterRiskMultiplier(0)).toBe(1);
  });

  it('rises above 1 with pollution', () => {
    expect(computeDisasterRiskMultiplier(100)).toBeGreaterThan(1);
  });
});
