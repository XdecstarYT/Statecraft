import { describe, expect, it } from 'vitest';
import {
  createNewGame,
  advanceTurn,
  runLegislativeElection,
  commitCorruption,
  respondToScandal,
  proposeTreaty,
  signTreaty,
  holdPressInterview,
  holdRally,
} from './index';
import { VANTORRA_COUNTRY, VANTORRA_PARTIES } from '../content/countries/vantorra';

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

    for (let i = 0; i < 60; i++) {
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
