import type { Country, District, Party } from '../../engine/models/types';

const DISTRICT_NAMES = [
  'Northgate', 'Rivermouth', 'Old Town', 'Highfield', 'Ashwood', 'Millbrook',
  'Stonebridge', 'Eastport', 'Westhaven', 'Fairview', 'Cedar Hollow', 'Redcliff',
  'Sunridge', 'Ironvale', 'Lakeside', 'Greymoor', 'Thistledown', 'Amberfield',
  'Blackwater', 'Pinehurst', 'Silverton', 'Oakhaven', 'Windmere', 'Copperfield',
  'Brightwater',
];

const STARTER_DISTRICTS: District[] = DISTRICT_NAMES.map((name, i) => ({
  id: `district-${i + 1}`,
  name,
}));

export const STARTER_COUNTRY: Country = {
  id: 'kastoria',
  name: 'Republic of Kastoria',
  regimeType: 'parliamentary',
  legislature: {
    name: 'National Assembly',
    electoralSystem: 'FPTP',
    districts: STARTER_DISTRICTS,
    totalSeats: STARTER_DISTRICTS.length,
    prThreshold: 0.05,
  },
};

export const STARTER_PARTIES: Party[] = [
  {
    id: 'party-nrp',
    name: 'National Renewal Party',
    ideology: { economic: 60, social: 40 },
    seats: 8,
    factions: [
      { name: 'Business Wing', ideologyOffset: 15, size: 5 },
      { name: 'Reform Wing', ideologyOffset: -10, size: 3 },
    ],
  },
  {
    id: 'party-klu',
    name: 'Kastorian Labour Union',
    ideology: { economic: -60, social: -20 },
    seats: 7,
    factions: [
      { name: 'Trade Union Bloc', ideologyOffset: -15, size: 4 },
      { name: 'Modernizers', ideologyOffset: 15, size: 3 },
    ],
  },
  {
    id: 'party-ga',
    name: 'Green Accord',
    ideology: { economic: -30, social: -70 },
    seats: 4,
    factions: [
      { name: 'Grassroots Wing', ideologyOffset: -10, size: 3 },
      { name: 'Pragmatist Wing', ideologyOffset: 15, size: 1 },
    ],
  },
  {
    id: 'party-tf',
    name: 'Traditionalist Front',
    ideology: { economic: 20, social: 80 },
    seats: 3,
    factions: [{ name: 'Rural Base', ideologyOffset: 5, size: 3 }],
  },
  {
    id: 'party-lda',
    name: 'Liberal Democratic Alliance',
    ideology: { economic: 10, social: -10 },
    seats: 3,
    factions: [{ name: 'Centrist Core', ideologyOffset: 0, size: 3 }],
  },
];
