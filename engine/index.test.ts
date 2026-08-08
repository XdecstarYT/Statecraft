import { describe, expect, it } from 'vitest';
import { createNewGame, advanceTurn, runLegislativeElection } from './index';

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
