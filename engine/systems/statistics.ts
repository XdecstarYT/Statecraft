import type { GameState } from '../models/types';

/**
 * STATISTICS — read-only aggregations over state that's otherwise scattered
 * across many systems (industry, markets, judiciary, diplomacy, movements,
 * legislature), purely for the full-country overview in
 * ui/components/StatisticsPanel.tsx. Nothing here feeds back into gameplay;
 * it exists so the UI layer stays a pure renderer of engine-computed values
 * rather than doing its own aggregation math, per CLAUDE.md's engine/UI
 * separation.
 */

export interface IndustrySummary {
  mineCount: number;
  factoryCount: number;
  averageMineTier: number;
  averageFactoryTier: number;
  depositCount: number;
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function computeIndustrySummary(state: GameState): IndustrySummary {
  return {
    mineCount: state.mines.length,
    factoryCount: state.factories.length,
    averageMineTier: average(state.mines.map((m) => m.tier)),
    averageFactoryTier: average(state.factories.map((f) => f.tier)),
    depositCount: state.resourceDeposits.length,
  };
}

export interface MarketSummary {
  companyCount: number;
  publicCompanyCount: number;
  /** Sum of sharePrice * totalShares across every public company — an abstracted total market cap, not a per-company breakdown. */
  totalMarketCap: number;
}

export function computeMarketSummary(state: GameState): MarketSummary {
  const publicCompanies = state.companies.filter((c) => c.isPublic);
  return {
    companyCount: state.companies.length,
    publicCompanyCount: publicCompanies.length,
    totalMarketCap: publicCompanies.reduce((sum, c) => sum + c.sharePrice * c.totalShares, 0),
  };
}

export interface JudiciarySummary {
  confirmedSeats: number;
  nominatedSeats: number;
  vacantSeats: number;
  averageJusticeIntegrity: number;
  reviewCasesPending: number;
  reviewCasesStruckDown: number;
}

export function computeJudiciarySummary(state: GameState): JudiciarySummary {
  const justices = state.court.seats.filter((s) => s !== null);
  const confirmed = justices.filter((j) => j!.status === 'confirmed');
  return {
    confirmedSeats: confirmed.length,
    nominatedSeats: justices.filter((j) => j!.status === 'nominated').length,
    vacantSeats: state.court.seats.filter((s) => s === null).length,
    averageJusticeIntegrity: average(confirmed.map((j) => j!.integrity)),
    reviewCasesPending: state.judicialReviewCases.filter((c) => c.status === 'pending').length,
    reviewCasesStruckDown: state.judicialReviewCases.filter((c) => c.status === 'struck_down').length,
  };
}

export interface DiplomacySummary {
  averageForeignRelations: number;
  activeTreaties: number;
  activeWars: number;
  activeTradeDeals: number;
}

export function computeDiplomacySummary(state: GameState): DiplomacySummary {
  const relationValues = Object.values(state.foreignRelations);
  return {
    averageForeignRelations: average(relationValues),
    activeTreaties: state.treaties.filter((t) => t.status === 'active').length,
    activeWars: state.wars.filter((w) => w.status === 'active').length,
    activeTradeDeals: state.tradeDeals.filter((d) => d.status === 'active').length,
  };
}

export interface MovementsSummary {
  count: number;
  totalSize: number;
}

export function computeMovementsSummary(state: GameState): MovementsSummary {
  return {
    count: state.movements.length,
    totalSize: state.movements.reduce((sum, m) => sum + m.size, 0),
  };
}

export interface GovernmentSummary {
  totalSeats: number;
  billsPassedTotal: number;
  billsInFlight: number;
}

export function computeGovernmentSummary(state: GameState): GovernmentSummary {
  return {
    totalSeats: state.parties.reduce((sum, p) => sum + p.seats, 0),
    billsPassedTotal: state.bills.filter((b) => b.status === 'passed').length,
    billsInFlight: state.bills.filter((b) => b.status === 'drafting' || b.status === 'committee' || b.status === 'floor').length,
  };
}
