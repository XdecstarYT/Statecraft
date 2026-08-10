import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { GameState, Politician, VoterBloc } from '../models/types';
import type { SocialPersona } from '../../content/socialMedia/personas';
import type { PostCategory } from '../../content/socialMedia/postTemplates';
import {
  computeEngagement,
  computeFollowerGrowth,
  computePassiveFollowerGrowth,
  computeTrendingTopics,
  computeTweetApprovalImpact,
  createPlayerPost,
  fillTemplate,
  generateFeedPosts,
} from './socialMedia';

const PERSONAS: SocialPersona[] = [
  { id: 'pundit-1', name: 'Marcus Feld', handle: '@marcusfeld', avatar: '🎙️', authorType: 'pundit' },
  { id: 'journalist-1', name: 'Priya N.', handle: '@priyan', avatar: '📰', authorType: 'journalist' },
  { id: 'citizen-1', name: 'Dana K.', handle: '@danak', avatar: '🙋', authorType: 'citizen' },
  { id: 'rival-1', name: 'Opposition Whip', handle: '@oppwhip', avatar: '⚔️', authorType: 'rival' },
  { id: 'meme-1', name: 'MemesDaily', handle: '@memesdaily', avatar: '😂', authorType: 'meme' },
];

const TEMPLATES: Record<PostCategory, string[]> = {
  crisis: ['BREAKING: {title}. {description}'],
  scandal: ['Scandal brewing around {politicianName}.'],
  war: ['War declared on {counterpartName}.'],
  court_struck: ['Court struck down "{billTitle}."'],
  court_upheld: ['Court upheld "{billTitle}."'],
  approval_high: ['{playerName} is riding high.'],
  approval_low: ['{playerName} is struggling.'],
  ambient: ['Just vibing.', 'Politics is exhausting.'],
};

function makePlayer(overrides: Partial<Politician> = {}): Politician {
  return {
    id: 'player',
    name: 'Alex Varga',
    isPlayer: true,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    turn: 5,
    politicians: [makePlayer()],
    eventLog: [],
    scandals: [],
    wars: [],
    foreignCounterparts: [],
    judicialReviewCases: [],
    economy: { gdpGrowth: 2, inflation: 3, unemployment: 5, debtToGdp: 60, budgetBalance: -2, pendingEffects: [] },
    crime: { crimeRate: 25, incarcerationRate: 12, policingFunding: 'standard', organizedCrimeInfluence: 5 },
    environment: { pollutionIndex: 15, renewableShare: 20, energyPolicy: 'balanced', greenInvestmentCapability: 20 },
    ...overrides,
  } as GameState;
}

describe('fillTemplate', () => {
  it('replaces every slot present', () => {
    expect(fillTemplate('Hello {name}, welcome to {place}', { name: 'Alex', place: 'Kastoria' })).toBe(
      'Hello Alex, welcome to Kastoria'
    );
  });

  it('leaves an unmatched slot untouched', () => {
    expect(fillTemplate('Hello {name}', {})).toBe('Hello {name}');
  });
});

describe('computeEngagement', () => {
  it('is deterministic for a fixed seed', () => {
    const a = computeEngagement('pundit', new SeededRng(1));
    const b = computeEngagement('pundit', new SeededRng(1));
    expect(a).toEqual(b);
  });

  it('journalists reach further than citizens on average', () => {
    let journalistTotal = 0;
    let citizenTotal = 0;
    for (let seed = 0; seed < 100; seed++) {
      journalistTotal += computeEngagement('journalist', new SeededRng(seed)).likes;
      citizenTotal += computeEngagement('citizen', new SeededRng(seed)).likes;
    }
    expect(journalistTotal).toBeGreaterThan(citizenTotal);
  });
});

