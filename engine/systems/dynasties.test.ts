import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { PoliticalDynasty, Politician } from '../models/types';
import { addDynastyMember, applyDynastyPrestigeDelta, foundDynasty, isDynastyMember, spawnHeir } from './dynasties';

function makePolitician(id: string): Politician {
  return {
    id,
    name: 'Founder',
    isPlayer: true,
    ideology: { economic: 20, social: -10 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
  };
}

describe('foundDynasty', () => {
  it('starts with the founder as the sole member and modest prestige', () => {
    const founder = makePolitician('founder-1');
    const dynasty = foundDynasty(founder, 'Varga', 'dynasty-1');
    expect(dynasty.memberIds).toEqual(['founder-1']);
    expect(dynasty.founderPoliticianId).toBe('founder-1');
    expect(dynasty.prestige).toBeGreaterThan(0);
    expect(dynasty.prestige).toBeLessThan(100);
  });
});

describe('isDynastyMember / addDynastyMember', () => {
  it('recognizes existing members and adds new ones without duplicating', () => {
    const founder = makePolitician('founder-1');
    let dynasty = foundDynasty(founder, 'Varga', 'dynasty-1');
    expect(isDynastyMember(dynasty, 'founder-1')).toBe(true);
    expect(isDynastyMember(dynasty, 'someone-else')).toBe(false);

    dynasty = addDynastyMember(dynasty, 'heir-1');
    expect(dynasty.memberIds).toContain('heir-1');
    const again = addDynastyMember(dynasty, 'heir-1');
    expect(again.memberIds.filter((id) => id === 'heir-1')).toHaveLength(1);
  });
});

describe('applyDynastyPrestigeDelta', () => {
  it('raises and clamps prestige to [0, 100]', () => {
    const dynasty: PoliticalDynasty = { id: 'd1', familyName: 'Varga', founderPoliticianId: 'f1', memberIds: ['f1'], prestige: 95 };
    const after = applyDynastyPrestigeDelta(dynasty, 20);
    expect(after.prestige).toBe(100);
  });

  it('lowers and clamps prestige to a floor of 0', () => {
    const dynasty: PoliticalDynasty = { id: 'd1', familyName: 'Varga', founderPoliticianId: 'f1', memberIds: ['f1'], prestige: 5 };
    const after = applyDynastyPrestigeDelta(dynasty, -20);
    expect(after.prestige).toBe(0);
  });
});

describe('spawnHeir', () => {
  it('carries the family name', () => {
    const dynasty: PoliticalDynasty = { id: 'd1', familyName: 'Varga', founderPoliticianId: 'f1', memberIds: ['f1'], prestige: 50 };
    const heir = spawnHeir(dynasty, { economic: 20, social: -10 }, 'party-a', 'seat-1', new SeededRng(1));
    expect(heir.name.endsWith('Varga')).toBe(true);
    expect(heir.partyId).toBe('party-a');
    expect(heir.isPlayer).toBe(false);
  });

  it('is deterministic for a given rng state', () => {
    const dynasty: PoliticalDynasty = { id: 'd1', familyName: 'Varga', founderPoliticianId: 'f1', memberIds: ['f1'], prestige: 50 };
    const a = spawnHeir(dynasty, { economic: 20, social: -10 }, 'party-a', 'seat-1', new SeededRng(9));
    const b = spawnHeir(dynasty, { economic: 20, social: -10 }, 'party-a', 'seat-1', new SeededRng(9));
    expect(a).toEqual(b);
  });

  it('a high-prestige dynasty produces stronger average attributes than a low-prestige one over many trials', () => {
    const highPrestige: PoliticalDynasty = { id: 'd1', familyName: 'Varga', founderPoliticianId: 'f1', memberIds: ['f1'], prestige: 100 };
    const lowPrestige: PoliticalDynasty = { id: 'd2', familyName: 'Nobody', founderPoliticianId: 'f2', memberIds: ['f2'], prestige: 0 };
    const rngHigh = new SeededRng(3);
    const rngLow = new SeededRng(3);
    let highTotal = 0;
    let lowTotal = 0;
    for (let i = 0; i < 50; i++) {
      const highHeir = spawnHeir(highPrestige, { economic: 0, social: 0 }, 'party-a', `seat-${i}`, rngHigh);
      const lowHeir = spawnHeir(lowPrestige, { economic: 0, social: 0 }, 'party-a', `seat-${i}`, rngLow);
      highTotal += highHeir.attributes.charisma + highHeir.attributes.intellect;
      lowTotal += lowHeir.attributes.charisma + lowHeir.attributes.intellect;
    }
    expect(highTotal).toBeGreaterThan(lowTotal);
  });

  it('keeps ideology close to the family position, within the clamped axis range', () => {
    const dynasty: PoliticalDynasty = { id: 'd1', familyName: 'Varga', founderPoliticianId: 'f1', memberIds: ['f1'], prestige: 50 };
    const heir = spawnHeir(dynasty, { economic: 90, social: 90 }, 'party-a', 'seat-1', new SeededRng(1));
    expect(heir.ideology.economic).toBeGreaterThanOrEqual(-100);
    expect(heir.ideology.economic).toBeLessThanOrEqual(100);
    expect(heir.ideology.economic).toBeGreaterThan(50);
  });
});
