import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { Bill, Coalition, Party, Politician } from '../models/types';
import {
  applyNpcStances,
  attemptSmearCampaign,
  canSmearCampaign,
  computeAllPartyMomentum,
  computeCoalitionDisciplineBonus,
  computePartyMomentum,
  computeStrategicMomentum,
  decideNpcScandalResponse,
  decideNpcStance,
  selectNpcBillSponsor,
  selectNpcBillTemplate,
  selectNpcCampaigner,
  selectNpcCorruptionTier,
  selectSmearCampaigner,
  updateRelationshipsAfterVote,
} from './npc';

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

describe('decideNpcStance', () => {
  const sponsor = makePolitician({ id: 'sponsor', partyId: 'party-a', ideology: { economic: 60, social: 60 } });

  it('always has the sponsor voting yes on their own bill', () => {
    expect(decideNpcStance(sponsor, sponsor, 0)).toBe('yes');
  });

  it('locks in yes for a closely aligned same-party member', () => {
    const ally = makePolitician({ id: 'ally', partyId: 'party-a', ideology: { economic: 65, social: 55 } });
    expect(decideNpcStance(ally, sponsor, 0)).toBe('yes');
  });

  it('locks in no for a distant, hostile, different-party member', () => {
    const rival = makePolitician({ id: 'rival', partyId: 'party-b', ideology: { economic: -80, social: -80 } });
    expect(decideNpcStance(rival, sponsor, -50)).toBe('no');
  });

  it('leaves a genuinely contested case undecided', () => {
    const swingVoter = makePolitician({ id: 'swing', partyId: 'party-b', ideology: { economic: 30, social: 20 } });
    expect(decideNpcStance(swingVoter, sponsor, 10)).toBe('undecided');
  });

  it('does not lock a distant opposing-party member as "no" without hostile relations', () => {
    const rival = makePolitician({ id: 'rival', partyId: 'party-b', ideology: { economic: -80, social: -80 } });
    expect(decideNpcStance(rival, sponsor, 50)).toBe('undecided');
  });

  it('leaves a moderately opposed member undecided when the sponsor is not the government', () => {
    const moderate = makePolitician({ id: 'moderate', partyId: 'party-b', ideology: { economic: -20, social: -10 } });
    expect(decideNpcStance(moderate, sponsor, -5)).toBe('undecided');
  });

  it('locks a moderately opposed member "no" via coordinated opposition when the sponsor is the player', () => {
    const playerSponsor = makePolitician({ id: 'sponsor', isPlayer: true, partyId: 'party-a', ideology: { economic: 60, social: 60 } });
    const moderate = makePolitician({ id: 'moderate', partyId: 'party-b', ideology: { economic: -50, social: -40 } });
    expect(decideNpcStance(moderate, playerSponsor, -5, { coordinatedOpposition: true })).toBe('no');
  });

  it('coordinated opposition never flips a genuine ally into a "no"', () => {
    const playerSponsor = makePolitician({ id: 'sponsor', isPlayer: true, partyId: 'party-a', ideology: { economic: 60, social: 60 } });
    const ally = makePolitician({ id: 'ally', partyId: 'party-b', ideology: { economic: 55, social: 65 } });
    expect(decideNpcStance(ally, playerSponsor, 10, { coordinatedOpposition: true })).not.toBe('no');
  });

  it('a coalition bonus can pull a mildly cross-party-distant member up to a "yes"', () => {
    const nearAlly = makePolitician({ id: 'nearAlly', partyId: 'party-b', ideology: { economic: 45, social: 45 } });
    expect(decideNpcStance(nearAlly, sponsor, 0)).toBe('undecided');
    expect(decideNpcStance(nearAlly, sponsor, 0, { coalitionBonus: 0.15 })).toBe('yes');
  });
});

function makeCoalition(overrides: Partial<Coalition> = {}): Coalition {
  return {
    id: 'coalition-1',
    memberPartyIds: ['party-a', 'party-b'],
    formateurPartyId: 'party-a',
    primeMinisterId: 'sponsor',
    seatsHeld: 10,
    totalSeats: 20,
    status: 'governing',
    confidenceVotesFor: 0,
    confidenceVotesAgainst: 0,
    formedTurn: 1,
    ...overrides,
  };
}