describe('generateFeedPosts', () => {
  it('reacts to a crisis event logged this turn', () => {
    const state = makeState({ eventLog: [{ turn: 5, category: 'economic_shock', title: 'Recession Fears', description: 'desc' }] });
    const posts = generateFeedPosts(state, new SeededRng(1), PERSONAS, TEMPLATES);
    expect(posts.some((p) => p.content.includes('Recession Fears'))).toBe(true);
  });

  it('ignores events from other turns', () => {
    const state = makeState({ eventLog: [{ turn: 3, category: 'economic_shock', title: 'Old News', description: 'desc' }] });
    const posts = generateFeedPosts(state, new SeededRng(1), PERSONAS, TEMPLATES);
    expect(posts.some((p) => p.content.includes('Old News'))).toBe(false);
  });

  it('reacts to a fresh scandal this turn', () => {
    const state = makeState({ scandals: [{ id: 's1', politicianId: 'player', tier: 'hard', turn: 5, status: 'unresolved' }] });
    const posts = generateFeedPosts(state, new SeededRng(1), PERSONAS, TEMPLATES);
    expect(posts.some((p) => p.content.includes('Alex Varga'))).toBe(true);
  });

  it('reacts to a war declared this turn', () => {
    const state = makeState({
      foreignCounterparts: [{ id: 'c1', name: 'Verdania', region: 'r', ideology: { economic: 0, social: 0 }, military: { strength: 1, personnel: 1, techLevel: 1 }, trade: { production: {} as never, consumption: {} as never }, location: { lat: 0, lng: 0 } }],
      wars: [{ id: 'w1', counterpartId: 'c1', startTurn: 5, status: 'active', advantage: 0 }],
    });
    const posts = generateFeedPosts(state, new SeededRng(1), PERSONAS, TEMPLATES);
    expect(posts.some((p) => p.content.includes('Verdania'))).toBe(true);
  });

  it('reacts to a judicial ruling resolved this turn', () => {
    const state = makeState({
      judicialReviewCases: [{ id: 'r1', billId: 'b1', billTitle: 'Tax Reform Act', turnFiled: 4, status: 'struck_down', turnResolved: 5 }],
    });
    const posts = generateFeedPosts(state, new SeededRng(1), PERSONAS, TEMPLATES);
    expect(posts.some((p) => p.content.includes('Tax Reform Act'))).toBe(true);
  });

  it('reacts to very high approval', () => {
    const state = makeState({ politicians: [makePlayer({ approval: { public: 80, base: 80, partyElite: 80 } })] });
    const posts = generateFeedPosts(state, new SeededRng(1), PERSONAS, TEMPLATES);
    expect(posts.some((p) => p.content.includes('riding high'))).toBe(true);
  });

  it('reacts to very low approval', () => {
    const state = makeState({ politicians: [makePlayer({ approval: { public: 10, base: 10, partyElite: 10 } })] });
    const posts = generateFeedPosts(state, new SeededRng(1), PERSONAS, TEMPLATES);
    expect(posts.some((p) => p.content.includes('struggling'))).toBe(true);
  });

  it('always adds some ambient chatter even on a quiet turn', () => {
    const state = makeState();
    const posts = generateFeedPosts(state, new SeededRng(1), PERSONAS, TEMPLATES);
    expect(posts.length).toBeGreaterThan(0);
  });

  it('is deterministic for a fixed seed', () => {
    const state = makeState({ eventLog: [{ turn: 5, category: 'scandal', title: 'X', description: 'Y' }] });
    const a = generateFeedPosts(state, new SeededRng(7), PERSONAS, TEMPLATES);
    const b = generateFeedPosts(state, new SeededRng(7), PERSONAS, TEMPLATES);
    expect(a).toEqual(b);
  });
});

