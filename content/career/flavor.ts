import type { EducationTrack } from '../../engine/models/types';

/**
 * Pre-authored flavor banks for career mode, picked deterministically (by
 * hashing some piece of state, same pattern as CorruptionPanel's
 * pickFlavorIndex) rather than by consuming the game's RNG — this is
 * cosmetic color layered on top of career.ts's real, seeded outcomes, not
 * a second source of randomness.
 */

export const EDUCATION_START_FLAVOR: Record<EducationTrack, string> = {
  community_college: 'Two years of night classes, paid for shift by shift.',
  trade_apprenticeship: 'Learning a trade from someone who’s done it for thirty years.',
  state_university: 'Financial aid, a shared dorm room, and a lot riding on this.',
  law_school: 'Case law until midnight, most nights.',
};

export const PARTY_WORK_FLAVOR: Record<'strong' | 'solid' | 'setback', string[]> = {
  strong: [
    'You organized a canvassing blitz that impressed even the district chair.',
    'A phone-banking session you ran turned into the branch’s best night all month.',
    'You talked a skeptical local business owner into hosting a fundraiser.',
    'The county newsletter ran a line about "an organizer worth watching."',
  ],
  solid: [
    'A quiet afternoon of door-knocking, one conversation at a time.',
    'You stuffed envelopes and worked the phones at the branch office.',
    'You showed up to the county meeting and said your piece.',
    'Nothing dramatic — just steady, unglamorous groundwork.',
  ],
  setback: [
    'A canvassing route you planned fell apart in the rain.',
    'You clashed with a branch veteran over strategy, and it showed.',
    'A fundraiser you helped plan drew a thin crowd.',
    'You missed a key meeting, and people noticed.',
  ],
};

export const LOCAL_RACE_WIN_FLAVOR: string[] = [
  'The county clerk read your name first, and the room actually cheered.',
  'A narrow count, a recount request that changed nothing, and a seat that’s yours.',
  'Your first campaign sign is still crooked in someone’s yard — and you won anyway.',
  'The local paper ran your photo above the fold: "Newcomer Takes Council Seat."',
];

export const LOCAL_RACE_LOSS_FLAVOR: string[] = [
  'You watched the count come in short from a folding chair in the back.',
  'A concession call, a quiet drive home, and a decision about what’s next.',
  'The margin wasn’t close enough to contest, and everyone in the room knew it.',
  'You shake the winner’s hand. It won’t be the last time you see them.',
];

export const REGIONAL_RACE_WIN_FLAVOR: string[] = [
  'The state party sends a bottle of something decent and a note: "Welcome up."',
  'A bigger district, a bigger crowd, and your name actually on statewide ballots now.',
  'The council seat feels like a lifetime ago. This is a real legislature.',
  'A veteran colleague shakes your hand: "Don’t get comfortable. It only gets harder."',
];

export const REGIONAL_RACE_LOSS_FLAVOR: string[] = [
  'The local seat carried you this far, but this field was out of your league — for now.',
  'A better-funded incumbent outspent you three to one, and it showed.',
  'You’re still the councilmember people know. Just not the legislator you wanted to be, yet.',
  'The numbers never really moved all night. A long way back to the office.',
];

export const GOVERNANCE_FLAVOR: Record<'strong' | 'solid' | 'setback', string[]> = {
  strong: [
    'You pushed a genuinely popular fix through committee — potholes filled, a park reopened, whatever it took.',
    'A constituent showed up just to say thank you. That doesn’t happen often.',
    'You found the votes for something everyone said was dead. It passed.',
    'The local paper called it "unusually competent governance." You’ll take it.',
  ],
  solid: [
    'A quiet session — budget lines reviewed, a few constituent calls returned.',
    'Nothing headline-worthy, just the actual work of holding office.',
    'You sat through the hearings, read the reports, did the job.',
    'A modest zoning dispute got resolved without anyone yelling. Progress.',
  ],
  setback: [
    'A vote you championed died in committee, and you spent the week explaining why.',
    'A budget line you fought for got cut anyway.',
    'An angry town hall reminded you how thin the goodwill really is.',
    'You missed a vote that mattered, and the opposition noticed.',
  ],
};

