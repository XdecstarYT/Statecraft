import { describe, expect, it } from 'vitest';
import { createNewGame } from '../index';
import type { Company, Justice, JudicialReviewCase, Mine, Treaty, War, TradeDeal, GrassrootsMovement } from '../models/types';
import {
  computeIndustrySummary,
  computeMarketSummary,
  computeJudiciarySummary,
  computeDiplomacySummary,
  computeMovementsSummary,
  computeGovernmentSummary,
} from './statistics';

describe('computeIndustrySummary', () => {
  it('is all zero with no mines/factories/deposits', () => {
    const state = createNewGame(1);
    const summary = computeIndustrySummary({ ...state, mines: [], factories: [], resourceDeposits: [] });
    expect(summary).toEqual({ mineCount: 0, factoryCount: 0, averageMineTier: 0, averageFactoryTier: 0, depositCount: 0 });
  });

  it('averages tiers correctly across multiple mines', () => {
    const state = createNewGame(1);
    const mines: Mine[] = [
      { id: 'm1', depositId: 'd1', ownership: 'state', tier: 1, turnBuilt: 1 },
      { id: 'm2', depositId: 'd2', ownership: 'state', tier: 3, turnBuilt: 1 },
    ];
    const summary = computeIndustrySummary({ ...state, mines });
    expect(summary.mineCount).toBe(2);
    expect(summary.averageMineTier).toBe(2);
  });
});

describe('computeMarketSummary', () => {
  function makeCompany(overrides: Partial<Company> & { id: string }): Company {
    return {
      name: overrides.id,
      sector: 'industrial',
      founderId: 'p1',
      turnFounded: 1,
      isPublic: false,
      totalShares: 1000,
      sharePrice: 10,
      playerShares: 1000,
      fundamentals: 50,
      ...overrides,
    };
  }

  it('only counts public companies toward market cap', () => {
    const state = createNewGame(1);
    const companies = [
      makeCompany({ id: 'c1', isPublic: true, sharePrice: 10, totalShares: 1000 }),
      makeCompany({ id: 'c2', isPublic: false, sharePrice: 100, totalShares: 1000 }),
    ];
    const summary = computeMarketSummary({ ...state, companies });
    expect(summary.companyCount).toBe(2);
    expect(summary.publicCompanyCount).toBe(1);
    expect(summary.totalMarketCap).toBe(10_000);
  });
});

describe('computeJudiciarySummary', () => {
  function makeJustice(overrides: Partial<Justice> & { id: string }): Justice {
    return {
      name: overrides.id,
      ideology: { economic: 0, social: 0 },
      integrity: 5,
      status: 'confirmed',
      ...overrides,
    };
  }

  it('counts vacant seats when every seat is null', () => {
    const state = createNewGame(1);
    const summary = computeJudiciarySummary({ ...state, court: { seats: [null, null, null] } });
    expect(summary.vacantSeats).toBe(3);
    expect(summary.confirmedSeats).toBe(0);
    expect(summary.averageJusticeIntegrity).toBe(0);
  });

  it('splits confirmed vs nominated seats and averages integrity across confirmed only', () => {
    const state = createNewGame(1);
    const seats = [
      makeJustice({ id: 'j1', status: 'confirmed', integrity: 6 }),
      makeJustice({ id: 'j2', status: 'confirmed', integrity: 10 }),
      makeJustice({ id: 'j3', status: 'nominated', integrity: 1 }),
      null,
    ];
    const summary = computeJudiciarySummary({ ...state, court: { seats } });
    expect(summary.confirmedSeats).toBe(2);
    expect(summary.nominatedSeats).toBe(1);
    expect(summary.vacantSeats).toBe(1);
    expect(summary.averageJusticeIntegrity).toBe(8);
  });

  it('counts pending and struck-down review cases separately', () => {
    const state = createNewGame(1);
    const cases: JudicialReviewCase[] = [
      { id: 'r1', billId: 'b1', billTitle: 'A', turnFiled: 1, status: 'pending' },
      { id: 'r2', billId: 'b2', billTitle: 'B', turnFiled: 1, status: 'struck_down' },
      { id: 'r3', billId: 'b3', billTitle: 'C', turnFiled: 1, status: 'upheld' },
    ];
    const summary = computeJudiciarySummary({ ...state, judicialReviewCases: cases });
    expect(summary.reviewCasesPending).toBe(1);
    expect(summary.reviewCasesStruckDown).toBe(1);
  });
});

