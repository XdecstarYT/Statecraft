import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { PoliticianAttributes, ThinkTank } from '../models/types';
import {
  applyCourtThinkTankOutcome,
  commissionReport,
  computeThinkTankAlignment,
  computeZeitgeistApprovalPressure,
  courtThinkTank,
  decayThinkTankDispositions,
  driftOvertonWindow,
} from './thinkTanks';

function makeThinkTank(overrides: Partial<ThinkTank> = {}): ThinkTank {
  return {
    id: 'thinktank-1',
    name: 'Test Institute',
    ideology: { economic: 50, social: 0 },
    prestige: 60,
    disposition: 0,
    ...overrides,
  };
}

const STRONG_ATTRS: PoliticianAttributes = { charisma: 5, intellect: 10, integrity: 5, network: 10, mediaSavvy: 5 };
const WEAK_ATTRS: PoliticianAttributes = { charisma: 5, intellect: 1, integrity: 5, network: 1, mediaSavvy: 5 };

describe('computeThinkTankAlignment', () => {
  it('is higher for an ideologically closer institute', () => {
    const close = makeThinkTank({ ideology: { economic: 5, social: 0 } });
    const far = makeThinkTank({ ideology: { economic: -95, social: -95 } });
    const subject = { economic: 0, social: 0 };
    expect(computeThinkTankAlignment(close, subject)).toBeGreaterThan(computeThinkTankAlignment(far, subject));
  });
});

describe('courtThinkTank', () => {
  it('is deterministic for a given rng state', () => {
    const thinkTank = makeThinkTank();
    const a = courtThinkTank(thinkTank, STRONG_ATTRS, new SeededRng(5));
    const b = courtThinkTank(thinkTank, STRONG_ATTRS, new SeededRng(5));
    expect(a).toEqual(b);
  });

  it('an intellectual, well-networked player succeeds far more often over many trials', () => {
    const thinkTank = makeThinkTank();
    const rngStrong = new SeededRng(2);
    const rngWeak = new SeededRng(2);
    let strongWins = 0;
    let weakWins = 0;
    for (let i = 0; i < 100; i++) {
      if (courtThinkTank(thinkTank, STRONG_ATTRS, rngStrong).success) strongWins++;
      if (courtThinkTank(thinkTank, WEAK_ATTRS, rngWeak).success) weakWins++;
    }
    expect(strongWins).toBeGreaterThan(weakWins);
  });

  it('applyCourtThinkTankOutcome clamps disposition to [-100, 100]', () => {
    const thinkTank = makeThinkTank({ disposition: 90 });
    const after = applyCourtThinkTankOutcome(thinkTank, { success: true, dispositionDelta: 30 });
    expect(after.disposition).toBeLessThanOrEqual(100);
  });
});

describe('decayThinkTankDispositions', () => {
  it('decays every institute toward zero', () => {
    const thinkTanks = [makeThinkTank({ disposition: 60 }), makeThinkTank({ id: 't2', disposition: -60 })];
    const after = decayThinkTankDispositions(thinkTanks);
    expect(after[0].disposition).toBeLessThan(60);
    expect(after[1].disposition).toBeGreaterThan(-60);
  });
});

describe('driftOvertonWindow', () => {
  it('moves current toward target', () => {
    const current = { economic: 0, social: 0 };
    const target = { economic: 100, social: -100 };
    const after = driftOvertonWindow(current, target, 0.1);
    expect(after.economic).toBeGreaterThan(0);
    expect(after.social).toBeLessThan(0);
  });

  it('does not overshoot the target with a normal rate', () => {
    const current = { economic: 0, social: 0 };
    const target = { economic: 50, social: 0 };
    const after = driftOvertonWindow(current, target, 0.3);
    expect(after.economic).toBeLessThanOrEqual(50);
  });
});

describe('commissionReport', () => {
  it('never publishes when disposition is below the threshold', () => {
    const thinkTank = makeThinkTank({ disposition: 0 });
    const outcome = commissionReport(thinkTank, { economic: 0, social: 0 }, new SeededRng(1));
    expect(outcome.published).toBe(false);
    expect(outcome.overtonShift).toEqual({ economic: 0, social: 0 });
  });

  it('a prestigious institute shifts the Overton window further than a fringe one, given a publish', () => {
    const prestigious = makeThinkTank({ disposition: 100, prestige: 100, ideology: { economic: 100, social: 0 } });
    const fringe = makeThinkTank({ disposition: 100, prestige: 5, ideology: { economic: 100, social: 0 } });
    const window = { economic: 0, social: 0 };
    // Force a publish by using a low roll seed and checking both consistently publish.
    let prestigiousShift = 0;
    let fringeShift = 0;
    for (let seed = 0; seed < 30; seed++) {
      const p = commissionReport(prestigious, window, new SeededRng(seed));
      const f = commissionReport(fringe, window, new SeededRng(seed));
      if (p.published) prestigiousShift = Math.max(prestigiousShift, p.overtonShift.economic);
      if (f.published) fringeShift = Math.max(fringeShift, f.overtonShift.economic);
    }
    expect(prestigiousShift).toBeGreaterThan(fringeShift);
  });

  it('is deterministic for a given rng state', () => {
    const thinkTank = makeThinkTank({ disposition: 80 });
    const window = { economic: 0, social: 0 };
    const a = commissionReport(thinkTank, window, new SeededRng(9));
    const b = commissionReport(thinkTank, window, new SeededRng(9));
    expect(a).toEqual(b);
  });
});

describe('computeZeitgeistApprovalPressure', () => {
  it('is positive when the window matches the player ideology', () => {
    const pressure = computeZeitgeistApprovalPressure({ economic: 20, social: 20 }, { economic: 20, social: 20 });
    expect(pressure).toBeGreaterThan(0);
  });

  it('is negative when the window is far from the player ideology', () => {
    const pressure = computeZeitgeistApprovalPressure({ economic: 100, social: 100 }, { economic: -100, social: -100 });
    expect(pressure).toBeLessThan(0);
  });

  it('stays within a small bound', () => {
    const pressure = computeZeitgeistApprovalPressure({ economic: 100, social: 100 }, { economic: 100, social: 100 });
    expect(Math.abs(pressure)).toBeLessThanOrEqual(3);
  });
});
