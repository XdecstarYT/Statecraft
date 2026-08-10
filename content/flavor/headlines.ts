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
      '{name} Notches a Hard-Fought Legislative Win',
      "Analysts Call It {name}'s Finest Hour",
      '{name} Builds Momentum With Floor Win',
      'A Defining Achievement for {name}',
      "{name}'s Persistence Finally Pays Off",
      'Supporters Celebrate as {name} Delivers',
    ],
    neutral: [
      '{name}-Backed Bill Clears Floor Vote',
      'Legislature Passes {name} Bill',
      "{name}'s Bill Passes After Narrow Vote",
      'Lawmakers Approve {name} Legislation',
      '{name} Secures Floor Passage',
      'Bill Sponsored by {name} Clears Chamber',
      '{name}\'s Proposal Advances to Law',
      'Floor Vote Goes {name}\'s Way',
    ],
    critical: [
      "Critics Blast {name}'s Rushed Bill",
      '{name} Muscles Through Controversial Legislation',
      "Questions Mount Over {name}'s Bill",
      '{name} Accused of Ramming Bill Through',
      "{name}'s Bill Passes Despite Warnings",
      'Opponents Vow to Fight {name}\'s New Law',
      '{name} Bulldozes Opposition to Pass Bill',
      "Watchdogs Flag Flaws in {name}'s Legislation",
    ],
  },
  bill_failed: {
    favorable: [
      '{name} Fights the Good Fight, Falls Just Short',
      "Legislature Rejects {name}'s Bill in a Close Vote",
      '{name} Vows to Try Again After Narrow Defeat',
      "{name}'s Bill Falls One Vote Shy",
      '{name} Refuses to Back Down After Setback',
      "Allies Rally Behind {name} After Narrow Loss",
      '{name} Takes the Long View After Defeat',
      'A Respectable Effort From {name}, Undone by the Numbers',
    ],
    neutral: [
      "{name}'s Bill Fails on the Floor",
      'Lawmakers Vote Down {name} Legislation',
      "{name}'s Proposal Dies in Committee Vote",
      'Floor Vote Sinks {name}-Backed Bill',
      '{name}\'s Bill Falls Short of Votes',
      'Legislature Shelves {name}\'s Proposal',
      '{name} Comes Up Short on the Floor',
      'Bill Sponsored by {name} Fails to Advance',
    ],
    critical: [
      '{name} Suffers Humiliating Defeat on the Floor',
      "Legislature Rebuffs {name}'s Overreach",
      "{name}'s Bill Collapses Amid Party Revolt",
      '{name} Misjudges the Room, Bill Dies',
      "{name}'s Credibility Takes a Hit After Defeat",
      'A Stinging Rebuke for {name}',
      '{name} Loses Control of the Floor',
      "Even Allies Abandon {name}'s Doomed Bill",
    ],
  },
  election_result: {
    favorable: [
      '{name} Triumphs at the Polls',
      'Voters Hand {name} a Resounding Mandate',
      "{name}'s Party Sweeps the Legislature",
      '{name} Rides a Wave of Support to Victory',
      '{name} Delivers a Decisive Election Night',
      "Voters Reward {name}'s Record",
      '{name} Cements Position With Big Win',
      'A Historic Night for {name}',
    ],
    neutral: [
      '{name} Wins Legislative Election',
      'Election Results: {name} Secures Seats',
      'Election Concludes, {name} Among the Winners',
      '{name}\'s Party Holds Steady in Results',
      'Voters Deliver a Mixed Verdict for {name}',
      '{name} Navigates a Competitive Field',
      'Election Night Ends With Gains for {name}',
      '{name}\'s Party Finishes Where Polls Predicted',
    ],
    critical: [
      'Voters Punish {name} at the Ballot Box',
      "{name}'s Party Suffers Stinging Losses",
      'Election Signals Trouble Ahead for {name}',
      '{name} Faces Reckoning After Poor Showing',
      "A Brutal Night for {name}'s Party",
      '{name} Left Searching for Answers After Losses',
      "Voters Deliver a Sharp Rebuke to {name}",
      '{name}\'s Coalition Fractures at the Polls',
    ],
  },
};