export const NOMINATION_SUCCESS_FLAVOR: string[] = [
  'The party chair calls personally: "We’re putting your name forward."',
  'A closed-door meeting, a show of hands, and suddenly it’s real.',
  'Years of envelope-stuffing and door-knocking just bought you a national ballot line.',
  'Someone hands you a lapel pin with the party’s name on it and says, "Don’t lose it."',
];

export const NOMINATION_REJECTION_FLAVOR: string[] = [
  'The committee thanks you for your service and picks someone else.',
  '"Not this cycle," the chair says, not unkindly. "Keep building."',
  'You hear the news secondhand, from someone else on the shortlist.',
  'The door isn’t closed — but it isn’t open yet either.',
];

export const CITIZEN_INITIATIVE_PASS_FLAVOR: string[] = [
  'The clerk certifies enough signatures, and the council has to actually vote on it.',
  'Your petition table outside the grocery store paid off — this is going on the ballot, and it wins.',
  'Local news picks up the story: "Resident-Led Petition Succeeds Where Council Wouldn’t Act."',
  'Neighbors who’d never met before showed up to canvass for this. It passed.',
];

export const CITIZEN_INITIATIVE_FAIL_FLAVOR: string[] = [
  'You fall short of a majority, and the petition dies in committee.',
  'A rival flyer campaign outworked yours in the final week.',
  'The turnout just wasn’t there — most people never even heard about it.',
  'Close, but the count comes back against you.',
];

export const CAMPAIGN_ACTIVITY_FLAVOR: Record<'canvass' | 'media_blitz', Record<'strong' | 'solid' | 'setback', string[]>> = {
  canvass: {
    strong: [
      'A full afternoon of door-knocking turned into a genuine conversation on every porch.',
      'You hit every block on the list, and people actually remembered your name after.',
      'A local shop owner offered to put your flyer in the window unprompted.',
      'The canvassing sheet came back covered in "strong yes" checkmarks.',
    ],
    solid: [
      'A steady round of doors — some conversations, some just a wave.',
      'Nothing dramatic, but the list got worked all the way through.',
      'A few undecided voters said they’d think about it.',
      'You handed out flyers at the transit stop for a couple hours.',
    ],
    setback: [
      'Rain cut the route short, and half the list went unworked.',
      'A tense exchange on one doorstep followed you for the rest of the block.',
      'Most doors just didn’t open.',
      'You mixed up two addresses and burned an hour finding your way back.',
    ],
  },
  media_blitz: {
    strong: [
      'A local news segment ran your clip almost unedited — the message landed exactly right.',
      'The ad buy outperformed every projection the campaign had.',
      'A well-placed op-ed got picked up and reprinted twice.',
      'Your social clips actually got shared outside your own circle.',
    ],
    solid: [
      'The ads ran on schedule. No breakout moment, but no disaster either.',
      'A radio spot got a modest, respectful response.',
      'The press release went out and got the usual small mention.',
      'Steady spend, steady (if unremarkable) reach.',
    ],
    setback: [
      'A clumsy soundbite got clipped out of context and spread faster than the original.',
      'The ad buy landed in the wrong time slot and barely reached anyone.',
      'A reporter asked a question the prepared lines didn’t cover.',
      'The budget went out and the numbers barely moved.',
    ],
  },
};

export const PARTY_LEADERSHIP_WIN_FLAVOR: string[] = [
  'The branch votes you in as an officer — a real seat at the table now, not just a volunteer badge.',
  'A show of hands, a gavel tap, and suddenly the machine answers to you too.',
  'The outgoing officer hands over the keys to the filing cabinet. It’s official.',
  'You’re not just canvassing for the party anymore. You help decide who else does.',
];

export const PARTY_LEADERSHIP_LOSS_FLAVOR: string[] = [
  'A rival with deeper roots in the branch wins the vote instead.',
  '"Not yet," the outgoing chair says. "Build a bit more first."',
  'The delegates weren’t wrong to be cautious — you weren’t quite ready.',
  'A close vote, but close doesn’t seat you.',
];

/** Deterministic (not RNG) pick so flavor varies by context without touching game state. See CorruptionPanel.tsx for the same pattern. */
export function pickFlavorIndex(key: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return hash % length;
}
