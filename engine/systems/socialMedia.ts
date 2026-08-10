import { SeededRng } from '../rng';
import { clamp, ideologicalAlignment } from '../ideology';
import type { GameState, IdeologyPosition, SocialPost, SocialPostAuthorType, VoterBloc } from '../models/types';
import type { SocialPersona } from '../../content/socialMedia/personas';
import type { PostCategory } from '../../content/socialMedia/postTemplates';
import type { PlayerTweetOption } from '../../content/socialMedia/playerTweetOptions';

/**
 * CHIRP — a fictional in-game social feed that reacts to what's actually
 * happening in the run (crises, scandals, wars, court rulings, the
 * player's own approval trend) by picking a persona and a pre-authored
 * template and filling in the slots — the same "assemble pre-written
 * content with code" approach as headlines/press coverage elsewhere in
 * this engine. The player can also post their own pre-written tweet,
 * which is scored against voter blocs for a real approval impact.
 */

export function fillTemplate(template: string, slots: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => slots[key] ?? match);
}

const CATEGORY_AUTHOR_TYPES: Record<PostCategory, SocialPostAuthorType[]> = {
  crisis: ['pundit', 'journalist', 'citizen'],
  scandal: ['journalist', 'rival', 'citizen'],
  war: ['journalist', 'pundit', 'citizen'],
  court_struck: ['journalist', 'pundit'],
  court_upheld: ['journalist', 'pundit'],
  approval_high: ['pundit', 'citizen'],
  approval_low: ['pundit', 'citizen'],
  ambient: ['citizen', 'meme'],
};

function pickPersonaForCategory(category: PostCategory, personas: SocialPersona[], rng: SeededRng): SocialPersona | null {
  const eligibleTypes = CATEGORY_AUTHOR_TYPES[category];
  const eligible = personas.filter((p) => eligibleTypes.includes(p.authorType));
  if (eligible.length === 0) return null;
  return rng.pick(eligible);
}

const ENGAGEMENT_RANGE: Record<SocialPostAuthorType, [number, number]> = {
  player: [50, 500],
  pundit: [200, 3000],
  journalist: [300, 5000],
  citizen: [5, 200],
  rival: [100, 1500],
  meme: [50, 8000],
};

export function computeEngagement(authorType: SocialPostAuthorType, rng: SeededRng): { likes: number; reposts: number } {
  const [min, max] = ENGAGEMENT_RANGE[authorType];
  const likes = rng.nextInt(min, max);
  const reposts = Math.round(likes * (0.1 + rng.next() * 0.3));
  return { likes, reposts };
}

function makePost(
  id: string,
  turn: number,
  persona: SocialPersona,
  content: string,
  topic: string,
  rng: SeededRng
): SocialPost {
  const { likes, reposts } = computeEngagement(persona.authorType, rng);
  return {
    id,
    turn,
    authorType: persona.authorType,
    authorName: persona.name,
    handle: persona.handle,
    avatar: persona.avatar,
    content,
    likes,
    reposts,
    topic,
  };
}

const AMBIENT_POSTS_PER_TURN = 2;
const APPROVAL_HIGH_THRESHOLD = 65;
const APPROVAL_LOW_THRESHOLD = 35;

/**
 * Builds every post this turn's events warrant — crisis headlines, fresh
 * scandals, newly-declared wars, judicial rulings just resolved, an
 * approval-trend reaction when the player is running especially hot or
 * cold, and a little ambient chatter regardless, so the feed never goes
 * fully quiet.
 */
export function generateFeedPosts(
  state: GameState,
  rng: SeededRng,
  personas: SocialPersona[],
  templates: Record<PostCategory, string[]>
): SocialPost[] {
  const posts: SocialPost[] = [];
  let counter = 0;
  const nextId = () => `post-${state.turn}-${counter++}`;

  const addPost = (category: PostCategory, slots: Record<string, string>, topic: string) => {
    const persona = pickPersonaForCategory(category, personas, rng);
    const pool = templates[category];
    if (!persona || !pool || pool.length === 0) return;
    const template = rng.pick(pool);
    posts.push(makePost(nextId(), state.turn, persona, fillTemplate(template, slots), topic, rng));
  };

  for (const entry of state.eventLog) {
    if (entry.turn !== state.turn) continue;
    addPost('crisis', { title: entry.title, description: entry.description }, entry.category);
  }

  for (const scandal of state.scandals) {
    if (scandal.turn !== state.turn) continue;
    const politician = state.politicians.find((p) => p.id === scandal.politicianId);
    addPost('scandal', { politicianName: politician?.name ?? 'the official' }, 'Scandal');
  }

  for (const war of state.wars) {
    if (war.startTurn !== state.turn) continue;
    const counterpart = state.foreignCounterparts.find((c) => c.id === war.counterpartId);
    addPost('war', { counterpartName: counterpart?.name ?? 'the rival nation' }, 'War');
  }

  for (const reviewCase of state.judicialReviewCases) {
    if (reviewCase.turnResolved !== state.turn) continue;
    const category: PostCategory = reviewCase.status === 'struck_down' ? 'court_struck' : 'court_upheld';
    addPost(category, { billTitle: reviewCase.billTitle }, 'Courts');
  }

  const player = state.politicians.find((p) => p.isPlayer);
  if (player) {
    if (player.approval.public >= APPROVAL_HIGH_THRESHOLD) {
      addPost('approval_high', { playerName: player.name }, 'Approval');
    } else if (player.approval.public <= APPROVAL_LOW_THRESHOLD) {
      addPost('approval_low', { playerName: player.name }, 'Approval');
    }
  }

  for (let i = 0; i < AMBIENT_POSTS_PER_TURN; i++) {
    addPost('ambient', {}, 'Chatter');
  }

  return posts;
}

