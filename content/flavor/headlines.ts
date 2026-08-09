import type { HeadlineTemplates } from '../../engine/systems/media';

/**
 * Pre-authored headline pools, keyed by event kind and how the covering
 * outlet's bias frames it. Assembled by seeded selection in
 * engine/systems/media.ts — never generated at runtime. Kept
 * country/legislature-agnostic since more than one starter country exists.
 */
export const HEADLINE_TEMPLATES: HeadlineTemplates = {
  bill_passed: {
    favorable: [
      '{name} Delivers a Landmark Win',
      "{name}'s Bill Clears the Floor to Wide Praise",
      'A Signature Victory for {name}',
      '{name} Makes Good on a Campaign Promise',
    ],
    neutral: [
      '{name}-Backed Bill Clears Floor Vote',
      'Legislature Passes {name} Bill',
      "{name}'s Bill Passes After Narrow Vote",
      'Lawmakers Approve {name} Legislation',
    ],
    critical: [
      "Critics Blast {name}'s Rushed Bill",
      '{name} Muscles Through Controversial Legislation',
      "Questions Mount Over {name}'s Bill",
      '{name} Accused of Ramming Bill Through',
    ],
  },
  bill_failed: {
    favorable: [
      '{name} Fights the Good Fight, Falls Just Short',
      "Legislature Rejects {name}'s Bill in a Close Vote",
      '{name} Vows to Try Again After Narrow Defeat',
      "{name}'s Bill Falls One Vote Shy",
    ],
    neutral: [
      "{name}'s Bill Fails on the Floor",
      'Lawmakers Vote Down {name} Legislation',
      "{name}'s Proposal Dies in Committee Vote",
      'Floor Vote Sinks {name}-Backed Bill',
    ],
    critical: [
      '{name} Suffers Humiliating Defeat on the Floor',
      "Legislature Rebuffs {name}'s Overreach",
      "{name}'s Bill Collapses Amid Party Revolt",
      '{name} Misjudges the Room, Bill Dies',
    ],
  },
  election_result: {
    favorable: [
      '{name} Triumphs at the Polls',
      'Voters Hand {name} a Resounding Mandate',
      "{name}'s Party Sweeps the Legislature",
      '{name} Rides a Wave of Support to Victory',
    ],
    neutral: [
      '{name} Wins Legislative Election',
      'Election Results: {name} Secures Seats',
      'Election Concludes, {name} Among the Winners',
      '{name}\'s Party Holds Steady in Results',
    ],
    critical: [
      'Voters Punish {name} at the Ballot Box',
      "{name}'s Party Suffers Stinging Losses",
      'Election Signals Trouble Ahead for {name}',
      '{name} Faces Reckoning After Poor Showing',
    ],
  },
};
