import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Bill, Politician } from '../models/types';
import {
  advanceToCommittee,
  advanceToFloor,
  applyFloorVoteResult,
  computeSupportProbability,
  proposeBill,
  relationshipKey,
  resolveFloorVote,
  resolveVote,
  setWhipStance,
} from './legislative';

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

describe('relationshipKey', () => {
  it('is order-independent', () => {
    expect(relationshipKey('a', 'b')).toBe(relationshipKey('b', 'a'));
  });
});

describe('computeSupportProbability', () => {
  const sponsor = makePolitician({
    id: 'sponsor',
    partyId: 'party-a',
    ideology: { economic: 80, social: 80 },
  });

  it('is high for an ideologically aligned same-party ally with favors', () => {
    const ally = makePolitician({
      id: 'ally',
      partyId: 'party-a',
      ideology: { economic: 80, social: 80 },
    });
    const p = computeSupportProbability(ally, sponsor, 100, 10);
    expect(p).toBeGreaterThan(0.9);
  });

  it('is low for an ideologically opposed rival in a different party', () => {
    const rival = makePolitician({
      id: 'rival',
      partyId: 'party-b',
      ideology: { economic: -80, social: -80 },
    });
    const p = computeSupportProbability(rival, sponsor, -50, 0);
    expect(p).toBeLessThan(0.2);
  });

  it('relationship and favors cannot push a maximally opposed member past a coin flip', () => {
    const extremeSponsor = makePolitician({
      id: 'extreme-sponsor',
      partyId: 'party-a',
      ideology: { economic: 100, social: 100 },
    });
    const opposite = makePolitician({
      id: 'opposite',
      partyId: 'party-a', // even granting the party-line bonus...
      ideology: { economic: -100, social: -100 }, // ...max possible ideological distance
    });
    const p = computeSupportProbability(opposite, extremeSponsor, 100, 10); // max relationship + max favors
    expect(p).toBeLessThanOrEqual(0.5);
  });

  it('increasing relationship strictly increases support, all else equal', () => {
    const member = makePolitician({ id: 'member', ideology: { economic: 20, social: -20 } });
    const low = computeSupportProbability(member, sponsor, -50, 2);
    const high = computeSupportProbability(member, sponsor, 80, 2);
    expect(high).toBeGreaterThan(low);
  });

  it('increasing favor bank strictly increases support, all else equal', () => {
    const member = makePolitician({ id: 'member', ideology: { economic: 20, social: -20 } });
    const low = computeSupportProbability(member, sponsor, 0, 0);
    const high = computeSupportProbability(member, sponsor, 0, 10);
    expect(high).toBeGreaterThan(low);
  });

  it('always returns a probability in (0, 1)', () => {
    const member = makePolitician({ id: 'member', ideology: { economic: -100, social: 100 } });
    const p = computeSupportProbability(member, sponsor, -100, 0);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(1);
  });
});

describe('resolveVote', () => {
  it('is deterministic for a given rng state and probability', () => {
    const rngA = new SeededRng(10);
    const rngB = new SeededRng(10);
    expect(resolveVote(0.7, rngA)).toBe(resolveVote(0.7, rngB));
  });

  it('always votes yes at probability 1 and no at probability 0', () => {
    const rng = new SeededRng(1);
    expect(resolveVote(1, rng)).toBe('yes');
    expect(resolveVote(0, rng)).toBe('no');
  });
});

describe('bill lifecycle', () => {
  const baseBill: Bill = proposeBill({
    id: 'bill-1',
    title: 'Test Act',
    provisions: [{ id: 'p1', description: 'Do a thing', budgetImpact: -1000 }],
    sponsorId: 'sponsor',
  });

  it('starts in drafting with an empty whip count', () => {
    expect(baseBill.status).toBe('drafting');
    expect(baseBill.whipCount).toEqual({});
  });

  it('advances drafting -> committee -> floor in order', () => {
    const committee = advanceToCommittee(baseBill);
    expect(committee.status).toBe('committee');
    const floor = advanceToFloor(committee);
    expect(floor.status).toBe('floor');
  });

  it('refuses to skip stages', () => {
    expect(() => advanceToFloor(baseBill)).toThrow();
  });

  it('setWhipStance records a stance without mutating the original bill', () => {
    const updated = setWhipStance(baseBill, 'member-1', 'yes');
    expect(updated.whipCount['member-1']).toBe('yes');
    expect(baseBill.whipCount['member-1']).toBeUndefined();
  });
});

