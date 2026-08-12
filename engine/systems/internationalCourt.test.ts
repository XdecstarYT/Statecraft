import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { SanctionsRegime, TribunalCase } from '../models/types';
import {
  computeConvictionProbability,
  computeSanctionsEconomyEffect,
  fileTribunalCase,
  imposeMultilateralSanctions,
  liftSanctions,
  resolveTribunalCase,
  rollWorldTribunalScrutiny,
} from './internationalCourt';

describe('fileTribunalCase', () => {
  it('starts a case as investigating', () => {
    const c = fileTribunalCase('nordholm', 'war_crimes', 10, 'case-1');
    expect(c.status).toBe('investigating');
    expect(c.targetId).toBe('nordholm');
    expect(c.turnFiled).toBe(10);
  });
});

describe('computeConvictionProbability', () => {
  it('rises with stronger evidence', () => {
    const weak = computeConvictionProbability('war_crimes', 0, 0);
    const strong = computeConvictionProbability('war_crimes', 1, 0);
    expect(strong).toBeGreaterThan(weak);
  });

  it('falls with higher standing', () => {
    const isolated = computeConvictionProbability('corruption', 0.5, -80);
    const wellConnected = computeConvictionProbability('corruption', 0.5, 80);
    expect(isolated).toBeGreaterThan(wellConnected);
  });

  it('stays within [0.05, 0.95]', () => {
    expect(computeConvictionProbability('crimes_against_humanity', 1, -100)).toBeLessThanOrEqual(0.95);
    expect(computeConvictionProbability('war_crimes', 0, 100)).toBeGreaterThanOrEqual(0.05);
  });
});

describe('resolveTribunalCase', () => {
  const baseCase: TribunalCase = { id: 'case-1', targetId: 'nordholm', chargeType: 'war_crimes', turnFiled: 1, status: 'investigating' };

  it('is deterministic for a given rng state', () => {
    const a = resolveTribunalCase(baseCase, 0.6, 0, 10, new SeededRng(3));
    const b = resolveTribunalCase(baseCase, 0.6, 0, 10, new SeededRng(3));
    expect(a).toEqual(b);
  });

  it('sets status to convicted or acquitted and records turnResolved', () => {
    const { case: resolved } = resolveTribunalCase(baseCase, 0.6, 0, 10, new SeededRng(1));
    expect(['convicted', 'acquitted']).toContain(resolved.status);
    expect(resolved.turnResolved).toBe(10);
  });

  it('strong evidence convicts far more often than weak evidence over many trials', () => {
    const rngStrong = new SeededRng(5);
    const rngWeak = new SeededRng(5);
    let strongConvictions = 0;
    let weakConvictions = 0;
    for (let i = 0; i < 100; i++) {
      if (resolveTribunalCase(baseCase, 1, 0, 10, rngStrong).convicted) strongConvictions++;
      if (resolveTribunalCase(baseCase, 0, 0, 10, rngWeak).convicted) weakConvictions++;
    }
    expect(strongConvictions).toBeGreaterThan(weakConvictions);
  });
});

describe('imposeMultilateralSanctions / liftSanctions', () => {
  it('creates an active regime with clamped severity', () => {
    const regime = imposeMultilateralSanctions('nordholm', 5, 10, 'sanctions-1');
    expect(regime.status).toBe('active');
    expect(regime.severity).toBe(3);
  });

  it('liftSanctions marks the regime lifted without mutating the original', () => {
    const regime = imposeMultilateralSanctions('nordholm', 2, 10, 'sanctions-1');
    const lifted = liftSanctions(regime);
    expect(lifted.status).toBe('lifted');
    expect(regime.status).toBe('active');
  });
});

describe('computeSanctionsEconomyEffect', () => {
  it('scales the base sanctions effect by severity', () => {
    const severity1: SanctionsRegime = { id: 's1', targetId: 'x', turnImposed: 1, status: 'active', severity: 1 };
    const severity3: SanctionsRegime = { id: 's2', targetId: 'x', turnImposed: 1, status: 'active', severity: 3 };
    const effect1 = computeSanctionsEconomyEffect(severity1);
    const effect3 = computeSanctionsEconomyEffect(severity3);
    expect(effect3.gdpGrowth!).toBeLessThan(effect1.gdpGrowth!);
  });

  it('returns no effect for a lifted regime', () => {
    const lifted: SanctionsRegime = { id: 's1', targetId: 'x', turnImposed: 1, status: 'lifted', severity: 2 };
    expect(computeSanctionsEconomyEffect(lifted)).toEqual({});
  });
});

describe('rollWorldTribunalScrutiny', () => {
  it('never fires with no scandals and no extreme wars', () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(rollWorldTribunalScrutiny(0, 0, new SeededRng(seed))).toBe(false);
    }
  });

  it('fires more often with more hard scandals and extreme wars, over many trials', () => {
    const rngClean = new SeededRng(2);
    const rngDirty = new SeededRng(2);
    let cleanFires = 0;
    let dirtyFires = 0;
    for (let i = 0; i < 200; i++) {
      if (rollWorldTribunalScrutiny(1, 0, rngClean)) cleanFires++;
      if (rollWorldTribunalScrutiny(5, 3, rngDirty)) dirtyFires++;
    }
    expect(dirtyFires).toBeGreaterThan(cleanFires);
  });
});
