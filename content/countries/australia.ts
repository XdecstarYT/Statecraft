import type { Country, District, Party } from '../../engine/models/types';

/**
 * Real Australian House of Representatives electorate names (~150, matching
 * the real chamber's size), grouped by state/territory the way the AEC
 * actually apportions them. The GLOBE positions these inside Australia's
 * real coastline via a deterministic seed-point subdivision (see
 * content/diplomacy/electorateLayout.ts) rather than real surveyed
 * boundaries — there's no electorate boundary data anywhere in this
 * codebase — so a seat's on-screen location doesn't correspond to its real
 * one, but the seat COUNT and NAMES are the genuine article.
 */
const NSW_DISTRICTS = [
  'Banks', 'Barton', 'Bennelong', 'Berowra', 'Blaxland', 'Bradfield', 'Calare', 'Chifley',
  'Cook', 'Cowper', 'Cunningham', 'Dobell', 'Eden-Monaro', 'Farrer', 'Fowler', 'Gilmore',
  'Grayndler', 'Greenway', 'Hughes', 'Hume', 'Hunter', 'Kingsford Smith', 'Lindsay', 'Lyne',
  'Macarthur', 'Mackellar', 'Macquarie', 'McMahon', 'Mitchell', 'New England', 'Newcastle',
  'North Sydney', 'Page', 'Parkes', 'Parramatta', 'Paterson', 'Reid', 'Richmond', 'Riverina',
  'Robertson', 'Shortland', 'Sydney', 'Warringah', 'Watson', 'Wentworth', 'Werriwa', 'Whitlam',
];

const VIC_DISTRICTS = [
  'Aston', 'Ballarat', 'Bendigo', 'Bruce', 'Calwell', 'Casey', 'Chisholm', 'Cooper',
  'Corangamite', 'Corio', 'Deakin', 'Dunkley', 'Flinders', 'Fraser', 'Gellibrand', 'Gippsland',
  'Goldstein', 'Hawke', 'Higgins', 'Holt', 'Hotham', 'Indi', 'Isaacs', 'Jagajaga', 'Kooyong',
  'La Trobe', 'Lalor', 'Macnamara', 'Mallee', 'McEwen', 'Melbourne', 'Menzies', 'Monash',
  'Nicholls', 'Scullin', 'Wannon', 'Wills',
];

const QLD_DISTRICTS = [
  'Blair', 'Bonner', 'Bowman', 'Brisbane', 'Capricornia', 'Dawson', 'Dickson', 'Fadden',
  'Fairfax', 'Fisher', 'Flynn', 'Forde', 'Griffith', 'Groom', 'Herbert', 'Hinkler', 'Kennedy',
  'Leichhardt', 'Lilley', 'Longman', 'Maranoa', 'McPherson', 'Moncrieff', 'Moreton', 'Oxley',
  'Petrie', 'Rankin', 'Ryan', 'Wide Bay', 'Wright',
];

const WA_DISTRICTS = [
  'Brand', 'Bullwinkel', 'Burt', 'Canning', 'Cowan', 'Curtin', 'Durack', 'Forrest',
  'Fremantle', 'Hasluck', 'Moore', "O'Connor", 'Pearce', 'Perth', 'Swan', 'Tangney', 'Vasse',
];

const SA_DISTRICTS = ['Adelaide', 'Barker', 'Boothby', 'Grey', 'Hindmarsh', 'Kingston', 'Makin', 'Mayo', 'Spence', 'Sturt'];

const TAS_DISTRICTS = ['Bass', 'Braddon', 'Clark', 'Franklin', 'Lyons'];

const NT_DISTRICTS = ['Lingiari', 'Solomon'];

const ACT_DISTRICTS = ['Bean', 'Canberra', 'Fenner'];

const DISTRICT_NAMES = [
  ...NSW_DISTRICTS,
  ...VIC_DISTRICTS,
  ...QLD_DISTRICTS,
  ...WA_DISTRICTS,
  ...SA_DISTRICTS,
  ...TAS_DISTRICTS,
  ...NT_DISTRICTS,
  ...ACT_DISTRICTS,
];

export const AUSTRALIA_DISTRICTS: District[] = DISTRICT_NAMES.map((name, i) => ({
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
    seats: 66,
    factions: [
      { name: 'Labor Left', ideologyOffset: -15, size: 31 },
      { name: 'Labor Right', ideologyOffset: 15, size: 35 },
    ],
  },
  {
    id: 'party-au-coalition',
    name: 'Liberal-National Coalition',
    ideology: { economic: 45, social: 40 },
    seats: 55,
    factions: [
      { name: 'Moderate Liberal Wing', ideologyOffset: -15, size: 25 },
      { name: 'National Party Wing', ideologyOffset: 15, size: 30 },
    ],
  },
  {
    id: 'party-au-greens',
    name: 'The Greens',
    ideology: { economic: -50, social: -65 },
    seats: 15,
    factions: [{ name: 'Grassroots Bloc', ideologyOffset: 0, size: 15 }],
  },
  {
    id: 'party-au-onenation',
    name: "Pauline Hanson's One Nation",
    ideology: { economic: 20, social: 80 },
    seats: 10,
    factions: [{ name: 'Populist Bloc', ideologyOffset: 0, size: 10 }],
  },
  {
    id: 'party-au-teal',
    name: 'Independents (Teal)',
    ideology: { economic: 10, social: -40 },
    seats: 5,
    factions: [{ name: 'Community Independent Bloc', ideologyOffset: 0, size: 5 }],
  },
];