describe('computeCoalitionDisciplineBonus', () => {
  const sponsor = makePolitician({ id: 'sponsor', partyId: 'party-a' });

  it('is zero with no active coalition', () => {
    const member = makePolitician({ id: 'm', partyId: 'party-b' });
    expect(computeCoalitionDisciplineBonus(member, sponsor, null)).toBe(0);
  });

  it('is zero when the member already shares the sponsor\'s party', () => {
    const member = makePolitician({ id: 'm', partyId: 'party-a' });
    expect(computeCoalitionDisciplineBonus(member, sponsor, makeCoalition())).toBe(0);
  });

  it('is positive when both parties are in the same coalition', () => {
    const member = makePolitician({ id: 'm', partyId: 'party-b' });
    expect(computeCoalitionDisciplineBonus(member, sponsor, makeCoalition())).toBeGreaterThan(0);
  });

  it('is zero when the member\'s party is outside the coalition', () => {
    const member = makePolitician({ id: 'm', partyId: 'party-c' });
    expect(computeCoalitionDisciplineBonus(member, sponsor, makeCoalition())).toBe(0);
  });
});

describe('applyNpcStances', () => {
  const sponsor = makePolitician({ id: 'sponsor', partyId: 'party-a', ideology: { economic: 60, social: 60 } });
  const ally = makePolitician({ id: 'ally', partyId: 'party-a', ideology: { economic: 65, social: 55 } });
  const rival = makePolitician({ id: 'rival', partyId: 'party-b', ideology: { economic: -80, social: -80 } });
  const player = makePolitician({ id: 'player', isPlayer: true, ideology: { economic: 0, social: 0 } });

  function floorBill(): Bill {
    return { id: 'b1', title: 'Test', provisions: [], sponsorId: 'sponsor', status: 'floor', whipCount: {} };
  }

  it('locks in clear-cut stances and leaves the rest untouched', () => {
    const bill = applyNpcStances(floorBill(), [sponsor, ally, rival, player], sponsor, { [`rival:sponsor`]: -50 });
    expect(bill.whipCount.ally).toBe('yes');
    expect(bill.whipCount.rival).toBe('no');
  });

  it('never assigns a stance to the player', () => {
    const bill = applyNpcStances(floorBill(), [sponsor, ally, rival, player], sponsor, {});
    expect(bill.whipCount.player).toBeUndefined();
  });

  it('does not overwrite a stance already locked (e.g. by the player)', () => {
    const preLocked: Bill = { ...floorBill(), whipCount: { ally: 'no' } };
    const bill = applyNpcStances(preLocked, [sponsor, ally, rival, player], sponsor, {});
    expect(bill.whipCount.ally).toBe('no');
  });

  it('whips a moderately-opposed rival "no" when the sponsor is the player, but not otherwise', () => {
    const playerSponsor = makePolitician({ id: 'player', isPlayer: true, partyId: 'party-a', ideology: { economic: 60, social: 60 } });
    const moderate = makePolitician({ id: 'moderate', partyId: 'party-b', ideology: { economic: -50, social: -40 } });

    const npcBill = applyNpcStances(floorBill(), [sponsor, moderate], sponsor, { 'moderate:sponsor': -5 });
    expect(npcBill.whipCount.moderate).toBeUndefined();

    const playerBill = applyNpcStances(
      { ...floorBill(), sponsorId: 'player' },
      [playerSponsor, moderate],
      playerSponsor,
      { 'moderate:player': -5 }
    );
    expect(playerBill.whipCount.moderate).toBe('no');
  });
});

