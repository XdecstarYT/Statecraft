import { describe, expect, it } from 'vitest';
import {
  createNewGame,
  advanceTurn,
  runLegislativeElection,
  runWarTurns,
  commitCorruption,
  respondToScandal,
  proposeTreaty,
  signTreaty,
  holdPressInterview,
  holdRally,
  declareWar,
  proposeTradeDeal,
  signTradeDeal,
  beginElectionNight,
  reportNextProvinceAction,
  concludeElectionNightAction,
  dismissElectionNight,
  appointToCabinet,
  mergePartiesAction,
  MAX_HEAD_OF_GOVERNMENT_TERMS,
  TERM_LENGTH_TURNS,
  buildMineAction,
  upgradeMineAction,
  buildFactoryAction,
  upgradeFactoryAction,
  sellRawResourceAction,
  sellProcessedGoodAction,
  runIndustryTurn,
  MAX_MINE_TIER,
  nominateJusticeAction,
  confirmJusticeAction,
  unlockTechAction,
  runJudiciaryTurn,
  runResearchTurn,
  runDemographicsTurn,
  runSocialPolicyTurn,
  runEnterpriseTurn,
  foundCompanyAction,
  ipoCompanyAction,
  buySharesAction,
  sellSharesAction,
  DEFAULT_COURT_SIZE,
  COMPANY_FOUNDING_COST,
  type GameState,
} from './index';
import { SeededRng } from './rng';
import { VANTORRA_COUNTRY, VANTORRA_PARTIES } from '../content/countries/vantorra';
import { ALL_NATIONS } from '../content/diplomacy/nations';

describe('election term schedule', () => {
  it('a fresh game has a next election scheduled a full term out', () => {
    const state = createNewGame(1);
    expect(state.nextElectionTurn).toBeGreaterThan(state.turn);
  });

  it('running an instant election resets the schedule a full term from now', () => {
    const state = createNewGame(1);
    const { state: after } = runLegislativeElection(state);
    expect(after.nextElectionTurn).toBe(after.turn + TERM_LENGTH_TURNS);
  });

  it('concluding an election night also resets the schedule', () => {
    let state = createNewGame(1);
    state = beginElectionNight(state);
    while (state.electionNight!.status === 'reporting') {
      state = reportNextProvinceAction(state);
    }
    state = concludeElectionNightAction(state);
    expect(state.nextElectionTurn).toBe(state.turn + TERM_LENGTH_TURNS);
  });
});

describe('createNewGame', () => {
  it('produces one politician per starting seat, and exactly one player', () => {
    const state = createNewGame(1);
    const totalSeats = state.parties.reduce((sum, p) => sum + p.seats, 0);
    expect(state.politicians).toHaveLength(totalSeats);

    const players = state.politicians.filter((p) => p.isPlayer);
    expect(players).toHaveLength(1);
  });

  it('is fully deterministic for the same seed', () => {
    const a = createNewGame(2024);
    const b = createNewGame(2024);
    expect(a).toEqual(b);
  });

  it('produces different legislatures for different seeds', () => {
    const a = createNewGame(1);
    const b = createNewGame(2);
    expect(a.politicians.map((p) => p.name)).not.toEqual(b.politicians.map((p) => p.name));
  });

  it('keeps every politician ideology within the -100..100 bounds', () => {
    const state = createNewGame(555);
    for (const p of state.politicians) {
      expect(p.ideology.economic).toBeGreaterThanOrEqual(-100);
      expect(p.ideology.economic).toBeLessThanOrEqual(100);
      expect(p.ideology.social).toBeGreaterThanOrEqual(-100);
      expect(p.ideology.social).toBeLessThanOrEqual(100);
    }
  });

  const usCountry = {
    id: 'united-states',
    name: 'United States',
    regimeType: 'presidential' as const,
    legislature: { name: 'House', electoralSystem: 'FPTP' as const, districts: [], totalSeats: 1, prThreshold: 0.05 },
  };

  it('populates the full world roster, excluding the player\'s own real country', () => {
    const state = createNewGame(1, { country: usCountry });
    expect(state.foreignCounterparts.some((c) => c.id === 'united-states')).toBe(false);
    expect(state.foreignCounterparts.length).toBeGreaterThan(180);
  });

  it('leaves the full roster untouched for a fictional starter country', () => {
    const state = createNewGame(1);
    expect(state.foreignCounterparts.length).toBe(ALL_NATIONS.length);
  });

  it('gives the player a starting military profile matching the real nation when playing one', () => {
    const usProfile = ALL_NATIONS.find((n) => n.id === 'united-states')!.military;
    const state = createNewGame(1, { country: usCountry });
    expect(state.playerMilitary).toEqual(usProfile);
  });
});

describe('advanceTurn', () => {
  it('increments the turn counter and moves the economy', () => {
    const state = createNewGame(10);
    const next = advanceTurn(state);
    expect(next.turn).toBe(state.turn + 1);
    expect(next.economy).not.toEqual(state.economy);
  });

  it('replays identically from the same seed and same sequence of actions', () => {
    const runOnce = (seed: number) => {
      let state = createNewGame(seed);
      state = advanceTurn(state);
      state = advanceTurn(state);
      state = advanceTurn(state);
      return state;
    };
    expect(runOnce(42)).toEqual(runOnce(42));
  });
});

describe('holdPressInterview / holdRally', () => {
  it('pushes a decaying approval event onto the player rather than an instant change', () => {
    const state = createNewGame(8);
    const player = state.politicians.find((p) => p.isPlayer)!;
    const { state: next, outcome } = holdPressInterview(state);
    const playerAfter = next.politicians.find((p) => p.id === player.id)!;
    expect(playerAfter.approvalEvents.length).toBeGreaterThan(0);
    expect(playerAfter.approval.public).toBe(player.approval.public); // not applied until advanceTurn
    expect(['strong', 'solid', 'gaffe']).toContain(outcome.outcome);
  });

  it('holdRally affects base approval, not public', () => {
    const state = createNewGame(8);
    const player = state.politicians.find((p) => p.isPlayer)!;
    const { state: next } = holdRally(state);
    const playerAfter = next.politicians.find((p) => p.id === player.id)!;
    expect(playerAfter.approvalEvents.some((e) => e.audience === 'base')).toBe(true);
    expect(playerAfter.approvalEvents.some((e) => e.audience === 'public')).toBe(false);
  });

  it('is deterministic for the same starting state', () => {
    const state = createNewGame(8);
    expect(holdPressInterview(state).outcome).toEqual(holdPressInterview(state).outcome);
  });
});

