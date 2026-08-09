import type { Country, Party } from '../../engine/models/types';
import { STARTER_COUNTRY, STARTER_PARTIES } from './starter';
import { VANTORRA_COUNTRY, VANTORRA_PARTIES } from './vantorra';

export interface StarterCountryOption {
  id: string;
  label: string;
  country: Country;
  parties: Party[];
}

export const STARTER_COUNTRY_OPTIONS: StarterCountryOption[] = [
  { id: 'kastoria', label: 'Republic of Kastoria (Parliamentary, FPTP)', country: STARTER_COUNTRY, parties: STARTER_PARTIES },
  { id: 'vantorra', label: 'The Vantorran Republic (Presidential, PR)', country: VANTORRA_COUNTRY, parties: VANTORRA_PARTIES },
];
