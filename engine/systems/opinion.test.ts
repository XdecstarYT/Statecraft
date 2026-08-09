import { describe, expect, it } from 'vitest';
import type { Politician, VoterBloc } from '../models/types';
import {
  advanceApproval,
  computeBlocSupport,
  computeWeightedPublicApproval,
  pushApprovalEvent,
} from './opinion';

function makeBloc(overrides: Partial<VoterBloc> & { id: string }): VoterBloc {
  return {
    name: overrides.id,
    size: 0.25,
    ideology: { economic: 0, social: 0 },
    persuadability: 1,
    issueSalience: [],
    ...overrides,
  };
}

function makePolitician(overrides: Partial<Politician> = {}): Politician {
  return {
    id: 'p1',
    name: 'Test Politician',
    isPlayer: false,
    ideology: { economic: 0, social: 0 },
    attributes: { charisma: 5, intellect: 5, integrity: 5, network: 5, mediaSavvy: 5 },
    partyId: 'party-a',
    approval: { public: 50, base: 50, partyElite: 50 },
    approvalEvents: [],
    ...overrides,
  };
}

describe('computeBlocSupport', () => {
  it('is near 1 for a fully persuadable bloc perfectly aligned with the target', () => {
    const bloc = makeBloc({ id: 'aligned', ideology: { economic: 40, social: 40 }, persuadability: 1 });
    expect(computeBlocSupport(bloc, { economic: 40, social: 40 })).toBeCloseTo(1, 5);
  });

  it('is near 0 for a fully persuadable bloc maximally opposed to the target', () => {
    const bloc = makeBloc({ id: 'opposed', ideology: { economic: -100, social: -100 }, persuadability: 1 });
    expect(computeBlocSupport(bloc, { economic: 100, social: 100 })).toBeCloseTo(0, 5);
  });

  it('collapses toward a coin flip as persuadability approaches 0, regardless of ideology', () => {
    const bloc = makeBloc({ id: 'locked-in', ideology: { economic: -100, social: -100 }, persuadability: 0 });
    expect(computeBlocSupport(bloc, { economic: 100, social: 100 })).toBeCloseTo(0.5, 5);
  });
});

describe('computeWeightedPublicApproval', () => {
  it('weights blocs by size', () => {
    const bigAligned = makeBloc({ id: 'big', size: 0.9, ideology: { economic: 50, social: 50 }, persuadability: 1 });
    const smallOpposed = makeBloc({ id: 'small', size: 0.1, ideology: { economic: -50, social: -50 }, persuadability: 1 });
    const approval = computeWeightedPublicApproval([bigAligned, smallOpposed], { economic: 50, social: 50 });
    expect(approval).toBeGreaterThan(80);
  });

  it('returns a neutral 50 when there are no blocs', () => {
    expect(computeWeightedPublicApproval([], { economic: 0, social: 0 })).toBe(50);
  });

  it('stays within 0..100 bounds', () => {
    const blocs = [
      makeBloc({ id: 'a', ideology: { economic: 100, social: 100 } }),
      makeBloc({ id: 'b', ideology: { economic: -100, social: -100 } }),
    ];
    const approval = computeWeightedPublicApproval(blocs, { economic: 0, social: 0 });
    expect(approval).toBeGreaterThanOrEqual(0);
    expect(approval).toBeLessThanOrEqual(100);
  });
});

describe('advanceApproval', () => {
  const neutralBlocs: VoterBloc[] = [makeBloc({ id: 'neutral', size: 1, persuadability: 0 })];

  it('is sticky: a single strong positive event does not jump approval to its full impact in one turn', () => {
    let politician = makePolitician({ approval: { public: 50, base: 50, partyElite: 50 } });
    politician = pushApprovalEvent(politician, 'public', 40, 6);
    politician = advanceApproval(politician, neutralBlocs);
    expect(politician.approval.public).toBeGreaterThan(50);
    expect(politician.approval.public).toBeLessThan(90); // not the full +40 jump
  });

  it('fades an event out and returns approval toward baseline over time', () => {
    let politician = makePolitician({ approval: { public: 50, base: 50, partyElite: 50 } });
    politician = pushApprovalEvent(politician, 'public', 40, 3);

    for (let i = 0; i < 3; i++) {
      politician = advanceApproval(politician, neutralBlocs);
    }
    expect(politician.approvalEvents).toHaveLength(0);

    const afterFade = politician.approval.public;
    // Many more turns with no live events should keep drifting back toward the 50 baseline.
    for (let i = 0; i < 20; i++) {
      politician = advanceApproval(politician, neutralBlocs);
    }
    expect(politician.approval.public).toBeLessThan(afterFade);
    expect(politician.approval.public).toBeCloseTo(50, 0);
  });

  it('never pushes approval outside 0..100 even with repeated extreme events', () => {
    let politician = makePolitician({ approval: { public: 95, base: 50, partyElite: 50 } });
    for (let i = 0; i < 5; i++) {
      politician = pushApprovalEvent(politician, 'public', 100, 6);
    }
    for (let i = 0; i < 10; i++) {
      politician = advanceApproval(politician, neutralBlocs);
    }
    expect(politician.approval.public).toBeLessThanOrEqual(100);
    expect(politician.approval.public).toBeGreaterThanOrEqual(0);
  });

  it('moves base and partyElite approval independently of public approval', () => {
    let politician = makePolitician();
    politician = pushApprovalEvent(politician, 'base', -30, 6);
    politician = advanceApproval(politician, neutralBlocs);
    expect(politician.approval.base).toBeLessThan(50);
    expect(politician.approval.partyElite).toBe(50);
  });

  it('is a pure function given the same inputs', () => {
    const politician = pushApprovalEvent(makePolitician(), 'public', 20, 4);
    const a = advanceApproval(politician, neutralBlocs);
    const b = advanceApproval(politician, neutralBlocs);
    expect(a).toEqual(b);
  });
});