const TRENDING_POLLUTION_THRESHOLD = 60;
const TRENDING_CRIME_THRESHOLD = 60;
const TRENDING_BOOM_GROWTH = 3;

/** Purely derived from current state — no storage needed, always reflects the live picture. */
export function computeTrendingTopics(state: GameState): string[] {
  const topics: string[] = [];
  if (state.scandals.some((s) => s.status === 'unresolved')) topics.push('#Scandal');
  if (state.wars.some((w) => w.status === 'active')) topics.push('#War');
  if (state.environment.pollutionIndex > TRENDING_POLLUTION_THRESHOLD) topics.push('#Climate');
  if (state.crime.crimeRate > TRENDING_CRIME_THRESHOLD) topics.push('#CrimeWave');
  if (state.economy.gdpGrowth > TRENDING_BOOM_GROWTH) topics.push('#EconomicBoom');
  if (state.economy.gdpGrowth < 0) topics.push('#Recession');
  if (state.judicialReviewCases.some((c) => c.status === 'struck_down' && c.turnResolved === state.turn)) {
    topics.push('#RuleOfLaw');
  }
  if (topics.length === 0) topics.push('#Politics');
  return topics.slice(0, 5);
}

const MAX_TWEET_APPROVAL_IMPACT = 6;

/** Weighted by bloc size and persuadability — the same lens voter blocs judge a politician's own ideology through. */
export function computeTweetApprovalImpact(stance: IdeologyPosition, blocs: VoterBloc[]): number {
  let weightedAlignment = 0;
  let totalWeight = 0;
  for (const bloc of blocs) {
    const weight = bloc.size * bloc.persuadability;
    weightedAlignment += ideologicalAlignment(stance, bloc.ideology) * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return 0;
  const avgAlignment = weightedAlignment / totalWeight;
  return clamp((avgAlignment - 0.5) * 2 * MAX_TWEET_APPROVAL_IMPACT, -MAX_TWEET_APPROVAL_IMPACT, MAX_TWEET_APPROVAL_IMPACT);
}

const VIRAL_APPROVAL_THRESHOLD = 3;

/** A real follower jump when a tweet lands especially well, on top of a normal baseline bump either way. */
export function computeFollowerGrowth(approvalImpact: number, rng: SeededRng): number {
  const base = rng.nextInt(50, 400);
  const viralBonus = approvalImpact >= VIRAL_APPROVAL_THRESHOLD ? rng.nextInt(500, 3000) : 0;
  return base + viralBonus;
}

const PASSIVE_FOLLOWER_GROWTH_SCALE = 3;
const PASSIVE_FOLLOWER_GROWTH_FLOOR_APPROVAL = 30;

/** A little organic growth for a popular player even when they never tweet — nothing below the floor. */
export function computePassiveFollowerGrowth(publicApproval: number): number {
  return Math.max(0, Math.round((publicApproval - PASSIVE_FOLLOWER_GROWTH_FLOOR_APPROVAL) * PASSIVE_FOLLOWER_GROWTH_SCALE));
}

/** Builds the player's own post from a chosen pre-written option. */
export function createPlayerPost(
  option: PlayerTweetOption,
  playerName: string,
  handle: string,
  turn: number,
  rng: SeededRng
): SocialPost {
  const { likes, reposts } = computeEngagement('player', rng);
  return {
    id: `post-${turn}-player-${rng.nextInt(1000, 9999)}`,
    turn,
    authorType: 'player',
    authorName: playerName,
    handle,
    avatar: '🧑‍💼',
    content: option.content,
    likes,
    reposts,
    topic: option.topic,
  };
}

export const MAX_FEED_POSTS = 80;
