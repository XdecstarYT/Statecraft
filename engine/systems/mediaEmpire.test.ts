import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { CulturalInstitution, MediaOutlet } from '../models/types';
import {
  advanceInstitutionPrestige,
  advanceOutletReach,
  advanceSoftPower,
  computeSoftPowerTarget,
  foundCulturalInstitution,
  foundMediaOutlet,
  investInOutlet,
} from './mediaEmpire';

describe('foundMediaOutlet', () => {
  it('starts with a small reach and the owner set', () => {
    const outlet = foundMediaOutlet('o1', 'The Daily Signal', { economic: 20, social: 10 }, 'player-1');
    expect(outlet.ownerId).toBe('player-1');
    expect(outlet.reach).toBeGreaterThan(0);
    expect(outlet.reach).toBeLessThan(0.1);
    expect(outlet.investedCapability).toBeGreaterThan(0);
  });
});

describe('investInOutlet', () => {
  it('raises invested capability, capped at 100', () => {
    const outlet = foundMediaOutlet('o1', 'Test Outlet', { economic: 0, social: 0 }, 'player-1');
    const invested = investInOutlet(outlet, 50);
    expect(invested.investedCapability).toBe((outlet.investedCapability ?? 0) + 50);
    const maxedOut = investInOutlet(invested, 1000);
    expect(maxedOut.investedCapability).toBe(100);
  });
});

describe('advanceOutletReach', () => {
  it('grows reach for a player-owned outlet', () => {
    const outlet = foundMediaOutlet('o1', 'Test Outlet', { economic: 0, social: 0 }, 'player-1');
    const grown = advanceOutletReach(outlet);
    expect(grown.reach).toBeGreaterThan(outlet.reach);
  });

  it('leaves an un-owned (pre-authored) outlet untouched', () => {
    const outlet: MediaOutlet = { id: 'press-1', name: 'State Press', bias: { economic: 0, social: 0 }, reach: 0.3 };
    const result = advanceOutletReach(outlet);
    expect(result).toEqual(outlet);
  });

  it('never exceeds a reach of 1', () => {
    let outlet = foundMediaOutlet('o1', 'Test Outlet', { economic: 0, social: 0 }, 'player-1');
    outlet = investInOutlet(outlet, 80);
    for (let i = 0; i < 2000; i++) outlet = advanceOutletReach(outlet);
    expect(outlet.reach).toBeLessThanOrEqual(1);
  });
});

describe('foundCulturalInstitution', () => {
  it('starts with prestige in the expected starting range', () => {
    const inst = foundCulturalInstitution('c1', 'National Arts Council', 'player-1', 5, new SeededRng(1));
    expect(inst.prestige).toBeGreaterThanOrEqual(20);
    expect(inst.prestige).toBeLessThanOrEqual(50);
    expect(inst.turnFounded).toBe(5);
  });
});

describe('advanceInstitutionPrestige', () => {
  it('stays within 0..100 bounds', () => {
    let inst: CulturalInstitution = { id: 'c1', name: 'Test', founderId: 'player-1', turnFounded: 1, prestige: 98 };
    const rng = new SeededRng(1);
    for (let i = 0; i < 200; i++) {
      inst = advanceInstitutionPrestige(inst, rng);
      expect(inst.prestige).toBeGreaterThanOrEqual(0);
      expect(inst.prestige).toBeLessThanOrEqual(100);
    }
  });
});

describe('computeSoftPowerTarget', () => {
  it('is zero with no owned outlets or institutions', () => {
    const outlets: MediaOutlet[] = [{ id: 'press-1', name: 'State Press', bias: { economic: 0, social: 0 }, reach: 0.5 }];
    expect(computeSoftPowerTarget(outlets, [])).toBe(0);
  });

  it('rises with owned outlet reach and institution prestige', () => {
    const outlets: MediaOutlet[] = [foundMediaOutlet('o1', 'Test', { economic: 0, social: 0 }, 'player-1')];
    const grown = { ...outlets[0], reach: 0.5 };
    const institutions: CulturalInstitution[] = [{ id: 'c1', name: 'Test', founderId: 'player-1', turnFounded: 1, prestige: 60 }];
    expect(computeSoftPowerTarget([grown], institutions)).toBeGreaterThan(0);
  });

  it('never exceeds 100', () => {
    const outlets: MediaOutlet[] = [foundMediaOutlet('o1', 'Test', { economic: 0, social: 0 }, 'player-1')];
    const maxed = { ...outlets[0], reach: 1 };
    const institutions: CulturalInstitution[] = Array.from({ length: 10 }, (_, i) => ({
      id: `c${i}`,
      name: 'Test',
      founderId: 'player-1',
      turnFounded: 1,
      prestige: 100,
    }));
    expect(computeSoftPowerTarget([maxed], institutions)).toBe(100);
  });
});

describe('advanceSoftPower', () => {
  it('is sticky — moves toward target but not instantly', () => {
    const outlets: MediaOutlet[] = [{ ...foundMediaOutlet('o1', 'Test', { economic: 0, social: 0 }, 'player-1'), reach: 1 }];
    const next = advanceSoftPower(0, outlets, []);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(computeSoftPowerTarget(outlets, []));
  });

  it('converges toward the target over many turns', () => {
    const outlets: MediaOutlet[] = [{ ...foundMediaOutlet('o1', 'Test', { economic: 0, social: 0 }, 'player-1'), reach: 0.5 }];
    let softPower = 0;
    for (let i = 0; i < 200; i++) softPower = advanceSoftPower(softPower, outlets, []);
    expect(softPower).toBeCloseTo(computeSoftPowerTarget(outlets, []), 0);
  });
});