describe('resolveFloorVote', () => {
  const sponsor = makePolitician({
    id: 'sponsor',
    isPlayer: true,
    partyId: 'party-a',
    ideology: { economic: 50, social: 50 },
  });

  function floorBill(whipCount: Bill['whipCount'] = {}): Bill {
    const drafted = proposeBill({
      id: 'bill-1',
      title: 'Test Act',
      provisions: [],
      sponsorId: 'sponsor',
    });
    return { ...advanceToFloor(advanceToCommittee(drafted)), whipCount };
  }

  it('passes unanimously when every member is locked in as yes', () => {
    const members = [sponsor, makePolitician({ id: 'm1' }), makePolitician({ id: 'm2' })];
    const bill = floorBill({ m1: 'yes', m2: 'yes' });
    const rng = new SeededRng(1);
    const result = resolveFloorVote(bill, members, {}, {}, rng);
    expect(result.yes).toBe(3);
    expect(result.no).toBe(0);
    expect(result.passed).toBe(true);
  });

  it('fails when locked-in no votes outnumber yes votes', () => {
    const members = [sponsor, makePolitician({ id: 'm1' }), makePolitician({ id: 'm2' }), makePolitician({ id: 'm3' })];
    const bill = floorBill({ m1: 'no', m2: 'no', m3: 'no' });
    const rng = new SeededRng(1);
    const result = resolveFloorVote(bill, members, {}, {}, rng);
    expect(result.no).toBe(3);
    expect(result.passed).toBe(false);
  });

  it('is deterministic given the same starting rng state', () => {
    const members = [
      sponsor,
      makePolitician({ id: 'm1', partyId: 'party-b', ideology: { economic: -50, social: -50 } }),
      makePolitician({ id: 'm2', partyId: 'party-b', ideology: { economic: -50, social: -50 } }),
      makePolitician({ id: 'm3', ideology: { economic: 40, social: 40 } }),
    ];
    const bill = floorBill();
    const resultA = resolveFloorVote(bill, members, {}, {}, new SeededRng(2024));
    const resultB = resolveFloorVote(bill, members, {}, {}, new SeededRng(2024));
    expect(resultA).toEqual(resultB);
  });

  it('throws if the bill is not on the floor', () => {
    const bill = proposeBill({ id: 'bill-1', title: 'Test', provisions: [], sponsorId: 'sponsor' });
    expect(() =>
      resolveFloorVote(bill, [sponsor], {}, {}, new SeededRng(1))
    ).toThrow();
  });
});

describe('applyFloorVoteResult', () => {
  it('marks the bill passed and records final stances', () => {
    const bill = advanceToFloor(
      advanceToCommittee(
        proposeBill({ id: 'bill-1', title: 'Test', provisions: [], sponsorId: 'sponsor' })
      )
    );
    const result = { yes: 3, no: 1, passed: true, finalWhipCount: { a: 'yes' as const, b: 'no' as const } };
    const updated = applyFloorVoteResult(bill, result);
    expect(updated.status).toBe('passed');
    expect(updated.whipCount).toEqual(result.finalWhipCount);
  });

  it('marks the bill failed when the result did not pass', () => {
    const bill = advanceToFloor(
      advanceToCommittee(
        proposeBill({ id: 'bill-1', title: 'Test', provisions: [], sponsorId: 'sponsor' })
      )
    );
    const result = { yes: 1, no: 3, passed: false, finalWhipCount: {} };
    const updated = applyFloorVoteResult(bill, result);
    expect(updated.status).toBe('failed');
  });
});
