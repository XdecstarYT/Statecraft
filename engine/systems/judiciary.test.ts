import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Court, Justice, Politician } from '../models/types';
import {
  DEFAULT_COURT_QUORUM,
  applyConfirmationResult,
  canHearCases,
  computeConfirmationSupportProbability,
  computeCourtIdeology,
  computeStrikeDownProbability,
  createEmptyCourt,
  nominateJustice,
  resolveConfirmationVote,
  resolveJudicialReview,
  rollForJudicialReviewChallenge,
  rollForJusticeRetirements,
} from './judiciary';

function makePolitician(overrides: Partial<Politician> = {}): Politician {
  return {
    id: 'p1',
    name: 'Test Pol',
    isPlayer: false,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

function makeJustice(overrides: Partial<Justice> = {}): Justice {
  return { id: 'j1', name: 'Justice One', ideology: { economic: 0, social: 0 }, integrity: 8, status: 'confirmed', ...overrides };
}

describe('createEmptyCourt', () => {
  it('creates the requested number of vacant seats', () => {
    const court = createEmptyCourt(5);
    expect(court.seats).toHaveLength(5);
    expect(court.seats.every((s) => s === null)).toBe(true);
  });
});

describe('nominateJustice', () => {
  it('fills only the targeted seat, leaving others untouched', () => {
    const court = createEmptyCourt(3);
    const next = nominateJustice(court, 1, { id: 'j1', name: 'A', ideology: { economic: 10, social: 10 }, integrity: 7 }, 5);
    expect(next.seats[0]).toBeNull();
    expect(next.seats[2]).toBeNull();
    expect(next.seats[1]).toMatchObject({ id: 'j1', status: 'nominated', turnAppointed: 5 });
  });

  it('replaces whatever nominee currently sits in the seat', () => {
    const court = createEmptyCourt(1);
    const first = nominateJustice(court, 0, { id: 'j1', name: 'A', ideology: { economic: 0, social: 0 }, integrity: 5 }, 1);
    const second = nominateJustice(first, 0, { id: 'j2', name: 'B', ideology: { economic: 0, social: 0 }, integrity: 5 }, 2);
    expect(second.seats[0]?.id).toBe('j2');
  });
});

describe('computeConfirmationSupportProbability', () => {
  it('is high for an aligned, high-integrity nominee', () => {
    const justice = { ideology: { economic: 0, social: 0 }, integrity: 10 };
    const member = makePolitician({ ideology: { economic: 0, social: 0 } });
    expect(computeConfirmationSupportProbability(justice, member)).toBeGreaterThan(0.8);
  });

  it('is low for a maximally-opposed, low-integrity nominee', () => {
    const justice = { ideology: { economic: -100, social: -100 }, integrity: 1 };
    const member = makePolitician({ ideology: { economic: 100, social: 100 } });
    expect(computeConfirmationSupportProbability(justice, member)).toBeLessThan(0.2);
  });

  it('integrity buys real but bounded cross-ideological support', () => {
    const member = makePolitician({ ideology: { economic: 100, social: 100 } });
    const lowIntegrity = computeConfirmationSupportProbability({ ideology: { economic: -100, social: -100 }, integrity: 1 }, member);
    const highIntegrity = computeConfirmationSupportProbability({ ideology: { economic: -100, social: -100 }, integrity: 10 }, member);
    expect(highIntegrity).toBeGreaterThan(lowIntegrity);
  });
});

describe('resolveConfirmationVote', () => {
  it('confirms a broadly popular nominee across many aligned members', () => {
    const politicians = Array.from({ length: 10 }, (_, i) => makePolitician({ id: `p${i}`, ideology: { economic: 0, social: 0 } }));
    const result = resolveConfirmationVote({ ideology: { economic: 0, social: 0 }, integrity: 10 }, politicians, new SeededRng(1));
    expect(result.confirmed).toBe(true);
    expect(result.yesVotes).toBeGreaterThan(result.noVotes);
    expect(Object.keys(result.votes)).toHaveLength(10);
  });

  it('rejects a nominee opposed by every member', () => {
    const politicians = Array.from({ length: 10 }, (_, i) =>
      makePolitician({ id: `p${i}`, ideology: { economic: 100, social: 100 } })
    );
    const result = resolveConfirmationVote({ ideology: { economic: -100, social: -100 }, integrity: 1 }, politicians, new SeededRng(1));
    expect(result.confirmed).toBe(false);
  });

  it('is deterministic for a fixed seed', () => {
    const politicians = Array.from({ length: 8 }, (_, i) => makePolitician({ id: `p${i}` }));
    const a = resolveConfirmationVote({ ideology: { economic: 20, social: -10 }, integrity: 6 }, politicians, new SeededRng(42));
    const b = resolveConfirmationVote({ ideology: { economic: 20, social: -10 }, integrity: 6 }, politicians, new SeededRng(42));
    expect(a).toEqual(b);
  });
});

describe('applyConfirmationResult', () => {
  it('seats a confirmed justice permanently', () => {
    const court = nominateJustice(createEmptyCourt(2), 0, { id: 'j1', name: 'A', ideology: { economic: 0, social: 0 }, integrity: 5 }, 1);
    const result = { confirmed: true, yesVotes: 5, noVotes: 1, votes: {} };
    const next = applyConfirmationResult(court, 0, result);
    expect(next.seats[0]?.status).toBe('confirmed');
  });

  it('vacates the seat again on rejection', () => {
    const court = nominateJustice(createEmptyCourt(2), 0, { id: 'j1', name: 'A', ideology: { economic: 0, social: 0 }, integrity: 5 }, 1);
    const result = { confirmed: false, yesVotes: 1, noVotes: 5, votes: {} };
    const next = applyConfirmationResult(court, 0, result);
    expect(next.seats[0]).toBeNull();
  });
});

describe('computeCourtIdeology', () => {
  it('is null when nobody is confirmed', () => {
    expect(computeCourtIdeology(createEmptyCourt(3))).toBeNull();
  });

  it('averages only confirmed justices, ignoring vacant/nominated seats', () => {
    const court: Court = {
      seats: [
        makeJustice({ ideology: { economic: 100, social: 0 }, status: 'confirmed' }),
        makeJustice({ ideology: { economic: -100, social: 0 }, status: 'confirmed' }),
        makeJustice({ ideology: { economic: 100, social: 100 }, status: 'nominated' }),
        null,
      ],
    };
    expect(computeCourtIdeology(court)).toEqual({ economic: 0, social: 0 });
  });
});

describe('canHearCases', () => {
  it('is false below quorum', () => {
    const court: Court = { seats: [makeJustice(), null, null, null, null] };
    expect(canHearCases(court)).toBe(false);
  });

  it('is true once quorum confirmed justices are seated', () => {
    const seats = Array.from({ length: DEFAULT_COURT_QUORUM }, (_, i) => makeJustice({ id: `j${i}` }));
    const court: Court = { seats: [...seats, null, null] };
    expect(canHearCases(court)).toBe(true);
  });
});

describe('rollForJudicialReviewChallenge', () => {
  it('is deterministic for a fixed seed', () => {
    expect(rollForJudicialReviewChallenge(new SeededRng(7))).toBe(rollForJudicialReviewChallenge(new SeededRng(7)));
  });

  it('never challenges at zero chance', () => {
    for (let seed = 0; seed < 20; seed++) {
      expect(rollForJudicialReviewChallenge(new SeededRng(seed), 0)).toBe(false);
    }
  });
});

describe('computeStrikeDownProbability', () => {
  it('is low when the court and sponsor are perfectly aligned', () => {
    const p = computeStrikeDownProbability({ economic: 0, social: 0 }, { economic: 0, social: 0 });
    expect(p).toBeCloseTo(0.05, 5);
  });

  it('is high when the court and sponsor are maximally opposed', () => {
    const p = computeStrikeDownProbability({ economic: -100, social: -100 }, { economic: 100, social: 100 });
    expect(p).toBeCloseTo(0.85, 5);
  });
});

describe('resolveJudicialReview', () => {
  const baseCase = { id: 'r1', billId: 'b1', billTitle: 'Test Bill', turnFiled: 3, status: 'pending' as const };

  it('is deterministic for a fixed seed', () => {
    const a = resolveJudicialReview(baseCase, 0.5, new SeededRng(9), 5);
    const b = resolveJudicialReview(baseCase, 0.5, new SeededRng(9), 5);
    expect(a).toEqual(b);
  });

  it('always upholds at zero strike-down probability', () => {
    const result = resolveJudicialReview(baseCase, 0, new SeededRng(1), 5);
    expect(result.status).toBe('upheld');
    expect(result.turnResolved).toBe(5);
  });

  it('always strikes down at full strike-down probability', () => {
    const result = resolveJudicialReview(baseCase, 1, new SeededRng(1), 5);
    expect(result.status).toBe('struck_down');
  });
});

describe('rollForJusticeRetirements', () => {
  it('never touches vacant or nominated seats', () => {
    const court: Court = { seats: [null, makeJustice({ status: 'nominated' })] };
    const next = rollForJusticeRetirements(court, new SeededRng(1));
    expect(next.seats[0]).toBeNull();
    expect(next.seats[1]?.status).toBe('nominated');
  });

  it('is deterministic for a fixed seed', () => {
    const court: Court = { seats: Array.from({ length: 5 }, (_, i) => makeJustice({ id: `j${i}` })) };
    const a = rollForJusticeRetirements(court, new SeededRng(3));
    const b = rollForJusticeRetirements(court, new SeededRng(3));
    expect(a).toEqual(b);
  });
});
