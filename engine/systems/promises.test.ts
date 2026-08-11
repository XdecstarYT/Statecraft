import { describe, expect, it } from 'vitest';
import { createNewGame } from '../index';
import { computeAllPromiseProgress, computePromiseProgress, getPromiseMetricDef, makePromise, PROMISE_METRIC_DEFS } from './promises';

describe('PROMISE_METRIC_DEFS', () => {
  it('reads a real, current value for every metric on a fresh game', () => {
    const state = createNewGame(1);
    for (const def of PROMISE_METRIC_DEFS) {
      expect(Number.isFinite(def.getValue(state))).toBe(true);
    }
  });
});

describe('makePromise', () => {
  it('records the metric’s current value as the baseline', () => {
    const state = createNewGame(1);
    const promise = makePromise(state, 'gdpGrowth');
    expect(promise.metric).toBe('gdpGrowth');
    expect(promise.madeTurn).toBe(state.turn);
    expect(promise.baselineValue).toBe(state.economy.gdpGrowth);
  });

  it('throws if a promise on that metric is already active', () => {
    const state = createNewGame(1);
    const promise = makePromise(state, 'unemployment');
    const withPromise = { ...state, playerPromises: [promise] };
    expect(() => makePromise(withPromise, 'unemployment')).toThrow();
  });

  it('allows different metrics to be promised independently', () => {
    const state = createNewGame(1);
    const first = makePromise(state, 'unemployment');
    const withFirst = { ...state, playerPromises: [first] };
    expect(() => makePromise(withFirst, 'inflation')).not.toThrow();
  });
});

describe('computePromiseProgress', () => {
  it('is 0 right when the promise is made', () => {
    const state = createNewGame(1);
    const promise = makePromise(state, 'gdpGrowth');
    expect(computePromiseProgress(state, promise)).toBe(0);
  });

  it('rises toward 100 as a "raise" metric improves', () => {
    const state = createNewGame(1);
    const promise = makePromise(state, 'gdpGrowth');
    const def = getPromiseMetricDef('gdpGrowth');
    const improved = { ...state, economy: { ...state.economy, gdpGrowth: promise.baselineValue + def.fullCreditDelta } };
    expect(computePromiseProgress(improved, promise)).toBeCloseTo(100, 5);

    const halfway = {
      ...state,
      economy: { ...state.economy, gdpGrowth: promise.baselineValue + def.fullCreditDelta / 2 },
    };
    expect(computePromiseProgress(halfway, promise)).toBeCloseTo(50, 5);
  });

  it('rises toward 100 as a "lower" metric improves', () => {
    const state = createNewGame(1);
    const promise = makePromise(state, 'unemployment');
    const def = getPromiseMetricDef('unemployment');
    const improved = {
      ...state,
      economy: { ...state.economy, unemployment: Math.max(0, promise.baselineValue - def.fullCreditDelta) },
    };
    expect(computePromiseProgress(improved, promise)).toBe(100);
  });

  it('never drops below 0 when a metric moves the wrong way', () => {
    const state = createNewGame(1);
    const promise = makePromise(state, 'gdpGrowth');
    const worsened = { ...state, economy: { ...state.economy, gdpGrowth: promise.baselineValue - 10 } };
    expect(computePromiseProgress(worsened, promise)).toBe(0);
  });

  it('never exceeds 100 even with overshoot', () => {
    const state = createNewGame(1);
    const promise = makePromise(state, 'gdpGrowth');
    const def = getPromiseMetricDef('gdpGrowth');
    const overshot = { ...state, economy: { ...state.economy, gdpGrowth: promise.baselineValue + def.fullCreditDelta * 5 } };
    expect(computePromiseProgress(overshot, promise)).toBe(100);
  });
});

describe('computeAllPromiseProgress', () => {
  it('returns one entry per active promise with matching def and live current value', () => {
    const state = createNewGame(1);
    const p1 = makePromise(state, 'gdpGrowth');
    const withPromises = { ...state, playerPromises: [p1] };
    const p2 = makePromise(withPromises, 'crimeRate');
    const finalState = { ...withPromises, playerPromises: [p1, p2] };

    const results = computeAllPromiseProgress(finalState);
    expect(results).toHaveLength(2);
    expect(results[0].def.metric).toBe('gdpGrowth');
    expect(results[0].currentValue).toBe(finalState.economy.gdpGrowth);
    expect(results[1].def.metric).toBe('crimeRate');
    expect(results[1].currentValue).toBe(finalState.crime.crimeRate);
  });

  it('returns an empty array with no promises made', () => {
    const state = createNewGame(1);
    expect(computeAllPromiseProgress(state)).toEqual([]);
  });
});
