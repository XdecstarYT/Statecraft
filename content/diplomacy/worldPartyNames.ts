import type { SeededRng } from '../../engine/rng';
import type { IdeologyPosition } from '../../engine/models/types';

/**
 * Pre-authored party-name parts for the world roster's AI governments —
 * assembled at random by seeded code, not generated at runtime. The prefix
 * pool is picked by the nation's economic-axis lean so a ruling party's
 * name at least rhymes with its ideology, same spirit as content/names/pool.ts.
 */
const LEFT_PREFIXES = ["People's", 'Socialist', "Workers'", 'Labour', 'Social Democratic', 'Progressive'];
const CENTER_PREFIXES = ['National', 'United', 'Democratic', 'Civic', 'Centrist', 'Unity'];
const RIGHT_PREFIXES = ['Conservative', 'National', 'Patriotic', 'Republican', 'Liberal', 'Reform'];
const SUFFIXES = ['Party', 'Alliance', 'Movement', 'Front', 'Coalition', 'Union', 'Congress', 'Assembly'];

export function pickWorldPartyName(ideology: IdeologyPosition, rng: SeededRng): string {
  const pool = ideology.economic < -20 ? LEFT_PREFIXES : ideology.economic > 20 ? RIGHT_PREFIXES : CENTER_PREFIXES;
  return `${rng.pick(pool)} ${rng.pick(SUFFIXES)}`;
}
