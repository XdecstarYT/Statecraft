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

export const BILL_TEMPLATES: BillTemplate[] = [
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
  {
    title: 'Affordable Housing Expansion Act',
    provisions: [
      { id: 'p1', description: 'Fund new public housing construction', budgetImpact: -3800 },
      { id: 'p2', description: 'Cap annual rent increases in high-demand areas', budgetImpact: -100 },
    ],
  },
  {
    title: 'Higher Education Investment Act',
    provisions: [
      { id: 'p1', description: 'Expand need-based university grants', budgetImpact: -2900 },
      { id: 'p2', description: 'Forgive a portion of vocational-training loans', budgetImpact: -1100 },
    ],
  },
  {
    title: 'Pension Solvency Reform Act',
    provisions: [
      { id: 'p1', description: 'Gradually raise the retirement age', budgetImpact: 2200 },
      { id: 'p2', description: 'Index pension contributions to wage growth', budgetImpact: 400 },
    ],
  },
  {
    title: 'Digital Privacy Protection Act',
    provisions: [
      { id: 'p1', description: 'Mandate data-breach disclosure within 72 hours', budgetImpact: -150 },
      { id: 'p2', description: 'Fund a new data-protection regulator', budgetImpact: -600 },
    ],
  },
  {
    title: 'Agricultural Resilience Act',
    provisions: [
      { id: 'p1', description: 'Subsidize drought-resistant crop research', budgetImpact: -1400 },
      { id: 'p2', description: 'Extend low-interest loans to small farms', budgetImpact: -900 },
    ],
  },
  {
    title: 'Judicial Efficiency Act',
    provisions: [
      { id: 'p1', description: 'Fund additional trial-court judgeships', budgetImpact: -1200 },
      { id: 'p2', description: 'Digitize court filing statewide', budgetImpact: -500 },
    ],
  },
];

export function pickBillTemplate(rng: SeededRng): BillTemplate {
  return rng.pick(BILL_TEMPLATES);
}
