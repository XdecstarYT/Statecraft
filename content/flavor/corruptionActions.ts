import type { CorruptionTier } from '../../engine/models/types';

/** Pre-authored flavor text for each corruption tier's available actions. */
export const CORRUPTION_ACTIONS: Record<CorruptionTier, string[]> = {
  soft: [
    'Steer a minor contract to a loyal donor',
    'Leak a favorable talking point to a friendly reporter',
    'Grant a discreet committee favor',
    'Fast-track a permit for a well-connected constituent',
    'Quietly bump a supporter up the appointment waitlist',
  ],
  medium: [
    'Arrange a no-bid catering contract for a party backer',
    "Quietly waive a permitting fee for an ally's business",
    'Funnel a campaign donation through a shell PAC',
    "Steer a consulting contract to a relative's firm",
    'Trade a committee vote for a donor favor',
  ],
  hard: [
    'Accept a briefcase of cash for a zoning exemption',
    'Divert emergency relief funds to a shell company',
    'Rig a procurement bid for a kickback',
    'Sell a confidential floor-vote count to a lobbyist',
    'Launder a bribe through an offshore consultancy',
  ],
};