describe('computeTrendingTopics', () => {
  it('defaults to a generic topic when nothing stands out', () => {
    expect(computeTrendingTopics(makeState())).toEqual(['#Politics']);
  });

  it('flags an unresolved scandal', () => {
    const state = makeState({ scandals: [{ id: 's1', politicianId: 'player', tier: 'soft', turn: 1, status: 'unresolved' }] });
    expect(computeTrendingTopics(state)).toContain('#Scandal');
  });

  it('flags high pollution and high crime', () => {
    const state = makeState({
      environment: { pollutionIndex: 90, renewableShare: 0, energyPolicy: 'fossil_heavy', greenInvestmentCapability: 0 },
      crime: { crimeRate: 90, incarcerationRate: 50, policingFunding: 'minimal', organizedCrimeInfluence: 50 },
    });
    const topics = computeTrendingTopics(state);
    expect(topics).toContain('#Climate');
    expect(topics).toContain('#CrimeWave');
  });

  it('flags a recession', () => {
    const state = makeState({ economy: { gdpGrowth: -2, inflation: 3, unemployment: 10, debtToGdp: 90, budgetBalance: -5, pendingEffects: [] } });
    expect(computeTrendingTopics(state)).toContain('#Recession');
  });
});

describe('computeTweetApprovalImpact', () => {
  const blocs: VoterBloc[] = [
    { id: 'b1', name: 'Left', size: 0.5, ideology: { economic: -100, social: -100 }, persuadability: 0.5, issueSalience: [] },
    { id: 'b2', name: 'Right', size: 0.5, ideology: { economic: 100, social: 100 }, persuadability: 0.5, issueSalience: [] },
  ];

  it('is exactly neutral for a centrist stance equidistant from two maximally-opposed blocs', () => {
    expect(computeTweetApprovalImpact({ economic: 0, social: 0 }, blocs)).toBeCloseTo(0, 5);
  });

  it('is zero with no voter blocs at all', () => {
    expect(computeTweetApprovalImpact({ economic: 50, social: 50 }, [])).toBe(0);
  });

  it('favors whichever bloc is more persuadable when stance is aligned with one side', () => {
    const skewed: VoterBloc[] = [
      { id: 'b1', name: 'Left', size: 0.5, ideology: { economic: -80, social: -80 }, persuadability: 0.9, issueSalience: [] },
      { id: 'b2', name: 'Right', size: 0.5, ideology: { economic: 80, social: 80 }, persuadability: 0.1, issueSalience: [] },
    ];
    const leftStance = computeTweetApprovalImpact({ economic: -80, social: -80 }, skewed);
    expect(leftStance).toBeGreaterThan(0);
  });
});

describe('computeFollowerGrowth', () => {
  it('is deterministic for a fixed seed', () => {
    const a = computeFollowerGrowth(1, new SeededRng(1));
    const b = computeFollowerGrowth(1, new SeededRng(1));
    expect(a).toBe(b);
  });

  it('adds a viral bonus for a strongly positive reception', () => {
    let viralTotal = 0;
    let flatTotal = 0;
    for (let seed = 0; seed < 50; seed++) {
      viralTotal += computeFollowerGrowth(6, new SeededRng(seed));
      flatTotal += computeFollowerGrowth(0, new SeededRng(seed));
    }
    expect(viralTotal).toBeGreaterThan(flatTotal);
  });
});

describe('computePassiveFollowerGrowth', () => {
  it('is zero at or below the floor', () => {
    expect(computePassiveFollowerGrowth(20)).toBe(0);
    expect(computePassiveFollowerGrowth(30)).toBe(0);
  });

  it('rises with approval above the floor', () => {
    expect(computePassiveFollowerGrowth(80)).toBeGreaterThan(computePassiveFollowerGrowth(50));
  });
});

describe('createPlayerPost', () => {
  it('carries the option content and player identity', () => {
    const option = { id: 'x', content: 'Hello world', stance: { economic: 0, social: 0 }, topic: 'Test' };
    const post = createPlayerPost(option, 'Alex Varga', '@alexvarga', 5, new SeededRng(1));
    expect(post.content).toBe('Hello world');
    expect(post.authorName).toBe('Alex Varga');
    expect(post.authorType).toBe('player');
    expect(post.turn).toBe(5);
  });
});
