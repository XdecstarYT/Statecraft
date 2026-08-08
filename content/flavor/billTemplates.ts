import { SeededRng } from '../../engine/rng';
import type { BillProvision } from '../../engine/models/types';

/**
 * Pre-authored bill templates the player (or an NPC sponsor) can draft
 * from. Assembled by code from static data — no live text generation.
 */
export interface BillTemplate {
  title: string;
  provisions: BillProvision[];
}

const TEMPLATES: BillTemplate[] = [
  {
    title: 'Public Infrastructure Investment Act',
    provisions: [
      { id: 'p1', description: 'Fund regional rail expansion', budgetImpact: -4200 },
      { id: 'p2', description: 'Grants for municipal road repair', budgetImpact: -1800 },
    ],
  },
  {
    title: 'Small Business Tax Relief Act',
    provisions: [
      { id: 'p1', description: 'Cut small-business tax rate by 3 points', budgetImpact: -2600 },
      { id: 'p2', description: 'Simplify quarterly filing requirements', budgetImpact: -200 },
    ],
  },
  {
    title: 'National Healthcare Access Act',
    provisions: [
      { id: 'p1', description: 'Expand subsidized clinic coverage', budgetImpact: -5100 },
      { id: 'p2', description: 'Cap out-of-pocket prescription costs', budgetImpact: -900 },
    ],
  },
  {
    title: 'Fiscal Responsibility Act',
    provisions: [
      { id: 'p1', description: 'Freeze discretionary spending growth', budgetImpact: 1500 },
      { id: 'p2', description: 'Close a corporate tax loophole', budgetImpact: 800 },
    ],
  },
  {
    title: 'Border Security Modernization Act',
    provisions: [
      { id: 'p1', description: 'Fund new port-of-entry scanning equipment', budgetImpact: -1300 },
      { id: 'p2', description: 'Hire additional customs officers', budgetImpact: -700 },
    ],
  },
  {
    title: 'Renewable Energy Transition Act',
    provisions: [
      { id: 'p1', description: 'Subsidize utility-scale solar and wind', budgetImpact: -3300 },
      { id: 'p2', description: 'Phase out coal plant tax credits', budgetImpact: 600 },
    ],
  },
];

export function pickBillTemplate(rng: SeededRng): BillTemplate {
  return rng.pick(TEMPLATES);
}
