import { SeededRng } from '../../engine/rng';
import type { BillCategory, BillProvision } from '../../engine/models/types';

/**
 * Pre-authored bill templates the player (or an NPC sponsor) can draft
 * from. Assembled by code from static data — no live text generation.
 */
export interface BillTemplate {
  title: string;
  category: BillCategory;
  provisions: BillProvision[];
}

export const CURATED_TEMPLATES: BillTemplate[] = [
  {
    title: 'Public Infrastructure Investment Act',
    category: 'infrastructure',
    provisions: [
      { id: 'p1', description: 'Fund regional rail expansion', budgetImpact: -4200 },
      { id: 'p2', description: 'Grants for municipal road repair', budgetImpact: -1800 },
    ],
  },
  {
    title: 'Small Business Tax Relief Act',
    category: 'economic',
    provisions: [
      { id: 'p1', description: 'Cut small-business tax rate by 3 points', budgetImpact: -2600 },
      { id: 'p2', description: 'Simplify quarterly filing requirements', budgetImpact: -200 },
    ],
  },
  {
    title: 'National Healthcare Access Act',
    category: 'healthcare',
    provisions: [
      { id: 'p1', description: 'Expand subsidized clinic coverage', budgetImpact: -5100 },
      { id: 'p2', description: 'Cap out-of-pocket prescription costs', budgetImpact: -900 },
    ],
  },
  {
    title: 'Fiscal Responsibility Act',
    category: 'economic',
    provisions: [
      { id: 'p1', description: 'Freeze discretionary spending growth', budgetImpact: 1500 },
      { id: 'p2', description: 'Close a corporate tax loophole', budgetImpact: 800 },
    ],
  },
  {
    title: 'Border Security Modernization Act',
    category: 'justice_safety',
    provisions: [
      { id: 'p1', description: 'Fund new port-of-entry scanning equipment', budgetImpact: -1300 },
      { id: 'p2', description: 'Hire additional customs officers', budgetImpact: -700 },
    ],
  },
  {
    title: 'Renewable Energy Transition Act',
    category: 'environment',
    provisions: [
      { id: 'p1', description: 'Subsidize utility-scale solar and wind', budgetImpact: -3300 },
      { id: 'p2', description: 'Phase out coal plant tax credits', budgetImpact: 600 },
    ],
  },
  {
    title: 'Affordable Housing Expansion Act',
    category: 'welfare',
    provisions: [
      { id: 'p1', description: 'Fund new public housing construction', budgetImpact: -3800 },
      { id: 'p2', description: 'Cap annual rent increases in high-demand areas', budgetImpact: -100 },
    ],
  },
  {
    title: 'Higher Education Investment Act',
    category: 'education',
    provisions: [
      { id: 'p1', description: 'Expand need-based university grants', budgetImpact: -2900 },
      { id: 'p2', description: 'Forgive a portion of vocational-training loans', budgetImpact: -1100 },
    ],
  },
  {
    title: 'Pension Solvency Reform Act',
    category: 'welfare',
    provisions: [
      { id: 'p1', description: 'Gradually raise the retirement age', budgetImpact: 2200 },
      { id: 'p2', description: 'Index pension contributions to wage growth', budgetImpact: 400 },
    ],
  },
  {
    title: 'Digital Privacy Protection Act',
    category: 'justice_safety',
    provisions: [
      { id: 'p1', description: 'Mandate data-breach disclosure within 72 hours', budgetImpact: -150 },
      { id: 'p2', description: 'Fund a new data-protection regulator', budgetImpact: -600 },
    ],
  },
  {
    title: 'Agricultural Resilience Act',
    category: 'economic',
    provisions: [
      { id: 'p1', description: 'Subsidize drought-resistant crop research', budgetImpact: -1400 },
      { id: 'p2', description: 'Extend low-interest loans to small farms', budgetImpact: -900 },
    ],
  },
  {
    title: 'Judicial Efficiency Act',
    category: 'justice_safety',
    provisions: [
      { id: 'p1', description: 'Fund additional trial-court judgeships', budgetImpact: -1200 },
      { id: 'p2', description: 'Digitize court filing statewide', budgetImpact: -500 },
    ],
  },
  {
    title: 'Minimum Wage Adjustment Act',
    category: 'welfare',
    provisions: [
      { id: 'p1', description: 'Raise the national minimum wage', budgetImpact: -300 },
      { id: 'p2', description: 'Phase in the increase over three years', budgetImpact: 0 },
    ],
  },
  {
    title: 'National Defense Readiness Act',
    category: 'defense',
    provisions: [
      { id: 'p1', description: 'Modernize aging military equipment', budgetImpact: -4700 },
      { id: 'p2', description: 'Increase reservist training funding', budgetImpact: -800 },
    ],
  },
  {
    title: 'Consumer Protection Reform Act',
    category: 'justice_safety',
    provisions: [
      { id: 'p1', description: 'Ban hidden fees in consumer contracts', budgetImpact: -150 },
      { id: 'p2', description: 'Fund a new consumer complaints bureau', budgetImpact: -500 },
    ],
  },
  {
    title: 'Immigration Modernization Act',
    category: 'economic',
    provisions: [
      { id: 'p1', description: 'Clear the visa-processing backlog', budgetImpact: -1600 },
      { id: 'p2', description: 'Expand skilled-worker visa quotas', budgetImpact: 200 },
    ],
  },
  {
    title: 'Technology Sector Growth Act',
    category: 'research_technology',
    provisions: [
      { id: 'p1', description: 'Offer tax credits for startup R&D', budgetImpact: -2100 },
      { id: 'p2', description: 'Fund public broadband expansion', budgetImpact: -1900 },
    ],
  },
  {
    title: 'Clean Water Infrastructure Act',
    category: 'infrastructure',
    provisions: [
      { id: 'p1', description: 'Replace aging lead pipe networks', budgetImpact: -3600 },
      { id: 'p2', description: 'Tighten industrial discharge standards', budgetImpact: -200 },
    ],
  },
];

