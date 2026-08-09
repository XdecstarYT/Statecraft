import { describe, expect, it } from 'vitest';
import {
  createNewGame,
  advanceTurn,
  runLegislativeElection,
  commitCorruption,
  respondToScandal,
  proposeTreaty,
  signTreaty,
} from './index';

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
});
