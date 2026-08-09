import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Politician } from '../models/types';
import { resolveDebate } from './debate';

function makePolitician(overrides: Partial<Politician> & { id: string }): Politician {
  return {
    name: overrides.id,
    isPlayer: false,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

describe('resolveDebate', () => {
  it('throws with fewer than two participants', () => {
    expect(() => resolveDebate([makePolitician({ id: 'a' })], new SeededRng(1))).toThrow();
  });

  it('is deterministic given the same rng state', () => {
    const a = makePolitician({ id: 'a' });
    const b = makePolitician({ id: 'b' });
    const r1 = resolveDebate([a, b], new SeededRng(7));
    const r2 = resolveDebate([a, b], new SeededRng(7));
    expect(r1).toEqual(r2);
  });

  it('a much stronger debater wins far more often across many seeds', () => {
    const strong = makePolitician({ id: 'strong', attributes: { charisma: 10, intellect: 10, integrity: 5, network: 5, mediaSavvy: 10 } });
    const weak = makePolitician({ id: 'weak', attributes: { charisma: 1, intellect: 1, integrity: 5, network: 5, mediaSavvy: 1 } });
    let strongWins = 0;
    const trials = 200;
    for (let seed = 0; seed < trials; seed++) {
      if (resolveDebate([strong, weak], new SeededRng(seed)).winnerId === 'strong') strongWins++;
    }
    expect(strongWins).toBeGreaterThan(trials * 0.8);
  });

  it('even a weaker debater can occasionally win (noise matters)', () => {
    const strong = makePolitician({ id: 'strong', attributes: { charisma: 8, intellect: 8, integrity: 5, network: 5, mediaSavvy: 8 } });
    const weak = makePolitician({ id: 'weak', attributes: { charisma: 4, intellect: 4, integrity: 5, network: 5, mediaSavvy: 4 } });
    let weakWon = false;
    for (let seed = 0; seed < 200 && !weakWon; seed++) {
      if (resolveDebate([strong, weak], new SeededRng(seed)).winnerId === 'weak') weakWon = true;
    }
    expect(weakWon).toBe(true);
  });

  it('supports more than two participants and picks exactly one winner', () => {
    const participants = [
      makePolitician({ id: 'a' }),
      makePolitician({ id: 'b' }),
      makePolitician({ id: 'c' }),
    ];
    const result = resolveDebate(participants, new SeededRng(3));
    expect(['a', 'b', 'c']).toContain(result.winnerId);
    expect(result.participants).toHaveLength(3);
  });
});
