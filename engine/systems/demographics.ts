import { clamp } from '../ideology';
import type { DemographicsState, EconomyDelta, EconomyState, ImmigrationPolicyLevel, VoterBloc } from '../models/types';

/**
 * IMMIGRATION & DEMOGRAPHICS — population is a real, moving number: natural
 * growth (births minus deaths, roughly fixed) plus net migration, which is
 * driven by how attractive the current economy looks and gated by the
 * player's own openness policy. Feeds back into the economy (a growing or
 * shrinking labor force nudges growth/unemployment) and into opinion (rapid
 * demographic change leaves more of the electorate genuinely up for grabs,
 * regardless of which direction that change runs).
 */

const POLICY_MULTIPLIER: Record<ImmigrationPolicyLevel, number> = {
  closed: 0,
  restricted: 0.4,
  open: 1.0,
};

const UNEMPLOYMENT_BASELINE = 8;
const MAX_MIGRATION_RATE_PER_TURN = 0.5;

/** -1 (repels migrants) .. 1 (draws them in) — driven by growth and how unemployment compares to a baseline. */
export function computeEconomicAttractiveness(economy: EconomyState): number {
  const growthTerm = clamp(economy.gdpGrowth / 5, -1, 1);
  const unemploymentTerm = clamp((UNEMPLOYMENT_BASELINE - economy.unemployment) / UNEMPLOYMENT_BASELINE, -1, 1);
  return clamp((growthTerm + unemploymentTerm) / 2, -1, 1);
}

/** Percent of population per turn, net — negative means net emigration. A 'closed' policy always yields zero, regardless of how attractive the economy is. */
export function computeMigrationRate(economy: EconomyState, policy: ImmigrationPolicyLevel): number {
  const attractiveness = computeEconomicAttractiveness(economy);
  return attractiveness * MAX_MIGRATION_RATE_PER_TURN * POLICY_MULTIPLIER[policy];
}

export function setImmigrationPolicy(demographics: DemographicsState, policy: ImmigrationPolicyLevel): DemographicsState {
  return { ...demographics, policy };
}

/** Advances population one turn by natural growth plus freshly-computed net migration. */
export function advanceDemographicsTurn(demographics: DemographicsState, economy: EconomyState): DemographicsState {
  const netMigrationRate = computeMigrationRate(economy, demographics.policy);
  const totalGrowthRate = demographics.naturalGrowthRate + netMigrationRate;
  const population = Math.max(0, demographics.population * (1 + totalGrowthRate / 100));
  return { ...demographics, population, netMigrationRate };
}

const LABOR_GDP_SCALE = 0.05;
const LABOR_UNEMPLOYMENT_SCALE = 0.03;
const MAX_LABOR_EFFECT = 0.5;

/** A growing labor force is a modest, real tailwind for growth (more workers and consumers) with a little short-term unemployment friction absorbing them; a shrinking one runs the reverse. */
export function computeLaborForceEffect(netMigrationRate: number): EconomyDelta {
  return {
    gdpGrowth: clamp(netMigrationRate * LABOR_GDP_SCALE, -MAX_LABOR_EFFECT, MAX_LABOR_EFFECT),
    unemployment: clamp(netMigrationRate * LABOR_UNEMPLOYMENT_SCALE, -MAX_LABOR_EFFECT, MAX_LABOR_EFFECT),
  };
}

const PERSUADABILITY_SHIFT_SCALE = 0.01;
const MAX_PERSUADABILITY_SHIFT = 0.05;

/** Rapid demographic change (in either direction) leaves more of the electorate genuinely undecided — a neutral, magnitude-only effect, not a claim about which side benefits. */
export function applyDemographicChangeToBlocs(blocs: VoterBloc[], netMigrationRate: number): VoterBloc[] {
  const shift = clamp(Math.abs(netMigrationRate) * PERSUADABILITY_SHIFT_SCALE, 0, MAX_PERSUADABILITY_SHIFT);
  if (shift === 0) return blocs;
  return blocs.map((b) => ({ ...b, persuadability: clamp(b.persuadability + shift, 0, 1) }));
}
