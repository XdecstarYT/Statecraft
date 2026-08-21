import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import { relationshipKey } from './legislative';
import { computeUnresolvedScandalSeverity } from './succession';
import type { Bill, BillCategory, CabinetAppointment, CabinetPortfolio, CabinetRank, Politician, Scandal } from '../models/types';

export const CABINET_PORTFOLIOS: CabinetPortfolio[] = ['finance', 'defense', 'foreignAffairs', 'justice'];

/** Appointing to an already-filled portfolio+rank replaces the previous holder there only — a junior appointment never bumps the senior minister, and vice versa. */
export function appointToCabinet(
  cabinet: CabinetAppointment[],
  portfolio: CabinetPortfolio,
  politicianId: string,
  rank: CabinetRank = 'senior'
): CabinetAppointment[] {
  return [
    ...cabinet.filter((c) => !(c.portfolio === portfolio && c.rank === rank)),
    { portfolio, politicianId, rank },
  ];
}

export function removeFromCabinet(
  cabinet: CabinetAppointment[],
  portfolio: CabinetPortfolio,
  rank: CabinetRank = 'senior'
): CabinetAppointment[] {
  return cabinet.filter((c) => !(c.portfolio === portfolio && c.rank === rank));
}

export interface ReshuffleResult {
  cabinet: CabinetAppointment[];
  /** The politician bumped out of the seat, if any — a real reshuffle consequence a caller can dock a relationship for. */
  removedPoliticianId: string | null;
}

/** Same replacement as appointToCabinet, but also reports who got bumped so a reshuffle can carry a real political cost. */
export function reshuffleCabinet(
  cabinet: CabinetAppointment[],
  portfolio: CabinetPortfolio,
  rank: CabinetRank,
  newPoliticianId: string
): ReshuffleResult {
  const previous = cabinet.find((c) => c.portfolio === portfolio && c.rank === rank);
  const nextCabinet = appointToCabinet(cabinet, portfolio, newPoliticianId, rank);
  const removedPoliticianId = previous && previous.politicianId !== newPoliticianId ? previous.politicianId : null;
  return { cabinet: nextCabinet, removedPoliticianId };
}

export interface CabinetEffects {
  /** Multiplies the difficulty's base economy volatility multiplier — a sharp Finance minister calms the numbers. */
  economyVolatilityMultiplier: number;
  /** Added directly to a war's effective-strength comparison — a sharp Defense minister is worth real strength. */
  warStrengthBonus: number;
  /** Multiplies the difficulty's base corruption detection multiplier — a principled Justice minister catches more, including the player's own. */
  corruptionDetectionMultiplier: number;
  /** 0..1 fraction shaved off the relation penalty for declaring war — a skilled Foreign Affairs minister softens the diplomatic fallout. */
  warDeclarationRelationSoftening: number;
}

const NEUTRAL_CABINET_EFFECTS: CabinetEffects = {
  economyVolatilityMultiplier: 1,
  warStrengthBonus: 0,
  corruptionDetectionMultiplier: 1,
  warDeclarationRelationSoftening: 0,
};

/** A junior minister contributes at half the weight of a senior one in the same portfolio — real support, not a redundant duplicate. */
const JUNIOR_EFFECT_WEIGHT = 0.5;

/**
 * A vacant portfolio contributes nothing; a filled one draws its effect
 * from that minister's relevant attribute (1..10 scale). Every effect
 * plugs into a multiplier or addend an existing system already accepts —
 * a cabinet appointment is real math, not flavor text. Junior ministers
 * stack an additional, smaller version of the same effect on top of their
 * portfolio's senior minister (or alone, if the senior seat is vacant).
 */
export function computeCabinetEffects(cabinet: CabinetAppointment[], politicians: Politician[]): CabinetEffects {
  const effects: CabinetEffects = { ...NEUTRAL_CABINET_EFFECTS };

  for (const appointment of cabinet) {
    const politician = politicians.find((p) => p.id === appointment.politicianId);
    if (!politician) continue;
    const w = appointment.rank === 'junior' ? JUNIOR_EFFECT_WEIGHT : 1;

    switch (appointment.portfolio) {
      case 'finance':
        effects.economyVolatilityMultiplier -= (politician.attributes.intellect / 10) * 0.25 * w;
        break;
      case 'defense':
        effects.warStrengthBonus += politician.attributes.intellect * 1.5 * w;
        break;
      case 'justice':
        effects.corruptionDetectionMultiplier += (politician.attributes.integrity / 10) * 0.3 * w;
        break;
      case 'foreignAffairs':
        effects.warDeclarationRelationSoftening += (politician.attributes.charisma / 10) * 0.4 * w;
        break;
    }
  }

  return effects;
}

/**
 * COLLECTIVE RESPONSIBILITY — a senior minister whose own portfolio just
 * suffered a real legislative defeat (a failed bill in their category)
 * carries real resignation risk, scaled by their own integrity: a
 * principled minister is *more* likely to fall on their sword over a
 * failure in their own department, not less — the inverse of how
 * integrity reads elsewhere (e.g. corruption, impeachment), by design.
 */
const CATEGORY_TO_PORTFOLIO: Partial<Record<BillCategory, CabinetPortfolio>> = {
  economic: 'finance',
  defense: 'defense',
  justice_safety: 'justice',
};

export function portfolioForBillCategory(category: BillCategory | undefined): CabinetPortfolio | undefined {
  return category ? CATEGORY_TO_PORTFOLIO[category] : undefined;
}

export function computeResignationProbability(minister: Politician, bill: Bill): number {
  if (bill.status !== 'failed') return 0;
  return clamp(0.1 + (minister.attributes.integrity / 10) * 0.35, 0, 1);
}

