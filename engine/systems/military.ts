import type { SeededRng } from '../rng';
import type { EconomyDelta, MilitaryProfile, War, WarStatus } from '../models/types';

/**
 * Effective combat power: raw strength scaled up by tech level — a
 * technologically advanced military gets more out of the same headline
 * strength number. See engine/models/types.ts for MilitaryProfile.
 */
export function computeEffectiveStrength(profile: MilitaryProfile): number {
  return profile.strength * (0.5 + profile.techLevel / 200);
}

/** Player-strength / counterpart-strength — >1 favors the player, <1 favors the counterpart. */
export function computeDeterrenceRatio(player: MilitaryProfile, counterpart: MilitaryProfile): number {
  const counterpartEdge = computeEffectiveStrength(counterpart);
  if (counterpartEdge <= 0) return computeEffectiveStrength(player) > 0 ? Infinity : 1;
  return computeEffectiveStrength(player) / counterpartEdge;
}

export function declareWar(counterpartId: string, turn: number): War {
  return { id: `war-${counterpartId}-${turn}`, counterpartId, startTurn: turn, status: 'active', advantage: 0 };
}

const ADVANTAGE_THRESHOLD = 100;
const STALEMATE_TURN_LIMIT = 20;
const WAR_UPKEEP_COST = 0.3;
const NOISE_RANGE = 15;

export interface WarTurnResult {
  war: War;
  economyEffect: EconomyDelta;
}

/**
 * Resolves one turn of an active war: compares effective strength with
 * seeded noise and accumulates a running advantage. The war concludes
 * (won/lost) once one side's edge becomes decisive, or is called a
 * stalemate if it drags on too long without a decisive edge either way.
 * Every active turn costs the budget regardless of how the war is going —
 * wars are never free, win or lose.
 */
export function resolveWarTurn(
  war: War,
  playerMilitary: MilitaryProfile,
  counterpartMilitary: MilitaryProfile,
  currentTurn: number,
  rng: SeededRng
): WarTurnResult {
  if (war.status !== 'active') return { war, economyEffect: {} };

  const playerEdge = computeEffectiveStrength(playerMilitary);
  const counterpartEdge = computeEffectiveStrength(counterpartMilitary);
  const noise = (rng.next() - 0.5) * NOISE_RANGE;
  const turnAdvantage = (playerEdge - counterpartEdge) / 10 + noise;

  const advantage = war.advantage + turnAdvantage;
  const turnsActive = currentTurn - war.startTurn;

  let status: WarStatus = 'active';
  let endTurn: number | undefined;
  if (advantage >= ADVANTAGE_THRESHOLD) {
    status = 'won';
    endTurn = currentTurn;
  } else if (advantage <= -ADVANTAGE_THRESHOLD) {
    status = 'lost';
    endTurn = currentTurn;
  } else if (turnsActive >= STALEMATE_TURN_LIMIT) {
    status = 'stalemate';
    endTurn = currentTurn;
  }

  const nextWar: War = { ...war, advantage, status, ...(endTurn !== undefined ? { endTurn } : {}) };

  let economyEffect: EconomyDelta = { budgetBalance: -WAR_UPKEEP_COST };
  if (status === 'won') economyEffect = { budgetBalance: -WAR_UPKEEP_COST + 0.4, gdpGrowth: 0.1 };
  else if (status === 'lost') economyEffect = { budgetBalance: -WAR_UPKEEP_COST - 0.8, gdpGrowth: -0.5 };
  else if (status === 'stalemate') economyEffect = { budgetBalance: -WAR_UPKEEP_COST - 0.3 };

  return { war: nextWar, economyEffect };
}

export const WAR_DECLARATION_RELATION_PENALTY = -60;
export const WAR_VICTORY_RELATION_DELTA = -20;
export const WAR_DEFEAT_RELATION_DELTA = -10;
export const WAR_STALEMATE_RELATION_DELTA = -15;

/** The extra relation hit that lands when a war concludes, on top of the -60 already applied on declaration. */
export function computeWarResolutionRelationDelta(status: WarStatus): number {
  if (status === 'won') return WAR_VICTORY_RELATION_DELTA;
  if (status === 'lost') return WAR_DEFEAT_RELATION_DELTA;
  if (status === 'stalemate') return WAR_STALEMATE_RELATION_DELTA;
  return 0;
}
