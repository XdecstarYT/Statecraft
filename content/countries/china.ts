import type { Country, Party } from '../../engine/models/types';

/**
 * Modeled as a dominant-party PR legislature: the Communist Party of China
 * holds an overwhelming majority, alongside the minor parties that make up
 * the real-world United Front system. This is a simplification for
 * gameplay variety, not a claim about how NPC seats are actually contested.
 */
export const CHINA_COUNTRY: Country = {
  id: 'china',
  name: "People's Republic of China",
  regimeType: 'presidential',
  legislature: {
    name: "National People's Congress",
    electoralSystem: 'PR_DHONDT',
    districts: [],
    totalSeats: 30,
    prThreshold: 0.02,
  },
};

export const CHINA_PARTIES: Party[] = [
  {
    id: 'party-cn-cpc',
    name: 'Communist Party of China',
    ideology: { economic: -20, social: 70 },
    seats: 24,
    factions: [
      { name: 'Reformist Technocrats', ideologyOffset: 15, size: 10 },
      { name: 'Party Conservatives', ideologyOffset: -10, size: 14 },
    ],
  },
  {
    id: 'party-cn-cdl',
    name: 'China Democratic League',
    ideology: { economic: -10, social: 40 },
    seats: 2,
    factions: [{ name: 'Academic Bloc', ideologyOffset: 0, size: 2 }],
  },
  {
    id: 'party-cn-rckmt',
    name: 'Revolutionary Committee of the Kuomintang',
    ideology: { economic: 10, social: 50 },
    seats: 2,
    factions: [{ name: 'Cross-Strait Bloc', ideologyOffset: 0, size: 2 }],
  },
  {
    id: 'party-cn-jiusan',
    name: 'Jiusan Society',
    ideology: { economic: -5, social: 45 },
    seats: 2,
    factions: [{ name: 'Scientific Bloc', ideologyOffset: 0, size: 2 }],
  },
];
