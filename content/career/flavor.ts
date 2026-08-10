import type { EducationTrack } from '../../engine/models/types';

/**
 * Pre-authored flavor banks for career mode, picked deterministically (by
 * hashing some piece of state, same pattern as CorruptionPanel's
 * pickFlavorIndex) rather than by consuming the game's RNG — this is
 * cosmetic color layered on top of career.ts's real, seeded outcomes, not
 * a second source of randomness.
 */

export const EDUCATION_START_FLAVOR: Record<EducationTrack, string> = {
  community_college: 'Two years of night classes, paid for shift by shift.',
  trade_apprenticeship: 'Learning a trade from someone who’s done it for thirty years.',
  state_university: 'Financial aid, a shared dorm room, and a lot riding on this.',
  law_school: 'Case law until midnight, most nights.',
};

export const PARTY_WORK_FLAVOR: Record<'strong' | 'solid' | 'setback', string[]> = {
  strong: [
    'You organized a canvassing blitz that impressed even the district chair.',
    'A phone-banking session you ran turned into the branch’s best night all month.',
    'You talked a skeptical local business owner into hosting a fundraiser.',
    'The county newsletter ran a line about "an organizer worth watching."',
  ],
  solid: [
    'A quiet afternoon of door-knocking, one conversation at a time.',
    'You stuffed envelopes and worked the phones at the branch office.',
    'You showed up to the county meeting and said your piece.',
    'Nothing dramatic — just steady, unglamorous groundwork.',
  ],
  setback: [
    'A canvassing route you planned fell apart in the rain.',
    'You clashed with a branch veteran over strategy, and it showed.',
    'A fundraiser you helped plan drew a thin crowd.',
    'You missed a key meeting, and people noticed.',
  ],
};

export const LOCAL_RACE_WIN_FLAVOR: string[] = [
  'The county clerk read your name first, and the room actually cheered.',
  'A narrow count, a recount request that changed nothing, and a seat that’s yours.',
  'Your first campaign sign is still crooked in someone’s yard — and you won anyway.',
  'The local paper ran your photo above the fold: "Newcomer Takes Council Seat."',
];

export const LOCAL_RACE_LOSS_FLAVOR: string[] = [
  'You watched the count come in short from a folding chair in the back.',
  'A concession call, a quiet drive home, and a decision about what’s next.',
  'The margin wasn’t close enough to contest, and everyone in the room knew it.',
  'You shake the winner’s hand. It won’t be the last time you see them.',
];

export const NOMINATION_SUCCESS_FLAVOR: string[] = [
  'The party chair calls personally: "We’re putting your name forward."',
  'A closed-door meeting, a show of hands, and suddenly it’s real.',
  'Years of envelope-stuffing and door-knocking just bought you a national ballot line.',
  'Someone hands you a lapel pin with the party’s name on it and says, "Don’t lose it."',
];

export const NOMINATION_REJECTION_FLAVOR: string[] = [
  'The committee thanks you for your service and picks someone else.',
  '"Not this cycle," the chair says, not unkindly. "Keep building."',
  'You hear the news secondhand, from someone else on the shortlist.',
  'The door isn’t closed — but it isn’t open yet either.',
];

/** Deterministic (not RNG) pick so flavor varies by context without touching game state. See CorruptionPanel.tsx for the same pattern. */
export function pickFlavorIndex(key: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return hash % length;
}
