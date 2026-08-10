import type { IdeologyPosition } from '../../engine/models/types';

/**
 * Pre-written tweets the player can choose to post — no free text (nothing
 * in the engine could meaningfully react to arbitrary player-typed
 * content without an LLM, which CLAUDE.md rules out for gameplay logic).
 * Each option carries a real ideological stance scored against voter
 * blocs the same way a politician's own ideology is. See
 * engine/systems/socialMedia.ts's computeTweetApprovalImpact.
 */
export interface PlayerTweetOption {
  id: string;
  content: string;
  stance: IdeologyPosition;
  topic: string;
}

export const PLAYER_TWEET_OPTIONS: PlayerTweetOption[] = [
  {
    id: 'populist-economic',
    content: "Every family deserves healthcare, housing, and a fair wage. That's what I'm fighting for.",
    stance: { economic: -60, social: -20 },
    topic: 'Economy',
  },
  {
    id: 'pro-market',
    content: 'Cutting red tape and letting businesses thrive is how we build real prosperity.',
    stance: { economic: 60, social: 10 },
    topic: 'Economy',
  },
  {
    id: 'progressive-social',
    content: 'Proud to stand for equality and justice for every community in this country.',
    stance: { economic: -10, social: -60 },
    topic: 'Society',
  },
  {
    id: 'traditionalist-social',
    content: "Our traditions and values built this nation. I won't apologize for defending them.",
    stance: { economic: 10, social: 60 },
    topic: 'Society',
  },
  {
    id: 'statesman',
    content: "Politics is noisy right now. Let's focus on what actually works for people.",
    stance: { economic: 0, social: 0 },
    topic: 'Governance',
  },
  {
    id: 'combative',
    content: "The other side keeps making promises they can't keep. We need real leadership.",
    stance: { economic: 0, social: 0 },
    topic: 'Politics',
  },
  {
    id: 'humor',
    content: 'Just spent an hour trying to explain budget policy to my cat. Wish me luck out there. 😂',
    stance: { economic: 0, social: 0 },
    topic: 'Humor',
  },
];
