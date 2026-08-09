import { describe, expect, it } from 'vitest';
import type { Politician } from '../models/types';
import { appointToCabinet, computeCabinetEffects, removeFromCabinet } from './cabinet';

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

describe('appointToCabinet', () => {
  it('adds a new appointment', () => {
    const cabinet = appointToCabinet([], 'finance', 'p1');
    expect(cabinet).toEqual([{ portfolio: 'finance', politicianId: 'p1' }]);
  });

  it('replaces whoever previously held that portfolio', () => {
    const cabinet = appointToCabinet([{ portfolio: 'finance', politicianId: 'p1' }], 'finance', 'p2');
    expect(cabinet).toEqual([{ portfolio: 'finance', politicianId: 'p2' }]);
  });

  it('leaves other portfolios untouched', () => {
    const cabinet = appointToCabinet([{ portfolio: 'defense', politicianId: 'p1' }], 'finance', 'p2');
    expect(cabinet).toHaveLength(2);
  });
});

describe('removeFromCabinet', () => {
  it('removes the appointment for that portfolio', () => {
    const cabinet = removeFromCabinet([{ portfolio: 'finance', politicianId: 'p1' }], 'finance');
    expect(cabinet).toHaveLength(0);
  });

  it('is a no-op for a vacant portfolio', () => {
    const cabinet = removeFromCabinet([{ portfolio: 'defense', politicianId: 'p1' }], 'finance');
    expect(cabinet).toHaveLength(1);
  });
});

describe('computeCabinetEffects', () => {
  it('returns neutral effects for an empty cabinet', () => {
    const effects = computeCabinetEffects([], []);
    expect(effects.economyVolatilityMultiplier).toBe(1);
    expect(effects.warStrengthBonus).toBe(0);
    expect(effects.corruptionDetectionMultiplier).toBe(1);
    expect(effects.warDeclarationRelationSoftening).toBe(0);
  });

  it('a sharp Finance minister lowers the economy volatility multiplier', () => {
    const politicians = [makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 10, integrity: 5, network: 5, mediaSavvy: 5 } })];
    const effects = computeCabinetEffects([{ portfolio: 'finance', politicianId: 'p1' }], politicians);
    expect(effects.economyVolatilityMultiplier).toBeLessThan(1);
  });

  it('a sharp Defense minister grants a positive war strength bonus', () => {
    const politicians = [makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 9, integrity: 5, network: 5, mediaSavvy: 5 } })];
    const effects = computeCabinetEffects([{ portfolio: 'defense', politicianId: 'p1' }], politicians);
    expect(effects.warStrengthBonus).toBeGreaterThan(0);
  });

  it('a principled Justice minister raises the corruption detection multiplier', () => {
    const politicians = [makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } })];
    const effects = computeCabinetEffects([{ portfolio: 'justice', politicianId: 'p1' }], politicians);
    expect(effects.corruptionDetectionMultiplier).toBeGreaterThan(1);
  });

  it('a charismatic Foreign Affairs minister softens the war-declaration relation hit', () => {
    const politicians = [makePolitician({ id: 'p1', attributes: { charisma: 10, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 } })];
    const effects = computeCabinetEffects([{ portfolio: 'foreignAffairs', politicianId: 'p1' }], politicians);
    expect(effects.warDeclarationRelationSoftening).toBeGreaterThan(0);
    expect(effects.warDeclarationRelationSoftening).toBeLessThanOrEqual(1);
  });

  it('ignores an appointment whose politician no longer exists', () => {
    const effects = computeCabinetEffects([{ portfolio: 'finance', politicianId: 'ghost' }], []);
    expect(effects.economyVolatilityMultiplier).toBe(1);
  });

  it('combines effects across multiple simultaneous portfolios', () => {
    const politicians = [
      makePolitician({ id: 'p1', attributes: { charisma: 5, intellect: 10, integrity: 5, network: 5, mediaSavvy: 5 } }),
      makePolitician({ id: 'p2', attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } }),
    ];
    const effects = computeCabinetEffects(
      [
        { portfolio: 'finance', politicianId: 'p1' },
        { portfolio: 'justice', politicianId: 'p2' },
      ],
      politicians
    );
    expect(effects.economyVolatilityMultiplier).toBeLessThan(1);
    expect(effects.corruptionDetectionMultiplier).toBeGreaterThan(1);
  });
});
