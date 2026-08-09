import type { HeadlineTemplates } from '../../engine/systems/media';

/**
 * Pre-authored headline pools, keyed by event kind and how the covering
 * outlet's bias frames it. Assembled by seeded selection in
 * engine/systems/media.ts — never generated at runtime.
 */
export const HEADLINE_TEMPLATES: HeadlineTemplates = {
  bill_passed: {
    favorable: [
      '{name} Delivers a Landmark Win for Kastoria',
      "{name}'s Bill Clears the Assembly to Wide Praise",
      'A Signature Victory for {name}',
    ],
    neutral: [
      '{name}-Backed Bill Clears Floor Vote',
      'Assembly Passes {name} Legislation',
      "{name}'s Bill Passes After Narrow Vote",
    ],
    critical: [
      "Critics Blast {name}'s Rushed Bill",
      '{name} Muscles Through Controversial Legislation',
      "Questions Mount Over {name}'s Bill",
    ],
  },
  bill_failed: {
    favorable: [
      '{name} Fights the Good Fight, Falls Just Short',
      "Assembly Rejects {name}'s Bill in a Close Vote",
      '{name} Vows to Try Again After Narrow Defeat',
    ],
    neutral: [
      "{name}'s Bill Fails on the Floor",
      'Assembly Votes Down {name} Legislation',
      "{name}'s Proposal Dies in Committee Vote",
    ],
    critical: [
      '{name} Suffers Humiliating Defeat on the Floor',
      "Assembly Rebuffs {name}'s Overreach",
      "{name}'s Bill Collapses Amid Party Revolt",
    ],
  },
  election_result: {
    favorable: [
      '{name} Triumphs at the Polls',
      'Voters Hand {name} a Resounding Mandate',
      "{name}'s Party Sweeps the National Assembly",
    ],
    neutral: [
      '{name} Wins National Assembly Election',
      'Election Results: {name} Secures Seats',
      'Assembly Election Concludes, {name} Among Winners',
    ],
    critical: [
      'Voters Punish {name} at the Ballot Box',
      "{name}'s Party Suffers Stinging Losses",
      'Election Signals Trouble Ahead for {name}',
    ],
  },
};
