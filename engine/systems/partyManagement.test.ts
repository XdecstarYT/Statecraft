import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Party, Politician } from '../models/types';
import { computeDefectionProbability, foundParty, mergeParties, rebrandParty } from './partyManagement';

function makeParty(overrides: Partial<Party> & { id: string }): Party {
  return { name: overrides.id, ideology: { economic: 0, social: 0 }, seats: 0, factions: [], ...overrides };
}

function makePolitician(overrides: Partial<Politician> & { id: string }): Politician {
  return {
    name: overrides.id,
    isPlayer: false,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'old',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

describe('computeDefectionProbability', () => {
  const oldParty = makeParty({ id: 'old', ideology: { economic: 0, social: 0 } });

  it('is 0 when the new party is not actually closer than the old one', () => {
    const member = makePolitician({ id: 'm', ideology: { economic: 50, social: 50 } });
    const p = computeDefectionProbability(member, oldParty, { economic: 100, social: 100 }, 0);
    expect(p).toBe(0);
  });

  it('rises the closer the new party is to the member relative to the old one', () => {
    const member = makePolitician({ id: 'm', ideology: { economic: 80, social: 80 } });
    const p = computeDefectionProbability(member, oldParty, { economic: 79, social: 79 }, 0);
    expect(p).toBeGreaterThan(0);
  });

  it('a warmer relationship with the founder increases the probability, all else equal', () => {
    const member = makePolitician({ id: 'm', ideology: { economic: 80, social: 80 } });
    const newIdeology = { economic: 70, social: 70 };
    const cold = computeDefectionProbability(member, oldParty, newIdeology, -50);
    const warm = computeDefectionProbability(member, oldParty, newIdeology, 80);
    expect(warm).toBeGreaterThan(cold);
  });

  it('stays within [0, 0.95]', () => {
    const member = makePolitician({ id: 'm', ideology: { economic: 100, social: 100 } });
    const p = computeDefectionProbability(member, oldParty, { economic: 100, social: 100 }, 100);
    expect(p).toBeLessThanOrEqual(0.95);
  });
});

describe('foundParty', () => {
  const oldParty = makeParty({ id: 'old', seats: 5, ideology: { economic: 0, social: 0 } });

  it('always moves the founder to the new party', () => {
    const founder = makePolitician({ id: 'founder', partyId: 'old' });
    const rng = new SeededRng(1);
    const result = foundParty(founder, [founder], [oldParty], 'new', 'New Party', { economic: 50, social: 50 }, {}, rng);
    expect(result.updatedPoliticians.find((p) => p.id === 'founder')!.partyId).toBe('new');
    expect(result.newParty.seats).toBe(1);
  });

  it('moves seats from the old party to the new one 1-for-1 with defectors', () => {
    const founder = makePolitician({ id: 'founder', partyId: 'old', ideology: { economic: 60, social: 60 } });
    const loyalist = makePolitician({ id: 'loyalist', partyId: 'old', ideology: { economic: -60, social: -60 } });
    const politicians = [founder, loyalist];
    const rng = new SeededRng(1);
    const result = foundParty(founder, politicians, [oldParty], 'new', 'New Party', { economic: 60, social: 60 }, {}, rng);

    const oldPartyAfter = result.updatedParties.find((p) => p.id === 'old')!;
    const newPartyAfter = result.updatedParties.find((p) => p.id === 'new')!;
    expect(oldPartyAfter.seats + newPartyAfter.seats).toBe(5);
    expect(newPartyAfter.seats).toBeGreaterThanOrEqual(1);
  });

  it('never lets a loyalist ideologically opposed to the new party defect', () => {
    const founder = makePolitician({ id: 'founder', partyId: 'old', ideology: { economic: 90, social: 90 } });
    const opponent = makePolitician({ id: 'opponent', partyId: 'old', ideology: { economic: -90, social: -90 } });
    const rng = new SeededRng(1);
    const result = foundParty(founder, [founder, opponent], [oldParty], 'new', 'New Party', { economic: 90, social: 90 }, {}, rng);
    expect(result.defectorIds).not.toContain('opponent');
    expect(result.updatedPoliticians.find((p) => p.id === 'opponent')!.partyId).toBe('old');
  });

  it('is deterministic for a given rng state', () => {
    const founder = makePolitician({ id: 'founder', partyId: 'old', ideology: { economic: 60, social: 60 } });
    const members = [founder, ...Array.from({ length: 5 }, (_, i) => makePolitician({ id: `m${i}`, ideology: { economic: 50 + i, social: 50 } }))];
    const a = foundParty(founder, members, [oldParty], 'new', 'New Party', { economic: 60, social: 60 }, {}, new SeededRng(9));
    const b = foundParty(founder, members, [oldParty], 'new', 'New Party', { economic: 60, social: 60 }, {}, new SeededRng(9));
    expect(a).toEqual(b);
  });

  it('throws if the founder party does not exist', () => {
    const founder = makePolitician({ id: 'founder', partyId: 'ghost' });
    expect(() =>
      foundParty(founder, [founder], [oldParty], 'new', 'New Party', { economic: 0, social: 0 }, {}, new SeededRng(1))
    ).toThrow();
  });
});

describe('mergeParties', () => {
  it('folds the absorbed party seats into the surviving party', () => {
    const a = makeParty({ id: 'a', seats: 10 });
    const b = makeParty({ id: 'b', seats: 7 });
    const { updatedParties } = mergeParties([], [a, b], 'b', 'a');
    expect(updatedParties.find((p) => p.id === 'a')!.seats).toBe(17);
    expect(updatedParties.find((p) => p.id === 'b')).toBeUndefined();
  });

  it('reassigns every absorbed member to the surviving party', () => {
    const a = makeParty({ id: 'a', seats: 1 });
    const b = makeParty({ id: 'b', seats: 1 });
    const member = makePolitician({ id: 'm', partyId: 'b' });
    const { updatedPoliticians } = mergeParties([member], [a, b], 'b', 'a');
    expect(updatedPoliticians[0].partyId).toBe('a');
  });

  it('throws if either party does not exist', () => {
    const a = makeParty({ id: 'a', seats: 1 });
    expect(() => mergeParties([], [a], 'ghost', 'a')).toThrow();
  });
});

describe('rebrandParty', () => {
  it('renames without touching ideology when none is given', () => {
    const a = makeParty({ id: 'a', name: 'Old Name', ideology: { economic: 10, social: 10 } });
    const updated = rebrandParty([a], 'a', 'New Name');
    expect(updated[0].name).toBe('New Name');
    expect(updated[0].ideology).toEqual({ economic: 10, social: 10 });
  });

  it('updates ideology when given', () => {
    const a = makeParty({ id: 'a', name: 'Old Name', ideology: { economic: 10, social: 10 } });
    const updated = rebrandParty([a], 'a', 'New Name', { economic: -10, social: -10 });
    expect(updated[0].ideology).toEqual({ economic: -10, social: -10 });
  });

  it('leaves other parties untouched', () => {
    const a = makeParty({ id: 'a' });
    const b = makeParty({ id: 'b', name: 'B' });
    const updated = rebrandParty([a, b], 'a', 'New A');
    expect(updated.find((p) => p.id === 'b')!.name).toBe('B');
  });
});
