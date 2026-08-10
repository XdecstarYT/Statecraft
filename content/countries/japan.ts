import type { Country, District, Party } from '../../engine/models/types';

const DISTRICT_NAMES = [
  'Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto',
  'Kawasaki', 'Saitama', 'Hiroshima', 'Sendai', 'Chiba', 'Kitakyushu', 'Sakai',
  'Niigata', 'Hamamatsu', 'Kumamoto', 'Okayama', 'Shizuoka', 'Kagoshima', 'Matsuyama',
  'Utsunomiya', 'Nagasaki', 'Nara', 'Toyama', 'Akita', 'Kanazawa', 'Gifu', 'Wakayama',
];

const JAPAN_DISTRICTS: District[] = DISTRICT_NAMES.map((name, i) => ({
  id: `jp-district-${i + 1}`,
  name,
}));

export const JAPAN_COUNTRY: Country = {
  id: 'japan',
  name: 'Japan',
  regimeType: 'parliamentary',
  legislature: {
    name: 'National Diet',
    electoralSystem: 'FPTP',
    districts: JAPAN_DISTRICTS,
    totalSeats: JAPAN_DISTRICTS.length,
    prThreshold: 0.05,
  },
};

export const JAPAN_PARTIES: Party[] = [
  {
    id: 'party-jp-ldp',
    name: 'Liberal Democratic Party',
    ideology: { economic: 35, social: 55 },
    seats: 16,
    factions: [
      { name: 'Business Establishment', ideologyOffset: -10, size: 9 },
      { name: 'Traditionalist Wing', ideologyOffset: 15, size: 7 },
    ],
  },
  {
    id: 'party-jp-cdp',
    name: 'Constitutional Democratic Party',
    ideology: { economic: -25, social: -20 },
    seats: 7,
    factions: [{ name: 'Reform Bloc', ideologyOffset: 0, size: 7 }],
  },
  {
    id: 'party-jp-komeito',
    name: 'Komeito',
    ideology: { economic: 10, social: 20 },
    seats: 3,
    factions: [{ name: 'Centrist Bloc', ideologyOffset: 0, size: 3 }],
  },
  {
    id: 'party-jp-ishin',
    name: 'Japan Innovation Party',
    ideology: { economic: 50, social: 10 },
    seats: 3,
    factions: [{ name: 'Deregulation Bloc', ideologyOffset: 0, size: 3 }],
  },
  {
    id: 'party-jp-jcp',
    name: 'Japanese Communist Party',
    ideology: { economic: -70, social: -30 },
    seats: 1,
    factions: [{ name: 'Socialist Bloc', ideologyOffset: 0, size: 1 }],
  },
];
