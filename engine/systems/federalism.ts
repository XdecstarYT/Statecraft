import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import type { EconomyDelta, InterstateDispute, InterstateDisputeMediationChoice, InterstateDisputeType, StateGovernment } from '../models/types';

/**
 * FEDERALISM — INTERSTATE DISPUTES. Two of the player's own provinces
 * occasionally clash (resource, border, trade, or a purely political
 * grievance), spawned with likelihood weighted by each state's own
 * federalTension (see stateGovernance.ts) — high-tension states pick
 * fights more often. The player mediates: favor one side, or stay neutral
 * for a smaller, evenly-split relief. Every choice carries a real, bounded
 * consequence, not flavor text alone.
 */
export const MAX_ACTIVE_DISPUTES = 3;
const DISPUTE_SPAWN_CHANCE = 0.04;
const DISPUTE_TYPES: InterstateDisputeType[] = ['resource', 'border', 'trade', 'political'];

function pickStateWeightedByTension(governments: StateGovernment[], rng: SeededRng, excludeId?: string): StateGovernment | null {
  const pool = governments.filter((g) => g.provinceId !== excludeId);
  if (pool.length === 0) return null;
  return rng.pickWeighted(pool.map((g) => ({ item: g, weight: Math.max(1, g.federalTension) })));
}

/**
 * Rolls for a new dispute this turn — null most turns. Two different
 * provinces are picked (tension-weighted), skipped entirely if that same
 * pair already has an active dispute, or if the active-dispute cap is
 * already reached.
 */
export function rollForInterstateDispute(
  governments: StateGovernment[],
  existingDisputes: InterstateDispute[],
  turn: number,
  rng: SeededRng,
  chance: number = DISPUTE_SPAWN_CHANCE
): InterstateDispute | null {
  if (governments.length < 2) return null;
  const activeCount = existingDisputes.filter((d) => d.status === 'active').length;
  if (activeCount >= MAX_ACTIVE_DISPUTES) return null;
  if (rng.next() > chance) return null;

  const stateA = pickStateWeightedByTension(governments, rng);
  if (!stateA) return null;
  const stateB = pickStateWeightedByTension(governments, rng, stateA.provinceId);
  if (!stateB) return null;

  const alreadyActive = existingDisputes.some(
    (d) =>
      d.status === 'active' &&
      ((d.stateAId === stateA.provinceId && d.stateBId === stateB.provinceId) ||
        (d.stateAId === stateB.provinceId && d.stateBId === stateA.provinceId))
  );
  if (alreadyActive) return null;

  return {
    id: `dispute-${turn}-${stateA.provinceId}-${stateB.provinceId}`,
    stateAId: stateA.provinceId,
    stateBId: stateB.provinceId,
    type: rng.pick(DISPUTE_TYPES),
    status: 'active',
    turnStarted: turn,
  };
}

const MEDIATION_TENSION_RELIEF = 15;
const MEDIATION_TENSION_PENALTY = 8;
const MEDIATION_NEUTRAL_RELIEF = MEDIATION_TENSION_RELIEF / 2;

export interface DisputeMediationResult {
  dispute: InterstateDispute;
  governments: StateGovernment[];
  economyEffect: EconomyDelta;
  playerApprovalEffect: number;
}

/**
 * Resolves an active dispute by the player's own choice: favoring a side
 * relieves that state's tension and raises the other's (a real grievance,
 * not costless), while staying neutral gives both a smaller, even relief.
 * Resource/trade disputes also carry a small national growth effect —
 * larger when resolved neutrally (an equitable settlement both sides can
 * actually work with) than when one side is simply favored.
 */
export function mediateInterstateDispute(
  dispute: InterstateDispute,
  choice: InterstateDisputeMediationChoice,
  governments: StateGovernment[],
  turn: number
): DisputeMediationResult {
  const nextGovernments = governments.map((gov) => {
    const isA = gov.provinceId === dispute.stateAId;
    const isB = gov.provinceId === dispute.stateBId;
    if (!isA && !isB) return gov;

    const favored = (isA && choice === 'favor_a') || (isB && choice === 'favor_b');
    const disfavored = (isA && choice === 'favor_b') || (isB && choice === 'favor_a');
    const delta = favored ? -MEDIATION_TENSION_RELIEF : disfavored ? MEDIATION_TENSION_PENALTY : -MEDIATION_NEUTRAL_RELIEF;
    return { ...gov, federalTension: clamp(gov.federalTension + delta, 0, 100) };
  });

  const economyEffect: EconomyDelta =
    dispute.type === 'trade' || dispute.type === 'resource' ? { gdpGrowth: choice === 'neutral' ? 0.05 : 0.02 } : {};
  const playerApprovalEffect = choice === 'neutral' ? 1 : 0.5;

  return {
    dispute: { ...dispute, status: 'resolved', turnResolved: turn, resolution: choice },
    governments: nextGovernments,
    economyEffect,
    playerApprovalEffect,
  };
}
