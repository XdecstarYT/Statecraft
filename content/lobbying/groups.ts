import type { InterestGroup } from '../../engine/models/types';

/**
 * A default roster of organized interest groups spanning the ideology
 * spectrum on both axes, so most bills provoke at least a couple of
 * strongly-felt reactions rather than a uniform shrug. Disposition starts
 * near neutral for everyone — nobody begins the game as a built-in ally or
 * enemy of the player.
 */
export const STARTER_INTEREST_GROUPS: InterestGroup[] = [
  {
    id: 'group-chamber-of-commerce',
    name: 'National Chamber of Commerce',
    focus: 'business',
    ideology: { economic: 75, social: 10 },
    influence: 80,
    disposition: 0,
  },
  {
    id: 'group-federation-of-labor',
    name: 'Federation of Labor',
    focus: 'labor',
    ideology: { economic: -70, social: -20 },
    influence: 75,
    disposition: 0,
  },
  {
    id: 'group-green-alliance',
    name: 'Green Alliance',
    focus: 'environment',
    ideology: { economic: -30, social: -60 },
    influence: 55,
    disposition: 0,
  },
  {
    id: 'group-family-values-coalition',
    name: 'Family Values Coalition',
    focus: 'social_conservative',
    ideology: { economic: 20, social: 80 },
    influence: 60,
    disposition: 0,
  },
  {
    id: 'group-civil-liberties-union',
    name: 'Civil Liberties Union',
    focus: 'civil_liberties',
    ideology: { economic: -10, social: -80 },
    influence: 50,
    disposition: 0,
  },
  {
    id: 'group-national-physicians-assoc',
    name: 'National Physicians Association',
    focus: 'healthcare',
    ideology: { economic: -15, social: 5 },
    influence: 45,
    disposition: 0,
  },
  {
    id: 'group-veterans-defense-league',
    name: 'Veterans & Defense League',
    focus: 'defense',
    ideology: { economic: 30, social: 40 },
    influence: 55,
    disposition: 0,
  },
  {
    id: 'group-farmers-union',
    name: "Farmers' Union",
    focus: 'agriculture',
    ideology: { economic: 10, social: 30 },
    influence: 40,
    disposition: 0,
  },
  {
    id: 'group-seniors-alliance',
    name: 'Seniors Alliance',
    focus: 'seniors',
    ideology: { economic: -40, social: 20 },
    influence: 65,
    disposition: 0,
  },
];
