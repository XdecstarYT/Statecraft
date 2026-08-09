import { SeededRng } from '../rng';
import type { EconomyDelta, EconomyState } from '../models/types';

function addDelta(economy: EconomyState, delta: EconomyDelta): EconomyState {
  return {
    ...economy,
    gdpGrowth: economy.gdpGrowth + (delta.gdpGrowth ?? 0),
    inflation: economy.inflation + (delta.inflation ?? 0),
    unemployment: economy.unemployment + (delta.unemployment ?? 0),
    debtToGdp: economy.debtToGdp + (delta.debtToGdp ?? 0),
    budgetBalance: economy.budgetBalance + (delta.budgetBalance ?? 0),
  };
}

/** Keeps indicators in physically sane ranges after applying deltas. */
function clampEconomy(economy: EconomyState): EconomyState {
  return {
    ...economy,
    unemployment: Math.max(0, economy.unemployment),
    debtToGdp: Math.max(0, economy.debtToGdp),
  };
}

/** Small, unavoidable per-turn drift — the economy moves even if the player does nothing. */
function smallExogenousDrift(rng: SeededRng): EconomyDelta {
  return {
    gdpGrowth: (rng.next() - 0.5) * 0.1,
    inflation: (rng.next() - 0.5) * 0.08,
    unemployment: (rng.next() - 0.5) * 0.06,
    debtToGdp: (rng.next() - 0.5) * 0.04,
    budgetBalance: (rng.next() - 0.5) * 0.05,
  };
}

/** Extra per-turn noise, on top of drift, so back-to-back turns never look identical. */
function noise(rng: SeededRng): EconomyDelta {
  return {
    gdpGrowth: (rng.next() - 0.5) * 0.05,
    inflation: (rng.next() - 0.5) * 0.05,
    unemployment: (rng.next() - 0.5) * 0.03,
    debtToGdp: (rng.next() - 0.5) * 0.02,
    budgetBalance: (rng.next() - 0.5) * 0.03,
  };
}

/** Applies a one-off economic effect immediately — for exogenous shocks and direct actions, not delayed policy. */
export function applyImmediateEffect(economy: EconomyState, delta: EconomyDelta): EconomyState {
  return clampEconomy(addDelta(economy, delta));
}

export const MIN_POLICY_DELAY_TURNS = 2;
export const MAX_POLICY_DELAY_TURNS = 6;

/**
 * Queues a policy's economic effect to land `delayTurns` turns from now,
 * instead of applying it immediately — passage isn't the same as impact.
 */
export function queuePolicyEffect(
  economy: EconomyState,
  delta: EconomyDelta,
  delayTurns: number
): EconomyState {
  if (delayTurns < MIN_POLICY_DELAY_TURNS || delayTurns > MAX_POLICY_DELAY_TURNS) {
    throw new Error(
      `Policy effect delay must be between ${MIN_POLICY_DELAY_TURNS} and ${MAX_POLICY_DELAY_TURNS} turns, got ${delayTurns}`
    );
  }
  return {
    ...economy,
    pendingEffects: [...economy.pendingEffects, { turnsRemaining: delayTurns, delta }],
  };
}

/**
 * Advances the economy by one turn: ticks the pending-effect queue down,
 * applies any effects that just landed, then layers on exogenous drift and
 * noise. Consumes RNG state, so it must run at most once per turn to stay
 * replay-deterministic.
 */
export function advanceEconomy(economy: EconomyState, rng: SeededRng): EconomyState {
  const ticked = economy.pendingEffects.map((effect) => ({
    ...effect,
    turnsRemaining: effect.turnsRemaining - 1,
  }));
  const landed = ticked.filter((effect) => effect.turnsRemaining <= 0);
  const stillPending = ticked.filter((effect) => effect.turnsRemaining > 0);

  let next: EconomyState = { ...economy, pendingEffects: stillPending };
  next = addDelta(next, smallExogenousDrift(rng));
  for (const effect of landed) {
    next = addDelta(next, effect.delta);
  }
  next = addDelta(next, noise(rng));

  return clampEconomy(next);
}