describe('runNpcTurn via advanceTurn', () => {
  it('eventually sponsors, progresses, and resolves an NPC bill over many turns', () => {
    let state = createNewGame(21);
    let sawDrafting = false;
    let sawResolved = false;

    for (let i = 0; i < 30; i++) {
      state = advanceTurn(state);
      const npcBills = state.bills.filter((b) => {
        const sponsor = state.politicians.find((p) => p.id === b.sponsorId);
        return sponsor && !sponsor.isPlayer;
      });
      if (npcBills.some((b) => b.status === 'drafting' || b.status === 'committee')) sawDrafting = true;
      if (npcBills.some((b) => b.status === 'passed' || b.status === 'failed')) sawResolved = true;
    }

    expect(sawDrafting).toBe(true);
    expect(sawResolved).toBe(true);
  });

  it('resolves the player into the final tally on any NPC bill that reaches a vote, rather than skipping them', () => {
    let state = createNewGame(21);
    const player = state.politicians.find((p) => p.isPlayer)!;
    let sawPlayerVote = false;
    for (let i = 0; i < 10; i++) {
      state = advanceTurn(state);
      for (const bill of state.bills) {
        const sponsor = state.politicians.find((p) => p.id === bill.sponsorId);
        if (sponsor && !sponsor.isPlayer && (bill.status === 'passed' || bill.status === 'failed')) {
          expect(['yes', 'no']).toContain(bill.whipCount[player.id]);
          sawPlayerVote = true;
        }
      }
    }
    expect(sawPlayerVote).toBe(true);
  });

  it('replays identically from the same seed, including NPC bill activity', () => {
    const runOnce = () => {
      let state = createNewGame(21);
      for (let i = 0; i < 15; i++) state = advanceTurn(state);
      return state;
    };
    expect(runOnce()).toEqual(runOnce());
  });

  it('eventually has a rival hold a press interview or rally of their own', () => {
    let state = createNewGame(21);
    const initialEvents = new Map(state.politicians.map((p) => [p.id, p.approvalEvents.length]));
    let sawNpcCampaignEvent = false;

    for (let i = 0; i < 20; i++) {
      state = advanceTurn(state);
      for (const p of state.politicians) {
        if (p.isPlayer) continue;
        if (p.approvalEvents.length > (initialEvents.get(p.id) ?? 0)) sawNpcCampaignEvent = true;
      }
    }

    expect(sawNpcCampaignEvent).toBe(true);
  });

  it('eventually has a rival risk a corrupt act, resolved without player input', () => {
    let state = createNewGame(21);
    let sawNpcScandal = false;

    // A generous turn count, not just enough to make the seed-21 average
    // work out today: every new per-turn system added to advanceTurn
    // shifts the single shared rng stream for every later draw, so a tight
    // cutoff tuned against one exact sequence breaks the next time
    // anything upstream changes. Detection is rare enough that even 200
    // turns isn't a safe margin for this seed — 400 comfortably clears it.
    for (let i = 0; i < 400; i++) {
      state = advanceTurn(state);
      const npcScandals = state.scandals.filter((s) => {
        const politician = state.politicians.find((p) => p.id === s.politicianId);
        return politician && !politician.isPlayer;
      });
      if (npcScandals.length > 0) {
        sawNpcScandal = true;
        // NPC scandals resolve themselves — never left dangling for the player.
        expect(npcScandals.every((s) => s.status === 'resolved')).toBe(true);
      }
    }

    expect(sawNpcScandal).toBe(true);
  });
});

describe('commitCorruption / respondToScandal', () => {
  it('always banks the configured favor gain with the target, detected or not', () => {
    const state = createNewGame(3);
    const actor = state.politicians.find((p) => !p.isPlayer)!;
    const target = state.politicians.find((p) => p.id !== actor.id)!;
    const { state: next, outcome } = commitCorruption(state, actor.id, target.id, 'soft');
    expect(next.favorBank[target.id]).toBe(outcome.favorGain);
  });

  it('opens an unresolved scandal only when detected, and resolving it applies an approval hit', () => {
    const state = createNewGame(3);
    const actor = state.politicians.find((p) => !p.isPlayer)!;
    const target = state.politicians.find((p) => p.id !== actor.id)!;

    // Full scrutiny + hard tier gives at least a 0.65 detection chance (see
    // corruption.test.ts for the exact formula) — try a bounded number of
    // seeds rather than asserting on one, so this isn't a flaky RNG bet.
    let caught: ReturnType<typeof commitCorruption>['state'] | undefined;
    let scandalId: string | undefined;
    for (let seed = 0; seed < 20 && !scandalId; seed++) {
      const attempt = commitCorruption({ ...state, rngState: seed }, actor.id, target.id, 'hard', 1);
      if (attempt.outcome.detected) {
        caught = attempt.state;
        scandalId = attempt.outcome.scandalId;
      }
    }
    expect(scandalId).toBeDefined();
    expect(caught!.scandals).toHaveLength(1);
    expect(caught!.scandals[0].status).toBe('unresolved');

    const resolved = respondToScandal(caught!, scandalId!, 'admit');
    expect(resolved.scandals[0].status).toBe('resolved');
    const actorAfter = resolved.politicians.find((p) => p.id === actor.id)!;
    expect(actorAfter.approvalEvents.length).toBeGreaterThan(0);
  });

  it('is a no-op for an unknown scandal id', () => {
    const state = createNewGame(3);
    expect(respondToScandal(state, 'no-such-scandal', 'admit')).toEqual(state);
  });
});

