import type { LegacyBreakdown } from './legacy';
import type { GameState } from '../models/types';

/**
 * ACHIEVEMENTS — a mix of derived checks (computed fresh from the current
 * legacy breakdown every time, no separate tracking needed) and milestone
 * flags (one-time events — founding a party, surviving a coalition vote,
 * etc. — recorded onto GameState.milestones the moment they happen, since
 * they can't be reconstructed from a single snapshot of current state).
 */

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  { id: 'first_law', name: 'First Law', description: 'Pass your first bill into law.' },
  { id: 'ten_laws', name: 'Prolific Legislator', description: 'Pass ten bills into law.' },
  { id: 'clean_hands', name: 'Clean Hands', description: 'Serve at least two full terms with zero scandals of any kind.' },
  { id: 'diplomat', name: 'Master Diplomat', description: 'Maintain an average foreign relations score above 50.' },
  { id: 'debt_slayer', name: 'Debt Slayer', description: 'Cut debt-to-GDP by at least 15 points from the starting baseline.' },
  { id: 'party_founder', name: 'Party Founder', description: 'Break away and found your own political party.' },
  { id: 'coalition_survivor', name: 'Coalition Survivor', description: 'Lead a multi-party coalition that survives its confidence vote.' },
  { id: 'landslide', name: 'Landslide', description: 'Govern with an outright single-party majority.' },
  { id: 'unifier', name: 'Unifier', description: 'Suppress a secessionist movement without losing the territory.' },
];

const MILESTONE_IDS = new Set([
  'party_founder',
  'coalition_survivor',
  'landslide',
  'unifier',
]);

export function isMilestoneAchievement(id: string): boolean {
  return MILESTONE_IDS.has(id);
}

/** Every achievement id currently unlocked — derived checks plus recorded milestones, deduplicated. */
export function computeUnlockedAchievements(state: GameState, breakdown: LegacyBreakdown): string[] {
  const unlocked = new Set(state.milestones);

  if (breakdown.billsPassed >= 1) unlocked.add('first_law');
  if (breakdown.billsPassed >= 10) unlocked.add('ten_laws');
  if (breakdown.yearsInPower >= 8 && breakdown.scandalRecord.total === 0) unlocked.add('clean_hands');
  if (breakdown.averageForeignRelations > 50) unlocked.add('diplomat');
  if (breakdown.economyDelta.debtToGdp >= 15) unlocked.add('debt_slayer');

  return Array.from(unlocked);
}
