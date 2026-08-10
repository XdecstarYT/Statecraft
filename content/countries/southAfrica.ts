import type { Country, Party } from '../../engine/models/types';

export const SOUTH_AFRICA_COUNTRY: Country = {
  id: 'south-africa',
  name: 'Republic of South Africa',
  regimeType: 'parliamentary',
  legislature: {
    name: 'National Assembly',
    electoralSystem: 'PR_DHONDT',
    districts: [],
    totalSeats: 30,
    prThreshold: 0,
  },
};

export const SOUTH_AFRICA_PARTIES: Party[] = [
  {
    id: 'party-za-anc',
    name: 'African National Congress',
    ideology: { economic: -35, social: -20 },
    seats: 13,
    factions: [
      { name: 'Tripartite Alliance Wing', ideologyOffset: -20, size: 6 },
      { name: 'Business-Friendly Wing', ideologyOffset: 25, size: 4 },
      { name: 'Old Guard', ideologyOffset: 5, size: 3 },
    ],
  },
  {
    id: 'party-za-da',
    name: 'Democratic Alliance',
    ideology: { economic: 45, social: 10 },
    seats: 8,
    factions: [{ name: 'Federalist Bloc', ideologyOffset: 0, size: 8 }],
  },
  {
    id: 'party-za-eff',
    name: 'Economic Freedom Fighters',
    ideology: { economic: -80, social: -30 },
    seats: 5,
    factions: [{ name: 'Radical Economic Wing', ideologyOffset: 0, size: 5 }],
  },
  {
    id: 'party-za-ifp',
    name: 'Inkatha Freedom Party',
    ideology: { economic: 15, social: 55 },
    seats: 2,
    factions: [{ name: 'Traditionalist Wing', ideologyOffset: 0, size: 2 }],
  },
  {
    id: 'party-za-vf',
    name: 'Freedom Front Plus',
    ideology: { economic: 55, social: 60 },
    seats: 2,
    factions: [{ name: 'Minority Rights Bloc', ideologyOffset: 0, size: 2 }],
  },
];
