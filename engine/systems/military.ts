import { clamp } from '../ideology';
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

const ATTRITION_PERSONNEL_RATE = 0.02;
const ATTRITION_STRENGTH_RATE = 0.01;

/**
 * A real, lasting cost of staying at war: every active turn wears a
 * military down a little — personnel and headline strength both decay —
 * so a long war leaves both sides weaker even for the winner, not just
 * poorer. Never decays below a token minimum.
 */
export function applyWarAttrition(military: MilitaryProfile): MilitaryProfile {
  return {
    ...military,
    personnel: Math.max(1, Math.round(military.personnel * (1 - ATTRITION_PERSONNEL_RATE))),
    strength: Math.max(1, military.strength * (1 - ATTRITION_STRENGTH_RATE)),
  };
}

export type MilitaryInvestmentTier = 'modest' | 'major';

export interface MilitaryInvestmentConfig {
  budgetCost: number;
  strengthGain: number;
  techGain: number;
  personnelGain: number;
}

/**
 * A bigger commitment buys more, at a proportionally bigger budget cost —
 * no tier is simply "better," they trade differently against the budget.
 */
export const MILITARY_INVESTMENT_TIERS: Record<MilitaryInvestmentTier, MilitaryInvestmentConfig> = {
  modest: { budgetCost: -0.3, strengthGain: 2, techGain: 1, personnelGain: 15 },
  major: { budgetCost: -0.9, strengthGain: 6, techGain: 3, personnelGain: 40 },
};

export interface MilitaryInvestmentResult {
  military: MilitaryProfile;
  economyEffect: EconomyDelta;
}

/** Grows the player's own military at a real, immediate budget cost — the only way strength or tech level rises. */
export function investInMilitary(military: MilitaryProfile, tier: MilitaryInvestmentTier): MilitaryInvestmentResult {
  const config = MILITARY_INVESTMENT_TIERS[tier];
  return {
    military: {
      strength: clamp(military.strength + config.strengthGain, 0, 100),
      techLevel: clamp(military.techLevel + config.techGain, 0, 100),
      personnel: military.personnel + config.personnelGain,
    },
    economyEffect: { budgetBalance: config.budgetCost },
  };
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
 * Resolves one turn of an active war: compares effective strength (plus
 * any allyStrengthBonus contributed by active defense-treaty partners)
 * with seeded noise, and accumulates a running advantage. The war
 * concludes (won/lost) once one side's edge becomes decisive, or is
 * called a stalemate if it drags on too long without a decisive edge
 * either way. Every active turn costs the budget regardless of how the
 * war is going — wars are never free, win or lose — and a conclusive
 * outcome's economic swing scales with how lopsided the matchup was:
 * beating a much stronger foe pays off bigger, losing despite being the
 * stronger side costs more.
 */
export function resolveWarTurn(
  war: War,
  playerMilitary: MilitaryProfile,
  counterpartMilitary: MilitaryProfile,
  currentTurn: number,
  rng: SeededRng,
  allyStrengthBonus = 0
): WarTurnResult {
  if (war.status !== 'active') return { war, economyEffect: {} };

  const playerEdge = computeEffectiveStrength(playerMilitary) + allyStrengthBonus;
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
  if (status === 'won') {
    const spoilsFactor = clamp(counterpartEdge / Math.max(1, playerEdge), 0.4, 2.5);
    economyEffect = { budgetBalance: -WAR_UPKEEP_COST + 0.4 * spoilsFactor, gdpGrowth: 0.1 * spoilsFactor };
  } else if (status === 'lost') {
    const humiliationFactor = clamp(playerEdge / Math.max(1, counterpartEdge), 0.4, 2.5);
    economyEffect = { budgetBalance: -WAR_UPKEEP_COST - 0.8 * humiliationFactor, gdpGrowth: -0.5 * humiliationFactor };
  } else if (status === 'stalemate') {
    economyEffect = { budgetBalance: -WAR_UPKEEP_COST - 0.3 };
  }

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
