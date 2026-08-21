import type { Donor } from '../../engine/models/types';

/**
 * A default donor roster spanning individual, corporate, union, and PAC
 * money across the ideology spectrum, so no single strategy (chase business
 * money, chase labor money) is the obviously correct one. Disposition
 * starts near neutral — nobody begins as a built-in ally.
 */
export const STARTER_DONORS: Donor[] = [
  {
    id: 'donor-industrialists-pac',
    name: 'Industrialists for Growth PAC',
    type: 'pac',
    ideology: { economic: 70, social: 20 },
    wealth: 90,
    disposition: 0,
  },
  {
    id: 'donor-national-manufacturing',
    name: 'National Manufacturing Corp.',
    type: 'corporation',
    ideology: { economic: 65, social: 0 },
    wealth: 85,
    disposition: 0,
  },
  {
    id: 'donor-teachers-union',
    name: 'United Teachers Federation',
    type: 'union',
    ideology: { economic: -60, social: -30 },
    wealth: 55,
    disposition: 0,
  },
  {
    id: 'donor-dockworkers-union',
    name: 'Dockworkers & Freight Union',
    type: 'union',
    ideology: { economic: -70, social: -10 },
    wealth: 45,
    disposition: 0,
  },
  {
    id: 'donor-progress-alliance-pac',
    name: 'Progress Alliance PAC',
    type: 'pac',
    ideology: { economic: -40, social: -70 },
    wealth: 60,
    disposition: 0,
  },
  {
    id: 'donor-heritage-values-pac',
    name: 'Heritage Values PAC',
    type: 'pac',
    ideology: { economic: 20, social: 80 },
    wealth: 65,
    disposition: 0,
  },
  {
    id: 'donor-retired-financier',
    name: 'Marcus Aldwin, Retired Financier',
    type: 'individual',
    ideology: { economic: 55, social: -20 },
    wealth: 70,
    disposition: 0,
  },
  {
    id: 'donor-tech-founder',
    name: 'Priya Nandakumar, Tech Founder',
    type: 'individual',
    ideology: { economic: 25, social: -60 },
    wealth: 75,
    disposition: 0,
  },
  {
    id: 'donor-family-farm-owner',
    name: 'Walt Ferreira, Family Farm Owner',
    type: 'individual',
    ideology: { economic: 10, social: 40 },
    wealth: 30,
    disposition: 0,
  },
  {
    id: 'donor-real-estate-mogul',
    name: 'Delia Cross, Real Estate Holdings',
    type: 'individual',
    ideology: { economic: 60, social: 10 },
    wealth: 80,
    disposition: 0,
  },
];
