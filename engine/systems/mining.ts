import type { SeededRng } from '../rng';
import type { Mine, RawResourceType, ResourceDeposit } from '../models/types';

/**
 * MINING — real, finite deposits generated once at game creation, mines
 * built on top of them that extract at a rate driven by deposit richness
 * and mine tier, depleting real reserves turn over turn until the deposit
 * runs dry.
 */

const DOMESTIC_DEPOSITS_PER_LOCATION_MIN = 1;
const DOMESTIC_DEPOSITS_PER_LOCATION_MAX = 2;
const FOREIGN_DEPOSIT_CHANCE = 0.4;
const BASE_RESERVES_PER_RICHNESS = 40;

export interface RawResourceWeight {
  id: RawResourceType;
  abundanceWeight: number;
}

/**
 * Generates every deposit in the world exactly once, at game creation,
 * from the seeded RNG — domestic locations (provinces) always get at
 * least one deposit each; foreign locations (nations) only sometimes do,
 * so foreign extraction reads as a real opportunity rather than a given.
 */
export function generateResourceDeposits(
  domesticLocationIds: string[],
  foreignLocationIds: string[],
  resources: RawResourceWeight[],
  rng: SeededRng
): ResourceDeposit[] {
  if (resources.length === 0) return [];
  const weighted = resources.map((r) => ({ item: r.id, weight: r.abundanceWeight }));
  const deposits: ResourceDeposit[] = [];
  let counter = 0;

  function makeDeposit(locationId: string, locationType: 'domestic' | 'foreign'): ResourceDeposit {
    const resource = rng.pickWeighted(weighted);
    const richness = rng.nextInt(30, 100);
    const remainingReserves = richness * BASE_RESERVES_PER_RICHNESS + rng.nextInt(0, 2000);
    return { id: `deposit-${counter++}`, resource, locationId, locationType, richness, remainingReserves };
  }

  for (const locationId of domesticLocationIds) {
    const count = rng.nextInt(DOMESTIC_DEPOSITS_PER_LOCATION_MIN, DOMESTIC_DEPOSITS_PER_LOCATION_MAX);
    for (let i = 0; i < count; i++) {
      deposits.push(makeDeposit(locationId, 'domestic'));
    }
  }

  for (const locationId of foreignLocationIds) {
    if (rng.next() >= FOREIGN_DEPOSIT_CHANCE) continue;
    deposits.push(makeDeposit(locationId, 'foreign'));
  }

  return deposits;
}

export const MAX_MINE_TIER = 3;
const BASE_EXTRACTION_PER_TIER = 10;

/** Units/turn a mine extracts from its deposit, before any logistics loss — tier and deposit richness both scale it. */
export function computeExtractionRate(mine: Mine, deposit: ResourceDeposit): number {
  return mine.tier * BASE_EXTRACTION_PER_TIER * (deposit.richness / 100);
}

export function buildMine(id: string, depositId: string, ownership: Mine['ownership'], turn: number): Mine {
  return { id, depositId, ownership, tier: 1, turnBuilt: turn };
}

export function upgradeMine(mine: Mine): Mine {
  return { ...mine, tier: Math.min(MAX_MINE_TIER, mine.tier + 1) };
}

export interface ExtractionResult {
  extracted: number;
  deposit: ResourceDeposit;
}

/** Extracts this turn's yield, capped by whatever's actually left in the deposit — a deposit at 0 reserves yields nothing. */
export function extractFromMine(mine: Mine, deposit: ResourceDeposit): ExtractionResult {
  const rate = computeExtractionRate(mine, deposit);
  const extracted = Math.min(rate, deposit.remainingReserves);
  return { extracted, deposit: { ...deposit, remainingReserves: deposit.remainingReserves - extracted } };
}

export function isDepositExhausted(deposit: ResourceDeposit): boolean {
  return deposit.remainingReserves <= 0;
}

/**
 * One-time cost to build a new tier-1 mine on an already-discovered
 * deposit, and to upgrade one to the given tier (2 or 3). Expressed in the
 * same wealth-scale units as personalWealth (see wealth.ts) — a
 * privately-owned facility debits this directly from the owner's personal
 * wealth, while a state-owned one is converted to a small budgetBalance
 * delta by the caller (see BUDGET_COST_SCALE in engine/index.ts), matching
 * how every other one-time investment (military, logistics) hits the
 * budget.
 */
export const MINE_BUILD_COST = 60;

export const MINE_UPGRADE_COST: Record<number, number> = { 2: 90, 3: 150 };

/** Per-turn upkeep, scales with tier — same wealth-scale units as the build cost. */
export function computeMineOperatingCost(mine: Mine): number {
  return mine.tier * 6;
}
