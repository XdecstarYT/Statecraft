import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Party, Politician, Scandal } from '../models/types';
import {
  IMPEACHMENT_THRESHOLD,
  MAX_HEAD_OF_GOVERNMENT_TERMS,
  computeImpeachmentSupportProbability,
  computeUnresolvedScandalSeverity,
  isTermLimited,
  recordTermServed,
  resolveImpeachmentVote,
  selectSuccessor,
} from './succession';

function makePolitician(overrides: Partial<Politician> & { id: string }): Politician {
  return {
    name: overrides.id,
    isPlayer: false,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 50, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

function makeParty(overrides: Partial<Party> & { id: string }): Party {
  return { name: overrides.id, ideology: { economic: 0, social: 0 }, seats: 10, factions: [], ...overrides };
}

describe('term limits', () => {
  it('is not term-limited before reaching the max', () => {
    expect(isTermLimited('p1', { p1: MAX_HEAD_OF_GOVERNMENT_TERMS - 1 })).toBe(false);
  });

  it('is term-limited once the max is reached', () => {
    expect(isTermLimited('p1', { p1: MAX_HEAD_OF_GOVERNMENT_TERMS })).toBe(true);
  });

  it('a politician with no recorded terms is not term-limited', () => {
    expect(isTermLimited('p1', {})).toBe(false);
  });

  it('recordTermServed increments only the given politician', () => {
    const result = recordTermServed({ p1: 1 }, 'p1');
    expect(result.p1).toBe(2);
    const fresh = recordTermServed({}, 'p2');
    expect(fresh.p2).toBe(1);
  });
});

describe('selectSuccessor', () => {
  const party = makeParty({ id: 'party-a' });

  it('picks the highest-scoring remaining party member', () => {
    const outgoing = makePolitician({ id: 'leader' });
    const weak = makePolitician({ id: 'weak', attributes: { charisma: 5, intellect: 5, integrity: 20, network: 10, mediaSavvy: 5 } });
    const strong = makePolitician({ id: 'strong', attributes: { charisma: 5, intellect: 5, integrity: 80, network: 80, mediaSavvy: 5 } });
    const successor = selectSuccessor(party, outgoing.id, [outgoing, weak, strong], {});
    expect(successor?.id).toBe('strong');
  });

  it('favors a candidate with a warmer relationship to the outgoing leader, all else equal', () => {
    const outgoing = makePolitician({ id: 'leader' });
    const a = makePolitician({ id: 'a' });
    const b = makePolitician({ id: 'b' });
    const relationships = { [`a:leader`]: 80, [`b:leader`]: -80 };
    const successor = selectSuccessor(party, outgoing.id, [outgoing, a, b], relationships);
    expect(successor?.id).toBe('a');
  });

  it('returns null when the party has nobody else to promote', () => {
    const outgoing = makePolitician({ id: 'leader' });
    const otherParty = makePolitician({ id: 'x', partyId: 'party-b' });
    expect(selectSuccessor(party, outgoing.id, [outgoing, otherParty], {})).toBeNull();
  });

  it('excludes the outgoing leader from candidates', () => {
    const outgoing = makePolitician({ id: 'leader' });
    const only = makePolitician({ id: 'only' });
    const successor = selectSuccessor(party, outgoing.id, [outgoing, only], {});
    expect(successor?.id).toBe('only');
  });
});

describe('impeachment', () => {
  const target = makePolitician({ id: 'target', attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 } });

  function makeChamber(count: number): Politician[] {
    return Array.from({ length: count }, (_, i) => makePolitician({ id: `m${i}` }));
  }

  it('computeUnresolvedScandalSeverity is 0 with no unresolved scandals', () => {
    expect(computeUnresolvedScandalSeverity('target', [])).toBe(0);
  });

  it('computeUnresolvedScandalSeverity rises with unresolved hard scandals', () => {
    const scandals: Scandal[] = [
      { id: 's1', politicianId: 'target', tier: 'hard', turn: 1, status: 'unresolved' },
    ];
    expect(computeUnresolvedScandalSeverity('target', scandals)).toBeGreaterThan(0);
  });

  it('resolved scandals do not count toward severity', () => {
    const scandals: Scandal[] = [
      { id: 's1', politicianId: 'target', tier: 'hard', turn: 1, status: 'resolved' },
    ];
    expect(computeUnresolvedScandalSeverity('target', scandals)).toBe(0);
  });

  it('a deeply scandalized, low-integrity, disliked target is far more likely to be impeached than a clean one', () => {
    const member = makePolitician({ id: 'member' });
    const cleanTarget = makePolitician({ id: 'clean', attributes: { charisma: 5, intellect: 5, integrity: 95, network: 5, mediaSavvy: 5 } });
    const dirtyProb = computeImpeachmentSupportProbability(member, target, { [relKey('member', 'target')]: -90 }, 1);
    const cleanProb = computeImpeachmentSupportProbability(member, cleanTarget, { [relKey('member', 'clean')]: 90 }, 0);
    expect(dirtyProb).toBeGreaterThan(cleanProb);
  });

  it('a clean, popular target almost never gets removed even with many trials', () => {
    const politicians = makeChamber(20);
    const clean = makePolitician({ id: 'clean-leader', attributes: { charisma: 5, intellect: 5, integrity: 95, network: 5, mediaSavvy: 5 } });
    const relationships: Record<string, number> = {};
    for (const m of politicians) relationships[relKey(m.id, clean.id)] = 80;
    let passedCount = 0;
    for (let seed = 0; seed < 30; seed++) {
      const result = resolveImpeachmentVote(clean, [...politicians, clean], relationships, [], new SeededRng(seed));
      if (result.passed) passedCount++;
    }
    expect(passedCount).toBe(0);
  });

  it('a deeply scandalized, disliked target can lose a supermajority vote', () => {
    const politicians = makeChamber(20);
    const relationships: Record<string, number> = {};
    for (const m of politicians) relationships[relKey(m.id, target.id)] = -90;
    const scandals: Scandal[] = [
      { id: 's1', politicianId: 'target', tier: 'hard', turn: 1, status: 'unresolved' },
      { id: 's2', politicianId: 'target', tier: 'hard', turn: 2, status: 'unresolved' },
    ];
    let passedCount = 0;
    for (let seed = 0; seed < 30; seed++) {
      const result = resolveImpeachmentVote(target, [...politicians, target], relationships, scandals, new SeededRng(seed));
      if (result.passed) passedCount++;
    }
    expect(passedCount).toBeGreaterThan(0);
  });

  it('requiredCount reflects the IMPEACHMENT_THRESHOLD supermajority', () => {
    const politicians = makeChamber(9);
    const result = resolveImpeachmentVote(target, [...politicians, target], {}, [], new SeededRng(1));
    expect(result.requiredCount).toBe(Math.ceil(9 * IMPEACHMENT_THRESHOLD));
  });
});

function relKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}
