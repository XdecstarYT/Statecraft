import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import {
  computeCoupRisk,
  computeCoupSuccessProbability,
  declareMartialLaw,
  declareStateOfEmergency,
  liftEmergencyPowers,
  resolveCoupAttempt,
  rollForCoupAttempt,
  selectCoupInstigator,
} from './instability';

describe('computeCoupRisk', () => {
  it('rises with unrest pressure', () => {
    const low = computeCoupRisk(0, 30, 60, 'none');
    const high = computeCoupRisk(1, 30, 60, 'none');
    expect(high).toBeGreaterThan(low);
  });

  it('rises with military strength', () => {
    const weakMilitary = computeCoupRisk(0.5, 10, 40, 'none');
    const strongMilitary = computeCoupRisk(0.5, 90, 40, 'none');
    expect(strongMilitary).toBeGreaterThan(weakMilitary);
  });

  it('falls with higher public approval', () => {
    const unpopular = computeCoupRisk(0.5, 50, 10, 'none');
    const popular = computeCoupRisk(0.5, 50, 90, 'none');
    expect(unpopular).toBeGreaterThan(popular);
  });

  it('rises under emergency powers, most under martial law', () => {
    const none = computeCoupRisk(0.3, 50, 50, 'none');
    const emergency = computeCoupRisk(0.3, 50, 50, 'state_of_emergency');
    const martialLaw = computeCoupRisk(0.3, 50, 50, 'martial_law');
    expect(emergency).toBeGreaterThan(none);
    expect(martialLaw).toBeGreaterThan(emergency);
  });

  it('never exceeds 0.6 even in the worst case', () => {
    expect(computeCoupRisk(1, 100, 0, 'martial_law')).toBeLessThanOrEqual(0.6);
  });
});

describe('rollForCoupAttempt', () => {
  it('never fires at zero risk', () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(rollForCoupAttempt(0, new SeededRng(seed))).toBe(false);
    }
  });

  it('fires more often at higher risk over many trials', () => {
    const rngLow = new SeededRng(4);
    const rngHigh = new SeededRng(4);
    let lowFires = 0;
    let highFires = 0;
    for (let i = 0; i < 200; i++) {
      if (rollForCoupAttempt(0.1, rngLow)) lowFires++;
      if (rollForCoupAttempt(0.5, rngHigh)) highFires++;
    }
    expect(highFires).toBeGreaterThan(lowFires);
  });
});

describe('selectCoupInstigator', () => {
  it('is deterministic for a given rng state', () => {
    const a = selectCoupInstigator(0.5, 50, 50, new SeededRng(6));
    const b = selectCoupInstigator(0.5, 50, 50, new SeededRng(6));
    expect(a).toBe(b);
  });

  it('favors military when military strength dominates', () => {
    const rng = new SeededRng(1);
    let militaryCount = 0;
    for (let i = 0; i < 100; i++) {
      if (selectCoupInstigator(0.01, 100, 90, rng) === 'military') militaryCount++;
    }
    expect(militaryCount).toBeGreaterThan(50);
  });

  it('favors popular_uprising when unrest pressure dominates', () => {
    const rng = new SeededRng(2);
    let uprisingCount = 0;
    for (let i = 0; i < 100; i++) {
      if (selectCoupInstigator(1, 5, 95, rng) === 'popular_uprising') uprisingCount++;
    }
    expect(uprisingCount).toBeGreaterThan(50);
  });
});

describe('computeCoupSuccessProbability', () => {
  it('rises with military strength', () => {
    expect(computeCoupSuccessProbability(90, 50)).toBeGreaterThan(computeCoupSuccessProbability(10, 50));
  });

  it('falls with higher public approval', () => {
    expect(computeCoupSuccessProbability(50, 10)).toBeGreaterThan(computeCoupSuccessProbability(50, 90));
  });

  it('stays within [0.05, 0.85]', () => {
    expect(computeCoupSuccessProbability(100, 0)).toBeLessThanOrEqual(0.85);
    expect(computeCoupSuccessProbability(0, 100)).toBeGreaterThanOrEqual(0.05);
  });
});

describe('resolveCoupAttempt', () => {
  it('is deterministic for a given rng state', () => {
    const a = resolveCoupAttempt('military', 60, 40, 10, 'coup-1', new SeededRng(5));
    const b = resolveCoupAttempt('military', 60, 40, 10, 'coup-1', new SeededRng(5));
    expect(a).toEqual(b);
  });

  it('records the instigator and turn', () => {
    const attempt = resolveCoupAttempt('rival_party', 50, 50, 7, 'coup-1', new SeededRng(1));
    expect(attempt.instigator).toBe('rival_party');
    expect(attempt.turn).toBe(7);
    expect(['succeeded', 'foiled']).toContain(attempt.outcome);
  });

  it('a strong military against a wildly unpopular government succeeds far more often than a weak one against a popular government', () => {
    const rngStrong = new SeededRng(8);
    const rngWeak = new SeededRng(8);
    let strongSuccesses = 0;
    let weakSuccesses = 0;
    for (let i = 0; i < 100; i++) {
      if (resolveCoupAttempt('military', 95, 5, 1, `c${i}`, rngStrong).outcome === 'succeeded') strongSuccesses++;
      if (resolveCoupAttempt('military', 5, 95, 1, `c${i}`, rngWeak).outcome === 'succeeded') weakSuccesses++;
    }
    expect(strongSuccesses).toBeGreaterThan(weakSuccesses);
  });
});

describe('emergency powers transitions', () => {
  it('declareStateOfEmergency returns state_of_emergency', () => {
    expect(declareStateOfEmergency()).toBe('state_of_emergency');
  });

  it('declareMartialLaw returns martial_law', () => {
    expect(declareMartialLaw()).toBe('martial_law');
  });

  it('liftEmergencyPowers returns none', () => {
    expect(liftEmergencyPowers()).toBe('none');
  });
});
