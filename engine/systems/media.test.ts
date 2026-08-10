import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { MediaOutlet } from '../models/types';
import { classifyFrame, generateCoverage, renderHeadline, type HeadlineTemplates } from './media';

const TEMPLATES: HeadlineTemplates = {
  bill_passed: {
    favorable: ['{name} Delivers a Win'],
    neutral: ['{name}-Backed Bill Clears Floor'],
    critical: ["Critics Blast {name}'s Bill"],
  },
  bill_failed: {
    favorable: ['{name} Fights the Good Fight, Falls Short'],
    neutral: ["{name}'s Bill Fails on the Floor"],
    critical: ['{name} Suffers Humiliating Defeat'],
  },
  election_result: {
    favorable: ['{name} Triumphs at the Polls'],
    neutral: ['{name} Wins Election'],
    critical: ['Voters Punish {name}'],
  },
};

function makeOutlet(overrides: Partial<MediaOutlet> & { id: string }): MediaOutlet {
  return {
    name: overrides.id,
    bias: { economic: 0, social: 0 },
    reach: 0.3,
    ...overrides,
  };
}

describe('classifyFrame', () => {
  it('is favorable when the outlet shares the subject\'s ideology', () => {
    const outlet = makeOutlet({ id: 'friendly', bias: { economic: 60, social: 60 } });
    expect(classifyFrame(outlet, { economic: 60, social: 60 })).toBe('favorable');
  });

  it('is critical when the outlet is ideologically opposed to the subject', () => {
    const outlet = makeOutlet({ id: 'hostile', bias: { economic: -80, social: -80 } });
    expect(classifyFrame(outlet, { economic: 80, social: 80 })).toBe('critical');
  });

  it('is neutral for an outlet at a middling ideological distance from the subject', () => {
    const outlet = makeOutlet({ id: 'centrist', bias: { economic: 0, social: 0 } });
    expect(classifyFrame(outlet, { economic: 100, social: 100 })).toBe('neutral');
  });
});

describe('renderHeadline', () => {
  it('fills the {name} slot', () => {
    const rng = new SeededRng(1);
    const headline = renderHeadline(TEMPLATES, 'bill_passed', 'favorable', 'Alex Varga', rng);
    expect(headline).toContain('Alex Varga');
    expect(headline).not.toContain('{name}');
  });

  it('is deterministic for a given rng state', () => {
    const a = renderHeadline(TEMPLATES, 'election_result', 'critical', 'Rival', new SeededRng(42));
    const b = renderHeadline(TEMPLATES, 'election_result', 'critical', 'Rival', new SeededRng(42));
    expect(a).toBe(b);
  });
});

describe('generateCoverage', () => {
  it('produces one coverage event per outlet, every outlet covering the same event', () => {
    const outlets: MediaOutlet[] = [
      makeOutlet({ id: 'left', bias: { economic: -70, social: -70 } }),
      makeOutlet({ id: 'right', bias: { economic: 70, social: 70 } }),
      makeOutlet({ id: 'centrist', bias: { economic: 0, social: 0 } }),
    ];
    const coverage = generateCoverage(
      outlets,
      TEMPLATES,
      'Alex Varga',
      { economic: 70, social: 70 },
      'bill_passed',
      new SeededRng(7)
    );

    expect(coverage).toHaveLength(3);
    const right = coverage.find((c) => c.outletId === 'right')!;
    const left = coverage.find((c) => c.outletId === 'left')!;
    expect(right.frame).toBe('favorable');
    expect(left.frame).toBe('critical');
    expect(right.headline).not.toBe(left.headline);
  });

  it('is deterministic for the same starting rng state', () => {
    const outlets: MediaOutlet[] = [makeOutlet({ id: 'a' }), makeOutlet({ id: 'b' })];
    const a = generateCoverage(outlets, TEMPLATES, 'Subject', { economic: 0, social: 0 }, 'bill_failed', new SeededRng(99));
    const b = generateCoverage(outlets, TEMPLATES, 'Subject', { economic: 0, social: 0 }, 'bill_failed', new SeededRng(99));
    expect(a).toEqual(b);
  });
});
