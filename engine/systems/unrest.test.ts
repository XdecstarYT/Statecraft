import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { EconomyState, Protest } from '../models/types';
import {
  RIOT_ESCALATION_THRESHOLD,
  advanceProtestIntensity,
  checkRiotEscalation,
  computeUnrestPressure,
  concedeToProtesters,
  disperseProtest,
  rollForProtest,
} from './unrest';

function makeEconomy(overrides: Partial<EconomyState> = {}): EconomyState {
  return {
    gdpGrowth: 2,
    inflation: 2,
    unemployment: 5,
    debtToGdp: 50,
    budgetBalance: 0,
    pendingEffects: [],
    ...overrides,
  };
}

function makeProtest(overrides: Partial<Protest> = {}): Protest {
  return { id: 'p1', cause: 'Test Cause', intensity: 30, status: 'protesting', turnStarted: 1, ...overrides };
}

describe('computeUnrestPressure', () => {
  it('is low when the economy and approval are healthy', () => {
    expect(computeUnrestPressure(makeEconomy({ unemployment: 3, inflation: 1 }), 70)).toBeLessThan(0.2);
  });

  it('is high when unemployment, inflation, and approval are all bad', () => {
    expect(computeUnrestPressure(makeEconomy({ unemployment: 15, inflation: 12 }), 10)).toBeGreaterThan(0.8);
  });

  it('stays within 0..1', () => {
    const pressure = computeUnrestPressure(makeEconomy({ unemployment: 999, inflation: 999 }), -999);
    expect(pressure).toBeGreaterThanOrEqual(0);
    expect(pressure).toBeLessThanOrEqual(1);
  });
});

describe('rollForProtest', () => {
  const causes = ['Cost of Living Protests', 'Fuel Price Riots'];

  it('never spawns a second protest while one is already active', () => {
    const existing = [makeProtest({ status: 'protesting' })];
    for (let seed = 0; seed < 20; seed++) {
      expect(rollForProtest(existing, 1, causes, 5, new SeededRng(seed))).toBeNull();
    }
  });

  it('spawns eventually at high pressure across many seeds', () => {
    let spawned = false;
    for (let seed = 0; seed < 50; seed++) {
      if (rollForProtest([], 1, causes, 5, new SeededRng(seed))) {
        spawned = true;
        break;
      }
    }
    expect(spawned).toBe(true);
  });

  it('spawns far less often at zero pressure than at full pressure', () => {
    let lowCount = 0;
    let highCount = 0;
    for (let seed = 0; seed < 300; seed++) {
      if (rollForProtest([], 0, causes, 5, new SeededRng(seed))) lowCount++;
      if (rollForProtest([], 1, causes, 5, new SeededRng(seed))) highCount++;
    }
    expect(highCount).toBeGreaterThan(lowCount * 3);
  });

  it('picks a cause from the supplied list', () => {
    let found: Protest | null = null;
    for (let seed = 0; seed < 50 && !found; seed++) {
      found = rollForProtest([], 1, causes, 5, new SeededRng(seed));
    }
    expect(found).not.toBeNull();
    expect(causes).toContain(found!.cause);
  });
});

describe('advanceProtestIntensity', () => {
  it('drifts toward the pressure target', () => {
    const protest = makeProtest({ intensity: 10 });
    const advanced = advanceProtestIntensity(protest, 1);
    expect(advanced.intensity).toBeGreaterThan(10);
  });

  it('does not change a riot or quelled protest', () => {
    const riot = makeProtest({ status: 'riot', intensity: 50 });
    expect(advanceProtestIntensity(riot, 1).intensity).toBe(50);
    const quelled = makeProtest({ status: 'quelled', intensity: 0 });
    expect(advanceProtestIntensity(quelled, 1).intensity).toBe(0);
  });
});

describe('checkRiotEscalation', () => {
  it('escalates to riot once intensity crosses the threshold', () => {
    const protest = makeProtest({ intensity: RIOT_ESCALATION_THRESHOLD });
    expect(checkRiotEscalation(protest).status).toBe('riot');
  });

  it('does not escalate below the threshold', () => {
    const protest = makeProtest({ intensity: RIOT_ESCALATION_THRESHOLD - 1 });
    expect(checkRiotEscalation(protest).status).toBe('protesting');
  });
});

describe('concedeToProtesters', () => {
  it('reduces intensity by a real, fixed amount', () => {
    const protest = makeProtest({ intensity: 60 });
    const conceded = concedeToProtesters(protest);
    expect(conceded.intensity).toBeLessThan(60);
  });

  it('quells the protest when intensity drops low enough', () => {
    const protest = makeProtest({ intensity: 20 });
    const conceded = concedeToProtesters(protest);
    expect(conceded.status).toBe('quelled');
  });

  it('leaves a high-intensity protest still protesting after one concession', () => {
    const protest = makeProtest({ intensity: 90 });
    const conceded = concedeToProtesters(protest);
    expect(conceded.status).toBe('protesting');
  });
});

describe('disperseProtest', () => {
  it('a strong policing force reliably quells a weak protest', () => {
    const protest = makeProtest({ intensity: 10 });
    let successCount = 0;
    for (let seed = 0; seed < 20; seed++) {
      if (disperseProtest(protest, 90, new SeededRng(seed)).success) successCount++;
    }
    expect(successCount).toBeGreaterThan(15);
  });

  it('a weak policing force against a strong protest can fail and escalate to riot', () => {
    const protest = makeProtest({ intensity: 95 });
    let failed = false;
    for (let seed = 0; seed < 20; seed++) {
      const result = disperseProtest(protest, 5, new SeededRng(seed));
      if (!result.success) {
        expect(result.protest.status).toBe('riot');
        failed = true;
        break;
      }
    }
    expect(failed).toBe(true);
  });

  it('success fully quells the protest', () => {
    const protest = makeProtest({ intensity: 5 });
    let result = disperseProtest(protest, 95, new SeededRng(1));
    for (let seed = 1; seed < 30 && !result.success; seed++) {
      result = disperseProtest(protest, 95, new SeededRng(seed));
    }
    expect(result.success).toBe(true);
    expect(result.protest.status).toBe('quelled');
    expect(result.protest.intensity).toBe(0);
  });
});