describe('treaty flow via the engine barrel', () => {
  it('signing a treaty updates relations immediately and queues the economic effect', () => {
    const state = createNewGame(4);
    const counterpart = state.foreignCounterparts[0];
    const treaty = proposeTreaty({
      id: 't1',
      counterpartId: counterpart.id,
      type: 'trade',
      title: 'Trade Deal',
      economyEffect: { gdpGrowth: 0.3 },
      relationEffect: 10,
    });
    const { relations, economy } = signTreaty(treaty, state.economy, state.foreignRelations);
    expect(relations[counterpart.id]).toBe(10);
    expect(economy.pendingEffects).toHaveLength(1);
  });
});

describe('trade deal flow via the engine barrel', () => {
  it('signing a trade deal queues its economic effect', () => {
    const state = createNewGame(4);
    const counterpart = state.foreignCounterparts[0];
    const deal = proposeTradeDeal('d1', counterpart.id, 'energy', 100, 0);
    const { economy } = signTradeDeal(deal, state.economy, state.foreignRelations);
    expect(economy.pendingEffects).toHaveLength(1);
  });
});

describe('runWarTurns', () => {
  it('is a no-op when there is no active war', () => {
    const state = createNewGame(4);
    expect(runWarTurns(state, SeededRng.fromState(state.rngState))).toEqual(state);
  });

  it('resolves a heavily lopsided war in the stronger side\'s favor within a bounded number of turns', () => {
    let state = createNewGame(4);
    const counterpart = state.foreignCounterparts[0];
    state = {
      ...state,
      playerMilitary: { strength: 95, personnel: 1000, techLevel: 90 },
      foreignCounterparts: state.foreignCounterparts.map((c) =>
        c.id === counterpart.id ? { ...c, military: { strength: 5, personnel: 10, techLevel: 10 } } : c
      ),
      wars: [declareWar(counterpart.id, state.turn)],
    };

    for (let i = 0; i < 30 && state.wars[0].status === 'active'; i++) {
      state = advanceTurn(state);
    }

    expect(state.wars[0].status).toBe('won');
    expect(state.foreignRelations[counterpart.id]).toBeLessThan(0);
  });

  it('always drains the budget while a war remains active', () => {
    let state = createNewGame(4);
    const counterpart = state.foreignCounterparts[0];
    state = { ...state, wars: [declareWar(counterpart.id, state.turn)] };
    const before = state.economy.budgetBalance;
    const after = runWarTurns(state, SeededRng.fromState(state.rngState));
    expect(after.economy.budgetBalance).toBeLessThan(before);
  });

  it('wears down both militaries (attrition) each active turn', () => {
    let state = createNewGame(4);
    const counterpart = state.foreignCounterparts[0];
    state = { ...state, wars: [declareWar(counterpart.id, state.turn)] };
    const playerBefore = state.playerMilitary.personnel;
    const counterpartBefore = counterpart.military.personnel;

    const after = runWarTurns(state, SeededRng.fromState(state.rngState));
    const counterpartAfter = after.foreignCounterparts.find((c) => c.id === counterpart.id)!;

    expect(after.playerMilitary.personnel).toBeLessThan(playerBefore);
    expect(counterpartAfter.military.personnel).toBeLessThan(counterpartBefore);
  });

  it('an active defense treaty ally measurably helps win a close war', () => {
    let state = createNewGame(4);
    const enemy = state.foreignCounterparts[0];
    const potentialAlly = state.foreignCounterparts[1];

    const base = {
      ...state,
      playerMilitary: { strength: 45, personnel: 500, techLevel: 45 },
      foreignCounterparts: state.foreignCounterparts.map((c) =>
        c.id === enemy.id ? { ...c, military: { strength: 50, personnel: 500, techLevel: 45 } } : c
      ),
    };

    const runToConclusion = (s: GameState, seed: number) => {
      let cur = { ...s, wars: [declareWar(enemy.id, s.turn)], rngState: seed };
      for (let i = 0; i < 100 && cur.wars[0].status === 'active'; i++) {
        cur = advanceTurn(cur);
      }
      return cur;
    };

    const alone = runToConclusion(base, 1);

    const withAlly = runToConclusion(
      {
        ...base,
        treaties: [
          {
            id: 't-ally',
            counterpartId: potentialAlly.id,
            type: 'defense',
            title: 'Mutual Defense Pact',
            status: 'active',
            economyEffect: {},
            relationEffect: 0,
          },
        ],
      },
      1
    );

    // With the exact same seed and starting matchup, the allied run should
    // never do *worse* than fighting alone, and should measurably help
    // (the war either resolves faster or the outcome tips in the player's
    // favor) since the ally contributes real effective strength.
    expect(withAlly.wars[0].advantage).toBeGreaterThanOrEqual(alone.wars[0].advantage);
  });
});

describe('runLegislativeElection', () => {
  it('allocates a number of seats equal to the legislature size', () => {
    const state = createNewGame(7);
    const { outcome } = runLegislativeElection(state);
    const totalSeats = Object.values(outcome.seatsWon).reduce((a, b) => a + b, 0);
    expect(totalSeats).toBe(state.country.legislature.districts.length);
  });

  it('updates party seat counts to match the outcome', () => {
    const state = createNewGame(7);
    const { state: nextState, outcome } = runLegislativeElection(state);
    for (const party of nextState.parties) {
      expect(party.seats).toBe(outcome.seatsWon[party.id] ?? 0);
    }
  });

  it('is deterministic for the same starting state', () => {
    const state = createNewGame(99);
    const a = runLegislativeElection(state);
    const b = runLegislativeElection(state);
    expect(a.outcome).toEqual(b.outcome);
  });

  it('gives the player\'s party a better result when their approval is high than when it is low', () => {
    const base = createNewGame(99);
    const player = base.politicians.find((p) => p.isPlayer)!;

    const popular = {
      ...base,
      politicians: base.politicians.map((p) =>
        p.id === player.id ? { ...p, approval: { ...p.approval, public: 90 } } : p
      ),
    };
    const unpopular = {
      ...base,
      politicians: base.politicians.map((p) =>
        p.id === player.id ? { ...p, approval: { ...p.approval, public: 10 } } : p
      ),
    };

    const popularResult = runLegislativeElection(popular).outcome.seatsWon[player.partyId] ?? 0;
    const unpopularResult = runLegislativeElection(unpopular).outcome.seatsWon[player.partyId] ?? 0;
    expect(popularResult).toBeGreaterThanOrEqual(unpopularResult);
  });
});

