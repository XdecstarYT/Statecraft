import type { Country, Party } from '../../engine/models/types';

export const ITALY_COUNTRY: Country = {
  id: 'italy',
  name: 'Italian Republic',
  regimeType: 'parliamentary',
  legislature: {
    name: 'Chamber of Deputies',
    electoralSystem: 'PR_DHONDT',
    districts: [],
    totalSeats: 30,
    prThreshold: 0.03,
  },
};

export const ITALY_PARTIES: Party[] = [
  {
    id: 'party-it-fdi',
    name: "Fratelli d'Italia",
    ideology: { economic: 30, social: 75 },
    seats: 8,
    factions: [{ name: 'National Conservative Bloc', ideologyOffset: 0, size: 8 }],
  },
  {
    id: 'party-it-pd',
    name: 'Partito Democratico',
    ideology: { economic: -25, social: -25 },
    seats: 6,
    factions: [
      { name: 'Reformist Wing', ideologyOffset: 10, size: 3 },
      { name: 'Left Wing', ideologyOffset: -10, size: 3 },
    ],
  },
  {
    id: 'party-it-m5s',
    name: 'Movimento 5 Stelle',
    ideology: { economic: -20, social: -10 },
    seats: 4,
    factions: [{ name: 'Populist Bloc', ideologyOffset: 0, size: 4 }],
  },
  {
    id: 'party-it-lega',
    name: 'Lega',
    ideology: { economic: 25, social: 60 },
    seats: 4,
    factions: [{ name: 'Northern League Bloc', ideologyOffset: 0, size: 4 }],
  },
  {
    id: 'party-it-fi',
    name: 'Forza Italia',
    ideology: { economic: 45, social: 30 },
    seats: 3,
    factions: [{ name: 'Liberal-Conservative Bloc', ideologyOffset: 0, size: 3 }],
  },
  {
    id: 'party-it-av',
    name: 'Azione/Italia Viva',
    ideology: { economic: 20, social: -20 },
    seats: 3,
    factions: [{ name: 'Centrist Bloc', ideologyOffset: 0, size: 3 }],
  },
  {
    id: 'party-it-avs',
    name: 'Alleanza Verdi e Sinistra',
    ideology: { economic: -55, social: -50 },
    seats: 2,
    factions: [{ name: 'Green-Left Bloc', ideologyOffset: 0, size: 2 }],
  },
];
