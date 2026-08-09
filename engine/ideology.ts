import type { IdeologyPosition } from './models/types';

/** Greatest possible distance between two points on the -100..100 economic/social axes. */
export const MAX_IDEOLOGICAL_DISTANCE = Math.sqrt(200 ** 2 + 200 ** 2);

export function ideologicalDistance(a: IdeologyPosition, b: IdeologyPosition): number {
  return Math.sqrt((a.economic - b.economic) ** 2 + (a.social - b.social) ** 2);
}

/** 1 (identical position) .. 0 (maximally opposed). */
export function ideologicalAlignment(a: IdeologyPosition, b: IdeologyPosition): number {
  return 1 - ideologicalDistance(a, b) / MAX_IDEOLOGICAL_DISTANCE;
}

export function clampAxis(value: number): number {
  return Math.max(-100, Math.min(100, value));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