describe('selectNpcBillSponsor', () => {
  it('never selects the player', () => {
    const player = makePolitician({ id: 'player', isPlayer: true });
    const others = [makePolitician({ id: 'a' }), makePolitician({ id: 'b' })];
    const rng = new SeededRng(1);
    for (let i = 0; i < 50; i++) {
      const sponsor = selectNpcBillSponsor([player, ...others], rng);
      expect(sponsor?.isPlayer).toBe(false);
    }
  });

  it('returns null when there are no NPCs to choose from', () => {
    const player = makePolitician({ id: 'player', isPlayer: true });
    expect(selectNpcBillSponsor([player], new SeededRng(1))).toBeNull();
  });

  it('favors higher network+intellect candidates over many draws', () => {
    const ambitious = makePolitician({
      id: 'ambitious',
      attributes: { charisma: 5, intellect: 10, integrity: 5, network: 10, mediaSavvy: 5 },
    });
    const meek = makePolitician({
      id: 'meek',
      attributes: { charisma: 5, intellect: 1, integrity: 5, network: 1, mediaSavvy: 5 },
    });
    const rng = new SeededRng(7);
    let ambitiousCount = 0;
    const trials = 500;
    for (let i = 0; i < trials; i++) {
      if (selectNpcBillSponsor([ambitious, meek], rng)?.id === 'ambitious') ambitiousCount++;
    }
    expect(ambitiousCount / trials).toBeGreaterThan(0.7);
  });
});

describe('selectNpcBillTemplate', () => {
  const bigSpend = { title: 'Big Spend', provisions: [{ budgetImpact: -5000 }] };
  const fiscallyTight = { title: 'Tight Budget', provisions: [{ budgetImpact: 500 }] };

  it('favors fiscally tight templates for a free-market sponsor', () => {
    const marketSponsor = makePolitician({ id: 's', ideology: { economic: 80, social: 0 } });
    const rng = new SeededRng(3);
    let tightCount = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      if (selectNpcBillTemplate(marketSponsor, [bigSpend, fiscallyTight], rng).title === 'Tight Budget') {
        tightCount++;
      }
    }
    expect(tightCount / trials).toBeGreaterThan(0.5);
  });

  it('favors big-spend templates for a state-leaning sponsor', () => {
    const stateSponsor = makePolitician({ id: 's', ideology: { economic: -80, social: 0 } });
    const rng = new SeededRng(4);
    let bigSpendCount = 0;
    const trials = 300;
    for (let i = 0; i < trials; i++) {
      if (selectNpcBillTemplate(stateSponsor, [bigSpend, fiscallyTight], rng).title === 'Big Spend') {
        bigSpendCount++;
      }
    }
    expect(bigSpendCount / trials).toBeGreaterThan(0.5);
  });
});

describe('updateRelationshipsAfterVote', () => {
  it('warms relations with those who voted the same way as the player', () => {
    const relationships = updateRelationshipsAfterVote({}, 'player', { player: 'yes', ally: 'yes' });
    expect(relationships['ally:player']).toBe(2);
  });

  it('cools relations with those who voted the opposite way', () => {
    const relationships = updateRelationshipsAfterVote({}, 'player', { player: 'yes', rival: 'no' });
    expect(relationships['player:rival']).toBe(-2);
  });

  it('is a no-op if the player has no recorded vote', () => {
    const before = { 'a:b': 10 };
    expect(updateRelationshipsAfterVote(before, 'player', { a: 'yes', b: 'no' })).toEqual(before);
  });

  it('clamps to -100..100', () => {
    const relationships = updateRelationshipsAfterVote({ 'player:rival': -99 }, 'player', {
      player: 'yes',
      rival: 'no',
    });
    expect(relationships['player:rival']).toBe(-100);
  });
});

describe('computePartyMomentum', () => {
  it('is neutral (1.0) at 50% approval', () => {
    expect(computePartyMomentum(50)).toBeCloseTo(1.0, 5);
  });

  it('rises with approval and falls with disapproval', () => {
    expect(computePartyMomentum(90)).toBeGreaterThan(computePartyMomentum(50));
    expect(computePartyMomentum(10)).toBeLessThan(computePartyMomentum(50));
  });

  it('stays within the 0.7..1.3 bounds', () => {
    expect(computePartyMomentum(0)).toBeCloseTo(0.7, 5);
    expect(computePartyMomentum(100)).toBeCloseTo(1.3, 5);
  });
});