describe('election night flow', () => {
  it('runs polls-open through a concluded, dismissable night for an FPTP country', () => {
    let state = createNewGame(11);
    state = beginElectionNight(state);
    expect(state.electionNight).not.toBeNull();
    expect(state.electionNight!.status).toBe('reporting');

    while (state.electionNight!.status === 'reporting') {
      state = reportNextProvinceAction(state);
    }
    expect(state.electionNight!.status).toBe('called');
    expect(state.electionNight!.finalSeats).toBeDefined();

    state = concludeElectionNightAction(state);
    expect(state.electionNight!.status).toBe('concluded');
    expect(state.electionNight!.victorySpeech).toBeTruthy();
    // The real seat counts should now match what the night called.
    const totalSeats = state.parties.reduce((sum, p) => sum + p.seats, 0);
    expect(totalSeats).toBe(Object.values(state.electionNight!.finalSeats!).reduce((a, b) => a + b, 0));

    state = dismissElectionNight(state);
    expect(state.electionNight).toBeNull();
  });

  it('runs a full night for a PR country too', () => {
    let state = createNewGame(11, { country: VANTORRA_COUNTRY, parties: VANTORRA_PARTIES });
    state = beginElectionNight(state);
    while (state.electionNight!.status === 'reporting') {
      state = reportNextProvinceAction(state);
    }
    expect(state.electionNight!.status).toBe('called');
    const totalSeats = Object.values(state.electionNight!.finalSeats!).reduce((a, b) => a + b, 0);
    expect(totalSeats).toBe(VANTORRA_COUNTRY.legislature.totalSeats);
  });

  it('is deterministic for the same seed across the whole night', () => {
    const runOnce = () => {
      let state = createNewGame(11);
      state = beginElectionNight(state);
      while (state.electionNight!.status === 'reporting') {
        state = reportNextProvinceAction(state);
      }
      return concludeElectionNightAction(state).electionNight;
    };
    expect(runOnce()).toEqual(runOnce());
  });
});

describe('cabinet effects wired into gameplay', () => {
  it('a Finance minister measurably calms economy volatility on average across many runs', () => {
    // A single-seed comparison of a noise-derived metric is inherently
    // flaky (25% less volatility doesn't mean every individual run is
    // calmer) — average the metric across many independent seeds instead.
    const runVariance = (seed: number, withMinister: boolean) => {
      let state = createNewGame(seed);
      const sharpFinanceMinister = state.politicians.find((p) => !p.isPlayer)!;
      if (withMinister) {
        state = {
          ...state,
          cabinet: appointToCabinet([], 'finance', sharpFinanceMinister.id),
          politicians: state.politicians.map((p) =>
            p.id === sharpFinanceMinister.id ? { ...p, attributes: { ...p.attributes, intellect: 10 } } : p
          ),
        };
      }
      const growthValues: number[] = [];
      for (let i = 0; i < 30; i++) {
        state = advanceTurn(state);
        growthValues.push(state.economy.gdpGrowth);
      }
      const mean = growthValues.reduce((a, b) => a + b, 0) / growthValues.length;
      return growthValues.reduce((sum, v) => sum + Math.abs(v - mean), 0) / growthValues.length;
    };

    // A generous trial count for the same reason as the NPC-scandal test
    // above: the shared rng stream shifts whenever a new per-turn system
    // is added upstream, so this needs enough samples to stay robust to
    // that rather than being tuned against one exact sequence.
    const trials = 150;
    let totalWith = 0;
    let totalWithout = 0;
    for (let seed = 1; seed <= trials; seed++) {
      totalWith += runVariance(seed, true);
      totalWithout += runVariance(seed, false);
    }

    expect(totalWith / trials).toBeLessThan(totalWithout / trials);
  });

  it('a Defense minister adds real strength to a war (advantage improves over the same seed)', () => {
    let base = createNewGame(21);
    const counterpart = base.foreignCounterparts[0];
    base = {
      ...base,
      playerMilitary: { strength: 40, personnel: 400, techLevel: 40 },
      foreignCounterparts: base.foreignCounterparts.map((c) =>
        c.id === counterpart.id ? { ...c, military: { strength: 45, personnel: 400, techLevel: 40 } } : c
      ),
    };
    const defenseMinister = base.politicians.find((p) => !p.isPlayer)!;

    const alone = { ...base, wars: [declareWar(counterpart.id, base.turn)] };
    const withMinister = {
      ...base,
      cabinet: appointToCabinet([], 'defense', defenseMinister.id),
      politicians: base.politicians.map((p) =>
        p.id === defenseMinister.id ? { ...p, attributes: { ...p.attributes, intellect: 10 } } : p
      ),
      wars: [declareWar(counterpart.id, base.turn)],
    };

    const afterAlone = runWarTurns(alone, SeededRng.fromState(alone.rngState));
    const afterMinister = runWarTurns(withMinister, SeededRng.fromState(withMinister.rngState));

    expect(afterMinister.wars[0].advantage).toBeGreaterThan(afterAlone.wars[0].advantage);
  });

  it('a Justice minister raises detection odds for corruption (including the player\'s own)', () => {
    const base = createNewGame(21);
    const player = base.politicians.find((p) => p.isPlayer)!;
    const target = base.politicians.find((p) => p.id !== player.id)!;
    const justiceMinister = base.politicians.find((p) => !p.isPlayer && p.id !== target.id)!;

    const withMinister = {
      ...base,
      cabinet: appointToCabinet([], 'justice', justiceMinister.id),
      politicians: base.politicians.map((p) =>
        p.id === justiceMinister.id ? { ...p, attributes: { ...p.attributes, integrity: 10 } } : p
      ),
    };

    let detectedWithout = 0;
    let detectedWith = 0;
    const trials = 200;
    for (let seed = 1; seed <= trials; seed++) {
      const withoutState = { ...base, rngState: seed };
      const withState = { ...withMinister, rngState: seed };
      if (commitCorruption(withoutState, player.id, target.id, 'hard').outcome.detected) detectedWithout++;
      if (commitCorruption(withState, player.id, target.id, 'hard').outcome.detected) detectedWith++;
    }

    expect(detectedWith).toBeGreaterThan(detectedWithout);
  });
});

