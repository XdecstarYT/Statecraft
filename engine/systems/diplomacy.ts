import { clamp } from '../ideology';
import { applyImmediateEffect, queuePolicyEffect } from './economy';
import type { EconomyState, Treaty } from '../models/types';

export const TREATY_SIGNING_DELAY_TURNS = 3;
export const TREATY_BREAK_PENALTY = -30;
export const SANCTIONS_RELATION_PENALTY = -20;
export const SANCTIONS_ECONOMY_EFFECT = { gdpGrowth: -0.15, budgetBalance: -0.1 };
export const AID_RELATION_BONUS = 15;
export const AID_BUDGET_COST = -0.2;

/** counterpartId -> disposition, clamped to -100..100. */
export function adjustRelation(
  relations: Record<string, number>,
  counterpartId: string,
  delta: number
): Record<string, number> {
  const current = relations[counterpartId] ?? 0;
  return { ...relations, [counterpartId]: clamp(current + delta, -100, 100) };
}

export function proposeTreaty(params: Omit<Treaty, 'status'>): Treaty {
  return { ...params, status: 'proposed' };
}

function assertStatus(treaty: Treaty, expected: Treaty['status']) {
  if (treaty.status !== expected) {
    throw new Error(
      `Treaty "${treaty.id}" must be "${expected}" for this action, but is "${treaty.status}"`
    );
  }
}

/**
 * Signing bumps relations immediately and queues the treaty's economic
 * effect with a delay — a trade deal doesn't move GDP the week it's inked.
 */
export function signTreaty(
  treaty: Treaty,
  economy: EconomyState,
  relations: Record<string, number>
): { treaty: Treaty; economy: EconomyState; relations: Record<string, number> } {
  assertStatus(treaty, 'proposed');
  return {
    treaty: { ...treaty, status: 'active' },
    economy: queuePolicyEffect(economy, treaty.economyEffect, TREATY_SIGNING_DELAY_TURNS),
    relations: adjustRelation(relations, treaty.counterpartId, treaty.relationEffect),
  };
}

/** Breaking an active treaty costs relations immediately; any queued economic effect still lands. */
export function breakTreaty(
  treaty: Treaty,
  relations: Record<string, number>
): { treaty: Treaty; relations: Record<string, number> } {
  assertStatus(treaty, 'active');
  return {
    treaty: { ...treaty, status: 'broken' },
    relations: adjustRelation(relations, treaty.counterpartId, TREATY_BREAK_PENALTY),
  };
}

/** A direct diplomatic action: sanctions cost relations and dent trade-linked growth immediately. */
export function imposeSanctions(
  counterpartId: string,
  economy: EconomyState,
  relations: Record<string, number>
): { economy: EconomyState; relations: Record<string, number> } {
  return {
    economy: applyImmediateEffect(economy, SANCTIONS_ECONOMY_EFFECT),
    relations: adjustRelation(relations, counterpartId, SANCTIONS_RELATION_PENALTY),
  };
}

/** A direct diplomatic action: aid buys goodwill at a small immediate budget cost. */
export function sendAid(
  counterpartId: string,
  economy: EconomyState,
  relations: Record<string, number>
): { economy: EconomyState; relations: Record<string, number> } {
  return {
    economy: applyImmediateEffect(economy, { budgetBalance: AID_BUDGET_COST }),
    relations: adjustRelation(relations, counterpartId, AID_RELATION_BONUS),
  };
}
