import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import { computeWeightedPublicApproval } from './opinion';
import type { BallotInitiative, EconomyDelta, IdeologyPosition, VoterBloc } from '../models/types';

/**
 * NATIONAL BALLOT INITIATIVES — puts an issue straight to the electorate
 * instead of the legislature. Reuses opinion.ts's voter-bloc weighting so
 * "yes" support is scored the same way public approval of a politician is:
 * each bloc's ideological fit with the initiative's stance, weighted by
 * bloc size and persuadability, plus real seeded noise so it's a genuine
 * vote rather than a guaranteed outcome even at high fit.
 */

export function proposeBallotInitiative(
  id: string,
  title: string,
  description: string,
  ideologyStance: IdeologyPosition,
  economyEffect: EconomyDelta,
  turn: number
): BallotInitiative {
  return { id, title, description, ideologyStance, economyEffect, status: 'active', turnProposed: turn };
}

const REFERENDUM_NOISE_RANGE = 16;

export interface BallotResult {
  passed: boolean;
  yesShare: number;
}

export function resolveBallotInitiative(
  initiative: BallotInitiative,
  blocs: VoterBloc[],
  rng: SeededRng
): { initiative: BallotInitiative; result: BallotResult } {
  const baseline = computeWeightedPublicApproval(blocs, initiative.ideologyStance);
  const noise = (rng.next() - 0.5) * REFERENDUM_NOISE_RANGE;
  const yesShare = clamp(baseline + noise, 0, 100) / 100;
  const passed = yesShare > 0.5;

  return {
    initiative: { ...initiative, status: passed ? 'passed' : 'failed', yesShare },
    result: { passed, yesShare },
  };
}
