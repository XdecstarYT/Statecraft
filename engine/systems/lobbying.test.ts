import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Bill, InterestGroup, Politician } from '../models/types';
import {
  applyBillOutcomeToGroups,
  applyCourtOutcome,
  computeGroupStance,
  computeLobbyingPressure,
  courtInterestGroup,
  decayGroupDispositions,
} from './lobbying';
import { proposeBill } from './legislative';

function makePolitician(overrides: Partial<Politician> & { id: string }): Politician {
  return {
    name: overrides.id,
    isPlayer: false,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

function makeGroup(overrides: Partial<InterestGroup> & { id: string }): InterestGroup {
  return {
    name: overrides.id,
    focus: 'business',
    ideology: { economic: 0, social: 0 },
    influence: 50,
    disposition: 0,
    ...overrides,
  };
}

function spendingBill(): Bill {
  return proposeBill({
    id: 'b1',
    title: 'Spending Bill',
    sponsorId: 'sponsor',
    provisions: [{ id: 'p1', description: 'Fund a program', budgetImpact: -5000 }],
  });
}

function austerityBill(): Bill {
  return proposeBill({
    id: 'b2',
    title: 'Austerity Bill',
    sponsorId: 'sponsor',
    provisions: [{ id: 'p1', description: 'Cut spending', budgetImpact: 5000 }],
  });
}

describe('computeGroupStance', () => {
  const sponsor = makePolitician({ id: 'sponsor', ideology: { economic: 80, social: 80 } });

  it('is strongly positive for an ideologically aligned free-market group on an austerity bill', () => {
    const group = makeGroup({ id: 'business', ideology: { economic: 80, social: 80 } });
    expect(computeGroupStance(group, austerityBill(), sponsor)).toBeGreaterThan(0.5);
  });

  it('is strongly negative for an ideologically opposed group', () => {
    const group = makeGroup({ id: 'labor', ideology: { economic: -80, social: -80 } });
    expect(computeGroupStance(group, austerityBill(), sponsor)).toBeLessThan(-0.5);
  });

  it('rewards fiscal alignment independent of the sponsor ideological match', () => {
    const freeMarketGroup = makeGroup({ id: 'fm', ideology: { economic: 60, social: 0 } });
    const onSpending = computeGroupStance(freeMarketGroup, spendingBill(), sponsor);
    const onAusterity = computeGroupStance(freeMarketGroup, austerityBill(), sponsor);
    expect(onAusterity).toBeGreaterThan(onSpending);
  });

  it('always stays within [-1, 1]', () => {
    const group = makeGroup({ id: 'extreme', ideology: { economic: -100, social: -100 } });
    const extremeSponsor = makePolitician({ id: 's2', ideology: { economic: 100, social: 100 } });
    const stance = computeGroupStance(group, austerityBill(), extremeSponsor);
    expect(stance).toBeGreaterThanOrEqual(-1);
    expect(stance).toBeLessThanOrEqual(1);
  });
});

describe('computeLobbyingPressure', () => {
  const sponsor = makePolitician({ id: 'sponsor', isPlayer: true, ideology: { economic: 70, social: 70 } });

  it('is 0 when there are no interest groups', () => {
    expect(computeLobbyingPressure([], austerityBill(), sponsor)).toBe(0);
  });

  it('is positive when aligned groups dominate', () => {
    const groups = [
      makeGroup({ id: 'g1', ideology: { economic: 80, social: 80 }, influence: 90 }),
      makeGroup({ id: 'g2', ideology: { economic: 70, social: 60 }, influence: 80 }),
    ];
    expect(computeLobbyingPressure(groups, austerityBill(), sponsor)).toBeGreaterThan(0);
  });

  it('is negative when opposed groups dominate', () => {
    const groups = [
      makeGroup({ id: 'g1', ideology: { economic: -80, social: -80 }, influence: 90 }),
      makeGroup({ id: 'g2', ideology: { economic: -70, social: -60 }, influence: 80 }),
    ];
    expect(computeLobbyingPressure(groups, austerityBill(), sponsor)).toBeLessThan(0);
  });

  it('a friendly disposition toward the player sponsor increases pressure beyond ideology alone', () => {
    const neutral = makeGroup({ id: 'g', ideology: { economic: 20, social: 20 }, influence: 60, disposition: 0 });
    const friendly = { ...neutral, disposition: 100 };
    const bill = austerityBill();
    const pNeutral = computeLobbyingPressure([neutral], bill, sponsor);
    const pFriendly = computeLobbyingPressure([friendly], bill, sponsor);
    expect(pFriendly).toBeGreaterThan(pNeutral);
  });

  it('stays within [-1, 1] even with many maximally-opposed high-influence groups', () => {
    const groups = Array.from({ length: 5 }, (_, i) =>
      makeGroup({ id: `g${i}`, ideology: { economic: -100, social: -100 }, influence: 100 })
    );
    const pressure = computeLobbyingPressure(groups, austerityBill(), sponsor);
    expect(pressure).toBeGreaterThanOrEqual(-1);
    expect(pressure).toBeLessThanOrEqual(1);
  });
});

describe('courtInterestGroup', () => {
  it('is deterministic for a given rng state', () => {
    const player = makePolitician({ id: 'player', attributes: { charisma: 8, intellect: 5, integrity: 5, network: 8, mediaSavvy: 5 } });
    const outcomeA = courtInterestGroup(player, new SeededRng(42));
    const outcomeB = courtInterestGroup(player, new SeededRng(42));
    expect(outcomeA).toEqual(outcomeB);
  });

  it('a higher-network, higher-charisma player succeeds more often over many trials', () => {
    const skilled = makePolitician({ id: 'skilled', attributes: { charisma: 10, intellect: 5, integrity: 5, network: 10, mediaSavvy: 5 } });
    const unskilled = makePolitician({ id: 'unskilled', attributes: { charisma: 1, intellect: 5, integrity: 5, network: 1, mediaSavvy: 5 } });
    const rngSkilled = new SeededRng(7);
    const rngUnskilled = new SeededRng(7);
    let skilledSuccesses = 0;
    let unskilledSuccesses = 0;
    for (let i = 0; i < 500; i++) {
      if (courtInterestGroup(skilled, rngSkilled).success) skilledSuccesses++;
      if (courtInterestGroup(unskilled, rngUnskilled).success) unskilledSuccesses++;
    }
    expect(skilledSuccesses).toBeGreaterThan(unskilledSuccesses);
  });
});

describe('applyCourtOutcome', () => {
  it('clamps disposition to [-100, 100]', () => {
    const group = makeGroup({ id: 'g', disposition: 95 });
    const updated = applyCourtOutcome(group, { success: true, dispositionDelta: 20 });
    expect(updated.disposition).toBe(100);
  });
});

describe('applyBillOutcomeToGroups', () => {
  const sponsor = makePolitician({ id: 'sponsor', isPlayer: true, ideology: { economic: 80, social: 80 } });

  it('warms a supportive group toward the sponsor when its favored bill passes', () => {
    const group = makeGroup({ id: 'g', ideology: { economic: 80, social: 80 }, influence: 80, disposition: 0 });
    const updated = applyBillOutcomeToGroups([group], austerityBill(), sponsor, true);
    expect(updated[0].disposition).toBeGreaterThan(0);
  });

  it('cools a supportive group when its favored bill fails', () => {
    const group = makeGroup({ id: 'g', ideology: { economic: 80, social: 80 }, influence: 80, disposition: 0 });
    const updated = applyBillOutcomeToGroups([group], austerityBill(), sponsor, false);
    expect(updated[0].disposition).toBeLessThan(0);
  });

  it('warms an opposed group when the bill it hated fails', () => {
    const group = makeGroup({ id: 'g', ideology: { economic: -80, social: -80 }, influence: 80, disposition: 0 });
    const updated = applyBillOutcomeToGroups([group], austerityBill(), sponsor, false);
    expect(updated[0].disposition).toBeGreaterThan(0);
  });
});

describe('decayGroupDispositions', () => {
  it('pulls positive disposition toward zero without crossing it', () => {
    const groups = [makeGroup({ id: 'g', disposition: 40 })];
    const decayed = decayGroupDispositions(groups);
    expect(decayed[0].disposition).toBeLessThan(40);
    expect(decayed[0].disposition).toBeGreaterThan(0);
  });

  it('pulls negative disposition toward zero without crossing it', () => {
    const groups = [makeGroup({ id: 'g', disposition: -40 })];
    const decayed = decayGroupDispositions(groups);
    expect(decayed[0].disposition).toBeGreaterThan(-40);
    expect(decayed[0].disposition).toBeLessThan(0);
  });

  it('leaves neutral disposition at zero', () => {
    const groups = [makeGroup({ id: 'g', disposition: 0 })];
    expect(decayGroupDispositions(groups)[0].disposition).toBe(0);
  });
});