describe('computeDiplomacySummary', () => {
  it('averages relations and counts only active treaties/wars/deals', () => {
    const state = createNewGame(1);
    const treaties: Treaty[] = [
      { id: 't1', counterpartId: 'a', type: 'trade', title: 'x', status: 'active', economyEffect: {}, relationEffect: 5 },
      { id: 't2', counterpartId: 'b', type: 'trade', title: 'y', status: 'broken', economyEffect: {}, relationEffect: 5 },
    ];
    const wars: War[] = [
      { id: 'w1', counterpartId: 'a', startTurn: 1, status: 'active', advantage: 0 },
      { id: 'w2', counterpartId: 'b', startTurn: 1, status: 'won', advantage: 10 },
    ];
    const tradeDeals: TradeDeal[] = [
      { id: 'd1', counterpartId: 'a', commodity: 'energy', volume: 10, tariff: 0, status: 'active' },
      { id: 'd2', counterpartId: 'b', commodity: 'energy', volume: 10, tariff: 0, status: 'cancelled' },
    ];
    const summary = computeDiplomacySummary({
      ...state,
      foreignRelations: { a: 20, b: -10 },
      treaties,
      wars,
      tradeDeals,
    });
    expect(summary.averageForeignRelations).toBe(5);
    expect(summary.activeTreaties).toBe(1);
    expect(summary.activeWars).toBe(1);
    expect(summary.activeTradeDeals).toBe(1);
  });

  it('averages to zero with no relations recorded', () => {
    const state = createNewGame(1);
    const summary = computeDiplomacySummary({ ...state, foreignRelations: {} });
    expect(summary.averageForeignRelations).toBe(0);
  });
});

describe('computeMovementsSummary', () => {
  it('sums size across every active movement', () => {
    const state = createNewGame(1);
    const movements: GrassrootsMovement[] = [
      { id: 'm1', name: 'A', mission: 'x', ideology: { economic: 0, social: 0 }, originBlocId: 'b1', size: 30, founded: 1 },
      { id: 'm2', name: 'B', mission: 'y', ideology: { economic: 0, social: 0 }, originBlocId: 'b2', size: 45, founded: 2 },
    ];
    const summary = computeMovementsSummary({ ...state, movements });
    expect(summary.count).toBe(2);
    expect(summary.totalSize).toBe(75);
  });
});

describe('computeGovernmentSummary', () => {
  it('counts passed bills separately from in-flight ones, regardless of sponsor', () => {
    const state = createNewGame(1);
    const bills = state.bills.map((b) => b);
    const summary = computeGovernmentSummary({
      ...state,
      bills: [
        ...bills,
        { id: 'b1', title: 'A', provisions: [], sponsorId: 'x', status: 'passed', whipCount: {} },
        { id: 'b2', title: 'B', provisions: [], sponsorId: 'x', status: 'drafting', whipCount: {} },
        { id: 'b3', title: 'C', provisions: [], sponsorId: 'x', status: 'floor', whipCount: {} },
        { id: 'b4', title: 'D', provisions: [], sponsorId: 'x', status: 'failed', whipCount: {} },
      ],
    });
    expect(summary.billsPassedTotal).toBe(1);
    expect(summary.billsInFlight).toBe(2);
    expect(summary.totalSeats).toBe(state.parties.reduce((sum, p) => sum + p.seats, 0));
  });
});