function makeParty(overrides: Partial<Party> & { id: string }): Party {
  return { name: overrides.id, ideology: { economic: 0, social: 0 }, seats: 1, factions: [], ...overrides };
}

describe('computeAllPartyMomentum', () => {
  it('gives every party its own momentum from its members\' average approval, not just the player\'s', () => {
    const partyA = makeParty({ id: 'party-a' });
    const partyB = makeParty({ id: 'party-b' });
    const politicians = [
      makePolitician({ id: 'p1', partyId: 'party-a', approval: { public: 90, base: 50, partyElite: 50 } }),
      makePolitician({ id: 'p2', partyId: 'party-b', approval: { public: 10, base: 50, partyElite: 50 } }),
    ];
    const momentum = computeAllPartyMomentum(politicians, [partyA, partyB]);
    expect(momentum['party-a']).toBeGreaterThan(momentum['party-b']);
  });

  it('averages across every member of a party', () => {
    const party = makeParty({ id: 'party-a' });
    const politicians = [
      makePolitician({ id: 'p1', partyId: 'party-a', approval: { public: 100, base: 50, partyElite: 50 } }),
      makePolitician({ id: 'p2', partyId: 'party-a', approval: { public: 0, base: 50, partyElite: 50 } }),
    ];
    const momentum = computeAllPartyMomentum(politicians, [party]);
    expect(momentum['party-a']).toBeCloseTo(computePartyMomentum(50), 5);
  });

  it('omits a party with no sitting members', () => {
    const empty = makeParty({ id: 'party-empty' });
    const momentum = computeAllPartyMomentum([], [empty]);
    expect(momentum['party-empty']).toBeUndefined();
  });
});

describe('computeStrategicMomentum', () => {
  it('boosts a party in real contention for the lead over its plain approval-driven momentum', () => {
    const leader = makeParty({ id: 'leader', seats: 55 });
    const contender = makeParty({ id: 'contender', seats: 45 });
    const politicians = [
      makePolitician({ id: 'l1', partyId: 'leader', approval: { public: 50, base: 50, partyElite: 50 } }),
      makePolitician({ id: 'c1', partyId: 'contender', approval: { public: 50, base: 50, partyElite: 50 } }),
    ];
    const base = computeAllPartyMomentum(politicians, [leader, contender]);
    const strategic = computeStrategicMomentum(politicians, [leader, contender]);
    expect(strategic.leader).toBeGreaterThan(base.leader);
    expect(strategic.contender).toBeGreaterThan(base.contender);
  });

  it('penalizes a clear also-ran relative to its plain approval-driven momentum', () => {
    const leader = makeParty({ id: 'leader', seats: 90 });
    const longshot = makeParty({ id: 'longshot', seats: 10 });
    const politicians = [
      makePolitician({ id: 'l1', partyId: 'leader', approval: { public: 50, base: 50, partyElite: 50 } }),
      makePolitician({ id: 's1', partyId: 'longshot', approval: { public: 50, base: 50, partyElite: 50 } }),
    ];
    const base = computeAllPartyMomentum(politicians, [leader, longshot]);
    const strategic = computeStrategicMomentum(politicians, [leader, longshot]);
    expect(strategic.longshot).toBeLessThan(base.longshot);
  });

  it('never lets the strategic multiplier push momentum outside the 0.7..1.3 band', () => {
    const leader = makeParty({ id: 'leader', seats: 100 });
    const politicians = [makePolitician({ id: 'l1', partyId: 'leader', approval: { public: 100, base: 50, partyElite: 50 } })];
    const strategic = computeStrategicMomentum(politicians, [leader]);
    expect(strategic.leader).toBeLessThanOrEqual(1.3);
    expect(strategic.leader).toBeGreaterThanOrEqual(0.7);
  });

  it('still ranks a popular party above an unpopular one at identical seat share', () => {
    const partyA = makeParty({ id: 'a', seats: 50 });
    const partyB = makeParty({ id: 'b', seats: 50 });
    const popular = [makePolitician({ id: 'a1', partyId: 'a', approval: { public: 90, base: 50, partyElite: 50 } })];
    const unpopular = [makePolitician({ id: 'b1', partyId: 'b', approval: { public: 10, base: 50, partyElite: 50 } })];
    const strategic = computeStrategicMomentum([...popular, ...unpopular], [partyA, partyB]);
    expect(strategic.a).toBeGreaterThan(strategic.b);
  });

  it('falls back to plain momentum when no party holds any seats yet', () => {
    const party = makeParty({ id: 'p', seats: 0 });
    const politicians = [makePolitician({ id: 'p1', partyId: 'p' })];
    expect(computeStrategicMomentum(politicians, [party])).toEqual(computeAllPartyMomentum(politicians, [party]));
  });
});

