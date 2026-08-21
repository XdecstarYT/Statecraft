import type { ThinkTank } from '../../engine/models/types';

/**
 * A default roster of ideological policy institutes spanning the spectrum,
 * with prestige varying so some reports genuinely move the Overton window
 * and others are barely noticed. Disposition starts neutral.
 */
export const STARTER_THINK_TANKS: ThinkTank[] = [
  {
    id: 'thinktank-free-market-institute',
    name: 'Free Market Institute',
    ideology: { economic: 80, social: 15 },
    prestige: 75,
    disposition: 0,
  },
  {
    id: 'thinktank-center-for-shared-prosperity',
    name: 'Center for Shared Prosperity',
    ideology: { economic: -70, social: -20 },
    prestige: 70,
    disposition: 0,
  },
  {
    id: 'thinktank-national-security-forum',
    name: 'National Security Forum',
    ideology: { economic: 30, social: 55 },
    prestige: 65,
    disposition: 0,
  },
  {
    id: 'thinktank-open-society-institute',
    name: 'Open Society Institute',
    ideology: { economic: -25, social: -75 },
    prestige: 60,
    disposition: 0,
  },
  {
    id: 'thinktank-traditional-values-council',
    name: 'Traditional Values Council',
    ideology: { economic: 15, social: 75 },
    prestige: 50,
    disposition: 0,
  },
  {
    id: 'thinktank-technocracy-lab',
    name: 'Technocracy Lab',
    ideology: { economic: 10, social: -35 },
    prestige: 55,
    disposition: 0,
  },
];
