import { SeededRng } from '../rng';
import { clamp } from '../ideology';
import type { Company, CompanySector } from '../models/types';

/**
 * STOCK MARKET & PRIVATE ENTERPRISE — the player founds a private company,
 * can take it public in a real IPO (selling a slice of it to the market for
 * an immediate cash windfall), and once public its shares trade on a
 * national market: price drifts with the company's own fundamentals (a
 * random walk, the same underlying-quality-changes-over-time shape as
 * everywhere else stochastic in this engine) plus the wider economy, and
 * holding shares in a public company pays a real per-turn dividend.
 */

export const COMPANY_FOUNDING_COST = 80;
const STARTING_SHARES = 1_000_000;
const STARTING_SHARE_PRICE = 2;
const IPO_FLOAT_FRACTION = 0.35;

export function foundCompany(
  id: string,
  name: string,
  sector: CompanySector,
  founderId: string,
  turn: number,
  rng: SeededRng
): Company {
  return {
    id,
    name,
    sector,
    founderId,
    turnFounded: turn,
    isPublic: false,
    totalShares: STARTING_SHARES,
    sharePrice: STARTING_SHARE_PRICE,
    playerShares: STARTING_SHARES,
    fundamentals: rng.nextInt(30, 70),
  };
}

export interface IpoResult {
  company: Company;
  proceeds: number;
}

/** Takes a private company public: the founder sells a fixed slice of their own stake to the market for immediate proceeds. A no-op (zero proceeds) if already public. */
export function ipoCompany(company: Company): IpoResult {
  if (company.isPublic) return { company, proceeds: 0 };
  const sharesSold = Math.round(company.playerShares * IPO_FLOAT_FRACTION);
  const proceeds = sharesSold * company.sharePrice;
  return {
    company: { ...company, isPublic: true, playerShares: company.playerShares - sharesSold },
    proceeds,
  };
}

const FUNDAMENTALS_VOLATILITY = 3;

/** A bounded random walk in the company's underlying business health — real strategic randomness, not noise on top of a fixed value. */
export function advanceCompanyFundamentals(company: Company, rng: SeededRng): Company {
  const delta = (rng.next() * 2 - 1) * FUNDAMENTALS_VOLATILITY;
  return { ...company, fundamentals: clamp(company.fundamentals + delta, 0, 100) };
}

const FUNDAMENTALS_PRICE_SCALE = 0.03;
const ECONOMY_PRICE_SCALE = 0.02;
const PRICE_NOISE_RANGE = 0.08;
const MAX_ECONOMY_TERM = 1;

/** Advances share price one turn: fundamentals above/below the 50 midpoint push it up/down, the wider economy adds a smaller correlated push, and a slice of real noise sits on top — only meaningful once a company is public (private shares have no market price discovery). */
export function advanceCompanySharePrice(company: Company, economyGdpGrowth: number, rng: SeededRng): Company {
  if (!company.isPublic) return company;
  const fundamentalsTerm = (company.fundamentals - 50) / 50;
  const economyTerm = clamp(economyGdpGrowth / 5, -MAX_ECONOMY_TERM, MAX_ECONOMY_TERM);
  const noise = (rng.next() * 2 - 1) * PRICE_NOISE_RANGE;
  const percentChange = fundamentalsTerm * FUNDAMENTALS_PRICE_SCALE + economyTerm * ECONOMY_PRICE_SCALE + noise;
  return { ...company, sharePrice: Math.max(0.01, company.sharePrice * (1 + percentChange)) };
}

/** One full turn for a company: fundamentals drift, then (if public) price follows. */
export function advanceCompanyTurn(company: Company, economyGdpGrowth: number, rng: SeededRng): Company {
  const withFundamentals = advanceCompanyFundamentals(company, rng);
  return advanceCompanySharePrice(withFundamentals, economyGdpGrowth, rng);
}

const DIVIDEND_YIELD_PER_TURN = 0.0015;

/** Real cash paid to the player each turn for shares held in a public company — proportional to both the stake's market value and how healthy the underlying business actually is. Private companies pay nothing (retained earnings). */
export function computeDividendPayout(company: Company): number {
  if (!company.isPublic) return 0;
  return company.playerShares * company.sharePrice * DIVIDEND_YIELD_PER_TURN * (company.fundamentals / 100);
}

export interface ShareTradeResult {
  company: Company;
  sharesTraded: number;
  /** Positive: cash spent buying. Negative: cash received selling. */
  cashDelta: number;
}

/** Buys as many shares as `budgetToSpend` covers at the current price. A no-op on a private company (nothing to buy on the open market yet). */
export function buyShares(company: Company, budgetToSpend: number): ShareTradeResult {
  if (!company.isPublic || budgetToSpend <= 0) return { company, sharesTraded: 0, cashDelta: 0 };
  const sharesTraded = budgetToSpend / company.sharePrice;
  return { company: { ...company, playerShares: company.playerShares + sharesTraded }, sharesTraded, cashDelta: budgetToSpend };
}

/** Sells up to `sharesToSell` at the current price, capped by what the player actually holds. */
export function sellShares(company: Company, sharesToSell: number): ShareTradeResult {
  const actualShares = Math.max(0, Math.min(sharesToSell, company.playerShares));
  const proceeds = actualShares * company.sharePrice;
  return { company: { ...company, playerShares: company.playerShares - actualShares }, sharesTraded: actualShares, cashDelta: -proceeds };
}

const MARKET_INDEX_BASE = 1000;
const NEUTRAL_FUNDAMENTALS = 50;

/** A headline market index derived purely from current state (no history to track) — the average fundamentals of every public company, scaled around a neutral base. Flat at the base value when nothing's listed yet. */
export function computeMarketIndex(companies: Company[]): number {
  const publicCompanies = companies.filter((c) => c.isPublic);
  if (publicCompanies.length === 0) return MARKET_INDEX_BASE;
  const avgFundamentals = publicCompanies.reduce((sum, c) => sum + c.fundamentals, 0) / publicCompanies.length;
  return MARKET_INDEX_BASE * (avgFundamentals / NEUTRAL_FUNDAMENTALS);
}

/** Total market value of the player's stake in a company, public or private. */
export function computeHoldingValue(company: Company): number {
  return company.playerShares * company.sharePrice;
}
