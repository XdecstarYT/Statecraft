import type { Country, Party } from '../../engine/models/types';

export const FRANCE_COUNTRY: Country = {
  id: 'france',
  name: 'French Republic',
  regimeType: 'semi-presidential',
  legislature: {
    name: 'National Assembly',
    electoralSystem: 'PR_DHONDT',
    districts: [],
    totalSeats: 30,
    prThreshold: 0.05,
  },
};

export const FRANCE_PARTIES: Party[] = [
  {
    id: 'party-fr-renaissance',
    name: 'Renaissance',
    ideology: { economic: 30, social: -5 },
    seats: 6,
    factions: [{ name: 'Macronist Centrists', ideologyOffset: 0, size: 6 }],
  },
  {
    id: 'party-fr-rn',
    name: 'Rassemblement National',
    ideology: { economic: 20, social: 80 },
    seats: 9,
    factions: [
      { name: 'National Populist Wing', ideologyOffset: 10, size: 6 },
      { name: 'Social Conservative Wing', ideologyOffset: -10, size: 3 },
    ],
  },
  {
    id: 'party-fr-lfi',
    name: 'La France Insoumise',
    ideology: { economic: -70, social: -40 },
    seats: 6,
    factions: [{ name: 'Radical Left Bloc', ideologyOffset: 0, size: 6 }],
  },
  {
    id: 'party-fr-lr',
    name: 'Les Républicains',
    ideology: { economic: 45, social: 45 },
    seats: 4,
    factions: [{ name: 'Gaullist Bloc', ideologyOffset: 0, size: 4 }],
  },
  {
    id: 'party-fr-ps',
    name: 'Parti Socialiste',
    ideology: { economic: -25, social: -20 },
    seats: 3,
    factions: [{ name: 'Social Democrat Bloc', ideologyOffset: 0, size: 3 }],
  },
  {
    id: 'party-fr-eelv',
    name: 'Europe Écologie Les Verts',
    ideology: { economic: -35, social: -55 },
    seats: 2,
    factions: [{ name: 'Green Bloc', ideologyOffset: 0, size: 2 }],
  },
];
