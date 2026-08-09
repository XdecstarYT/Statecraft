import type { Country, Party } from '../../engine/models/types';

/**
 * A second starter country with a genuinely different regime and electoral
 * system from Kastoria — presidential rather than parliamentary, and
 * party-list PR (D'Hondt) as the *main* legislature rather than only being
 * demoed in the Electoral Systems Lab.
 */
export const VANTORRA_COUNTRY: Country = {
  id: 'vantorra',
  name: 'The Vantorran Republic',
  regimeType: 'presidential',
  legislature: {
    name: 'Federal Chamber',
    electoralSystem: 'PR_DHONDT',
    districts: [],
    totalSeats: 40,
    prThreshold: 0.04,
  },
};

export const VANTORRA_PARTIES: Party[] = [
  {
    id: 'party-vup',
    name: 'Vantorran Unity Party',
    ideology: { economic: 45, social: 10 },
    seats: 12,
    factions: [
      { name: 'Industrialist Wing', ideologyOffset: 15, size: 7 },
      { name: 'Federalist Wing', ideologyOffset: -10, size: 5 },
    ],
  },
  {
    id: 'party-pwf',
    name: 'Popular Workers Front',
    ideology: { economic: -55, social: -30 },
    seats: 10,
    factions: [
      { name: 'Syndicalist Bloc', ideologyOffset: -15, size: 6 },
      { name: 'Social Democrats', ideologyOffset: 15, size: 4 },
    ],
  },
  {
    id: 'party-ea',
    name: 'Ecological Alliance',
    ideology: { economic: -20, social: -60 },
    seats: 6,
    factions: [{ name: 'Youth Wing', ideologyOffset: -10, size: 6 }],
  },
  {
    id: 'party-hc',
    name: 'Heritage Coalition',
    ideology: { economic: 15, social: 75 },
    seats: 7,
    factions: [{ name: 'Rural Assembly', ideologyOffset: 5, size: 7 }],
  },
  {
    id: 'party-rd',
    name: 'Reform Democrats',
    ideology: { economic: 5, social: -15 },
    seats: 5,
    factions: [{ name: 'Centrist Core', ideologyOffset: 0, size: 5 }],
  },
];