describe('selectNpcCampaigner', () => {
  it('never selects the player', () => {
    const player = makePolitician({ id: 'player', isPlayer: true });
    const others = [makePolitician({ id: 'a' }), makePolitician({ id: 'b' })];
    const rng = new SeededRng(1);
    for (let i = 0; i < 50; i++) {
      expect(selectNpcCampaigner([player, ...others], rng)?.isPlayer).toBe(false);
    }
  });

  it('returns null with no NPCs to choose from', () => {
    const player = makePolitician({ id: 'player', isPlayer: true });
    expect(selectNpcCampaigner([player], new SeededRng(1))).toBeNull();
  });

  it('favors a more charismatic/media-savvy/well-connected candidate over many draws', () => {
    const star = makePolitician({
      id: 'star',
      attributes: { charisma: 10, intellect: 5, integrity: 5, network: 10, mediaSavvy: 10 },
    });
    const wallflower = makePolitician({
      id: 'wallflower',
      attributes: { charisma: 1, intellect: 5, integrity: 5, network: 1, mediaSavvy: 1 },
    });
    const rng = new SeededRng(11);
    let starCount = 0;
    const trials = 500;
    for (let i = 0; i < trials; i++) {
      if (selectNpcCampaigner([star, wallflower], rng)?.id === 'star') starCount++;
    }
    expect(starCount / trials).toBeGreaterThan(0.7);
  });
});

describe('selectNpcCorruptionTier', () => {
  it('sits out far more often for a high-integrity politician than a low-integrity one', () => {
    const scrupulous = makePolitician({
      id: 'clean',
      attributes: { charisma: 5, intellect: 5, integrity: 10, network: 5, mediaSavvy: 5 },
    });
    const reckless = makePolitician({
      id: 'dirty',
      attributes: { charisma: 5, intellect: 5, integrity: 1, network: 5, mediaSavvy: 5 },
    });
    const trials = 500;
    let cleanAttempts = 0;
    let dirtyAttempts = 0;
    const rngClean = new SeededRng(5);
    const rngDirty = new SeededRng(5);
    for (let i = 0; i < trials; i++) {
      if (selectNpcCorruptionTier(scrupulous, rngClean) !== null) cleanAttempts++;
      if (selectNpcCorruptionTier(reckless, rngDirty) !== null) dirtyAttempts++;
    }
    expect(dirtyAttempts).toBeGreaterThan(cleanAttempts);
  });

  it('only ever returns a valid tier or null', () => {
    const politician = makePolitician({ id: 'p', attributes: { charisma: 5, intellect: 5, integrity: 3, network: 5, mediaSavvy: 5 } });
    const rng = new SeededRng(9);
    for (let i = 0; i < 200; i++) {
      const tier = selectNpcCorruptionTier(politician, rng);
      expect(tier === null || ['soft', 'medium', 'hard'].includes(tier)).toBe(true);
    }
  });
});

