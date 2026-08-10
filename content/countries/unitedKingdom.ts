import type { Country, District, Party } from '../../engine/models/types';

const DISTRICT_NAMES = [
  'London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow', 'Liverpool', 'Bristol',
  'Sheffield', 'Edinburgh', 'Newcastle', 'Cardiff', 'Belfast', 'Nottingham',
  'Leicester', 'Southampton', 'Portsmouth', 'Aberdeen', 'Oxford', 'Cambridge', 'York',
  'Coventry', 'Bradford', 'Hull', 'Plymouth', 'Stoke-on-Trent', 'Wolverhampton',
  'Derby', 'Swansea', 'Dundee', 'Reading',
];

const UK_DISTRICTS: District[] = DISTRICT_NAMES.map((name, i) => ({
  id: `uk-district-${i + 1}`,
  name,
}));

export const UK_COUNTRY: Country = {
  id: 'united-kingdom',
  name: 'United Kingdom',
  regimeType: 'parliamentary',
  legislature: {
    name: 'House of Commons',
    electoralSystem: 'FPTP',
    districts: UK_DISTRICTS,
    totalSeats: UK_DISTRICTS.length,
    prThreshold: 0.05,
  },
};

export const UK_PARTIES: Party[] = [
  {
    id: 'party-uk-labour',
    name: 'Labour Party',
    ideology: { economic: -30, social: -25 },
    seats: 12,
    factions: [
      { name: 'Soft Left', ideologyOffset: -10, size: 8 },
      { name: 'Blue Labour Wing', ideologyOffset: 15, size: 4 },
    ],
  },
  {
    id: 'party-uk-conservative',
    name: 'Conservative Party',
    ideology: { economic: 45, social: 40 },
    seats: 8,
    factions: [
      { name: 'One Nation Wing', ideologyOffset: -15, size: 3 },
      { name: 'Free-Market Right', ideologyOffset: 15, size: 5 },
    ],
  },
  {
    id: 'party-uk-libdem',
    name: 'Liberal Democrats',
    ideology: { economic: -5, social: -35 },
    seats: 3,
    factions: [{ name: 'Centrist Bloc', ideologyOffset: 0, size: 3 }],
  },
  {
    id: 'party-uk-reform',
    name: 'Reform UK',
    ideology: { economic: 40, social: 75 },
    seats: 4,
    factions: [{ name: 'Populist Bloc', ideologyOffset: 0, size: 4 }],
  },
  {
    id: 'party-uk-snp',
    name: 'Scottish National Party',
    ideology: { economic: -25, social: -30 },
    seats: 2,
    factions: [{ name: 'Independence Bloc', ideologyOffset: 0, size: 2 }],
  },
  {
    id: 'party-uk-green',
    name: 'Green Party',
    ideology: { economic: -60, social: -70 },
    seats: 1,
    factions: [{ name: 'Grassroots Bloc', ideologyOffset: 0, size: 1 }],
  },
];
