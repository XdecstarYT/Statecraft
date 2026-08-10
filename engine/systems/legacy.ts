import { clamp, ideologicalDistance, MAX_IDEOLOGICAL_DISTANCE } from '../ideology';
import { WEEKS_PER_YEAR } from '../calendar';
import type { EconomyState, GameState } from '../models/types';

/**
 * Win-condition axes from CLAUDE.md §12: personal power, party dominance,
 * and national outcomes, each scored independently. See computeLegacySummary.
 */
export type VictoryPath = 'personal_power' | 'party_dominance' | 'national_prestige';

export interface EconomyDeltaSummary {
  /** Positive = improvement over the starting baseline. */
  gdpGrowth: number;
  unemployment: number;
  debtToGdp: number;
}

export interface ScandalRecord {
  total: number;
  unresolved: number;
  hard: number;
}

/** Every raw figure the scoring formulas below are computed from — nothing hidden. */
export interface LegacyBreakdown {
  yearsInPower: number;
  billsPassed: number;
  partySeatShare: number;
  partyIdeologicalCoherence: number;
  economyDelta: EconomyDeltaSummary;
  scandalRecord: ScandalRecord;
  averageForeignRelations: number;
  currentApproval: number;
}

function computeEconomyDelta(current: EconomyState, baseline: EconomyState): EconomyDeltaSummary {
  return {
    gdpGrowth: current.gdpGrowth - baseline.gdpGrowth,
    unemployment: baseline.unemployment - current.unemployment,
    debtToGdp: baseline.debtToGdp - current.debtToGdp,
  };
}

function computePartyCoherence(state: GameState, partyId: string): number {
  const party = state.parties.find((p) => p.id === partyId);
  const members = state.politicians.filter((p) => p.partyId === partyId);
  if (!party || members.length === 0) return 1;
  const avgDistance =
    members.reduce((sum, m) => sum + ideologicalDistance(m.ideology, party.ideology), 0) / members.length;
  return clamp(1 - avgDistance / MAX_IDEOLOGICAL_DISTANCE, 0, 1);
}

/** Assembles the raw figures every legacy score is computed from. */
export function computeLegacyBreakdown(state: GameState): LegacyBreakdown {
  const player = state.politicians.find((p) => p.isPlayer);
  const totalSeats = state.parties.reduce((sum, p) => sum + p.seats, 0);
  const playerParty = player ? state.parties.find((p) => p.id === player.partyId) : undefined;

  return {
    yearsInPower: state.turn / WEEKS_PER_YEAR,
    billsPassed: state.bills.filter((b) => b.status === 'passed' && b.sponsorId === player?.id).length,
    partySeatShare: playerParty && totalSeats > 0 ? playerParty.seats / totalSeats : 0,
    partyIdeologicalCoherence: playerParty ? computePartyCoherence(state, playerParty.id) : 1,
    economyDelta: computeEconomyDelta(state.economy, state.startingEconomy),
    scandalRecord: {
      total: state.scandals.length,
      unresolved: state.scandals.filter((s) => s.status === 'unresolved').length,
      hard: state.scandals.filter((s) => s.tier === 'hard').length,
    },
    averageForeignRelations: (() => {
      const values = Object.values(state.foreignRelations);
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    })(),
    currentApproval: player?.approval.public ?? 50,
  };
}

/** Years in power, approval, and legislative record, discounted for unresolved/hard scandals. */
export function scorePersonalPower(b: LegacyBreakdown): number {
  const longevity = clamp(b.yearsInPower * 10, 0, 40);
  const approval = clamp(b.currentApproval * 0.3, 0, 30);
  const legislative = clamp(b.billsPassed * 6, 0, 30);
  const scandalPenalty = b.scandalRecord.unresolved * 8 + b.scandalRecord.hard * 5;
  return clamp(longevity + approval + legislative - scandalPenalty, 0, 100);
}

/** Seat share plus how ideologically coherent the party has stayed. */
export function scorePartyDominance(b: LegacyBreakdown): number {
  return clamp(b.partySeatShare * 60 + b.partyIdeologicalCoherence * 40, 0, 100);
}

/** Real outcomes versus the starting baseline: growth, jobs, debt, and standing abroad. */
export function scoreNationalPrestige(b: LegacyBreakdown): number {
  const growth = clamp(50 + b.economyDelta.gdpGrowth * 15, 0, 100) * 0.35;
  const jobs = clamp(50 + b.economyDelta.unemployment * 10, 0, 100) * 0.25;
  const debt = clamp(50 + b.economyDelta.debtToGdp, 0, 100) * 0.2;
  const relations = clamp(50 + b.averageForeignRelations * 0.5, 0, 100) * 0.2;
  return clamp(growth + jobs + debt + relations, 0, 100);
}

/**
 * How the public judges the administration right now: heavily approval- and
 * short-term-economy-weighted, and forgiving of scandals once they're
 * resolved (only unresolved ones still sting).
 */
export function scoreContemporaryVerdict(b: LegacyBreakdown): number {
  const approvalWeight = b.currentApproval * 0.7;
  const economyWeight = clamp(50 + b.economyDelta.gdpGrowth * 10, 0, 100) * 0.3;
  const scandalPenalty = b.scandalRecord.unresolved * 5;
  return clamp(approvalWeight + economyWeight - scandalPenalty, 0, 100);
}

/**
 * How history judges the administration: discounts approval entirely in
 * favor of durable economic outcomes and the integrity record — every
 * scandal counts against it, resolved or not, and hard-tier ones count
 * heavily. This is deliberately built to be able to diverge sharply from
 * the contemporary verdict (a popular-but-corrupt run scores well on one,
 * poorly on the other).
 */
export function scoreHistoriansVerdict(b: LegacyBreakdown): number {
  const growth = clamp(50 + b.economyDelta.gdpGrowth * 15, 0, 100) * 0.3;
  const jobs = clamp(50 + b.economyDelta.unemployment * 10, 0, 100) * 0.2;
  const debt = clamp(50 + b.economyDelta.debtToGdp, 0, 100) * 0.2;
  const integrity =
    clamp(100 - b.scandalRecord.hard * 20 - b.scandalRecord.unresolved * 10 - b.scandalRecord.total * 3, 0, 100) *
    0.2;
  const relations = clamp(50 + b.averageForeignRelations * 0.5, 0, 100) * 0.1;
  return clamp(growth + jobs + debt + integrity + relations, 0, 100);
}

export interface LegacySummary {
  breakdown: LegacyBreakdown;
  personalPower: number;
  partyDominance: number;
  nationalPrestige: number;
  contemporaryVerdict: number;
  historiansVerdict: number;
}

export function computeLegacySummary(state: GameState): LegacySummary {
  const breakdown = computeLegacyBreakdown(state);
  return {
    breakdown,
    personalPower: scorePersonalPower(breakdown),
    partyDominance: scorePartyDominance(breakdown),
    nationalPrestige: scoreNationalPrestige(breakdown),
    contemporaryVerdict: scoreContemporaryVerdict(breakdown),
    historiansVerdict: scoreHistoriansVerdict(breakdown),
  };
}

/** Whichever of the three win-condition axes is currently strongest. */
export function determineLeadingVictoryPath(summary: LegacySummary): VictoryPath {
  const { personalPower, partyDominance, nationalPrestige } = summary;
  if (personalPower >= partyDominance && personalPower >= nationalPrestige) return 'personal_power';
  if (partyDominance >= nationalPrestige) return 'party_dominance';
  return 'national_prestige';
}
