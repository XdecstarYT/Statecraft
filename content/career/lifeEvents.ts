import type { CareerLifeEventDef } from '../../engine/systems/career';

/**
 * Pre-authored personal life events for career mode's life-sim layer.
 * Picked by career.ts's rollForLifeEvent (seeded, weighted, gated by each
 * def's optional condition) — this file only supplies content, never
 * touches the RNG itself.
 */
export const CAREER_LIFE_EVENTS: CareerLifeEventDef[] = [
  {
    id: 'started-dating',
    title: 'Someone New',
    description: 'You started seeing someone outside the grind of school, work, and party meetings.',
    weight: 6,
    condition: (state) => state.relationshipStatus === 'single',
    effect: { healthDelta: 6, setRelationshipStatus: 'dating' },
  },
  {
    id: 'breakup',
    title: 'It Didn’t Work Out',
    description: 'A relationship that had been drifting for a while finally ended.',
    weight: 3,
    condition: (state) => state.relationshipStatus === 'dating',
    effect: { healthDelta: -10, setRelationshipStatus: 'single' },
  },
  {
    id: 'engagement-wedding',
    title: 'A Wedding',
    description: 'After a long courtship, you got married — friends, family, and a bill that ran higher than planned.',
    weight: 2,
    condition: (state) => state.relationshipStatus === 'dating',
    effect: { healthDelta: 10, moneyDelta: -80, civicRecordDelta: 3, setRelationshipStatus: 'married' },
  },
  {
    id: 'divorce',
    title: 'A Divorce',
    description: 'The marriage didn’t survive the pace of this life. It’s over, on paper now too.',
    weight: 1,
    condition: (state) => state.relationshipStatus === 'married',
    effect: { healthDelta: -15, moneyDelta: -40, setRelationshipStatus: 'divorced' },
  },
  {
    id: 'new-baby',
    title: 'A New Baby',
    description: 'Sleepless nights, diaper bags, and a whole new reason to care how this all turns out.',
    weight: 2,
    condition: (state) => state.relationshipStatus === 'married' && !state.hasChildren,
    effect: { healthDelta: -12, moneyDelta: -60, setHasChildren: true },
  },
  {
    id: 'health-scare',
    title: 'A Health Scare',
    description: 'A trip to the doctor turned into more tests than you expected. It resolved, but it cost you.',
    weight: 4,
    effect: { healthDelta: -18, moneyDelta: -35 },
  },
  {
    id: 'burnout',
    title: 'Burnout Catches Up',
    description: 'Months of running on fumes finally caught up with you — a rough stretch that took its toll.',
    weight: 5,
    condition: (state) => state.health < 35,
    effect: { healthDelta: -10, attributeDelta: { charisma: -0.3, intellect: -0.3 } },
  },
  {
    id: 'fitness-kick',
    title: 'A Fitness Kick',
    description: 'You started running most mornings before everything else begins. It’s helping.',
    weight: 4,
    effect: { healthDelta: 12 },
  },
  {
    id: 'small-inheritance',
    title: 'A Small Inheritance',
    description: 'A distant relative left behind more than anyone expected.',
    weight: 1,
    effect: { moneyDelta: 150 },
  },
  {
    id: 'family-emergency',
    title: 'A Family Emergency',
    description: 'A relative needed help, financial and otherwise, and you didn’t hesitate.',
    weight: 3,
    effect: { moneyDelta: -50, healthDelta: -5 },
  },
  {
    id: 'old-friend-connection',
    title: 'An Old Friend Reconnects',
    description: 'Someone from years ago got back in touch — and turned out to know exactly the right people.',
    weight: 3,
    effect: { attributeDelta: { network: 0.4 } },
  },
  {
    id: 'quiet-season',
    title: 'A Quiet Season',
    description: 'Nothing dramatic happened. You noticed, and it felt like enough.',
    weight: 5,
    effect: { healthDelta: 4 },
  },
];
