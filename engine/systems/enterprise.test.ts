import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Company } from '../models/types';
import {
  COMPANY_FOUNDING_COST,
  advanceCompanyFundamentals,
  advanceCompanySharePrice,
  advanceCompanyTurn,
  buyShares,
  computeDividendPayout,
  computeHoldingValue,
  computeMarketIndex,
  foundCompany,
  ipoCompany,
  sellShares,
} from './enterprise';

function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'c1',
    name: 'Test Co',
    sector: 'industrial',
    founderId: 'player',
    turnFounded: 1,
    isPublic: false,
    totalShares: 1_000_000,
    sharePrice: 2,
    playerShares: 1_000_000,
    fundamentals: 50,
    ...overrides,
  };
}

describe('foundCompany', () => {
  it('creates a fully founder-owned, private company', () => {
    const company = foundCompany('c1', 'Acme', 'technology', 'player', 3, new SeededRng(1));
    expect(company.isPublic).toBe(false);
    expect(company.playerShares).toBe(company.totalShares);
    expect(company.founderId).toBe('player');
    expect(company.turnFounded).toBe(3);
    expect(company.fundamentals).toBeGreaterThanOrEqual(30);
    expect(company.fundamentals).toBeLessThanOrEqual(70);
  });

  it('is deterministic for a fixed seed', () => {
    const a = foundCompany('c1', 'Acme', 'technology', 'player', 3, new SeededRng(9));
    const b = foundCompany('c1', 'Acme', 'technology', 'player', 3, new SeededRng(9));
    expect(a).toEqual(b);
  });

  it('has a real, positive founding cost', () => {
    expect(COMPANY_FOUNDING_COST).toBeGreaterThan(0);
  });
});

describe('ipoCompany', () => {
  it('sells a slice of the founder stake to the public for real proceeds', () => {
    const company = makeCompany({ isPublic: false, playerShares: 1_000_000, sharePrice: 2 });
    const { company: after, proceeds } = ipoCompany(company);
    expect(after.isPublic).toBe(true);
    expect(after.playerShares).toBeLessThan(1_000_000);
    expect(proceeds).toBeGreaterThan(0);
    expect(proceeds).toBe((1_000_000 - after.playerShares) * 2);
  });

  it('is a no-op on an already-public company', () => {
    const company = makeCompany({ isPublic: true });
    const { company: after, proceeds } = ipoCompany(company);
    expect(after).toEqual(company);
    expect(proceeds).toBe(0);
  });
});

describe('advanceCompanyFundamentals', () => {
  it('stays within 0..100 bounds even after many turns', () => {
    let company = makeCompany({ fundamentals: 98 });
    for (let i = 0; i < 100; i++) {
      company = advanceCompanyFundamentals(company, new SeededRng(i));
      expect(company.fundamentals).toBeGreaterThanOrEqual(0);
      expect(company.fundamentals).toBeLessThanOrEqual(100);
    }
  });

  it('is deterministic for a fixed seed', () => {
    const company = makeCompany();
    const a = advanceCompanyFundamentals(company, new SeededRng(5));
    const b = advanceCompanyFundamentals(company, new SeededRng(5));
    expect(a).toEqual(b);
  });
});

describe('advanceCompanySharePrice', () => {
  it('never changes price for a private company', () => {
    const company = makeCompany({ isPublic: false, sharePrice: 5 });
    const after = advanceCompanySharePrice(company, 2, new SeededRng(1));
    expect(after.sharePrice).toBe(5);
  });

  it('trends upward on average for strong fundamentals and a strong economy', () => {
    const company = makeCompany({ isPublic: true, fundamentals: 90, sharePrice: 10 });
    let totalChange = 0;
    for (let seed = 0; seed < 200; seed++) {
      const after = advanceCompanySharePrice(company, 5, new SeededRng(seed));
      totalChange += after.sharePrice - company.sharePrice;
    }
    expect(totalChange).toBeGreaterThan(0);
  });

  it('trends downward on average for weak fundamentals and a weak economy', () => {
    const company = makeCompany({ isPublic: true, fundamentals: 10, sharePrice: 10 });
    let totalChange = 0;
    for (let seed = 0; seed < 200; seed++) {
      const after = advanceCompanySharePrice(company, -5, new SeededRng(seed));
      totalChange += after.sharePrice - company.sharePrice;
    }
    expect(totalChange).toBeLessThan(0);
  });

  it('never drops the price to zero or below', () => {
    const company = makeCompany({ isPublic: true, fundamentals: 0, sharePrice: 0.02 });
    for (let seed = 0; seed < 50; seed++) {
      const after = advanceCompanySharePrice(company, -5, new SeededRng(seed));
      expect(after.sharePrice).toBeGreaterThan(0);
    }
  });
});