describe('canSmearCampaign', () => {
  const target = makePolitician({ id: 'target', ideology: { economic: 60, social: 60 } });

  it('requires the target to have an active scandal', () => {
    const rival = makePolitician({ id: 'rival', ideology: { economic: -60, social: -60 } });
    expect(canSmearCampaign(rival, target, -50, false)).toBe(false);
  });

  it('requires ideological opposition and a hostile relationship', () => {
    const closeAlly = makePolitician({ id: 'ally', ideology: { economic: 65, social: 55 } });
    expect(canSmearCampaign(closeAlly, target, -50, true)).toBe(false);

    const opponentButFriendly = makePolitician({ id: 'friendly-opponent', ideology: { economic: -60, social: -60 } });
    expect(canSmearCampaign(opponentButFriendly, target, 50, true)).toBe(false);
  });

  it('allows a hostile ideological opponent to smear a target with an active scandal', () => {
    const rival = makePolitician({ id: 'rival', ideology: { economic: -60, social: -60 } });
    expect(canSmearCampaign(rival, target, -50, true)).toBe(true);
  });

  it('never allows smearing yourself', () => {
    expect(canSmearCampaign(target, target, -100, true)).toBe(false);
  });
});

describe('selectSmearCampaigner', () => {
  const target = makePolitician({ id: 'target', ideology: { economic: 60, social: 60 } });

  it('returns null when nobody is eligible', () => {
    const ally = makePolitician({ id: 'ally', ideology: { economic: 65, social: 55 } });
    const rng = new SeededRng(1);
    expect(selectSmearCampaigner([ally, target], target, {}, true, rng)).toBeNull();
  });

  it('never picks the player or the target', () => {
    const player = makePolitician({ id: 'player', isPlayer: true, ideology: { economic: -60, social: -60 } });
    const rival = makePolitician({ id: 'rival', ideology: { economic: -60, social: -60 } });
    const relationships = { 'player:target': -50, 'rival:target': -50 };
    const rng = new SeededRng(2);
    for (let i = 0; i < 20; i++) {
      const picked = selectSmearCampaigner([player, rival, target], target, relationships, true, rng);
      expect(picked?.id).toBe('rival');
    }
  });
});

describe('attemptSmearCampaign', () => {
  it('lands far more often than it backfires for a skilled attacker', () => {
    const skilled = makePolitician({
      id: 'skilled',
      attributes: { charisma: 10, intellect: 5, integrity: 5, network: 5, mediaSavvy: 10 },
    });
    const rng = new SeededRng(3);
    let landed = 0;
    const trials = 500;
    for (let i = 0; i < trials; i++) {
      if (attemptSmearCampaign(skilled, rng).outcome === 'landed') landed++;
    }
    expect(landed / trials).toBeGreaterThan(0.8);
  });

  it('a landed smear hurts the target and helps the attacker; a backfire does the reverse', () => {
    const attacker = makePolitician({ id: 'a' });
    const rng = new SeededRng(4);
    for (let i = 0; i < 50; i++) {
      const outcome = attemptSmearCampaign(attacker, rng);
      if (outcome.outcome === 'landed') {
        expect(outcome.targetApprovalImpact).toBeLessThan(0);
        expect(outcome.attackerApprovalImpact).toBeGreaterThan(0);
      } else {
        expect(outcome.targetApprovalImpact).toBeLessThanOrEqual(0);
        expect(outcome.attackerApprovalImpact).toBeLessThan(0);
      }
    }
  });
});

describe('decideNpcScandalResponse', () => {
  it('admits fault when integrity is high', () => {
    const p = makePolitician({ id: 'p', attributes: { charisma: 5, intellect: 5, integrity: 8, network: 2, mediaSavvy: 5 } });
    expect(decideNpcScandalResponse(p)).toBe('admit');
  });

  it('scapegoats when integrity is low but network is high', () => {
    const p = makePolitician({ id: 'p', attributes: { charisma: 5, intellect: 5, integrity: 3, network: 9, mediaSavvy: 5 } });
    expect(decideNpcScandalResponse(p)).toBe('scapegoat');
  });

  it('denies when both integrity and network are low', () => {
    const p = makePolitician({ id: 'p', attributes: { charisma: 5, intellect: 5, integrity: 2, network: 2, mediaSavvy: 5 } });
    expect(decideNpcScandalResponse(p)).toBe('deny');
  });
});
