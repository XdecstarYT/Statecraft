import type { Country, Party } from '../../engine/models/types';

export const BRAZIL_COUNTRY: Country = {
  id: 'brazil',
  name: 'Federative Republic of Brazil',
  regimeType: 'presidential',
  legislature: {
    name: 'Chamber of Deputies',
    electoralSystem: 'PR_DHONDT',
    districts: [],
    totalSeats: 30,
    prThreshold: 0.02,
  },
};

export const BRAZIL_PARTIES: Party[] = [
  {
    id: 'party-br-pl',
    name: 'Partido Liberal',
    ideology: { economic: 35, social: 70 },
    seats: 9,
    factions: [
      { name: 'Evangelical Bloc', ideologyOffset: 10, size: 5 },
      { name: 'Agribusiness Bloc', ideologyOffset: -5, size: 4 },
    ],
  },
  {
    id: 'party-br-pt',
    name: 'Partido dos Trabalhadores',
    ideology: { economic: -50, social: -30 },
    seats: 8,
    factions: [
      { name: 'Trade Union Wing', ideologyOffset: -15, size: 4 },
      { name: 'Governing Coalition Wing', ideologyOffset: 15, size: 4 },
    ],
  },
  {
    id: 'party-br-uniao',
    name: 'União Brasil',
    ideology: { economic: 30, social: 30 },
    seats: 5,
    factions: [{ name: 'Centrão Bloc', ideologyOffset: 0, size: 5 }],
  },
  {
    id: 'party-br-psd',
    name: 'Partido Social Democrático',
    ideology: { economic: 15, social: 15 },
    seats: 4,
    factions: [{ name: 'Centrão Bloc', ideologyOffset: 0, size: 4 }],
  },
  {
    id: 'party-br-psol',
    name: 'Rede Sustentabilidade/PSOL',
    ideology: { economic: -55, social: -50 },
    seats: 2,
    factions: [{ name: 'Green-Left Bloc', ideologyOffset: 0, size: 2 }],
  },
  {
    id: 'party-br-mdb',
    name: 'MDB',
    ideology: { economic: 10, social: 10 },
    seats: 2,
    factions: [{ name: 'Centrão Bloc', ideologyOffset: 0, size: 2 }],
  },
];
