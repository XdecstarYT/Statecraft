import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { VoterBloc } from '../models/types';
import { proposeBallotInitiative, resolveBallotInitiative } from './referendum';

function makeBloc(overrides: Partial<VoterBloc> & { id: string }): VoterBloc {
  return {
    name: overrides.id,
    size: 0.5,
    ideology: { economic: 0, social: 0 },
    persuadability: 0.8,
    issueSalience: [],
    ...overrides,
  };
}

describe('proposeBallotInitiative', () => {
  it('creates an active initiative', () => {
    const initiative = proposeBallotInitiative(
      'i1',
      'Flat Tax',
      'A flat income tax',
      { economic: 80, social: 0 },
      { budgetBalance: 1 },
      5
    );
    expect(initiative.status).toBe('active');
    expect(initiative.turnProposed).toBe(5);
  });
});

describe('resolveBallotInitiative', () => {
  it('passes when the electorate is strongly aligned with the stance', () => {
    const blocs = [
      makeBloc({ id: 'b1', size: 0.6, ideology: { economic: 80, social: 80 }, persuadability: 0.9 }),
      makeBloc({ id: 'b2', size: 0.4, ideology: { economic: 70, social: 70 }, persuadability: 0.9 }),
    ];
    const initiative = proposeBallotInitiative('i1', 'Tax Cut', 'desc', { economic: 80, social: 80 }, {}, 1);
    const { result } = resolveBallotInitiative(initiative, blocs, new SeededRng(3));
    expect(result.passed).toBe(true);
    expect(result.yesShare).toBeGreaterThan(0.5);
  });

  it('fails when the electorate is strongly opposed to the stance', () => {
    const blocs = [
      makeBloc({ id: 'b1', size: 0.6, ideology: { economic: -80, social: -80 }, persuadability: 0.9 }),
      makeBloc({ id: 'b2', size: 0.4, ideology: { economic: -70, social: -70 }, persuadability: 0.9 }),
    ];
    const initiative = proposeBallotInitiative('i1', 'Tax Cut', 'desc', { economic: 80, social: 80 }, {}, 1);
    const { result } = resolveBallotInitiative(initiative, blocs, new SeededRng(3));
    expect(result.passed).toBe(false);
    expect(result.yesShare).toBeLessThan(0.5);
  });

  it('sets the resolved initiative status to match the outcome', () => {
    const blocs = [makeBloc({ id: 'b1', size: 1, ideology: { economic: 90, social: 90 }, persuadability: 0.9 })];
    const initiative = proposeBallotInitiative('i1', 'x', 'desc', { economic: 90, social: 90 }, {}, 1);
    const { initiative: resolved, result } = resolveBallotInitiative(initiative, blocs, new SeededRng(9));
    expect(resolved.status).toBe(result.passed ? 'passed' : 'failed');
    expect(resolved.yesShare).toBe(result.yesShare);
  });

  it('is deterministic for a fixed seed', () => {
    const blocs = [makeBloc({ id: 'b1', size: 1, ideology: { economic: 10, social: -10 }, persuadability: 0.5 })];
    const initiative = proposeBallotInitiative('i1', 'x', 'desc', { economic: 20, social: 0 }, {}, 1);
    const a = resolveBallotInitiative(initiative, blocs, new SeededRng(42));
    const b = resolveBallotInitiative(initiative, blocs, new SeededRng(42));
    expect(a.result.yesShare).toBe(b.result.yesShare);
  });
});
