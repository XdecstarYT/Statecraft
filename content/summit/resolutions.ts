import type { SummitResolutionTemplate } from '../../engine/models/types';

/**
 * Pre-authored summit resolution templates — picked deterministically by
 * the seeded RNG in engine/systems/summit.ts, never generated at runtime.
 */
export const SUMMIT_RESOLUTION_TEMPLATES: SummitResolutionTemplate[] = [
  {
    type: 'trade_pact',
    title: 'Multilateral Tariff Reduction Pact',
    description: 'A broad accord to lower tariffs among signatory nations.',
    stance: { economic: 60, social: 0 },
    economyEffect: { gdpGrowth: 0.25 },
  },
  {
    type: 'human_rights',
    title: 'Universal Civil Liberties Declaration',
    description: 'A joint declaration affirming a baseline of civil liberties protections.',
    stance: { economic: 0, social: -60 },
    economyEffect: {},
  },
  {
    type: 'climate_accord',
    title: 'Global Emissions Reduction Accord',
    description: 'A coordinated commitment to cut carbon emissions over the next decade.',
    stance: { economic: -30, social: -40 },
    economyEffect: { gdpGrowth: -0.1, budgetBalance: -0.1 },
  },
  {
    type: 'sanctions_regime',
    title: 'Coordinated Sanctions Framework',
    description: 'A framework for imposing unified economic sanctions against destabilizing regimes.',
    stance: { economic: 20, social: 30 },
    economyEffect: { gdpGrowth: -0.1 },
  },
];