export interface CollectiveResponsibilityResult {
  cabinet: CabinetAppointment[];
  resignedPoliticianId: string | null;
  portfolio: CabinetPortfolio | null;
}

/**
 * Rolls collective responsibility for every cabinet seat tied to a bill's
 * portfolio (senior and junior alike) against a just-failed bill; the
 * first minister whose roll lands resigns and is removed from cabinet. A
 * no-op (returns the same cabinet, resignedPoliticianId null) for a bill
 * whose category maps to no portfolio, or one that didn't fail.
 */
export function resolveCollectiveResponsibility(
  cabinet: CabinetAppointment[],
  politicians: Politician[],
  bill: Bill,
  rng: SeededRng
): CollectiveResponsibilityResult {
  const portfolio = portfolioForBillCategory(bill.category);
  if (!portfolio) return { cabinet, resignedPoliticianId: null, portfolio: null };

  const seats = cabinet.filter((c) => c.portfolio === portfolio);
  for (const seat of seats) {
    const minister = politicians.find((p) => p.id === seat.politicianId);
    if (!minister) continue;
    const probability = computeResignationProbability(minister, bill);
    if (rng.next() < probability) {
      return {
        cabinet: removeFromCabinet(cabinet, seat.portfolio, seat.rank),
        resignedPoliticianId: minister.id,
        portfolio,
      };
    }
  }
  return { cabinet, resignedPoliticianId: null, portfolio };
}

/** A scandal breaking against a sitting minister carries a real, tier-scaled chance they're forced out of cabinet immediately, independent of any no-confidence vote. */
const SCANDAL_FORCED_EXIT_PROBABILITY: Record<Scandal['tier'], number> = { soft: 0.05, medium: 0.25, hard: 0.6 };

export function computeScandalForcedExitProbability(tier: Scandal['tier']): number {
  return SCANDAL_FORCED_EXIT_PROBABILITY[tier];
}

export interface ScandalForcedExitResult {
  cabinet: CabinetAppointment[];
  removedPoliticianId: string | null;
}

/** Rolls whether a scandal against a sitting minister forces them out of every cabinet seat they hold (a minister could in principle hold both a senior and a junior seat, though the standard flow never assigns that). */
export function resolveScandalForcedExit(
  cabinet: CabinetAppointment[],
  scandal: Scandal,
  rng: SeededRng
): ScandalForcedExitResult {
  const heldSeats = cabinet.filter((c) => c.politicianId === scandal.politicianId);
  if (heldSeats.length === 0) return { cabinet, removedPoliticianId: null };
  const probability = computeScandalForcedExitProbability(scandal.tier);
  if (rng.next() >= probability) return { cabinet, removedPoliticianId: null };
  const nextCabinet = cabinet.filter((c) => c.politicianId !== scandal.politicianId);
  return { cabinet: nextCabinet, removedPoliticianId: scandal.politicianId };
}

/**
 * NAMED NO-CONFIDENCE MOTIONS — the legislature can vote out a specific
 * sitting minister without touching the head of government, on a simple
 * majority (a much lower bar than the head-of-government impeachment in
 * succession.ts, since removing one minister is a routine political event,
 * not a constitutional crisis). Support tracks the same
 * relationship/integrity/scandal shape as impeachment, just less biased
 * toward acquittal.
 */
export const MINISTER_NO_CONFIDENCE_THRESHOLD = 0.5;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

export function computeMinisterNoConfidenceSupportProbability(
  member: Politician,
  minister: Politician,
  relationships: Record<string, number>,
  scandalSeverity: number
): number {
  const relationshipTerm = -clamp((relationships[relationshipKey(member.id, minister.id)] ?? 0) / 100, -1, 1);
  const integrityTerm = (60 - minister.attributes.integrity) / 60;
  const scandalTerm = scandalSeverity * 2 - 1;
  const score = 1.2 * scandalTerm + 0.7 * integrityTerm + 0.6 * relationshipTerm - 0.6;
  return sigmoid(score);
}

export interface MinisterNoConfidenceResult {
  votesFor: number;
  votesAgainst: number;
  totalCount: number;
  requiredCount: number;
  passed: boolean;
}

export function resolveMinisterNoConfidenceVote(
  minister: Politician,
  politicians: Politician[],
  relationships: Record<string, number>,
  scandals: Scandal[],
  rng: SeededRng,
  threshold: number = MINISTER_NO_CONFIDENCE_THRESHOLD
): MinisterNoConfidenceResult {
  const scandalSeverity = computeUnresolvedScandalSeverity(minister.id, scandals);
  let votesFor = 0;
  for (const member of politicians) {
    if (member.id === minister.id) continue;
    const probability = computeMinisterNoConfidenceSupportProbability(member, minister, relationships, scandalSeverity);
    if (rng.next() < probability) votesFor++;
  }
  const totalCount = politicians.length - 1;
  const requiredCount = Math.ceil(totalCount * threshold);
  const votesAgainst = totalCount - votesFor;
  return { votesFor, votesAgainst, totalCount, requiredCount, passed: votesFor >= requiredCount };
}

/** Removes every cabinet seat the targeted minister holds once a no-confidence motion against them passes; a no-op cabinet on failure. */
export function applyMinisterNoConfidenceResult(
  cabinet: CabinetAppointment[],
  minister: Politician,
  result: MinisterNoConfidenceResult
): CabinetAppointment[] {
  if (!result.passed) return cabinet;
  return cabinet.filter((c) => c.politicianId !== minister.id);
}
