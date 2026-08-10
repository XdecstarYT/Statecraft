import type { Country, District, Party } from '../../engine/models/types';

const DISTRICT_NAMES = [
  'Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Newcastle',
  'Canberra', 'Wollongong', 'Hobart', 'Geelong', 'Townsville', 'Cairns', 'Darwin',
  'Toowoomba', 'Ballarat', 'Bendigo', 'Albury', 'Launceston', 'Mackay', 'Rockhampton',
  'Bunbury', 'Bundaberg', 'Wagga Wagga', 'Coffs Harbour', 'Gladstone', 'Mildura',
  'Shepparton', 'Port Macquarie', 'Orange',
];

const AUSTRALIA_DISTRICTS: District[] = DISTRICT_NAMES.map((name, i) => ({
  id: `au-district-${i + 1}`,
  name,
}));

export const AUSTRALIA_COUNTRY: Country = {
  id: 'australia',
  name: 'Commonwealth of Australia',
  regimeType: 'parliamentary',
  legislature: {
    name: 'House of Representatives',
    electoralSystem: 'FPTP',
    districts: AUSTRALIA_DISTRICTS,
    totalSeats: AUSTRALIA_DISTRICTS.length,
    prThreshold: 0.05,
  },
};

export const AUSTRALIA_PARTIES: Party[] = [
  {
    id: 'party-au-labor',
    name: 'Australian Labor Party',
    ideology: { economic: -30, social: -15 },
    seats: 13,
    factions: [
      { name: 'Labor Left', ideologyOffset: -15, size: 6 },
      { name: 'Labor Right', ideologyOffset: 15, size: 7 },
    ],
  },
  {
    id: 'party-au-coalition',
    name: 'Liberal-National Coalition',
    ideology: { economic: 45, social: 40 },
    seats: 11,
    factions: [
      { name: 'Moderate Liberal Wing', ideologyOffset: -15, size: 5 },
      { name: 'National Party Wing', ideologyOffset: 15, size: 6 },
    ],
  },
  {
    id: 'party-au-greens',
    name: 'The Greens',
    ideology: { economic: -50, social: -65 },
    seats: 3,
    factions: [{ name: 'Grassroots Bloc', ideologyOffset: 0, size: 3 }],
  },
  {
    id: 'party-au-onenation',
    name: "Pauline Hanson's One Nation",
    ideology: { economic: 20, social: 80 },
    seats: 2,
    factions: [{ name: 'Populist Bloc', ideologyOffset: 0, size: 2 }],
  },
  {
    id: 'party-au-teal',
    name: 'Independents (Teal)',
    ideology: { economic: 10, social: -40 },
    seats: 1,
    factions: [{ name: 'Community Independent Bloc', ideologyOffset: 0, size: 1 }],
  },
];