describe('advanceCompanyTurn', () => {
  it('advances both fundamentals and (for a public company) price', () => {
    const company = makeCompany({ isPublic: true });
    const after = advanceCompanyTurn(company, 2, new SeededRng(1));
    expect(after.fundamentals).not.toBe(company.fundamentals);
  });
});

describe('computeDividendPayout', () => {
  it('is zero for a private company', () => {
    expect(computeDividendPayout(makeCompany({ isPublic: false }))).toBe(0);
  });

  it('is positive for a public company with shares and healthy fundamentals', () => {
    expect(computeDividendPayout(makeCompany({ isPublic: true, fundamentals: 80 }))).toBeGreaterThan(0);
  });

  it('scales up with better fundamentals', () => {
    const weak = computeDividendPayout(makeCompany({ isPublic: true, fundamentals: 20 }));
    const strong = computeDividendPayout(makeCompany({ isPublic: true, fundamentals: 90 }));
    expect(strong).toBeGreaterThan(weak);
  });
});

describe('buyShares / sellShares', () => {
  it('buyShares is a no-op on a private company', () => {
    const company = makeCompany({ isPublic: false });
    const result = buyShares(company, 100);
    expect(result.sharesTraded).toBe(0);
    expect(result.cashDelta).toBe(0);
  });

  it('buyShares adds shares proportional to budget and price', () => {
    const company = makeCompany({ isPublic: true, sharePrice: 4, playerShares: 0 });
    const result = buyShares(company, 40);
    expect(result.sharesTraded).toBe(10);
    expect(result.company.playerShares).toBe(10);
    expect(result.cashDelta).toBe(40);
  });

  it('sellShares caps at whatever is actually held', () => {
    const company = makeCompany({ isPublic: true, sharePrice: 2, playerShares: 5 });
    const result = sellShares(company, 100);
    expect(result.sharesTraded).toBe(5);
    expect(result.company.playerShares).toBe(0);
    expect(result.cashDelta).toBe(-10);
  });

  it('sellShares never goes negative on remaining shares', () => {
    const company = makeCompany({ playerShares: 3 });
    const result = sellShares(company, 3);
    expect(result.company.playerShares).toBe(0);
  });
});

describe('computeMarketIndex', () => {
  it('is at the base value when nothing is public', () => {
    expect(computeMarketIndex([makeCompany({ isPublic: false })])).toBe(1000);
  });

  it('is above base when public companies have above-neutral fundamentals', () => {
    const companies = [makeCompany({ id: 'a', isPublic: true, fundamentals: 80 })];
    expect(computeMarketIndex(companies)).toBeGreaterThan(1000);
  });

  it('is below base when public companies have below-neutral fundamentals', () => {
    const companies = [makeCompany({ id: 'a', isPublic: true, fundamentals: 20 })];
    expect(computeMarketIndex(companies)).toBeLessThan(1000);
  });

  it('ignores private companies entirely', () => {
    const companies = [makeCompany({ id: 'a', isPublic: false, fundamentals: 100 })];
    expect(computeMarketIndex(companies)).toBe(1000);
  });
});

describe('computeHoldingValue', () => {
  it('multiplies shares held by current price', () => {
    expect(computeHoldingValue(makeCompany({ playerShares: 50, sharePrice: 3 }))).toBe(150);
  });
});