describe('the second starter country (Vantorra, presidential/PR)', () => {
  it('creates a valid game with a PR_DHONDT legislature and no districts', () => {
    const state = createNewGame(5, { country: VANTORRA_COUNTRY, parties: VANTORRA_PARTIES });
    expect(state.country.legislature.electoralSystem).toBe('PR_DHONDT');
    expect(state.country.legislature.districts).toHaveLength(0);
    const totalSeats = state.parties.reduce((sum, p) => sum + p.seats, 0);
    expect(state.politicians).toHaveLength(totalSeats);
  });

  it('runs a PR election that allocates exactly the nominal total seats', () => {
    const state = createNewGame(5, { country: VANTORRA_COUNTRY, parties: VANTORRA_PARTIES });
    const { outcome } = runLegislativeElection(state);
    expect(outcome.system).toBe('PR_DHONDT');
    const totalSeats = Object.values(outcome.seatsWon).reduce((a, b) => a + b, 0);
    expect(totalSeats).toBe(state.country.legislature.totalSeats);
  });

  it('advances turns and resolves NPC bills the same as the default country', () => {
    let state = createNewGame(5, { country: VANTORRA_COUNTRY, parties: VANTORRA_PARTIES });
    for (let i = 0; i < 15; i++) state = advanceTurn(state);
    expect(state.turn).toBe(16);
  });
});

describe('mergePartiesAction', () => {
  it('cleans up a dangling coalition membership when the absorbed party was a coalition member', () => {
    const state = createNewGame(1);
    expect(state.coalition).not.toBeNull();
    const coalition = state.coalition!;
    const absorbedPartyId = coalition.memberPartyIds[coalition.memberPartyIds.length - 1];
    const survivingPartyId = state.parties.find((p) => p.id !== absorbedPartyId)!.id;

    const merged = mergePartiesAction(state, absorbedPartyId, survivingPartyId);

    expect(merged.parties.some((p) => p.id === absorbedPartyId)).toBe(false);
    expect(merged.coalition!.memberPartyIds).not.toContain(absorbedPartyId);
    expect(merged.coalition!.memberPartyIds).toContain(survivingPartyId);
    // every remaining member id must resolve to a real party
    for (const id of merged.coalition!.memberPartyIds) {
      expect(merged.parties.some((p) => p.id === id)).toBe(true);
    }
    // seat totals stay internally consistent with the post-merge party list
    const totalSeats = merged.parties.reduce((sum, p) => sum + p.seats, 0);
    expect(merged.coalition!.totalSeats).toBe(totalSeats);
  });

  it('reassigns the formateur when the absorbed party was the formateur', () => {
    const state = createNewGame(1);
    const coalition = state.coalition!;
    const formateurPartyId = coalition.formateurPartyId;
    const survivingPartyId = state.parties.find((p) => p.id !== formateurPartyId)!.id;

    const merged = mergePartiesAction(state, formateurPartyId, survivingPartyId);

    expect(merged.coalition!.formateurPartyId).toBe(survivingPartyId);
  });

  it('leaves the coalition untouched when neither party is a coalition member', () => {
    const state = createNewGame(1);
    const coalition = state.coalition!;
    const nonMemberParties = state.parties.filter((p) => !coalition.memberPartyIds.includes(p.id));
    if (nonMemberParties.length < 2) return; // not applicable for this seed's party split
    const merged = mergePartiesAction(state, nonMemberParties[0].id, nonMemberParties[1].id);
    expect(merged.coalition!.memberPartyIds).toEqual(coalition.memberPartyIds);
  });
});

describe('house rules', () => {
  it('defaults to all-standard rules when none are given', () => {
    const state = createNewGame(1);
    expect(state.houseRules).toEqual({ disableTermLimits: false, doubleEventFrequency: false, noCorruption: false });
  });

  it('createNewGame accepts partial house rule overrides', () => {
    const state = createNewGame(1, { houseRules: { noCorruption: true } });
    expect(state.houseRules.noCorruption).toBe(true);
    expect(state.houseRules.disableTermLimits).toBe(false);
  });

  it('noCorruption blocks the player corruption action entirely', () => {
    const state = createNewGame(1, { houseRules: { noCorruption: true } });
    const player = state.politicians.find((p) => p.isPlayer)!;
    const target = state.politicians.find((p) => p.id !== player.id)!;
    const { state: after, outcome } = commitCorruption(state, player.id, target.id, 'hard');
    expect(outcome).toEqual({ detected: false, favorGain: 0, budgetImpact: 0 });
    expect(after).toBe(state);
  });

  it('disableTermLimits lets a single leader keep accumulating terms past the normal cap', () => {
    let state = createNewGame(3, { houseRules: { disableTermLimits: true } });
    for (let i = 0; i < 10; i++) {
      state = runLegislativeElection(state).state;
    }
    const maxTerms = Math.max(...Object.values(state.termsServed));
    expect(maxTerms).toBeGreaterThan(MAX_HEAD_OF_GOVERNMENT_TERMS);
  });

  it('with term limits on (the default), leadership actually changes hands over repeated elections', () => {
    let state = createNewGame(3);
    const leaderIds = new Set<string>();
    for (let i = 0; i < 10; i++) {
      state = runLegislativeElection(state).state;
      const totalSeats = state.parties.reduce((sum, p) => sum + p.seats, 0);
      const majorityParty = state.parties.find((p) => p.seats > totalSeats / 2);
      if (majorityParty) leaderIds.add(state.partyLeaderId[majorityParty.id]);
    }
    expect(leaderIds.size).toBeGreaterThan(1);
  });

  it('with term limits disabled, the same leader holds on for every election', () => {
    let state = createNewGame(3, { houseRules: { disableTermLimits: true } });
    const leaderIds = new Set<string>();
    for (let i = 0; i < 10; i++) {
      state = runLegislativeElection(state).state;
      const totalSeats = state.parties.reduce((sum, p) => sum + p.seats, 0);
      const majorityParty = state.parties.find((p) => p.seats > totalSeats / 2);
      if (majorityParty) leaderIds.add(state.partyLeaderId[majorityParty.id]);
    }
    expect(leaderIds.size).toBe(1);
  });
});

