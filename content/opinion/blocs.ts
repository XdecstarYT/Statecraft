import type { VoterBloc } from '../../engine/models/types';

/**
 * Starter voter blocs for the Republic of Kastoria. Sizes sum to 1.0 —
 * this is the whole electorate, segmented rather than treated as one
 * approval number. See engine/systems/opinion.ts.
 */
export const STARTER_VOTER_BLOCS: VoterBloc[] = [
  {
    id: 'urban-progressives',
    name: 'Urban Progressives',
    size: 0.18,
    ideology: { economic: -50, social: -60 },
    persuadability: 0.6,
    issueSalience: [
      { issue: 'Healthcare', weight: 0.4 },
      { issue: 'Climate', weight: 0.35 },
      { issue: 'Education', weight: 0.25 },
    ],
  },
  {
    id: 'rural-traditionalists',
    name: 'Rural Traditionalists',
    size: 0.2,
    ideology: { economic: 30, social: 75 },
    persuadability: 0.4,
    issueSalience: [
      { issue: 'Security', weight: 0.4 },
      { issue: 'Tradition', weight: 0.35 },
      { issue: 'Agriculture', weight: 0.25 },
    ],
  },
  {
    id: 'suburban-moderates',
    name: 'Suburban Moderates',
    size: 0.22,
    ideology: { economic: 15, social: -5 },
    persuadability: 0.8,
    issueSalience: [
      { issue: 'Economy', weight: 0.4 },
      { issue: 'Education', weight: 0.3 },
      { issue: 'Healthcare', weight: 0.3 },
    ],
  },
  {
    id: 'working-class-union-base',
    name: 'Working-Class Union Base',
    size: 0.17,
    ideology: { economic: -55, social: -10 },
    persuadability: 0.5,
    issueSalience: [
      { issue: 'Jobs', weight: 0.45 },
      { issue: 'Wages', weight: 0.35 },
      { issue: 'Healthcare', weight: 0.2 },
    ],
  },
  {
    id: 'business-professional-class',
    name: 'Business & Professional Class',
    size: 0.14,
    ideology: { economic: 65, social: 20 },
    persuadability: 0.55,
    issueSalience: [
      { issue: 'Taxes', weight: 0.4 },
      { issue: 'Regulation', weight: 0.35 },
      { issue: 'Trade', weight: 0.25 },
    ],
  },
  {
    id: 'young-digital-natives',
    name: 'Young Digital Natives',
    size: 0.09,
    ideology: { economic: -20, social: -55 },
    persuadability: 0.9,
    issueSalience: [
      { issue: 'Climate', weight: 0.4 },
      { issue: 'Housing', weight: 0.35 },
      { issue: 'Tech Policy', weight: 0.25 },
    ],
  },
];
