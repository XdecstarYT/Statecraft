import type { Endorser } from '../../engine/models/types';

/**
 * Pre-authored endorsers — no runtime generation. Ideology positions
 * spread across the spectrum so alignment with a given politician varies
 * meaningfully; prominence scales how big an endorsement's approval swing
 * is if won.
 */
export const ENDORSERS: Endorser[] = [
  { id: 'endorser-celeb-1', name: 'Mara Voss (actress)', type: 'celebrity', ideology: { economic: -40, social: -60 }, prominence: 70 },
  { id: 'endorser-celeb-2', name: 'Deacon Kray (musician)', type: 'celebrity', ideology: { economic: 20, social: -30 }, prominence: 55 },
  { id: 'endorser-celeb-3', name: 'Tomas Ilic (athlete)', type: 'celebrity', ideology: { economic: 10, social: 40 }, prominence: 60 },
  { id: 'endorser-union-1', name: 'National Teachers Union', type: 'union', ideology: { economic: -60, social: -30 }, prominence: 50 },
  { id: 'endorser-union-2', name: 'Transport Workers Federation', type: 'union', ideology: { economic: -50, social: 0 }, prominence: 45 },
  { id: 'endorser-union-3', name: 'Manufacturing Trades Council', type: 'union', ideology: { economic: -20, social: 20 }, prominence: 40 },
  { id: 'endorser-news-1', name: 'The Daily Standard', type: 'newspaper', ideology: { economic: 50, social: 40 }, prominence: 65 },
  { id: 'endorser-news-2', name: 'The Metropolitan Herald', type: 'newspaper', ideology: { economic: -30, social: -50 }, prominence: 60 },
  { id: 'endorser-news-3', name: 'National Business Journal', type: 'newspaper', ideology: { economic: 70, social: 10 }, prominence: 50 },
  { id: 'endorser-news-4', name: 'The Community Gazette', type: 'newspaper', ideology: { economic: -10, social: -10 }, prominence: 35 },
];
