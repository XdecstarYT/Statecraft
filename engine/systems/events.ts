import type { SeededRng } from '../rng';
import { applyImmediateEffect } from './economy';
import { pushApprovalEvent } from './opinion';
import { adjustRelation } from './diplomacy';
import { computeDisasterRiskMultiplier } from './environment';
import type {
  CrisisCategory,
  EconomyDelta,
  EconomyState,
  EventLogEntry,
  GameState,
} from '../models/types';

export interface CrisisEventDef {
  id: string;
  category: CrisisCategory;
  title: string;
  description: string;
  baseWeight: number;
  economyEffect?: EconomyDelta;
  playerApprovalEffect?: number;
  foreignRelationEffect?: { counterpartId: string; delta: number };
}

const FRAGILE_GDP_GROWTH = 0.5;
const FRAGILE_UNEMPLOYMENT = 8;
const FRAGILE_DEBT_TO_GDP = 90;
const LOW_APPROVAL_THRESHOLD = 35;

export function isEconomyFragile(economy: EconomyState): boolean {
  return (
    economy.gdpGrowth < FRAGILE_GDP_GROWTH ||
    economy.unemployment > FRAGILE_UNEMPLOYMENT ||
    economy.debtToGdp > FRAGILE_DEBT_TO_GDP
  );
}

export function hasActiveScandal(state: GameState): boolean {
  return state.scandals.some((s) => s.status === 'unresolved');
}

export function getPlayerApproval(state: GameState): number {
  const player = state.politicians.find((p) => p.isPlayer);
  return player ? player.approval.public : 50;
}

/**
 * Weights an event table entry against the current state: a fragile
 * economy raises economic-shock odds, an unresolved scandal raises
 * follow-up-investigation odds, low approval raises unrest odds, and real
 * accumulated pollution (see environment.ts) raises natural-disaster odds.
 */
export function computeEventWeight(def: CrisisEventDef, state: GameState): number {
  let weight = def.baseWeight;
  if (def.category === 'economic_shock' && isEconomyFragile(state.economy)) weight *= 2.5;
  if (def.category === 'scandal' && hasActiveScandal(state)) weight *= 2;
  if (def.category === 'civil_unrest' && getPlayerApproval(state) < LOW_APPROVAL_THRESHOLD) weight *= 2;
  if (def.category === 'natural_disaster') weight *= computeDisasterRiskMultiplier(state.environment.pollutionIndex);
  return weight;
}

export const DEFAULT_EVENT_CHANCE = 0.35;

/**
 * Rolls whether a crisis event fires this turn and, if so, which one —
 * weighted by the current state rather than uniform chance.
 */
export function rollForEvent(
  defs: CrisisEventDef[],
  state: GameState,
  rng: SeededRng,
  chance: number = DEFAULT_EVENT_CHANCE
): CrisisEventDef | null {
  if (defs.length === 0) return null;
  if (rng.next() > chance) return null;
  const weighted = defs.map((def) => ({ item: def, weight: computeEventWeight(def, state) }));
  return rng.pickWeighted(weighted);
}

/** Applies a crisis event's economy/approval/relation effects and logs it. */
export function applyCrisisEvent(state: GameState, def: CrisisEventDef): GameState {
  let next = state;

  if (def.economyEffect) {
    next = { ...next, economy: applyImmediateEffect(next.economy, def.economyEffect) };
  }

  if (def.playerApprovalEffect) {
    const player = next.politicians.find((p) => p.isPlayer);
    if (player) {
      const impact = def.playerApprovalEffect;
      const politicians = next.politicians.map((p) =>
        p.id === player.id ? pushApprovalEvent(p, 'public', impact, 5) : p
      );
      next = { ...next, politicians };
    }
  }

  if (def.foreignRelationEffect) {
    const { counterpartId, delta } = def.foreignRelationEffect;
    next = { ...next, foreignRelations: adjustRelation(next.foreignRelations, counterpartId, delta) };
  }

  const logEntry: EventLogEntry = {
    turn: next.turn,
    category: def.category,
    title: def.title,
    description: def.description,
  };
  return { ...next, eventLog: [...next.eventLog, logEntry] };
}
