import type { SeededRng } from '../rng';
import { ideologicalAlignment } from '../ideology';
import type { IdeologyPosition, MediaOutlet } from '../models/types';

export type CoverageFrame = 'favorable' | 'neutral' | 'critical';

export type EventKind = 'bill_passed' | 'bill_failed' | 'election_result';

/** Pre-authored headline pools, injected rather than imported directly, so this system stays content-agnostic and testable in isolation. */
export type HeadlineTemplates = Record<EventKind, Record<CoverageFrame, string[]>>;

/**
 * How an outlet's own bias reads a subject's ideological position:
 * outlets close to the subject cover them favorably, outlets far from them
 * cover them critically. Every outlet covers the same event — only the
 * frame changes, never whether it's covered.
 */
export function classifyFrame(outlet: MediaOutlet, subject: IdeologyPosition): CoverageFrame {
  const alignment = ideologicalAlignment(outlet.bias, subject);
  // Favorable requires closer alignment than critical requires opposition: the
  // corner-to-corner MAX_IDEOLOGICAL_DISTANCE is rarely approached by real
  // party/outlet positions, so a lenient favorable cutoff made near-everyone
  // read as friendly. 0.75 keeps "favorable" for genuinely aligned outlets
  // while giving even a centrist subject a realistic favorable/neutral split.
  if (alignment >= 0.75) return 'favorable';
  if (alignment <= 0.34) return 'critical';
  return 'neutral';
}

export function renderHeadline(
  templates: HeadlineTemplates,
  eventKind: EventKind,
  frame: CoverageFrame,
  subjectName: string,
  rng: SeededRng
): string {
  const pool = templates[eventKind][frame];
  const chosen = rng.pick(pool);
  return chosen.replace('{name}', subjectName);
}

export interface CoverageEvent {
  outletId: string;
  outletName: string;
  frame: CoverageFrame;
  headline: string;
}

/**
 * Generates every outlet's take on one event. Deterministic given the RNG's
 * state — same seed and same sequence of actions produces the same press.
 */
export function generateCoverage(
  outlets: MediaOutlet[],
  templates: HeadlineTemplates,
  subjectName: string,
  subjectIdeology: IdeologyPosition,
  eventKind: EventKind,
  rng: SeededRng
): CoverageEvent[] {
  return outlets.map((outlet) => {
    const frame = classifyFrame(outlet, subjectIdeology);
    const headline = renderHeadline(templates, eventKind, frame, subjectName, rng);
    return { outletId: outlet.id, outletName: outlet.name, frame, headline };
  });
}
