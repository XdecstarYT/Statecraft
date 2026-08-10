import type { EconomyDelta, TreatyType } from '../../engine/models/types';

export interface TreatyTemplate {
  type: TreatyType;
  title: string;
  economyEffect: EconomyDelta;
  relationEffect: number;
}

export const TREATY_TEMPLATES: TreatyTemplate[] = [
  {
    type: 'trade',
    title: 'Bilateral Trade Accord',
    economyEffect: { gdpGrowth: 0.4, budgetBalance: 0.1 },
    relationEffect: 15,
  },
  {
    type: 'defense',
    title: 'Mutual Defense Pact',
    economyEffect: { budgetBalance: -0.3 },
    relationEffect: 25,
  },
  {
    type: 'nonaggression',
    title: 'Non-Aggression Treaty',
    economyEffect: {},
    relationEffect: 10,
  },
  {
    type: 'aid',
    title: 'Development Aid Agreement',
    economyEffect: { budgetBalance: -0.5, gdpGrowth: 0.1 },
    relationEffect: 20,
  },
];
