import type { SeededRng } from '../rng';
import { clamp } from '../ideology';
import type { Politician } from '../models/types';

/**
 * Campaign actions give the previously-decorative charisma/mediaSavvy/
 * network attributes real mechanical weight. Every action carries genuine
 * risk — a gaffe is always possible, a clean win never guaranteed — per
 * CLAUDE.md's "let the player fail" spirit.
 */

export type CampaignOutcomeTier = 'strong' | 'solid' | 'gaffe';

export interface CampaignActionOutcome {
  outcome: CampaignOutcomeTier;
  approvalImpact: number;
}

interface CampaignActionConfig {
  strongImpact: number;
  solidImpact: number;
  gaffeImpact: number;
}

/**
 * skill 0..1 -> a strong/solid/gaffe roll. Skill shifts the odds but never
 * eliminates the tails: strong tops out at 50%, gaffe never drops below 5%.
 */
function rollCampaignOutcome(
  skill: number,
  config: CampaignActionConfig,
  rng: SeededRng
): CampaignActionOutcome {
  const s = clamp(skill, 0, 1);
  const pStrong = 0.15 + s * 0.35;
  const pGaffe = 0.35 - s * 0.3;
  const roll = rng.next();

  if (roll < pStrong) return { outcome: 'strong', approvalImpact: config.strongImpact };
  if (roll < 1 - pGaffe) return { outcome: 'solid', approvalImpact: config.solidImpact };
  return { outcome: 'gaffe', approvalImpact: config.gaffeImpact };
}

export function computeMediaSkill(politician: Politician): number {
  return (politician.attributes.charisma + politician.attributes.mediaSavvy) / 20;
}

export function computeRallySkill(politician: Politician): number {
  return (politician.attributes.charisma + politician.attributes.network) / 20;
}

const PRESS_INTERVIEW_CONFIG: CampaignActionConfig = { strongImpact: 12, solidImpact: 4, gaffeImpact: -10 };
const RALLY_CONFIG: CampaignActionConfig = { strongImpact: 10, solidImpact: 3, gaffeImpact: -8 };

/** A press interview: charisma + media savvy driven, moves public approval. */
export function attemptPressInterview(politician: Politician, rng: SeededRng): CampaignActionOutcome {
  return rollCampaignOutcome(computeMediaSkill(politician), PRESS_INTERVIEW_CONFIG, rng);
}

/** A rally: charisma + network driven, moves the party base's approval. */
export function attemptRally(politician: Politician, rng: SeededRng): CampaignActionOutcome {
  return rollCampaignOutcome(computeRallySkill(politician), RALLY_CONFIG, rng);
}
