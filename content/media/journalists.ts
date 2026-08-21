import type { Journalist } from '../../engine/models/types';

/**
 * A default press corps — one or two named journalists per starter outlet
 * (see content/media/outlets.ts), spanning credibility and starting
 * scrutiny levels so the player has both easy allies and a genuine watchdog
 * to worry about from turn one.
 */
export const STARTER_JOURNALISTS: Journalist[] = [
  {
    id: 'journalist-elena-marchetti',
    name: 'Elena Marchetti',
    outletId: 'kastorian-herald',
    ideology: { economic: 55, social: 35 },
    credibility: 70,
    disposition: 0,
    scrutiny: 0.1,
  },
  {
    id: 'journalist-dmitri-volkov',
    name: 'Dmitri Volkov',
    outletId: 'public-voice-daily',
    ideology: { economic: -55, social: -40 },
    credibility: 65,
    disposition: 0,
    scrutiny: 0.15,
  },
  {
    id: 'journalist-sofia-reyes',
    name: 'Sofia Reyes',
    outletId: 'national-ledger',
    ideology: { economic: 75, social: 10 },
    credibility: 55,
    disposition: 0,
    scrutiny: 0.1,
  },
  {
    id: 'journalist-tomas-brandt',
    name: 'Tomas Brandt',
    outletId: 'workers-standard',
    ideology: { economic: -65, social: -15 },
    credibility: 60,
    disposition: 0,
    scrutiny: 0.15,
  },
  {
    id: 'journalist-yuki-hamada',
    name: 'Yuki Hamada',
    outletId: 'kastoria-tonight',
    ideology: { economic: 0, social: 5 },
    credibility: 85,
    disposition: 0,
    scrutiny: 0.2,
  },
  {
    id: 'journalist-anais-fontaine',
    name: 'Anaïs Fontaine',
    outletId: 'the-tribune',
    ideology: { economic: 10, social: 70 },
    credibility: 50,
    disposition: 0,
    scrutiny: 0.1,
  },
];
