import type { Country, District, Party } from '../../engine/models/types';

const DISTRICT_NAMES = [
  'Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg',
  'Quebec City', 'Hamilton', 'Kitchener', 'London', 'Victoria', 'Halifax', 'Oshawa',
  'Windsor', 'Saskatoon', 'Regina', "St. John's", 'Barrie', 'Kelowna', 'Sherbrooke',
  'Guelph', 'Kingston', 'Sudbury', 'Trois-Rivières', 'Moncton', 'Thunder Bay',
  'Saint John', 'Fredericton', 'Charlottetown',
];

const CANADA_DISTRICTS: District[] = DISTRICT_NAMES.map((name, i) => ({
  id: `ca-district-${i + 1}`,
  name,
}));

export const CANADA_COUNTRY: Country = {
  id: 'canada',
  name: 'Canada',
  regimeType: 'parliamentary',
  legislature: {
    name: 'House of Commons',
    electoralSystem: 'FPTP',
    districts: CANADA_DISTRICTS,
    totalSeats: CANADA_DISTRICTS.length,
    prThreshold: 0.05,
  },
};

export const CANADA_PARTIES: Party[] = [
  {
    id: 'party-ca-conservative',
    name: 'Conservative Party',
    ideology: { economic: 40, social: 35 },
    seats: 12,
    factions: [
      { name: 'Red Tory Wing', ideologyOffset: -15, size: 4 },
      { name: 'Populist Wing', ideologyOffset: 15, size: 8 },
    ],
  },
  {
    id: 'party-ca-liberal',
    name: 'Liberal Party',
    ideology: { economic: -15, social: -25 },
    seats: 10,
    factions: [{ name: 'Centrist Bloc', ideologyOffset: 0, size: 10 }],
  },
  {
    id: 'party-ca-ndp',
    name: 'New Democratic Party',
    ideology: { economic: -55, social: -35 },
    seats: 3,
    factions: [{ name: 'Labour Bloc', ideologyOffset: 0, size: 3 }],
  },
  {
    id: 'party-ca-bloc',
    name: 'Bloc Québécois',
    ideology: { economic: -10, social: 10 },
    seats: 3,
    factions: [{ name: 'Sovereigntist Bloc', ideologyOffset: 0, size: 3 }],
  },
  {
    id: 'party-ca-green',
    name: 'Green Party',
    ideology: { economic: -50, social: -60 },
    seats: 2,
    factions: [{ name: 'Grassroots Bloc', ideologyOffset: 0, size: 2 }],
  },
];
