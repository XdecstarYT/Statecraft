import type { SeededRng } from '../rng';
import { applyImmediateEffect, queuePolicyEffect } from './economy';
import { pushApprovalEvent } from './opinion';
import { adjustRelation } from './diplomacy';
import { computeEventWeight } from './events';
import type { ActiveDilemma, DilemmaDef, EventLogEntry, GameState } from '../models/types';

/**
 * DILEMMAS — the interactive cousin of the crisis-event table in events.ts:
 * instead of auto-applying, a rolled dilemma sits in GameState.activeDilemma
 * (at most one at a time, same shape as activeSummit) until the player picks
 * one of its 2-3 real, named responses via resolveDilemmaChoice. Reuses
 * events.ts's state-aware category weighting unchanged.
 */

export const DEFAULT_DILEMMA_CHANCE = 0.12;

/** Rolls whether a new dilemma is raised this turn — only when there isn't one active already (checked by the caller, same as rollForSummit). */
export function rollForDilemma(
  defs: DilemmaDef[],
  state: GameState,
  rng: SeededRng,
  chance: number = DEFAULT_DILEMMA_CHANCE
): ActiveDilemma | null {
  if (defs.length === 0) return null;
  if (rng.next() > chance) return null;

  const weighted = defs.map((def) => ({ item: def, weight: computeEventWeight(def, state) }));
  const def = rng.pickWeighted(weighted);

  return {
    id: `dilemma-${state.turn}`,
    defId: def.id,
    category: def.category,
    title: def.title,
    description: def.description,
    choices: def.choices,
    turnRaised: state.turn,
  };
}

const DILEMMA_APPROVAL_DECAY_TURNS = 5;

/**
 * Resolves the active dilemma with the player's chosen response: applies
 * that choice's immediate economy/approval/relation effects right away,
 * queues its delayedEconomyEffect (if any) onto the same lag mechanism
 * bills and other policy use, logs the outcome, and clears activeDilemma.
 * A no-op if there's no active dilemma or the choice id doesn't match one
 * of its options.
 */
export function resolveDilemmaChoice(state: GameState, choiceId: string): GameState {
  const dilemma = state.activeDilemma;
  if (!dilemma) return state;
  const choice = dilemma.choices.find((c) => c.id === choiceId);
  if (!choice) return state;

  let economy = state.economy;
  if (choice.economyEffect) economy = applyImmediateEffect(economy, choice.economyEffect);
  if (choice.delayedEconomyEffect) {
    economy = queuePolicyEffect(economy, choice.delayedEconomyEffect.delta, choice.delayedEconomyEffect.turnsRemaining);
  }

  let politicians = state.politicians;
  if (choice.playerApprovalEffect) {
    const player = politicians.find((p) => p.isPlayer);
    if (player) {
      politicians = politicians.map((p) =>
        p.id === player.id ? pushApprovalEvent(p, 'public', choice.playerApprovalEffect!, DILEMMA_APPROVAL_DECAY_TURNS) : p
      );
    }
  }

  let foreignRelations = state.foreignRelations;
  if (choice.foreignRelationEffect) {
    foreignRelations = adjustRelation(foreignRelations, choice.foreignRelationEffect.counterpartId, choice.foreignRelationEffect.delta);
  }

  const logEntry: EventLogEntry = {
    turn: state.turn,
    category: dilemma.category,
    title: dilemma.title,
    description: `Chose "${choice.label}" — ${choice.description}`,
  };

  return {
    ...state,
    economy,
    politicians,
    foreignRelations,
    eventLog: [...state.eventLog, logEntry],
    activeDilemma: null,
  };
}
