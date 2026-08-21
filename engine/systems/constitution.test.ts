import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { AmendmentChange, Country, HouseRules, Politician } from '../models/types';
import { DEFAULT_HOUSE_RULES } from '../models/types';
import {
  AMENDMENT_SUPERMAJORITY_THRESHOLD,
  applyAmendmentChange,
  applyAmendmentVoteResult,
  proposeAmendment,
  resolveAmendmentVote,
} from './constitution';

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

function makeCountry(overrides: Partial<Country> = {}): Country {
  return {
    id: 'test-nation',
    name: 'Test Nation',
    regimeType: 'parliamentary',
    legislature: {
      name: 'Test Assembly',
      electoralSystem: 'FPTP',
      districts: [],
      totalSeats: 10,
      prThreshold: 0.05,
    },
    ...overrides,
  };
}

describe('proposeAmendment', () => {
  it('starts proposed with an empty whip count', () => {
    const amendment = proposeAmendment({
      id: 'amend-1',
      title: 'Switch to PR',
      description: 'test',
      change: { type: 'electoral_system', electoralSystem: 'PR_DHONDT' },
      sponsorId: 'p-1',
      turnProposed: 1,
    });
    expect(amendment.status).toBe('proposed');
    expect(amendment.whipCount).toEqual({});
  });
});

describe('resolveAmendmentVote', () => {
  it('passes when nearly everyone strongly supports the sponsor (aligned ideology, warm relationships)', () => {
    const sponsor = makePolitician({ id: 'sponsor' });
    const members = Array.from({ length: 20 }, (_, i) => makePolitician({ id: `m${i}`, ideology: { economic: 0, social: 0 } }));
    const politicians = [sponsor, ...members];
    const relationships: Record<string, number> = {};
    for (const m of members) relationships[[sponsor.id, m.id].sort().join(':')] = 100;

    const amendment = proposeAmendment({
      id: 'amend-1',
      title: 'test',
      description: 'test',
      change: { type: 'house_rule', houseRule: 'noCorruption', houseRuleValue: true },
      sponsorId: sponsor.id,
      turnProposed: 1,
    });

    const result = resolveAmendmentVote(amendment, politicians, relationships, {}, new SeededRng(1));
    expect(result.passed).toBe(true);
    expect(result.yes / (result.yes + result.no)).toBeGreaterThanOrEqual(AMENDMENT_SUPERMAJORITY_THRESHOLD);
  });

  it('fails a bare-majority-but-not-supermajority coalition, across many seeds', () => {
    // Ideologically neutral, no relationship boost — support hovers well
    // under 2/3, unlike an ordinary floor vote's 1/2 bar.
    const sponsor = makePolitician({ id: 'sponsor', ideology: { economic: 60, social: 60 } });
    const members = Array.from({ length: 30 }, (_, i) =>
      makePolitician({ id: `m${i}`, ideology: { economic: -30 + (i % 7) * 5, social: -30 + (i % 5) * 5 } })
    );
    const politicians = [sponsor, ...members];

    let sawFailure = false;
    for (let seed = 0; seed < 30 && !sawFailure; seed++) {
      const amendment = proposeAmendment({
        id: 'amend-1',
        title: 'test',
        description: 'test',
        change: { type: 'house_rule', houseRule: 'noCorruption', houseRuleValue: true },
        sponsorId: sponsor.id,
        turnProposed: 1,
      });
      const result = resolveAmendmentVote(amendment, politicians, {}, {}, new SeededRng(seed));
      if (!result.passed) sawFailure = true;
    }
    expect(sawFailure).toBe(true);
  });

  it('is deterministic given the same seed', () => {
    const sponsor = makePolitician({ id: 'sponsor' });
    const members = Array.from({ length: 10 }, (_, i) => makePolitician({ id: `m${i}` }));
    const politicians = [sponsor, ...members];
    const amendment = proposeAmendment({
      id: 'amend-1',
      title: 'test',
      description: 'test',
      change: { type: 'house_rule', houseRule: 'noCorruption', houseRuleValue: true },
      sponsorId: sponsor.id,
      turnProposed: 1,
    });
    const a = resolveAmendmentVote(amendment, politicians, {}, {}, new SeededRng(42));
    const b = resolveAmendmentVote(amendment, politicians, {}, {}, new SeededRng(42));
    expect(a).toEqual(b);
  });
});

describe('applyAmendmentVoteResult', () => {
  it('sets status passed and records vote tallies + turn', () => {
    const amendment = proposeAmendment({
      id: 'amend-1',
      title: 'test',
      description: 'test',
      change: { type: 'house_rule', houseRule: 'noCorruption', houseRuleValue: true },
      sponsorId: 'sponsor',
      turnProposed: 1,
    });
    const result = { yes: 10, no: 2, passed: true, finalWhipCount: { sponsor: 'yes' as const } };
    const resolved = applyAmendmentVoteResult(amendment, result, 5);
    expect(resolved.status).toBe('passed');
    expect(resolved.votesFor).toBe(10);
    expect(resolved.votesAgainst).toBe(2);
    expect(resolved.turnResolved).toBe(5);
  });
});

describe('applyAmendmentChange', () => {
  const houseRules: HouseRules = { ...DEFAULT_HOUSE_RULES };

  it('changes the electoral system', () => {
    const country = makeCountry();
    const change: AmendmentChange = { type: 'electoral_system', electoralSystem: 'PR_DHONDT' };
    const result = applyAmendmentChange(country, houseRules, change);
    expect(result.country.legislature.electoralSystem).toBe('PR_DHONDT');
  });

  it('changes the regime type', () => {
    const country = makeCountry();
    const change: AmendmentChange = { type: 'regime_type', regimeType: 'presidential' };
    const result = applyAmendmentChange(country, houseRules, change);
    expect(result.country.regimeType).toBe('presidential');
  });

  it('toggles a house rule', () => {
    const country = makeCountry();
    const change: AmendmentChange = { type: 'house_rule', houseRule: 'disableTermLimits', houseRuleValue: true };
    const result = applyAmendmentChange(country, houseRules, change);
    expect(result.houseRules.disableTermLimits).toBe(true);
    expect(houseRules.disableTermLimits).toBe(false); // original untouched
  });

  it('surfaces a new term length for the caller to apply', () => {
    const country = makeCountry();
    const change: AmendmentChange = { type: 'term_length', termLengthTurns: 96 };
    const result = applyAmendmentChange(country, houseRules, change);
    expect(result.termLengthTurns).toBe(96);
  });

  it('is a no-op when the change payload is malformed for its declared type', () => {
    const country = makeCountry();
    const change: AmendmentChange = { type: 'electoral_system' };
    const result = applyAmendmentChange(country, houseRules, change);
    expect(result.country).toEqual(country);
    expect(result.houseRules).toEqual(houseRules);
  });
});
