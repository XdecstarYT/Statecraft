import type { Difficulty, EconomyState } from '../../engine';

/**
 * Historical-flavor starting scenarios — each overrides just the starting
 * economy indicators and suggested difficulty on top of whichever country
 * the player picks. Pre-authored, no runtime generation.
 */
export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  economyOverrides: Partial<EconomyState>;
}

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'standard',
    name: 'Standard Start',
    description: 'A healthy, unremarkable economy — the default starting point.',
    difficulty: 'standard',
    economyOverrides: {},
  },
  {
    id: 'recession',
    name: 'Recession Era',
    description: 'Take office in the teeth of a downturn: negative growth, high unemployment, a battered budget.',
    difficulty: 'hard',
    economyOverrides: { gdpGrowth: -1.8, unemployment: 11.5, inflation: 6.5, debtToGdp: 78, budgetBalance: -6.5 },
  },
  {
    id: 'boom',
    name: 'Boom Years',
    description: 'A roaring economy — low unemployment, strong growth, and an actual budget surplus.',
    difficulty: 'easy',
    economyOverrides: { gdpGrowth: 5.2, unemployment: 3.1, inflation: 2.0, debtToGdp: 35, budgetBalance: 1.5 },
  },
  {
    id: 'stagflation',
    name: 'Stagflation Crisis',
    description: 'Slow growth and runaway inflation at once — the classic 1970s-style bind, with nowhere easy to turn.',
    difficulty: 'hard',
    economyOverrides: { gdpGrowth: 0.4, unemployment: 8.0, inflation: 12.0, debtToGdp: 65, budgetBalance: -4.0 },
  },
  {
    id: 'reconstruction',
    name: 'Post-Crisis Reconstruction',
    description: 'Rebuilding after a national crisis — heavy debt and high unemployment, but a public desperate for stability.',
    difficulty: 'hard',
    economyOverrides: { gdpGrowth: 1.0, unemployment: 14.0, inflation: 9.0, debtToGdp: 95, budgetBalance: -8.0 },
  },
];
