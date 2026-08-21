import { clamp } from '../ideology';
import type { AiBillAnalysis, EconomyDelta } from '../models/types';

/**
 * AI POLICY ANALYSIS — pure, deterministic-given-its-input logic for
 * turning a (network-sourced, therefore untrusted and non-reproducible)
 * AI response into a safe, bounded GameState effect. The actual network
 * call lives entirely in the UI layer (ui/ai/policyAdvisor.ts) and the
 * Netlify function that proxies it — this module never touches a
 * network, never touches Math.random(), and is fully unit-testable like
 * every other system in /engine. See types.ts's AiBillAnalysis for why
 * this is a deliberate, narrow exception to the no-runtime-LLM rule
 * rather than a violation of it: nothing here is reproducible from the
 * seed, but everything here is bounded, additive, and optional.
 */

/** No single AI-suggested economic nudge can move any indicator by more than this, regardless of what the model returns. */
export const AI_ECONOMY_ADJUSTMENT_BOUND = 1.5;
/** No single AI-suggested approval nudge can exceed this. */
export const AI_APPROVAL_ADJUSTMENT_BOUND = 5;
/** How long the AI's economic nudge takes to land — same lag-queue mechanism (queuePolicyEffect) every other policy effect uses. */
export const AI_ANALYSIS_ECONOMY_DELAY_TURNS = 2;
/** Hard cap on how much narrative text gets stored/rendered, regardless of what the model returns. */
const NARRATIVE_MAX_LENGTH = 600;

function clampBounded(value: number | undefined, bound: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return clamp(value, -bound, bound);
}

export function clampAiEconomyDelta(delta: EconomyDelta): EconomyDelta {
  return {
    gdpGrowth: clampBounded(delta.gdpGrowth, AI_ECONOMY_ADJUSTMENT_BOUND),
    inflation: clampBounded(delta.inflation, AI_ECONOMY_ADJUSTMENT_BOUND),
    unemployment: clampBounded(delta.unemployment, AI_ECONOMY_ADJUSTMENT_BOUND),
    debtToGdp: clampBounded(delta.debtToGdp, AI_ECONOMY_ADJUSTMENT_BOUND),
    budgetBalance: clampBounded(delta.budgetBalance, AI_ECONOMY_ADJUSTMENT_BOUND),
  };
}

export function clampAiApprovalEffect(value: number): number {
  return clampBounded(value, AI_APPROVAL_ADJUSTMENT_BOUND);
}

/** Builds the stored analysis record from raw (untrusted) inputs — every numeric field clamped, narrative truncated. */
export function buildAiBillAnalysis(
  billId: string,
  narrative: string,
  rawEconomyEffect: EconomyDelta,
  rawPlayerApprovalEffect: number,
  turn: number
): AiBillAnalysis {
  return {
    billId,
    narrative: (narrative || 'No analysis available.').slice(0, NARRATIVE_MAX_LENGTH),
    economyEffect: clampAiEconomyDelta(rawEconomyEffect),
    playerApprovalEffect: clampAiApprovalEffect(rawPlayerApprovalEffect),
    turnRequested: turn,
  };
}
