import type { SeededRng } from '../rng';
import { clamp, ideologicalAlignment, ideologicalDistance, MAX_IDEOLOGICAL_DISTANCE } from '../ideology';
import type { IdeologyPosition, PoliticianAttributes, ThinkTank } from '../models/types';

/**
 * THINK TANKS & POLICY INSTITUTES — courtable the same way donors and
 * interest groups are, but their real lever is the Overton window: a
 * published report nudges the national ideological center of gravity
 * toward the institute's own position, scaled by how prestigious that
 * institute actually is. The window's distance from the player's own
 * ideology then exerts a small, ongoing approval pressure — public mood
 * drifting with or against the zeitgeist, the same "sticky, no instant
 * jumps" shape as every other approval-event source in this engine.
 */

const DISPOSITION_DECAY_RATE = 0.05;

export function computeThinkTankAlignment(thinkTank: ThinkTank, subjectIdeology: IdeologyPosition): number {
  return ideologicalAlignment(thinkTank.ideology, subjectIdeology);
}

export interface CourtThinkTankOutcome {
  success: boolean;
  dispositionDelta: number;
}

export function courtThinkTank(
  thinkTank: ThinkTank,
  playerAttributes: PoliticianAttributes,
  rng: SeededRng
): CourtThinkTankOutcome {
  const chance = 0.35 + (playerAttributes.intellect + playerAttributes.network) / 80 + thinkTank.disposition / 500;
  const success = rng.next() < chance;
  const dispositionDelta = success ? rng.nextInt(10, 20) : rng.nextInt(-6, 2);
  return { success, dispositionDelta };
}

export function applyCourtThinkTankOutcome(thinkTank: ThinkTank, outcome: CourtThinkTankOutcome): ThinkTank {
  return { ...thinkTank, disposition: clamp(thinkTank.disposition + outcome.dispositionDelta, -100, 100) };
}

export function decayThinkTankDispositions(thinkTanks: ThinkTank[]): ThinkTank[] {
  return thinkTanks.map((t) => ({ ...t, disposition: t.disposition * (1 - DISPOSITION_DECAY_RATE) }));
}

const REPORT_MIN_DISPOSITION = 15;
const OVERTON_DRIFT_RATE = 0.06;

export interface CommissionReportOutcome {
  published: boolean;
  /** How far the Overton window actually moved, on each axis. */
  overtonShift: IdeologyPosition;
}

/**
 * Commissioning a report — success requires a genuinely warm relationship
 * (a cold institute won't lend its name to anything), and the resulting
 * Overton shift is proportional to the institute's prestige: a fringe
 * outfit barely moves the needle, a prestigious one moves it for real.
 */
export function commissionReport(
  thinkTank: ThinkTank,
  currentOvertonWindow: IdeologyPosition,
  rng: SeededRng
): CommissionReportOutcome {
  if (thinkTank.disposition < REPORT_MIN_DISPOSITION) {
    return { published: false, overtonShift: { economic: 0, social: 0 } };
  }
  const published = rng.next() < 0.5 + thinkTank.disposition / 250;
  if (!published) return { published: false, overtonShift: { economic: 0, social: 0 } };

  const strength = OVERTON_DRIFT_RATE * clamp(thinkTank.prestige / 100, 0, 1);
  const nextWindow = driftOvertonWindow(currentOvertonWindow, thinkTank.ideology, strength);
  return {
    published: true,
    overtonShift: {
      economic: nextWindow.economic - currentOvertonWindow.economic,
      social: nextWindow.social - currentOvertonWindow.social,
    },
  };
}

/** Moves `current` a fraction of the way toward `target` — the same bounded-drift shape used across this engine (ideology drift, redistricting, etc.). */
export function driftOvertonWindow(current: IdeologyPosition, target: IdeologyPosition, rate: number): IdeologyPosition {
  return {
    economic: current.economic + (target.economic - current.economic) * rate,
    social: current.social + (target.social - current.social) * rate,
  };
}

const ZEITGEIST_MAX_PRESSURE = 3;

/**
 * How much the current national zeitgeist should nudge the player's public
 * approval each turn — positive when the Overton window sits close to the
 * player's own ideology, negative when it's drifted away. Bounded small on
 * purpose: this is ambient pressure, not a headline event.
 */
export function computeZeitgeistApprovalPressure(overtonWindow: IdeologyPosition, playerIdeology: IdeologyPosition): number {
  const distance = ideologicalDistance(overtonWindow, playerIdeology);
  const alignment = 1 - (2 * distance) / MAX_IDEOLOGICAL_DISTANCE;
  return alignment * ZEITGEIST_MAX_PRESSURE;
}
