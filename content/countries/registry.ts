import type { Country, Party } from '../../engine/models/types';
import { STARTER_COUNTRY, STARTER_PARTIES } from './starter';
import { VANTORRA_COUNTRY, VANTORRA_PARTIES } from './vantorra';
import { US_COUNTRY, US_PARTIES } from './unitedStates';
import { CHINA_COUNTRY, CHINA_PARTIES } from './china';
import { GERMANY_COUNTRY, GERMANY_PARTIES } from './germany';
import { JAPAN_COUNTRY, JAPAN_PARTIES } from './japan';
import { INDIA_COUNTRY, INDIA_PARTIES } from './india';
import { UK_COUNTRY, UK_PARTIES } from './unitedKingdom';
import { FRANCE_COUNTRY, FRANCE_PARTIES } from './france';
import { ITALY_COUNTRY, ITALY_PARTIES } from './italy';
import { BRAZIL_COUNTRY, BRAZIL_PARTIES } from './brazil';
import { CANADA_COUNTRY, CANADA_PARTIES } from './canada';
import { AUSTRALIA_COUNTRY, AUSTRALIA_PARTIES } from './australia';
import { SOUTH_AFRICA_COUNTRY, SOUTH_AFRICA_PARTIES } from './southAfrica';
import { SOUTH_KOREA_COUNTRY, SOUTH_KOREA_PARTIES } from './southKorea';

export interface StarterCountryOption {
  id: string;
  label: string;
  country: Country;
  parties: Party[];
}

export const STARTER_COUNTRY_OPTIONS: StarterCountryOption[] = [
  { id: 'kastoria', label: 'Republic of Kastoria (Parliamentary, FPTP)', country: STARTER_COUNTRY, parties: STARTER_PARTIES },
  { id: 'vantorra', label: 'The Vantorran Republic (Presidential, PR)', country: VANTORRA_COUNTRY, parties: VANTORRA_PARTIES },
  { id: 'united-states', label: 'United States (Presidential, FPTP)', country: US_COUNTRY, parties: US_PARTIES },
  { id: 'china', label: 'China (Dominant-Party, PR)', country: CHINA_COUNTRY, parties: CHINA_PARTIES },
  { id: 'germany', label: 'Germany (Parliamentary, PR)', country: GERMANY_COUNTRY, parties: GERMANY_PARTIES },
  { id: 'japan', label: 'Japan (Parliamentary, FPTP)', country: JAPAN_COUNTRY, parties: JAPAN_PARTIES },
  { id: 'india', label: 'India (Parliamentary, FPTP)', country: INDIA_COUNTRY, parties: INDIA_PARTIES },
  { id: 'united-kingdom', label: 'United Kingdom (Parliamentary, FPTP)', country: UK_COUNTRY, parties: UK_PARTIES },
  { id: 'france', label: 'France (Semi-Presidential, PR)', country: FRANCE_COUNTRY, parties: FRANCE_PARTIES },
  { id: 'italy', label: 'Italy (Parliamentary, PR)', country: ITALY_COUNTRY, parties: ITALY_PARTIES },
  { id: 'brazil', label: 'Brazil (Presidential, PR)', country: BRAZIL_COUNTRY, parties: BRAZIL_PARTIES },
  { id: 'canada', label: 'Canada (Parliamentary, FPTP)', country: CANADA_COUNTRY, parties: CANADA_PARTIES },
  { id: 'australia', label: 'Australia (Parliamentary, FPTP)', country: AUSTRALIA_COUNTRY, parties: AUSTRALIA_PARTIES },
  { id: 'south-africa', label: 'South Africa (Parliamentary, PR)', country: SOUTH_AFRICA_COUNTRY, parties: SOUTH_AFRICA_PARTIES },
  { id: 'south-korea', label: 'South Korea (Presidential, FPTP)', country: SOUTH_KOREA_COUNTRY, parties: SOUTH_KOREA_PARTIES },
];
