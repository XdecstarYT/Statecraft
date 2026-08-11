import { clamp } from '../ideology';
import type { GameState, PlayerPromise, PromiseMetric } from '../models/types';

/**
 * Every promisable metric is one real, already-tracked stat with a single
 * sensible direction — nobody promises to raise unemployment. Progress is
 * how far that stat has moved in the promised direction since the promise
 * was made, normalized against fullCreditDelta (the movement that counts
 * as fully kept). No fabricated numbers: getValue always reads live state.
 */
export interface PromiseMetricDef {
  metric: PromiseMetric;
  label: string;
  icon: string;
  direction: 'raise' | 'lower';
  /** Movement (in the promised direction) that counts as 100% kept. */
  fullCreditDelta: number;
  getValue: (state: GameState) => number;
}

export const PROMISE_METRIC_DEFS: PromiseMetricDef[] = [
  {
    metric: 'gdpGrowth',
    label: 'GDP Growth',
    icon: '💰',
    direction: 'raise',
    fullCreditDelta: 3,
    getValue: (state) => state.economy.gdpGrowth,
  },
  {
    metric: 'unemployment',
    label: 'Unemployment',
    icon: '📉',
    direction: 'lower',
    fullCreditDelta: 4,
    getValue: (state) => state.economy.unemployment,
  },
  {
    metric: 'inflation',
    label: 'Inflation',
    icon: '📉',
    direction: 'lower',
    fullCreditDelta: 4,
    getValue: (state) => state.economy.inflation,
  },
  {
    metric: 'debtToGdp',
    label: 'Debt-to-GDP',
    icon: '📊',
    direction: 'lower',
    fullCreditDelta: 15,
    getValue: (state) => state.economy.debtToGdp,
  },
  {
    metric: 'budgetBalance',
    label: 'Budget Balance',
    icon: '🏦',
    direction: 'raise',
    fullCreditDelta: 5,
    getValue: (state) => state.economy.budgetBalance,
  },
  {
    metric: 'crimeRate',
    label: 'Crime Rate',
    icon: '🚨',
    direction: 'lower',
    fullCreditDelta: 20,
    getValue: (state) => state.crime.crimeRate,
  },
  {
    metric: 'pollutionIndex',
    label: 'Pollution',
    icon: '🏭',
    direction: 'lower',
    fullCreditDelta: 20,
    getValue: (state) => state.environment.pollutionIndex,
  },
  {
    metric: 'publicApproval',
    label: 'Public Approval',
    icon: '📣',
    direction: 'raise',
    fullCreditDelta: 20,
    getValue: (state) => state.politicians.find((p) => p.isPlayer)?.approval.public ?? 50,
  },
];

export function getPromiseMetricDef(metric: PromiseMetric): PromiseMetricDef {
  const def = PROMISE_METRIC_DEFS.find((d) => d.metric === metric);
  if (!def) throw new Error(`Unknown promise metric: ${metric}`);
  return def;
}

/**
 * Records a new campaign promise against the metric's current real value.
 * Throws if the player already has an active promise on this metric rather
 * than silently stacking duplicates — see makePromiseAction in ui/store.ts
 * for the user-facing guard.
 */
export function makePromise(state: GameState, metric: PromiseMetric): PlayerPromise {
  if (state.playerPromises.some((p) => p.metric === metric)) {
    throw new Error(`A promise for metric "${metric}" is already active`);
  }
  const def = getPromiseMetricDef(metric);
  return {
    id: `promise-${state.turn}-${metric}-${state.playerPromises.length}`,
    metric,
    madeTurn: state.turn,
    baselineValue: def.getValue(state),
  };
}

/** 0..100 — how much of the promised movement has actually happened, read fresh from live state every call. */
export function computePromiseProgress(state: GameState, promise: PlayerPromise): number {
  const def = getPromiseMetricDef(promise.metric);
  const current = def.getValue(state);
  const rawDelta = def.direction === 'raise' ? current - promise.baselineValue : promise.baselineValue - current;
  return clamp((rawDelta / def.fullCreditDelta) * 100, 0, 100);
}

export interface PromiseWithProgress {
  promise: PlayerPromise;
  def: PromiseMetricDef;
  progress: number;
  currentValue: number;
}

export function computeAllPromiseProgress(state: GameState): PromiseWithProgress[] {
  return state.playerPromises.map((promise) => {
    const def = getPromiseMetricDef(promise.metric);
    return {
      promise,
      def,
      progress: computePromiseProgress(state, promise),
      currentValue: def.getValue(state),
    };
  });
}
