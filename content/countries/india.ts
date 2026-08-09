import type { Country, District, Party } from '../../engine/models/types';

const DISTRICT_NAMES = [
  'Delhi', 'Mumbai', 'Bangalore', 'Kolkata', 'Chennai', 'Hyderabad', 'Pune',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Bhopal', 'Patna',
  'Ludhiana', 'Agra', 'Nashik', 'Vadodara', 'Varanasi', 'Surat', 'Coimbatore',
  'Guwahati', 'Ranchi', 'Chandigarh', 'Amritsar', 'Mysuru', 'Thiruvananthapuram',
  'Bhubaneswar', 'Jodhpur',
];

const INDIA_DISTRICTS: District[] = DISTRICT_NAMES.map((name, i) => ({
  id: `in-district-${i + 1}`,
  name,
}));

export const INDIA_COUNTRY: Country = {
  id: 'india',
  name: 'Republic of India',
  regimeType: 'parliamentary',
  legislature: {
    name: 'Lok Sabha',
    electoralSystem: 'FPTP',
    districts: INDIA_DISTRICTS,
    totalSeats: INDIA_DISTRICTS.length,
    prThreshold: 0.05,
  },
};

export const INDIA_PARTIES: Party[] = [
  {
    id: 'party-in-bjp',
    name: 'Bharatiya Janata Party',
    ideology: { economic: 30, social: 70 },
    seats: 14,
    factions: [
      { name: 'Hindutva Wing', ideologyOffset: 15, size: 8 },
      { name: 'Reformist Technocrats', ideologyOffset: -15, size: 6 },
    ],
  },
  {
    id: 'party-in-inc',
    name: 'Indian National Congress',
    ideology: { economic: -10, social: -10 },
    seats: 9,
    factions: [
      { name: 'Old Guard', ideologyOffset: 10, size: 5 },
      { name: 'Youth Wing', ideologyOffset: -15, size: 4 },
    ],
  },
  {
    id: 'party-in-aap',
    name: 'Aam Aadmi Party',
    ideology: { economic: -20, social: -5 },
    seats: 2,
    factions: [{ name: 'Anti-Corruption Bloc', ideologyOffset: 0, size: 2 }],
  },
  {
    id: 'party-in-tmc',
    name: 'All India Trinamool Congress',
    ideology: { economic: -15, social: 5 },
    seats: 3,
    factions: [{ name: 'Regionalist Bloc', ideologyOffset: 0, size: 3 }],
  },
  {
    id: 'party-in-cpim',
    name: 'Communist Party of India (Marxist)',
    ideology: { economic: -70, social: -30 },
    seats: 2,
    factions: [{ name: 'Left Front Bloc', ideologyOffset: 0, size: 2 }],
  },
];
