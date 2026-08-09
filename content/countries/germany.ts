import type { Country, Party } from '../../engine/models/types';

export const GERMANY_COUNTRY: Country = {
  id: 'germany',
  name: 'Federal Republic of Germany',
  regimeType: 'parliamentary',
  legislature: {
    name: 'Bundestag',
    electoralSystem: 'PR_DHONDT',
    districts: [],
    totalSeats: 30,
    prThreshold: 0.05,
  },
};

export const GERMANY_PARTIES: Party[] = [
  {
    id: 'party-de-cdu',
    name: 'CDU/CSU',
    ideology: { economic: 40, social: 30 },
    seats: 9,
    factions: [
      { name: 'Christian Social Wing', ideologyOffset: 15, size: 5 },
      { name: 'Modernizer Wing', ideologyOffset: -10, size: 4 },
    ],
  },
  {
    id: 'party-de-spd',
    name: 'SPD',
    ideology: { economic: -20, social: -10 },
    seats: 7,
    factions: [
      { name: 'Trade Union Wing', ideologyOffset: -15, size: 4 },
      { name: 'Seeheimer Circle', ideologyOffset: 15, size: 3 },
    ],
  },
  {
    id: 'party-de-greens',
    name: 'Alliance 90/The Greens',
    ideology: { economic: -30, social: -60 },
    seats: 5,
    factions: [{ name: 'Realo Wing', ideologyOffset: 10, size: 5 }],
  },
  {
    id: 'party-de-fdp',
    name: 'FDP',
    ideology: { economic: 60, social: -20 },
    seats: 3,
    factions: [{ name: 'Free-Market Bloc', ideologyOffset: 0, size: 3 }],
  },
  {
    id: 'party-de-afd',
    name: 'AfD',
    ideology: { economic: 20, social: 85 },
    seats: 4,
    factions: [{ name: 'National Conservative Bloc', ideologyOffset: 0, size: 4 }],
  },
  {
    id: 'party-de-linke',
    name: 'Die Linke',
    ideology: { economic: -70, social: -30 },
    seats: 2,
    factions: [{ name: 'Socialist Bloc', ideologyOffset: 0, size: 2 }],
  },
];
