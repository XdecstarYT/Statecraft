import { describe, expect, it } from 'vitest';
import type { InfrastructureState } from '../models/types';
import {
  INFRASTRUCTURE_INVESTMENT_TIERS,
  advanceInfrastructureDecay,
  computeInfrastructureApprovalImpact,
  computeInfrastructureEconomyEffect,
  investInInfrastructure,
} from './infrastructure';

function makeInfrastructure(overrides: Partial<InfrastructureState> = {}): InfrastructureState {
  return { transport: 50, power: 50, water: 50, digital: 50, ...overrides };
}

describe('investInInfrastructure', () => {
  it('major tier costs more and gains more than modest', () => {
    expect(INFRASTRUCTURE_INVESTMENT_TIERS.major.budgetCost).toBeLessThan(INFRASTRUCTURE_INVESTMENT_TIERS.modest.budgetCost);
    expect(INFRASTRUCTURE_INVESTMENT_TIERS.major.gain).toBeGreaterThan(INFRASTRUCTURE_INVESTMENT_TIERS.modest.gain);
  });

  it('raises only the targeted category', () => {
    const infrastructure = makeInfrastructure();
    const { infrastructure: after, economyEffect } = investInInfrastructure(infrastructure, 'transport', 'modest');
    expect(after.transport).toBeGreaterThan(50);
    expect(after.power).toBe(50);
    expect(after.water).toBe(50);
    expect(after.digital).toBe(50);
    expect(economyEffect.budgetBalance).toBeLessThan(0);
  });

  it('caps a category at 100', () => {
    const { infrastructure } = investInInfrastructure(makeInfrastructure({ power: 95 }), 'power', 'major');
    expect(infrastructure.power).toBeLessThanOrEqual(100);
  });
});

describe('advanceInfrastructureDecay', () => {
  it('lowers every category a little', () => {
    const infrastructure = makeInfrastructure();
    const next = advanceInfrastructureDecay(infrastructure);
    expect(next.transport).toBeLessThan(50);
    expect(next.power).toBeLessThan(50);
    expect(next.water).toBeLessThan(50);
    expect(next.digital).toBeLessThan(50);
  });

  it('never drops below zero', () => {
    const infrastructure = makeInfrastructure({ transport: 0, power: 0, water: 0, digital: 0 });
    const next = advanceInfrastructureDecay(infrastructure);
    expect(next.transport).toBeGreaterThanOrEqual(0);
  });
});

describe('computeInfrastructureEconomyEffect', () => {
  it('is roughly neutral at the neutral baseline', () => {
    expect(computeInfrastructureEconomyEffect(makeInfrastructure({ transport: 50, power: 50, water: 50, digital: 50 })).gdpGrowth).toBeCloseTo(0, 5);
  });

  it('is a real tailwind above baseline and a drag below it', () => {
    const good = computeInfrastructureEconomyEffect(makeInfrastructure({ transport: 90, power: 90, water: 90, digital: 90 }));
    const bad = computeInfrastructureEconomyEffect(makeInfrastructure({ transport: 10, power: 10, water: 10, digital: 10 }));
    expect(good.gdpGrowth).toBeGreaterThan(0);
    expect(bad.gdpGrowth).toBeLessThan(0);
  });
});

describe('computeInfrastructureApprovalImpact', () => {
  it('is positive above baseline, negative below, and bounded', () => {
    expect(computeInfrastructureApprovalImpact(makeInfrastructure({ transport: 90, power: 90, water: 90, digital: 90 }))).toBeGreaterThan(0);
    expect(computeInfrastructureApprovalImpact(makeInfrastructure({ transport: 10, power: 10, water: 10, digital: 10 }))).toBeLessThan(0);
    expect(computeInfrastructureApprovalImpact(makeInfrastructure({ transport: 100, power: 100, water: 100, digital: 100 }))).toBeLessThanOrEqual(6);
  });
});
