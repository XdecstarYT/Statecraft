import { describe, expect, it } from 'vitest';
import {
  AI_APPROVAL_ADJUSTMENT_BOUND,
  AI_ECONOMY_ADJUSTMENT_BOUND,
  buildAiBillAnalysis,
  clampAiApprovalEffect,
  clampAiEconomyDelta,
} from './aiPolicyAnalysis';

describe('clampAiEconomyDelta', () => {
  it('passes through values already within bounds', () => {
    const result = clampAiEconomyDelta({ gdpGrowth: 0.5, inflation: -0.3, unemployment: 0.1, debtToGdp: -0.2, budgetBalance: 0.4 });
    expect(result).toEqual({ gdpGrowth: 0.5, inflation: -0.3, unemployment: 0.1, debtToGdp: -0.2, budgetBalance: 0.4 });
  });

  it('clamps a wildly large positive value returned by the model', () => {
    const result = clampAiEconomyDelta({ gdpGrowth: 9999 });
    expect(result.gdpGrowth).toBe(AI_ECONOMY_ADJUSTMENT_BOUND);
  });

  it('clamps a wildly large negative value', () => {
    const result = clampAiEconomyDelta({ inflation: -9999 });
    expect(result.inflation).toBe(-AI_ECONOMY_ADJUSTMENT_BOUND);
  });

  it('treats missing/non-numeric fields as zero rather than throwing', () => {
    const result = clampAiEconomyDelta({});
    expect(result).toEqual({ gdpGrowth: 0, inflation: 0, unemployment: 0, debtToGdp: 0, budgetBalance: 0 });
  });

  it('treats NaN/Infinity as zero (defends against a malformed AI response)', () => {
    const result = clampAiEconomyDelta({ gdpGrowth: NaN, inflation: Infinity, unemployment: -Infinity });
    expect(result.gdpGrowth).toBe(0);
    expect(result.inflation).toBe(0);
    expect(result.unemployment).toBe(0);
  });
});

describe('clampAiApprovalEffect', () => {
  it('passes through a value within bounds', () => {
    expect(clampAiApprovalEffect(3)).toBe(3);
  });

  it('clamps an out-of-range value to the bound', () => {
    expect(clampAiApprovalEffect(1000)).toBe(AI_APPROVAL_ADJUSTMENT_BOUND);
    expect(clampAiApprovalEffect(-1000)).toBe(-AI_APPROVAL_ADJUSTMENT_BOUND);
  });

  it('treats a non-finite value as zero', () => {
    expect(clampAiApprovalEffect(NaN)).toBe(0);
  });
});

describe('buildAiBillAnalysis', () => {
  it('builds a record with clamped fields and the given turn', () => {
    const analysis = buildAiBillAnalysis('bill-1', 'A short analysis.', { gdpGrowth: 0.2 }, 2, 10);
    expect(analysis.billId).toBe('bill-1');
    expect(analysis.narrative).toBe('A short analysis.');
    expect(analysis.economyEffect.gdpGrowth).toBe(0.2);
    expect(analysis.playerApprovalEffect).toBe(2);
    expect(analysis.turnRequested).toBe(10);
  });

  it('truncates an excessively long narrative', () => {
    const longText = 'x'.repeat(5000);
    const analysis = buildAiBillAnalysis('bill-1', longText, {}, 0, 1);
    expect(analysis.narrative.length).toBeLessThanOrEqual(600);
  });

  it('falls back to a placeholder narrative when empty', () => {
    const analysis = buildAiBillAnalysis('bill-1', '', {}, 0, 1);
    expect(analysis.narrative).toBe('No analysis available.');
  });

  it('is deterministic given the same raw inputs', () => {
    const a = buildAiBillAnalysis('bill-1', 'Text', { gdpGrowth: 1 }, 3, 5);
    const b = buildAiBillAnalysis('bill-1', 'Text', { gdpGrowth: 1 }, 3, 5);
    expect(a).toEqual(b);
  });
});
