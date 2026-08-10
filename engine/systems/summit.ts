import type { SeededRng } from '../rng';
import { ideologicalAlignment } from '../ideology';
import type { ForeignCounterpart, SummitResolution, SummitResolutionTemplate } from '../models/types';

/**
 * INTERNATIONAL SUMMITS — periodic multilateral resolutions (trade pacts,
 * human-rights declarations, climate accords, sanctions regimes) put to a
 * vote among a handful of attending nations. Each attendee's vote is
 * driven by real ideological alignment with the resolution's stance, not
 * a coin flip; passage requires a real majority, including the player's
 * own vote.
 */

const SUMMIT_BASE_CHANCE = 0.05;
const MIN_ATTENDEES = 3;
const MAX_ATTENDEES = 6;

/** Picks `count` distinct counterparts without replacement, using the seeded rng (never Array.sort with rng in the comparator — that isn't a safe determinism pattern). */
function pickAttendees(counterparts: ForeignCounterpart[], count: number, rng: SeededRng): ForeignCounterpart[] {
  const pool = [...counterparts];
  const picked: ForeignCounterpart[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = rng.nextInt(0, pool.length - 1);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

/** Rolls whether a new summit resolution is convened this turn — only when there isn't one active already (checked by the caller). */
export function rollForSummit(
  turn: number,
  templates: SummitResolutionTemplate[],
  counterparts: ForeignCounterpart[],
  rng: SeededRng,
  chance: number = SUMMIT_BASE_CHANCE
): SummitResolution | null {
  if (templates.length === 0 || counterparts.length < MIN_ATTENDEES) return null;
  if (rng.next() >= chance) return null;

  const template = rng.pick(templates);
  const attendeeCount = rng.nextInt(MIN_ATTENDEES, Math.min(MAX_ATTENDEES, counterparts.length));
  const attendees = pickAttendees(counterparts, attendeeCount, rng);

  return {
    id: `summit-${turn}`,
    type: template.type,
    title: template.title,
    description: template.description,
    stance: template.stance,
    economyEffect: template.economyEffect,
    attendeeIds: attendees.map((a) => a.id),
    turnProposed: turn,
  };
}

export interface SummitVoteRecord {
  counterpartId: string;
  vote: 'yes' | 'no';
}

export interface SummitOutcome {
  passed: boolean;
  votesFor: number;
  votesAgainst: number;
  votes: SummitVoteRecord[];
}

/**
 * Resolves the summit: every attendee votes yes with a probability equal
 * to their real ideological alignment with the resolution's stance, the
 * player's own vote (which they chose) counts too, and it passes on a
 * real majority of everyone who had a say.
 */
export function resolveSummit(
  resolution: SummitResolution,
  playerVote: 'yes' | 'no',
  attendees: ForeignCounterpart[],
  rng: SeededRng
): SummitOutcome {
  const votes: SummitVoteRecord[] = attendees.map((nation) => {
    const probability = ideologicalAlignment(resolution.stance, nation.ideology);
    return { counterpartId: nation.id, vote: rng.next() < probability ? 'yes' : 'no' };
  });

  const votesFor = votes.filter((v) => v.vote === 'yes').length + (playerVote === 'yes' ? 1 : 0);
  const votesAgainst = votes.filter((v) => v.vote === 'no').length + (playerVote === 'no' ? 1 : 0);

  return { passed: votesFor > votesAgainst, votesFor, votesAgainst, votes };
}
