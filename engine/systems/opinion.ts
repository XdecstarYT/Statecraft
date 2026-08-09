import { clamp, ideologicalAlignment } from '../ideology';
import type { ApprovalEvent, IdeologyPosition, Politician, PoliticianApproval, VoterBloc } from '../models/types';

/**
 * How quickly current approval closes the gap to its target each turn.
 * Low on purpose — this is what makes approval "sticky": a single event
 * shifts the target, not the number the player actually sees.
 */
export const DEFAULT_CONVERGENCE_RATE = 0.2;

/** Default number of turns an approval event's influence takes to fully fade. */
export const DEFAULT_EVENT_MEMORY_TURNS = 6;

/**
 * How strongly a voter bloc backs someone at the given ideological position,
 * scaled by the bloc's persuadability (locked-in blocs respond less to
 * ideological fit than swing blocs do). Returns 0..1.
 */
export function computeBlocSupport(bloc: VoterBloc, target: IdeologyPosition): number {
  const alignment = clamp(ideologicalAlignment(bloc.ideology, target), 0, 1);
  // A bloc with persuadability 0 treats everyone as a coin flip; persuadability 1
  // lets ideological fit fully determine support.
  return 0.5 + (alignment - 0.5) * bloc.persuadability;
}

/**
 * Aggregates every bloc's support into a single 0..100 baseline public
 * approval figure, weighted by bloc size. This is the ideological "gravity"
 * public approval is pulled toward each turn, on top of any active events.
 */
export function computeWeightedPublicApproval(
  blocs: VoterBloc[],
  target: IdeologyPosition
): number {
  const totalSize = blocs.reduce((sum, b) => sum + b.size, 0);
  if (totalSize <= 0) return 50;
  const weighted = blocs.reduce((sum, b) => sum + computeBlocSupport(b, target) * b.size, 0);
  return clamp((weighted / totalSize) * 100, 0, 100);
}

/** Queues a new approval event — a scandal, a good speech, a bill's fallout, etc. */
export function pushApprovalEvent(
  politician: Politician,
  audience: keyof PoliticianApproval,
  impact: number,
  memoryTurns: number = DEFAULT_EVENT_MEMORY_TURNS
): Politician {
  const event: ApprovalEvent = { audience, impact, turnsRemaining: memoryTurns, initialTurns: memoryTurns };
  return { ...politician, approvalEvents: [...politician.approvalEvents, event] };
}

function sumEventShift(events: ApprovalEvent[], audience: keyof PoliticianApproval): number {
  return events
    .filter((e) => e.audience === audience)
    .reduce((sum, e) => sum + e.impact * (e.turnsRemaining / e.initialTurns), 0);
}

/**
 * Advances one politician's approval by one turn: event memory decays,
 * public approval's target blends the voter-bloc ideological baseline with
 * any live event shift, and every audience's current value moves toward its
 * target at `convergenceRate` rather than jumping straight there.
 */
export function advanceApproval(
  politician: Politician,
  blocs: VoterBloc[],
  convergenceRate: number = DEFAULT_CONVERGENCE_RATE
): Politician {
  const events = politician.approvalEvents
    .map((e) => ({ ...e, turnsRemaining: e.turnsRemaining - 1 }))
    .filter((e) => e.turnsRemaining > 0);

  const publicBaseline = computeWeightedPublicApproval(blocs, politician.ideology);
  const publicTarget = clamp(publicBaseline + sumEventShift(events, 'public'), 0, 100);
  const baseTarget = clamp(politician.approval.base + sumEventShift(events, 'base'), 0, 100);
  const eliteTarget = clamp(politician.approval.partyElite + sumEventShift(events, 'partyElite'), 0, 100);

  const step = (current: number, target: number) => current + (target - current) * convergenceRate;

  return {
    ...politician,
    approvalEvents: events,
    approval: {
      public: step(politician.approval.public, publicTarget),
      base: step(politician.approval.base, baseTarget),
      partyElite: step(politician.approval.partyElite, eliteTarget),
    },
  };
}
