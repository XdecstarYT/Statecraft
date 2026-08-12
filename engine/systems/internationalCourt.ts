import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import { SANCTIONS_ECONOMY_EFFECT } from './diplomacy';
import type { EconomyDelta, SanctionsRegime, TribunalCase, TribunalChargeType } from '../models/types';

/**
 * INTERNATIONAL COURTS & SANCTIONS — a multilateral body distinct from
 * diplomacy.ts's bilateral imposeSanctions: a tribunal can indict a
 * foreign leader (or, rarely, the player's own government) for war crimes,
 * corruption, or crimes against humanity, and a conviction triggers real,
 * scaled multilateral sanctions rather than one country's own unilateral
 * penalty.
 */

export const PLAYER_TRIBUNAL_TARGET_ID = 'player';
export const TRIBUNAL_RESOLUTION_DELAY_TURNS = 6;

export function fileTribunalCase(targetId: string, chargeType: TribunalChargeType, turn: number, id: string): TribunalCase {
  return { id, targetId, chargeType, turnFiled: turn, status: 'investigating' };
}

const CHARGE_BASE_CONVICTION: Record<TribunalChargeType, number> = {
  war_crimes: 0.5,
  corruption: 0.4,
  crimes_against_humanity: 0.55,
};

/**
 * Conviction likelihood rises with how strong the underlying evidence is
 * (0..1 — a war fought at a heavy advantage swing, a stack of unresolved
 * hard-tier scandals, whatever the caller judges relevant) and falls with
 * the target's own diplomatic standing (well-connected governments are
 * harder to convict than isolated ones).
 */
export function computeConvictionProbability(chargeType: TribunalChargeType, evidenceStrength: number, standing: number): number {
  const base = CHARGE_BASE_CONVICTION[chargeType];
  const evidenceTerm = clamp(evidenceStrength, 0, 1) * 0.4;
  const standingTerm = clamp(standing, -100, 100) / 100 * 0.25;
  return clamp(base + evidenceTerm - standingTerm, 0.05, 0.95);
}

export interface TribunalResolution {
  case: TribunalCase;
  convicted: boolean;
}

export function resolveTribunalCase(
  tribunalCase: TribunalCase,
  evidenceStrength: number,
  standing: number,
  turn: number,
  rng: SeededRng
): TribunalResolution {
  const probability = computeConvictionProbability(tribunalCase.chargeType, evidenceStrength, standing);
  const convicted = rng.next() < probability;
  return {
    case: { ...tribunalCase, status: convicted ? 'convicted' : 'acquitted', turnResolved: turn },
    convicted,
  };
}

export function imposeMultilateralSanctions(targetId: string, severity: number, turn: number, id: string): SanctionsRegime {
  return { id, targetId, turnImposed: turn, status: 'active', severity: clamp(Math.round(severity), 1, 3) };
}

export function liftSanctions(regime: SanctionsRegime): SanctionsRegime {
  return { ...regime, status: 'lifted' };
}

/** Scales diplomacy.ts's own bilateral sanctions economy effect by the regime's severity — a multilateral regime hits harder than any one country's unilateral penalty. */
export function computeSanctionsEconomyEffect(regime: SanctionsRegime): EconomyDelta {
  if (regime.status !== 'active') return {};
  return {
    gdpGrowth: SANCTIONS_ECONOMY_EFFECT.gdpGrowth * regime.severity,
    budgetBalance: SANCTIONS_ECONOMY_EFFECT.budgetBalance * regime.severity,
  };
}

const WORLD_SCRUTINY_BASE_CHANCE = 0.03;

/**
 * A small per-turn chance the world community opens a tribunal case
 * against the player's own government — driven by real signal (unresolved
 * hard-tier scandals, wars fought at extreme advantage swings), never
 * arbitrary. Most turns, for most players, this stays at 0.
 */
export function rollWorldTribunalScrutiny(hardScandalCount: number, extremeWarCount: number, rng: SeededRng): boolean {
  if (hardScandalCount === 0 && extremeWarCount === 0) return false;
  const chance = clamp(WORLD_SCRUTINY_BASE_CHANCE + hardScandalCount * 0.02 + extremeWarCount * 0.04, 0, 0.4);
  return rng.next() < chance;
}