/**
 * Combinatorial generation of a large, varied bill pool from small
 * pre-authored phrase pools — static content assembled once at module load
 * via a fixed formula (no SeededRng, no runtime randomness, no live text
 * generation), per CLAUDE.md's "pre-authored content assembled by code"
 * guidance. 25 domains x 20 title suffixes = 500 generated templates.
 */
const DOMAINS = [
  'Infrastructure',
  'Healthcare',
  'Education',
  'Defense',
  'Agriculture',
  'Technology',
  'Housing',
  'Environment',
  'Justice',
  'Immigration',
  'Labor',
  'Trade',
  'Energy',
  'Public Safety',
  'Transportation',
  'Arts & Culture',
  'Veterans Affairs',
  'Consumer Protection',
  'Telecommunications',
  'Water Resources',
  'Urban Development',
  'Rural Development',
  'Social Security',
  'Banking & Finance',
  'Space & Aerospace',
];

/**
 * Which real system each generated domain's bills actually nudge when
 * passed — see engine/index.ts's applyBillCategoryEffect. Domains with no
 * obviously-matching system (Agriculture, Trade, Banking & Finance, Arts &
 * Culture, Immigration — see the comment on computeMigrationRate for why
 * immigration isn't hooked to a sticky stat) fall back to 'economic', so
 * they still move the budget/growth like every bill does, just nothing
 * more specific.
 */
const DOMAIN_CATEGORY: Record<string, BillCategory> = {
  Infrastructure: 'infrastructure',
  Healthcare: 'healthcare',
  Education: 'education',
  Defense: 'defense',
  Agriculture: 'economic',
  Technology: 'research_technology',
  Housing: 'welfare',
  Environment: 'environment',
  Justice: 'justice_safety',
  Immigration: 'economic',
  Labor: 'welfare',
  Trade: 'economic',
  Energy: 'environment',
  'Public Safety': 'justice_safety',
  Transportation: 'infrastructure',
  'Arts & Culture': 'economic',
  'Veterans Affairs': 'defense',
  'Consumer Protection': 'justice_safety',
  Telecommunications: 'infrastructure',
  'Water Resources': 'infrastructure',
  'Urban Development': 'infrastructure',
  'Rural Development': 'welfare',
  'Social Security': 'welfare',
  'Banking & Finance': 'economic',
  'Space & Aerospace': 'research_technology',
};

const TITLE_SUFFIXES = [
  'Modernization Act',
  'Investment Act',
  'Reform Act',
  'Improvement Act',
  'Advancement Act',
  'Protection Act',
  'Access Act',
  'Expansion Act',
  'Resilience Act',
  'Accountability Act',
  'Innovation Act',
  'Security Act',
  'Fairness Act',
  'Sustainability Act',
  'Empowerment Act',
  'Efficiency Act',
  'Transparency Act',
  'Revitalization Act',
  'Opportunity Act',
  'Stewardship Act',
];

const SPEND_PROVISIONS = [
  'Fund a major expansion of {domain} programs',
  'Provide new grants to strengthen {domain}',
  'Hire additional staff to support {domain}',
  'Launch a national initiative to modernize {domain}',
  'Subsidize local projects tied to {domain}',
];

const SAVE_PROVISIONS = [
  'Streamline {domain} administrative overhead',
  'Close a loophole affecting {domain} spending',
  'Consolidate overlapping {domain} agencies',
  'Tighten eligibility rules for {domain} programs',
  'Cut redundant {domain} contracts',
];

function generateDomainTemplates(): BillTemplate[] {
  const templates: BillTemplate[] = [];
  DOMAINS.forEach((domain, domainIndex) => {
    const domainLower = domain.toLowerCase();
    const category = DOMAIN_CATEGORY[domain] ?? 'economic';
    TITLE_SUFFIXES.forEach((suffix, suffixIndex) => {
      const spendPhrase = SPEND_PROVISIONS[(domainIndex + suffixIndex) % SPEND_PROVISIONS.length];
      const savePhrase = SAVE_PROVISIONS[(domainIndex + suffixIndex * 2) % SAVE_PROVISIONS.length];
      const spendImpact = -(800 + ((suffixIndex * 137 + domainIndex * 53) % 4000));
      const saveImpact = 100 + ((suffixIndex * 97 + domainIndex * 31) % 900);
      templates.push({
        title: `${domain} ${suffix}`,
        category,
        provisions: [
          {
            id: `gen-${domainIndex}-${suffixIndex}-p1`,
            description: spendPhrase.replace('{domain}', domainLower),
            budgetImpact: spendImpact,
          },
          {
            id: `gen-${domainIndex}-${suffixIndex}-p2`,
            description: savePhrase.replace('{domain}', domainLower),
            budgetImpact: saveImpact,
          },
        ],
      });
    });
  });
  return templates;
}

export const BILL_TEMPLATES: BillTemplate[] = [...CURATED_TEMPLATES, ...generateDomainTemplates()];

export function pickBillTemplate(rng: SeededRng): BillTemplate {
  return rng.pick(BILL_TEMPLATES);
}
