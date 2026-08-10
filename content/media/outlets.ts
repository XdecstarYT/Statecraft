import type { MediaOutlet } from '../../engine/models/types';

/**
 * Starter press landscape for the Republic of Kastoria — static bias
 * profiles spanning the spectrum. See engine/systems/media.ts for how bias
 * turns into a favorable/neutral/critical frame on the same event.
 */
export const STARTER_MEDIA_OUTLETS: MediaOutlet[] = [
  {
    id: 'kastorian-herald',
    name: 'The Kastorian Herald',
    bias: { economic: 55, social: 35 },
    reach: 0.35,
  },
  {
    id: 'public-voice-daily',
    name: 'Public Voice Daily',
    bias: { economic: -55, social: -40 },
    reach: 0.3,
  },
  {
    id: 'national-ledger',
    name: 'The National Ledger',
    bias: { economic: 75, social: 10 },
    reach: 0.2,
  },
  {
    id: 'workers-standard',
    name: "Workers' Standard",
    bias: { economic: -65, social: -15 },
    reach: 0.18,
  },
  {
    id: 'kastoria-tonight',
    name: 'Kastoria Tonight',
    bias: { economic: 0, social: 5 },
    reach: 0.55,
  },
  {
    id: 'the-tribune',
    name: 'The Tribune',
    bias: { economic: 10, social: 70 },
    reach: 0.25,
  },
];