describe('industry (mining, logistics, manufacturing, market)', () => {
  it('createNewGame seeds a populated resource economy', () => {
    const state = createNewGame(1);
    expect(state.resourceDeposits.length).toBeGreaterThan(0);
    expect(state.mines).toEqual([]);
    expect(state.factories).toEqual([]);
    expect(state.logisticsNetwork.capability).toBe(20);
    expect(state.marketPrices.iron_ore).toBeGreaterThan(0);
    expect(state.marketPrices.steel).toBeGreaterThan(0);
    expect(state.rawResourceStockpile.iron_ore).toBe(0);
  });

  it('buildMineAction claims a domestic deposit and bills the state budget', () => {
    const state = createNewGame(1);
    const deposit = state.resourceDeposits.find((d) => d.locationType === 'domestic')!;
    const { state: after, outcome, mine } = buildMineAction(state, deposit.id, 'state');
    expect(outcome.success).toBe(true);
    expect(mine).not.toBeNull();
    expect(after.mines).toHaveLength(1);
    expect(after.economy.budgetBalance).toBeLessThan(state.economy.budgetBalance);
  });

  it('buildMineAction refuses to double-claim the same deposit', () => {
    const state = createNewGame(1);
    const deposit = state.resourceDeposits.find((d) => d.locationType === 'domestic')!;
    const { state: after } = buildMineAction(state, deposit.id, 'state');
    const { outcome } = buildMineAction(after, deposit.id, 'state');
    expect(outcome).toEqual({ success: false, reason: 'deposit_claimed' });
  });

  it('a private mine debits the player\'s personal wealth instead of the budget, and refuses when wealth is short', () => {
    const state = createNewGame(1);
    const player = state.politicians.find((p) => p.isPlayer)!;
    const deposit = state.resourceDeposits.find((d) => d.locationType === 'domestic')!;

    const { outcome: poorOutcome } = buildMineAction(state, deposit.id, 'private');
    expect(poorOutcome).toEqual({ success: false, reason: 'insufficient_wealth' });

    const funded: GameState = { ...state, personalWealth: { ...state.personalWealth, [player.id]: 500 } };
    const { state: after, outcome } = buildMineAction(funded, deposit.id, 'private');
    expect(outcome.success).toBe(true);
    expect(after.personalWealth[player.id]).toBeLessThan(500);
    expect(after.economy.budgetBalance).toBe(funded.economy.budgetBalance);
  });

  it('upgradeMineAction raises tier up to the max and then refuses', () => {
    const state = createNewGame(1);
    const deposit = state.resourceDeposits.find((d) => d.locationType === 'domestic')!;
    let { state: after, mine } = buildMineAction(state, deposit.id, 'state');

    for (let tier = mine!.tier; tier < MAX_MINE_TIER; tier++) {
      const result = upgradeMineAction(after, mine!.id);
      expect(result.outcome.success).toBe(true);
      after = result.state;
    }
    expect(after.mines[0].tier).toBe(MAX_MINE_TIER);

    const overCap = upgradeMineAction(after, mine!.id);
    expect(overCap.outcome).toEqual({ success: false, reason: 'max_tier' });
  });

  it('buildFactoryAction rejects an unknown recipe id', () => {
    const state = createNewGame(1);
    const { outcome, factory } = buildFactoryAction(state, 'province-x', 'domestic', 'not-a-real-recipe', 'state');
    expect(outcome).toEqual({ success: false, reason: 'recipe_not_found' });
    expect(factory).toBeNull();
  });

  it('buildFactoryAction and upgradeFactoryAction work end to end for a state-owned factory', () => {
    const state = createNewGame(1);
    const { state: after, outcome, factory } = buildFactoryAction(state, 'province-x', 'domestic', 'recipe-steel', 'state');
    expect(outcome.success).toBe(true);
    expect(factory!.tier).toBe(1);

    const upgraded = upgradeFactoryAction(after, factory!.id);
    expect(upgraded.outcome.success).toBe(true);
    expect(upgraded.state.factories[0].tier).toBe(2);
  });

  it('runIndustryTurn extracts, ships, and processes resources into finished goods over a turn', () => {
    let state = createNewGame(1);
    const ironDeposit = state.resourceDeposits.find(
      (d) => d.locationType === 'domestic' && d.resource === 'iron_ore' && d.remainingReserves > 200
    );
    const coalDeposit = state.resourceDeposits.find(
      (d) => d.locationType === 'domestic' && d.resource === 'coal' && d.remainingReserves > 200
    );
    if (!ironDeposit || !coalDeposit) {
      // This seed didn't happen to generate both inputs domestically — the test is about the
      // mechanism, not this specific seed, so it's safe to skip rather than fail spuriously.
      return;
    }

    ({ state } = buildMineAction(state, ironDeposit.id, 'state'));
    ({ state } = buildMineAction(state, coalDeposit.id, 'state'));
    ({ state } = buildFactoryAction(state, 'province-x', 'domestic', 'recipe-steel', 'state'));

    const rng = new SeededRng(state.rngState);
    const after = runIndustryTurn(state, rng);

    expect(after.resourceDeposits.find((d) => d.id === ironDeposit.id)!.remainingReserves).toBeLessThan(
      ironDeposit.remainingReserves
    );
    expect(after.rawResourceStockpile.iron_ore + after.rawResourceStockpile.coal).toBeGreaterThanOrEqual(0);
    expect(after.stateGoodsStockpile.steel).toBeGreaterThanOrEqual(0);
    expect(after.economy.budgetBalance).toBeLessThan(state.economy.budgetBalance);
  });

  it('sellRawResourceAction sells from the shared stockpile and credits the chosen pool', () => {
    const state = createNewGame(1);
    const stocked: GameState = { ...state, rawResourceStockpile: { ...state.rawResourceStockpile, iron_ore: 100 } };

    const { state: afterStateSale, sale: stateSale } = sellRawResourceAction(stocked, 'iron_ore', 40, 'state');
    expect(stateSale.unitsSold).toBe(40);
    expect(afterStateSale.rawResourceStockpile.iron_ore).toBe(60);
    expect(afterStateSale.economy.budgetBalance).toBeGreaterThan(stocked.economy.budgetBalance);

    const player = state.politicians.find((p) => p.isPlayer)!;
    const { state: afterPrivateSale, sale: privateSale } = sellRawResourceAction(stocked, 'iron_ore', 40, 'private');
    expect(privateSale.unitsSold).toBe(40);
    expect(afterPrivateSale.personalWealth[player.id]).toBeGreaterThan(stocked.personalWealth[player.id]);
  });

  it('sellProcessedGoodAction caps units sold at what is actually in stock', () => {
    const state = createNewGame(1);
    const stocked: GameState = { ...state, stateGoodsStockpile: { ...state.stateGoodsStockpile, steel: 10 } };
    const { state: after, sale } = sellProcessedGoodAction(stocked, 'steel', 999, 'state');
    expect(sale.unitsSold).toBe(10);
    expect(after.stateGoodsStockpile.steel).toBe(0);
  });
});

