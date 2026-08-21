import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import { createNewGame } from '../index';
import type { DilemmaDef } from '../models/types';
import { rollForDilemma, resolveDilemmaChoice } from './dilemmas';

const DEFS: DilemmaDef[] = [
  {
    id: 'test-dilemma',
    category: 'economic_shock',
    title: 'Test Dilemma',
    description: 'A test situation demands a response.',
    baseWeight: 1,
    choices: [
      {
        id: 'spend',
        label: 'Spend Big',
        description: 'Throw money at it.',
        economyEffect: { budgetBalance: -1, gdpGrowth: 0.5 },
        playerApprovalEffect: 6,
        delayedEconomyEffect: { turnsRemaining: 3, delta: { gdpGrowth: 0.3 } },
      },
      {
        id: 'restraint',
        label: 'Show Restraint',
        description: 'Do nothing and hope it passes.',
        economyEffect: { budgetBalance: 0.5 },
        playerApprovalEffect: -4,
      },
    ],
  },
];

describe('rollForDilemma', () => {
  it('never rolls with no defs', () => {
    const state = createNewGame(1);
    expect(rollForDilemma([], state, new SeededRng(1), 1)).toBeNull();
  });

  it('never rolls below the chance threshold', () => {
    const state = createNewGame(1);
    expect(rollForDilemma(DEFS, state, new SeededRng(1), 0)).toBeNull();
  });

  it('raises a dilemma carrying the def’s choices when it does roll', () => {
    const state = createNewGame(1);
    const dilemma = rollForDilemma(DEFS, state, new SeededRng(1), 1);
    expect(dilemma).not.toBeNull();
    expect(dilemma!.defId).toBe('test-dilemma');
    expect(dilemma!.choices).toHaveLength(2);
    expect(dilemma!.turnRaised).toBe(state.turn);
  });
});

describe('resolveDilemmaChoice', () => {
  function stateWithActiveDilemma() {
    const base = createNewGame(1);
    const dilemma = rollForDilemma(DEFS, base, new SeededRng(1), 1)!;
    return { ...base, activeDilemma: dilemma };
  }

  it('is a no-op when there is no active dilemma', () => {
    const state = createNewGame(1);
    const next = resolveDilemmaChoice(state, 'spend');
    expect(next).toBe(state);
  });

  it('is a no-op for an unknown choice id', () => {
    const state = stateWithActiveDilemma();
    const next = resolveDilemmaChoice(state, 'not-a-real-choice');
    expect(next).toBe(state);
  });

  it('applies the chosen response’s immediate economy effect, approval bump, and clears the dilemma', () => {
    const state = stateWithActiveDilemma();
    const next = resolveDilemmaChoice(state, 'spend');
    expect(next.activeDilemma).toBeNull();
    expect(next.economy.budgetBalance).toBeLessThan(state.economy.budgetBalance);
    expect(next.economy.gdpGrowth).toBeGreaterThan(state.economy.gdpGrowth);
    const player = next.politicians.find((p) => p.isPlayer)!;
    expect(player.approvalEvents.at(-1)!.impact).toBe(6);
  });

  it('queues the delayed effect rather than applying it immediately', () => {
    const state = stateWithActiveDilemma();
    const next = resolveDilemmaChoice(state, 'spend');
    const queued = next.economy.pendingEffects.find((e) => e.delta.gdpGrowth === 0.3);
    expect(queued).toBeDefined();
    expect(queued!.turnsRemaining).toBe(3);
  });

  it('a different choice on the same dilemma produces a different outcome', () => {
    const state = stateWithActiveDilemma();
    const restraint = resolveDilemmaChoice(state, 'restraint');
    expect(restraint.economy.budgetBalance).toBeGreaterThan(state.economy.budgetBalance);
    const player = restraint.politicians.find((p) => p.isPlayer)!;
    expect(player.approvalEvents.at(-1)!.impact).toBe(-4);
  });

  it('logs the resolution with the chosen label', () => {
    const state = stateWithActiveDilemma();
    const next = resolveDilemmaChoice(state, 'spend');
    const entry = next.eventLog.at(-1)!;
    expect(entry.description).toContain('Spend Big');
    expect(entry.title).toBe('Test Dilemma');
  });
});
