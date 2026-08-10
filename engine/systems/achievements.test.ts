import { describe, expect, it } from 'vitest';
import { createNewGame } from '../index';
import type { LegacyBreakdown } from './legacy';
import { ACHIEVEMENT_DEFINITIONS, computeUnlockedAchievements, isMilestoneAchievement } from './achievements';

function makeBreakdown(overrides: Partial<LegacyBreakdown> = {}): LegacyBreakdown {
  return {
    yearsInPower: 0,
    billsPassed: 0,
    partySeatShare: 0.3,
    partyIdeologicalCoherence: 0.8,
    economyDelta: { gdpGrowth: 0, unemployment: 0, debtToGdp: 0 },
    scandalRecord: { total: 0, unresolved: 0, hard: 0 },
    averageForeignRelations: 0,
    currentApproval: 50,
    ...overrides,
  };
}

describe('ACHIEVEMENT_DEFINITIONS', () => {
  it('has unique ids', () => {
    const ids = ACHIEVEMENT_DEFINITIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('isMilestoneAchievement', () => {
  it('flags known milestone ids', () => {
    expect(isMilestoneAchievement('party_founder')).toBe(true);
    expect(isMilestoneAchievement('landslide')).toBe(true);
  });

  it('does not flag derived achievements as milestones', () => {
    expect(isMilestoneAchievement('first_law')).toBe(false);
    expect(isMilestoneAchievement('debt_slayer')).toBe(false);
  });
});

describe('computeUnlockedAchievements', () => {
  it('unlocks nothing on a fresh game with no bills passed', () => {
    const state = createNewGame(1);
    const unlocked = computeUnlockedAchievements(state, makeBreakdown());
    expect(unlocked).not.toContain('first_law');
    expect(unlocked).not.toContain('ten_laws');
  });

  it('unlocks first_law and ten_laws at the right thresholds', () => {
    const state = createNewGame(1);
    const one = computeUnlockedAchievements(state, makeBreakdown({ billsPassed: 1 }));
    expect(one).toContain('first_law');
    expect(one).not.toContain('ten_laws');

    const ten = computeUnlockedAchievements(state, makeBreakdown({ billsPassed: 10 }));
    expect(ten).toContain('first_law');
    expect(ten).toContain('ten_laws');
  });

  it('unlocks clean_hands only with enough years and zero scandals', () => {
    const state = createNewGame(1);
    const tooEarly = computeUnlockedAchievements(state, makeBreakdown({ yearsInPower: 8, scandalRecord: { total: 0, unresolved: 0, hard: 0 } }));
    expect(tooEarly).toContain('clean_hands');

    const scandalized = computeUnlockedAchievements(state, makeBreakdown({ yearsInPower: 8, scandalRecord: { total: 1, unresolved: 0, hard: 0 } }));
    expect(scandalized).not.toContain('clean_hands');

    const shortTenure = computeUnlockedAchievements(state, makeBreakdown({ yearsInPower: 2, scandalRecord: { total: 0, unresolved: 0, hard: 0 } }));
    expect(shortTenure).not.toContain('clean_hands');
  });

  it('unlocks diplomat above 50 average relations and debt_slayer at 15+ point improvement', () => {
    const state = createNewGame(1);
    const diplomat = computeUnlockedAchievements(state, makeBreakdown({ averageForeignRelations: 60 }));
    expect(diplomat).toContain('diplomat');

    const notDiplomat = computeUnlockedAchievements(state, makeBreakdown({ averageForeignRelations: 40 }));
    expect(notDiplomat).not.toContain('diplomat');

    const debtSlayer = computeUnlockedAchievements(state, makeBreakdown({ economyDelta: { gdpGrowth: 0, unemployment: 0, debtToGdp: 20 } }));
    expect(debtSlayer).toContain('debt_slayer');
  });

  it('includes recorded milestones from state.milestones', () => {
    const state = { ...createNewGame(1), milestones: ['party_founder', 'landslide'] };
    const unlocked = computeUnlockedAchievements(state, makeBreakdown());
    expect(unlocked).toContain('party_founder');
    expect(unlocked).toContain('landslide');
  });

  it('deduplicates milestones already implied by derived checks', () => {
    const state = { ...createNewGame(1), milestones: ['first_law'] };
    const unlocked = computeUnlockedAchievements(state, makeBreakdown({ billsPassed: 1 }));
    expect(unlocked.filter((id) => id === 'first_law')).toHaveLength(1);
  });
});