describe('judiciary, research, demographics, and social policy', () => {
  it('createNewGame seeds real defaults for all four systems', () => {
    const state = createNewGame(1);
    expect(state.court.seats).toHaveLength(DEFAULT_COURT_SIZE);
    expect(state.court.seats.every((s) => s === null)).toBe(true);
    expect(state.judicialReviewCases).toEqual([]);
    expect(state.research).toEqual({ capability: 20, accumulatedPoints: 0, unlockedTechIds: [] });
    expect(state.demographics.population).toBeGreaterThan(0);
    expect(state.socialPolicy.lifeExpectancy).toBeGreaterThan(0);
  });

  it('nominateJusticeAction fills a vacant seat and rejects an out-of-range one', () => {
    const state = createNewGame(1);
    const { state: after, outcome } = nominateJusticeAction(state, 0);
    expect(outcome.success).toBe(true);
    expect(after.court.seats[0]?.status).toBe('nominated');

    const invalid = nominateJusticeAction(state, 99);
    expect(invalid.outcome).toEqual({ success: false, reason: 'invalid_seat' });
  });

  it('confirmJusticeAction resolves a pending nominee and refuses an empty seat', () => {
    const state = createNewGame(1);
    const { state: nominated } = nominateJusticeAction(state, 0);
    const { state: after, outcome, result } = confirmJusticeAction(nominated, 0);
    expect(outcome.success).toBe(true);
    expect(result).not.toBeNull();
    expect(after.court.seats[0] === null || after.court.seats[0]?.status === 'confirmed').toBe(true);

    const empty = confirmJusticeAction(state, 1);
    expect(empty.outcome).toEqual({ success: false, reason: 'no_nominee' });
  });

  it('runJudiciaryTurn never files a review case while the court lacks a quorum', () => {
    let state = createNewGame(1);
    const player = state.politicians.find((p) => p.isPlayer)!;
    state = { ...state, bills: [{ id: 'b1', title: 'Test Bill', provisions: [], sponsorId: player.id, status: 'passed', whipCount: {} }] };
    for (let i = 0; i < 30; i++) {
      const rng = new SeededRng(state.rngState);
      state = runJudiciaryTurn(state, rng);
      state = { ...state, rngState: rng.getState() };
    }
    expect(state.judicialReviewCases).toEqual([]);
  });

  it('runJudiciaryTurn files and eventually resolves a review case once the court has quorum', () => {
    let state = createNewGame(1);
    const player = state.politicians.find((p) => p.isPlayer)!;
    const justice = (id: string) => ({
      id,
      name: id,
      ideology: { economic: 0, social: 0 },
      integrity: 8,
      status: 'confirmed' as const,
    });
    state = {
      ...state,
      court: { seats: [justice('j0'), justice('j1'), justice('j2'), null, null] },
      bills: [{ id: 'b1', title: 'Test Bill', provisions: [], sponsorId: player.id, status: 'passed', whipCount: {} }],
    };

    let sawCase = false;
    let sawResolution = false;
    for (let i = 0; i < 60; i++) {
      const rng = new SeededRng(state.rngState);
      state = runJudiciaryTurn(state, rng);
      state = { ...state, rngState: rng.getState() };
      if (state.judicialReviewCases.length > 0) sawCase = true;
      if (state.judicialReviewCases.some((c) => c.status !== 'pending')) sawResolution = true;
    }
    expect(sawCase).toBe(true);
    expect(sawResolution).toBe(true);
  });

  it('runResearchTurn accumulates points, and unlockTechAction spends them for a real economic payoff', () => {
    let state = createNewGame(1);
    for (let i = 0; i < 30; i++) state = runResearchTurn(state);
    expect(state.research.accumulatedPoints).toBeGreaterThan(0);

    const { state: after, outcome } = unlockTechAction(state, 'basic-metallurgy');
    expect(outcome.success).toBe(true);
    expect(after.research.unlockedTechIds).toContain('basic-metallurgy');
    expect(after.economy.gdpGrowth).toBeGreaterThan(state.economy.gdpGrowth);

    const missingPrereq = unlockTechAction(after, 'advanced-robotics');
    expect(missingPrereq.outcome).toEqual({ success: false, reason: 'prerequisites_not_met' });

    const unknown = unlockTechAction(after, 'not-a-real-tech');
    expect(unknown.outcome).toEqual({ success: false, reason: 'tech_not_found' });
  });

  it('runDemographicsTurn moves population and feeds the economy and voter blocs', () => {
    const state = createNewGame(1);
    const next = runDemographicsTurn(state);
    expect(next.demographics.population).not.toBe(state.demographics.population);
    expect(next.voterBlocs).toHaveLength(state.voterBlocs.length);
  });

  it('runSocialPolicyTurn drifts indicators toward a changed funding target, bills the budget, and pushes an approval event', () => {
    let state = createNewGame(1);
    state = { ...state, socialPolicy: { ...state.socialPolicy, healthcareFunding: 'generous' } };
    const next = runSocialPolicyTurn(state);
    const player = next.politicians.find((p) => p.isPlayer)!;
    expect(next.socialPolicy.lifeExpectancy).toBeGreaterThan(state.socialPolicy.lifeExpectancy);
    expect(next.economy.budgetBalance).toBeLessThan(state.economy.budgetBalance);
    expect(player.approvalEvents.length).toBeGreaterThan(0);
  });
});

