import type { Country, District, Party } from '../../engine/models/types';

const DISTRICT_NAMES = [
  'Gangnam', 'Jongno', 'Yeongdeungpo', 'Mapo', 'Songpa', 'Busan Haeundae', 'Busan Sasang',
  'Incheon Namdong', 'Incheon Bupyeong', 'Daegu Suseong', 'Daejeon Yuseong', 'Gwangju Buk',
  'Ulsan Nam', 'Suwon Yeongtong', 'Seongnam Bundang', 'Goyang Ilsan', 'Yongin Suji',
  'Changwon Uichang', 'Jeonju Wansan', 'Cheonan Seobuk', 'Pohang Buk', 'Gimhae',
  'Chuncheon', 'Jeju', 'Cheongju Sangdang', 'Ansan Danwon', 'Anyang Dongan', 'Namyangju',
  'Hwaseong', 'Pyeongtaek',
];

const SOUTH_KOREA_DISTRICTS: District[] = DISTRICT_NAMES.map((name, i) => ({
  id: `kr-district-${i + 1}`,
  name,
}));

export const SOUTH_KOREA_COUNTRY: Country = {
  id: 'south-korea',
  name: 'Republic of Korea',
  regimeType: 'presidential',
  legislature: {
    name: 'National Assembly',
    electoralSystem: 'FPTP',
    districts: SOUTH_KOREA_DISTRICTS,
    totalSeats: SOUTH_KOREA_DISTRICTS.length,
    prThreshold: 0.03,
  },
};

export const SOUTH_KOREA_PARTIES: Party[] = [
  {
    id: 'party-kr-ppp',
    name: 'People Power Party',
    ideology: { economic: 35, social: 30 },
    seats: 13,
    factions: [
      { name: 'Pragmatist Wing', ideologyOffset: -15, size: 7 },
      { name: 'Hardline Conservative Wing', ideologyOffset: 20, size: 6 },
    ],
  },
  {
    id: 'party-kr-dp',
    name: 'Democratic Party',
    ideology: { economic: -30, social: -25 },
    seats: 14,
    factions: [
      { name: 'Reformist Wing', ideologyOffset: -15, size: 8 },
      { name: 'Moderate Wing', ideologyOffset: 15, size: 6 },
    ],
  },
  {
    id: 'party-kr-justice',
    name: 'Justice Party',
    ideology: { economic: -55, social: -45 },
    seats: 2,
    factions: [{ name: 'Labor-Aligned Bloc', ideologyOffset: 0, size: 2 }],
  },
  {
    id: 'party-kr-reform',
    name: 'New Reform Party',
    ideology: { economic: 10, social: -10 },
    seats: 1,
    factions: [{ name: 'Independent Reformers', ideologyOffset: 0, size: 1 }],
  },
];
