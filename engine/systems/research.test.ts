import { describe, expect, it } from 'vitest';
import type { ResearchState, TechNode } from '../models/types';
import {
  RESEARCH_INVESTMENT_TIERS,
  advanceResearchPoints,
  canAffordTech,
  computeResearchPointsPerTurn,
  investInResearch,
  isTechAvailable,
  unlockTech,
} from './research';

function makeResearch(overrides: Partial<ResearchState> = {}): ResearchState {
  return { capability: 20, accumulatedPoints: 0, unlockedTechIds: [], ...overrides };
}

function makeTech(overrides: Partial<TechNode> = {}): TechNode {
  return {
    id: 't1',
    name: 'Test Tech',
    description: '',
    category: 'economy',
    cost: 50,
    prerequisites: [],
    economyEffect: { gdpGrowth: 0.1 },
    ...overrides,
  };
}

describe('investInResearch', () => {
  it('major tier costs more and gains more than modest', () => {
    expect(RESEARCH_INVESTMENT_TIERS.major.budgetCost).toBeLessThan(RESEARCH_INVESTMENT_TIERS.modest.budgetCost);
    expect(RESEARCH_INVESTMENT_TIERS.major.capabilityGain).toBeGreaterThan(RESEARCH_INVESTMENT_TIERS.modest.capabilityGain);
  });

  it('raises capability and carries a real budget cost', () => {
    const { research, economyEffect } = investInResearch(makeResearch({ capability: 20 }), 'modest');
    expect(research.capability).toBeGreaterThan(20);
    expect(economyEffect.budgetBalance).toBeLessThan(0);
  });

  it('caps capability at 100', () => {
    const { research } = investInResearch(makeResearch({ capability: 95 }), 'major');
    expect(research.capability).toBeLessThanOrEqual(100);
  });
});

describe('computeResearchPointsPerTurn / advanceResearchPoints', () => {
  it('scales with invested capability', () => {
    const low = computeResearchPointsPerTurn(makeResearch({ capability: 0 }));
    const high = computeResearchPointsPerTurn(makeResearch({ capability: 100 }));
    expect(high).toBeGreaterThan(low);
  });

  it('accumulates points turn over turn', () => {
    let research = makeResearch({ capability: 0, accumulatedPoints: 0 });
    research = advanceResearchPoints(research);
    const afterOne = research.accumulatedPoints;
    research = advanceResearchPoints(research);
    expect(research.accumulatedPoints).toBe(afterOne * 2);
  });
});

describe('isTechAvailable', () => {
  it('is true for a tech with no prerequisites', () => {
    expect(isTechAvailable(makeTech({ prerequisites: [] }), [])).toBe(true);
  });

  it('is false when a prerequisite is missing', () => {
    expect(isTechAvailable(makeTech({ prerequisites: ['base-tech'] }), [])).toBe(false);
  });

  it('is true once every prerequisite is unlocked', () => {
    expect(isTechAvailable(makeTech({ prerequisites: ['a', 'b'] }), ['a', 'b'])).toBe(true);
  });

  it('is false if already unlocked', () => {
    expect(isTechAvailable(makeTech({ id: 't1' }), ['t1'])).toBe(false);
  });
});

describe('canAffordTech', () => {
  it('is false below cost and true at or above it', () => {
    const tech = makeTech({ cost: 100 });
    expect(canAffordTech(tech, 99)).toBe(false);
    expect(canAffordTech(tech, 100)).toBe(true);
  });
});

describe('unlockTech', () => {
  it('spends points, records the unlock, and returns the tech economy effect', () => {
    const research = makeResearch({ accumulatedPoints: 100 });
    const tech = makeTech({ id: 'iron-smelting', cost: 60, economyEffect: { gdpGrowth: 0.2 } });
    const { research: after, economyEffect } = unlockTech(research, tech);
    expect(after.accumulatedPoints).toBe(40);
    expect(after.unlockedTechIds).toContain('iron-smelting');
    expect(economyEffect).toEqual({ gdpGrowth: 0.2 });
  });
});
