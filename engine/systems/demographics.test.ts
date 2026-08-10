import { describe, expect, it } from 'vitest';
import type { DemographicsState, EconomyState, VoterBloc } from '../models/types';
import {
  applyDemographicChangeToBlocs,
  advanceDemographicsTurn,
  computeEconomicAttractiveness,
  computeLaborForceEffect,
  computeMigrationRate,
  setImmigrationPolicy,
} from './demographics';

function makeEconomy(overrides: Partial<EconomyState> = {}): EconomyState {
  return { gdpGrowth: 2, inflation: 3, unemployment: 5, debtToGdp: 60, budgetBalance: -2, pendingEffects: [], ...overrides };
}

function makeDemographics(overrides: Partial<DemographicsState> = {}): DemographicsState {
  return { population: 10000, naturalGrowthRate: 0.05, netMigrationRate: 0, policy: 'restricted', ...overrides };
}

describe('computeEconomicAttractiveness', () => {
  it('is positive for strong growth and low unemployment', () => {
    expect(computeEconomicAttractiveness(makeEconomy({ gdpGrowth: 5, unemployment: 2 }))).toBeGreaterThan(0);
  });

  it('is negative for recession and high unemployment', () => {
    expect(computeEconomicAttractiveness(makeEconomy({ gdpGrowth: -5, unemployment: 16 }))).toBeLessThan(0);
  });

  it('is clamped within -1..1', () => {
    const extreme = computeEconomicAttractiveness(makeEconomy({ gdpGrowth: 500, unemployment: -50 }));
    expect(extreme).toBeLessThanOrEqual(1);
    expect(extreme).toBeGreaterThanOrEqual(-1);
  });
});

describe('computeMigrationRate', () => {
  it('is always zero under a closed policy, regardless of economy', () => {
    expect(computeMigrationRate(makeEconomy({ gdpGrowth: 10, unemployment: 1 }), 'closed')).toBe(0);
  });

  it('is larger in magnitude under open policy than restricted, for the same economy', () => {
    const economy = makeEconomy({ gdpGrowth: 5, unemployment: 2 });
    const restricted = computeMigrationRate(economy, 'restricted');
    const open = computeMigrationRate(economy, 'open');
    expect(open).toBeGreaterThan(restricted);
  });

  it('is negative (net emigration) for a weak economy even under open policy', () => {
    expect(computeMigrationRate(makeEconomy({ gdpGrowth: -5, unemployment: 16 }), 'open')).toBeLessThan(0);
  });
});

describe('setImmigrationPolicy', () => {
  it('updates only the policy field', () => {
    const demographics = makeDemographics({ policy: 'closed' });
    const next = setImmigrationPolicy(demographics, 'open');
    expect(next.policy).toBe('open');
    expect(next.population).toBe(demographics.population);
  });
});

describe('advanceDemographicsTurn', () => {
  it('grows population under positive natural growth and a closed border', () => {
    const demographics = makeDemographics({ population: 10000, naturalGrowthRate: 0.1, policy: 'closed' });
    const next = advanceDemographicsTurn(demographics, makeEconomy());
    expect(next.population).toBeGreaterThan(10000);
    expect(next.netMigrationRate).toBe(0);
  });

  it('records the net migration rate actually applied', () => {
    const demographics = makeDemographics({ policy: 'open' });
    const next = advanceDemographicsTurn(demographics, makeEconomy({ gdpGrowth: 5, unemployment: 2 }));
    expect(next.netMigrationRate).toBeGreaterThan(0);
  });

  it('never drives population negative', () => {
    const demographics = makeDemographics({ population: 1, naturalGrowthRate: -50, policy: 'closed' });
    const next = advanceDemographicsTurn(demographics, makeEconomy());
    expect(next.population).toBeGreaterThanOrEqual(0);
  });
});

describe('computeLaborForceEffect', () => {
  it('is a growth tailwind for positive net migration', () => {
    const effect = computeLaborForceEffect(0.3);
    expect(effect.gdpGrowth).toBeGreaterThan(0);
  });

  it('is a growth headwind for negative net migration (emigration)', () => {
    const effect = computeLaborForceEffect(-0.3);
    expect(effect.gdpGrowth).toBeLessThan(0);
  });

  it('is bounded even for extreme migration rates', () => {
    const effect = computeLaborForceEffect(1000);
    expect(effect.gdpGrowth).toBeLessThanOrEqual(0.5);
  });
});

describe('applyDemographicChangeToBlocs', () => {
  function makeBloc(overrides: Partial<VoterBloc> = {}): VoterBloc {
    return {
      id: 'b1',
      name: 'Bloc',
      size: 0.5,
      ideology: { economic: 0, social: 0 },
      persuadability: 0.3,
      issueSalience: [],
      ...overrides,
    };
  }

  it('raises persuadability with the magnitude of change, not its direction', () => {
    const blocs = [makeBloc()];
    const positive = applyDemographicChangeToBlocs(blocs, 0.4)[0].persuadability;
    const negative = applyDemographicChangeToBlocs(blocs, -0.4)[0].persuadability;
    expect(positive).toBe(negative);
    expect(positive).toBeGreaterThan(0.3);
  });

  it('leaves blocs untouched at zero migration', () => {
    const blocs = [makeBloc()];
    expect(applyDemographicChangeToBlocs(blocs, 0)).toEqual(blocs);
  });

  it('never pushes persuadability above 1', () => {
    const blocs = [makeBloc({ persuadability: 0.99 })];
    const next = applyDemographicChangeToBlocs(blocs, 1000);
    expect(next[0].persuadability).toBeLessThanOrEqual(1);
  });
});