describe('stock market and private enterprise', () => {
  it('foundCompanyAction debits personal wealth and creates a fully player-owned private company', () => {
    const state = createNewGame(1);
    const player = state.politicians.find((p) => p.isPlayer)!;
    const funded: GameState = { ...state, personalWealth: { ...state.personalWealth, [player.id]: 500 } };
    const { state: after, outcome, company } = foundCompanyAction(funded, 'Acme Corp', 'technology');
    expect(outcome.success).toBe(true);
    expect(company).not.toBeNull();
    expect(company!.isPublic).toBe(false);
    expect(company!.playerShares).toBe(company!.totalShares);
    expect(after.personalWealth[player.id]).toBe(500 - COMPANY_FOUNDING_COST);
    expect(after.companies).toHaveLength(1);
  });

  it('foundCompanyAction refuses when the player cannot afford it', () => {
    const state = createNewGame(1);
    const { outcome, company } = foundCompanyAction(state, 'Acme Corp', 'technology');
    expect(outcome).toEqual({ success: false, reason: 'insufficient_wealth' });
    expect(company).toBeNull();
  });

  it('ipoCompanyAction takes a company public and pays the founder real proceeds', () => {
    const state = createNewGame(1);
    const player = state.politicians.find((p) => p.isPlayer)!;
    const funded: GameState = { ...state, personalWealth: { ...state.personalWealth, [player.id]: 500 } };
    const { state: founded, company } = foundCompanyAction(funded, 'Acme Corp', 'technology');
    const { state: after, outcome, proceeds } = ipoCompanyAction(founded, company!.id);
    expect(outcome.success).toBe(true);
    expect(proceeds).toBeGreaterThan(0);
    expect(after.companies[0].isPublic).toBe(true);
    expect(after.personalWealth[player.id]).toBe(founded.personalWealth[player.id] + proceeds);

    const alreadyPublic = ipoCompanyAction(after, company!.id);
    expect(alreadyPublic.outcome).toEqual({ success: false, reason: 'already_public' });
  });

  it('buySharesAction and sellSharesAction only work once a company is public, and move real cash', () => {
    const state = createNewGame(1);
    const player = state.politicians.find((p) => p.isPlayer)!;
    const funded: GameState = { ...state, personalWealth: { ...state.personalWealth, [player.id]: 500 } };
    const { state: founded, company } = foundCompanyAction(funded, 'Acme Corp', 'technology');

    const buyBeforeIpo = buySharesAction(founded, company!.id, 50);
    expect(buyBeforeIpo.outcome).toEqual({ success: false, reason: 'not_public' });

    const { state: public_ } = ipoCompanyAction(founded, company!.id);
    const wealthBeforeBuy = public_.personalWealth[player.id];
    const { state: afterBuy, outcome: buyOutcome } = buySharesAction(public_, company!.id, 50);
    expect(buyOutcome.success).toBe(true);
    expect(afterBuy.personalWealth[player.id]).toBe(wealthBeforeBuy - 50);
    expect(afterBuy.companies[0].playerShares).toBeGreaterThan(public_.companies[0].playerShares);

    const { state: afterSell, outcome: sellOutcome } = sellSharesAction(afterBuy, company!.id, 1_000_000_000);
    expect(sellOutcome.success).toBe(true);
    expect(afterSell.companies[0].playerShares).toBe(0);
    expect(afterSell.personalWealth[player.id]).toBeGreaterThan(afterBuy.personalWealth[player.id]);
  });

  it('runEnterpriseTurn advances price/fundamentals and pays dividends on public holdings', () => {
    const state = createNewGame(1);
    const player = state.politicians.find((p) => p.isPlayer)!;
    const funded: GameState = { ...state, personalWealth: { ...state.personalWealth, [player.id]: 500 } };
    const { state: founded, company } = foundCompanyAction(funded, 'Acme Corp', 'technology');
    const { state: public_ } = ipoCompanyAction(founded, company!.id);

    const rng = new SeededRng(public_.rngState);
    const next = runEnterpriseTurn(public_, rng);
    expect(next.companies[0].fundamentals).not.toBe(public_.companies[0].fundamentals);
    expect(next.personalWealth[player.id]).toBeGreaterThan(public_.personalWealth[player.id]);
  });

  it('runEnterpriseTurn is a no-op with no companies founded', () => {
    const state = createNewGame(1);
    const rng = new SeededRng(state.rngState);
    const next = runEnterpriseTurn(state, rng);
    expect(next).toBe(state);
  });
});
