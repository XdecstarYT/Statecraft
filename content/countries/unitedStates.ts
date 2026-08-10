import type { Country, District, Party } from '../../engine/models/types';

const DISTRICT_NAMES = [
  'Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'Seattle', 'Portland',
  'Denver', 'Phoenix', 'Salt Lake City', 'Austin', 'Houston', 'Dallas', 'San Antonio',
  'Chicago', 'Detroit', 'Minneapolis', 'St. Louis', 'Atlanta', 'Miami', 'Tampa',
  'Charlotte', 'Nashville', 'New Orleans', 'Boston', 'New York', 'Philadelphia',
  'Pittsburgh', 'Baltimore', 'Washington D.C.', 'Columbus',
];

const US_DISTRICTS: District[] = DISTRICT_NAMES.map((name, i) => ({
  id: `us-district-${i + 1}`,
  name,
}));

export const US_COUNTRY: Country = {
  id: 'united-states',
  name: 'United States',
  regimeType: 'presidential',
  legislature: {
    name: 'House of Representatives',
    electoralSystem: 'FPTP',
    districts: US_DISTRICTS,
    totalSeats: US_DISTRICTS.length,
    prThreshold: 0.05,
  },
};

export const US_PARTIES: Party[] = [
  {
    id: 'party-us-gop',
    name: 'Republican Party',
    ideology: { economic: 55, social: 60 },
    seats: 14,
    factions: [
      { name: 'MAGA Populist Wing', ideologyOffset: 15, size: 8 },
      { name: 'Business Establishment', ideologyOffset: -10, size: 6 },
    ],
  },
  {
    id: 'party-us-dem',
    name: 'Democratic Party',
    ideology: { economic: -35, social: -40 },
    seats: 13,
    factions: [
      { name: 'Progressive Wing', ideologyOffset: -20, size: 6 },
      { name: 'Moderate/Blue Dog Wing', ideologyOffset: 15, size: 7 },
    ],
  },
  {
    id: 'party-us-lib',
    name: 'Libertarian Party',
    ideology: { economic: 80, social: -50 },
    seats: 2,
    factions: [{ name: 'Free-Market Bloc', ideologyOffset: 0, size: 2 }],
  },
  {
    id: 'party-us-green',
    name: 'Green Party',
    ideology: { economic: -70, social: -70 },
    seats: 1,
    factions: [{ name: 'Grassroots Bloc', ideologyOffset: 0, size: 1 }],
  },
];
