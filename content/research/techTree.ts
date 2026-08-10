import type { TechNode } from '../../engine/models/types';

/**
 * Pre-authored tech tree — four independent three-tier chains, one per
 * category. Each node's one-time economyEffect is a real, felt payoff
 * (occasionally with a genuine tradeoff, like automation trimming jobs even
 * as it lifts output), applied the moment engine/systems/research.ts's
 * unlockTech fires. See engine/index.ts's unlockTechAction.
 */
export const TECH_TREE: TechNode[] = [
  {
    id: 'basic-metallurgy',
    name: 'Basic Metallurgy',
    description: 'Modern smelting and alloying techniques for the national industrial base.',
    category: 'industry',
    cost: 40,
    prerequisites: [],
    economyEffect: { gdpGrowth: 0.1 },
  },
  {
    id: 'industrial-automation',
    name: 'Industrial Automation',
    description: 'Assembly-line automation raises output per worker across the industrial base.',
    category: 'industry',
    cost: 90,
    prerequisites: ['basic-metallurgy'],
    economyEffect: { gdpGrowth: 0.25 },
  },
  {
    id: 'advanced-robotics',
    name: 'Advanced Robotics',
    description: 'Fully robotic production lines — a major output boost, with real short-term job displacement.',
    category: 'industry',
    cost: 160,
    prerequisites: ['industrial-automation'],
    economyEffect: { gdpGrowth: 0.45, unemployment: 0.15 },
  },
  {
    id: 'small-arms-standardization',
    name: 'Small Arms Standardization',
    description: 'A standardized service rifle and ammunition line cuts procurement waste.',
    category: 'military',
    cost: 40,
    prerequisites: [],
    economyEffect: { budgetBalance: 0.08 },
  },
  {
    id: 'combined-arms-doctrine',
    name: 'Combined Arms Doctrine',
    description: 'Integrated infantry, armor, and air doctrine improves force efficiency.',
    category: 'military',
    cost: 90,
    prerequisites: ['small-arms-standardization'],
    economyEffect: { budgetBalance: 0.15 },
  },
  {
    id: 'precision-guided-systems',
    name: 'Precision-Guided Systems',
    description: 'Precision munitions reduce the material cost of maintaining deterrence.',
    category: 'military',
    cost: 160,
    prerequisites: ['combined-arms-doctrine'],
    economyEffect: { budgetBalance: 0.25 },
  },
  {
    id: 'agronomy',
    name: 'Modern Agronomy',
    description: 'Crop science and mechanized farming raise agricultural yields nationwide.',
    category: 'economy',
    cost: 40,
    prerequisites: [],
    economyEffect: { gdpGrowth: 0.1, unemployment: -0.1 },
  },
  {
    id: 'industrial-supply-chains',
    name: 'Industrial Supply Chains',
    description: 'Modern logistics networks cut waste across production and distribution.',
    category: 'economy',
    cost: 90,
    prerequisites: ['agronomy'],
    economyEffect: { gdpGrowth: 0.2, unemployment: -0.15 },
  },
  {
    id: 'data-driven-markets',
    name: 'Data-Driven Markets',
    description: 'Real-time market data sharpens pricing and investment nationwide.',
    category: 'economy',
    cost: 160,
    prerequisites: ['industrial-supply-chains'],
    economyEffect: { gdpGrowth: 0.35, inflation: -0.1 },
  },
  {
    id: 'civil-service-reform',
    name: 'Civil Service Reform',
    description: 'A professionalized, merit-based civil service trims administrative waste.',
    category: 'governance',
    cost: 40,
    prerequisites: [],
    economyEffect: { budgetBalance: 0.15 },
  },
  {
    id: 'digital-governance',
    name: 'Digital Governance',
    description: 'Digitized public services cut overhead and processing delays.',
    category: 'governance',
    cost: 90,
    prerequisites: ['civil-service-reform'],
    economyEffect: { budgetBalance: 0.25 },
  },
  {
    id: 'open-data-transparency',
    name: 'Open Data & Transparency',
    description: 'Public data mandates curb waste and quietly discourage petty graft.',
    category: 'governance',
    cost: 160,
    prerequisites: ['digital-governance'],
    economyEffect: { budgetBalance: 0.4 },
  },
];
