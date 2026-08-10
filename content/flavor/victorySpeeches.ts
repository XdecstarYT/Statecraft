import type { SeededRng } from '../../engine/rng';
import type { IdeologyPosition } from '../../engine/models/types';

/**
 * Templated victory-night speech lines, assembled by seeded selection —
 * never generated at runtime. Picked by margin of victory (landslide vs.
 * narrow) and flavored by the winning party's economic/social leaning, the
 * same spirit as content/flavor/headlines.ts.
 */

const LANDSLIDE_OPENERS = [
  'Tonight, {party} did not just win — {party} sent a message the whole country heard.',
  'This is not a narrow mandate. This is a mandate.',
  'The scale of tonight\'s result speaks for itself.',
  'From coast to coast, the country has spoken with one voice.',
];

const NARROW_OPENERS = [
  'This was a close race, and we do not take a single vote for granted.',
  'Tonight\'s margin was thin — but a win is a win, and we intend to govern like it.',
  'We heard from a country that is closely, deeply divided, and we will not forget that.',
  'It came down to the wire, and {party} came out ahead.',
];

const MARKET_RIGHT_LINES = [
  'We will cut what holds this economy back and get out of the way of the people who build it.',
  'Growth is not the enemy of fairness — it is how we pay for it.',
  'Every business that opens its doors tomorrow is a vote of confidence in what we just did tonight.',
];

const STATE_LEFT_LINES = [
  'No one in this country should be left to fend for themselves.',
  'Tonight belongs to the people who do the work and rarely get the credit.',
  'We will build a country that takes care of its own.',
];

const TRADITIONALIST_LINES = [
  'We will not apologize for the values that built this country.',
  'Family, faith, and community are not relics — they are the foundation we build on.',
];

const PROGRESSIVE_LINES = [
  'This country is ready to move forward, not backward.',
  'Change was on the ballot tonight, and change won.',
];

const CLOSERS = [
  'Now, the real work begins.',
  'Thank you. Let\'s get to work.',
  'To everyone who voted for us, and everyone who didn\'t — I intend to earn your trust.',
  'Good night, and God bless this country.',
];

function pickIdeologyLine(ideology: IdeologyPosition, rng: SeededRng): string {
  const pool = ideology.economic >= 0 ? MARKET_RIGHT_LINES : STATE_LEFT_LINES;
  const socialPool = ideology.social >= 0 ? TRADITIONALIST_LINES : PROGRESSIVE_LINES;
  return rng.next() < 0.5 ? rng.pick(pool) : rng.pick(socialPool);
}

const LANDSLIDE_MARGIN_THRESHOLD = 0.3;

/**
 * Assembles a short victory speech from the winning party's name, ideology,
 * and margin of victory (see computeVictoryMarginFraction in
 * electionNight.ts). Consumes the game's seeded RNG — deterministic given
 * the same rng state.
 */
export function pickVictorySpeech(partyName: string, ideology: IdeologyPosition, marginFraction: number, rng: SeededRng): string {
  const openers = marginFraction >= LANDSLIDE_MARGIN_THRESHOLD ? LANDSLIDE_OPENERS : NARROW_OPENERS;
  const opener = rng.pick(openers).replace(/\{party\}/g, partyName);
  const ideologyLine = pickIdeologyLine(ideology, rng);
  const closer = rng.pick(CLOSERS);
  return `${opener} ${ideologyLine} ${closer}`;
}
