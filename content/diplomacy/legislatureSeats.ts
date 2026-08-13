import type { ForeignCounterpart } from '../../engine/models/types';

/**
 * Real lower/single-chamber legislature sizes for the ~30 hand-authored
 * major powers in content/diplomacy/nations.ts — the same gameplay-
 * abstraction spirit as the rest of that file (real number, not a claim
 * about real electoral boundaries or a real result). China is the one
 * deliberate exception: its National People's Congress has ~2,980
 * delegates, which is capped well below that here purely so a per-seat
 * FPTP simulation of it stays computationally sane — every other number
 * below is the real chamber size.
 */
export const REAL_LEGISLATURE_SEATS: Record<string, number> = {
  'united-states': 435,
  china: 500,
  russia: 450,
  india: 543,
  'united-kingdom': 650,
  france: 577,
  'south-korea': 300,
  japan: 465,
  pakistan: 336,
  israel: 120,
  turkey: 600,
  italy: 400,
  germany: 630,
  iran: 290,
  'saudi-arabia': 150,
  brazil: 513,
  egypt: 568,
  indonesia: 575,
  vietnam: 500,
  poland: 460,
  australia: 151,
  spain: 350,
  mexico: 500,
  canada: 338,
  nigeria: 360,
  netherlands: 150,
  'south-africa': 400,
  sweden: 349,
  switzerland: 200,
  argentina: 257,
};

const MIN_GENERATED_SEATS = 45;
const MAX_GENERATED_SEATS = 400;
const SEAT_FORMULA_BASE = 25;
const SEAT_FORMULA_SCALE = 9;

/**
 * For the ~160 procedurally-generated nations with no real-world
 * legislature data anywhere in this codebase: a deterministic, size-
 * correlated (not asserted-real) estimate from the only size-like signal
 * already recorded for every nation — military personnel — via a gentle
 * square-root scaling, so a tiny nation doesn't get an absurd one-seat
 * chamber and a huge one doesn't run away unbounded. This is a documented
 * approximation for gameplay variety, not a claim about that nation's real
 * assembly size.
 */
function estimateSeatCount(nation: ForeignCounterpart): number {
  const raw = SEAT_FORMULA_BASE + SEAT_FORMULA_SCALE * Math.sqrt(nation.military.personnel);
  return Math.max(MIN_GENERATED_SEATS, Math.min(MAX_GENERATED_SEATS, Math.round(raw)));
}

/** The number of single-member districts (and thus legislature seats) a foreign nation's own election is contested over. */
export function computeForeignSeatCount(nation: ForeignCounterpart): number {
  return REAL_LEGISLATURE_SEATS[nation.id] ?? estimateSeatCount(nation);
}
