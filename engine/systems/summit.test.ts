import { describe, expect, it } from 'vitest';
import { SeededRng } from '../rng';
import type { ForeignCounterpart, SummitResolutionTemplate } from '../models/types';
import { rollForSummit, resolveSummit } from './summit';

function makeCounterpart(overrides: Partial<ForeignCounterpart> & { id: string }): ForeignCounterpart {
  return {
    name: overrides.id,
    region: 'Testland',
    ideology: { economic: 0, social: 0 },
    military: { strength: 50, personnel: 100, techLevel: 50 },
    trade: { production: { energy: 0, food: 0, minerals: 0, manufactured: 0, technology: 0 }, consumption: { energy: 0, food: 0, minerals: 0, manufactured: 0, technology: 0 } },
    location: { lat: 0, lng: 0 },
    ...overrides,
  };
}

const TEMPLATES: SummitResolutionTemplate[] = [
  {
    type: 'trade_pact',
    title: 'Test Trade Pact',
    description: 'desc',
    stance: { economic: 60, social: 0 },
    economyEffect: { gdpGrowth: 0.2 },
  },
];

function makeCounterparts(n: number): ForeignCounterpart[] {
  return Array.from({ length: n }, (_, i) => makeCounterpart({ id: `nation-${i}` }));
}

describe('rollForSummit', () => {
  it('never convenes with fewer than the minimum attendee pool', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(rollForSummit(1, TEMPLATES, makeCounterparts(2), new SeededRng(seed), 1)).toBeNull();
    }
  });

  it('never convenes with no templates', () => {
    expect(rollForSummit(1, [], makeCounterparts(10), new SeededRng(1), 1)).toBeNull();
  });

  it('convenes eventually at high chance across many seeds', () => {
    let convened = false;
    for (let seed = 0; seed < 30 && !convened; seed++) {
      if (rollForSummit(1, TEMPLATES, makeCounterparts(10), new SeededRng(seed), 1)) convened = true;
    }
    expect(convened).toBe(true);
  });

  it('picks distinct attendees with no duplicates', () => {
    let resolution = null;
    for (let seed = 0; seed < 30 && !resolution; seed++) {
      resolution = rollForSummit(1, TEMPLATES, makeCounterparts(10), new SeededRng(seed), 1);
    }
    expect(resolution).not.toBeNull();
    const unique = new Set(resolution!.attendeeIds);
    expect(unique.size).toBe(resolution!.attendeeIds.length);
  });

  it('never rolls above the given chance across many seeds', () => {
    let count = 0;
    const trials = 1000;
    for (let seed = 0; seed < trials; seed++) {
      if (rollForSummit(1, TEMPLATES, makeCounterparts(10), new SeededRng(seed), 0.05)) count++;
    }
    expect(count / trials).toBeLessThan(0.15);
  });
});

describe('resolveSummit', () => {
  it('is deterministic given the same rng state', () => {
    const resolution = rollForSummit(1, TEMPLATES, makeCounterparts(10), new SeededRng(3), 1)!;
    const attendees = makeCounterparts(10).filter((c) => resolution.attendeeIds.includes(c.id));
    const a = resolveSummit(resolution, 'yes', attendees, new SeededRng(9));
    const b = resolveSummit(resolution, 'yes', attendees, new SeededRng(9));
    expect(a).toEqual(b);
  });

  it('a resolution strongly aligned with every attendee passes far more often than one opposed to everyone', () => {
    const resolution = rollForSummit(1, TEMPLATES, makeCounterparts(10), new SeededRng(3), 1)!;
    const alignedAttendees = makeCounterparts(10)
      .filter((c) => resolution.attendeeIds.includes(c.id))
      .map((c) => ({ ...c, ideology: resolution.stance }));
    const opposedAttendees = makeCounterparts(10)
      .filter((c) => resolution.attendeeIds.includes(c.id))
      .map((c) => ({ ...c, ideology: { economic: -resolution.stance.economic, social: -resolution.stance.social } }));

    let alignedPasses = 0;
    let opposedPasses = 0;
    for (let seed = 0; seed < 100; seed++) {
      if (resolveSummit(resolution, 'yes', alignedAttendees, new SeededRng(seed)).passed) alignedPasses++;
      if (resolveSummit(resolution, 'no', opposedAttendees, new SeededRng(seed)).passed) opposedPasses++;
    }
    expect(alignedPasses).toBeGreaterThan(opposedPasses);
  });

  it("the player's vote counts toward the tally", () => {
    const resolution = rollForSummit(1, TEMPLATES, makeCounterparts(4), new SeededRng(3), 1)!;
    const attendees = makeCounterparts(4).filter((c) => resolution.attendeeIds.includes(c.id));
    const outcome = resolveSummit(resolution, 'yes', attendees, new SeededRng(5));
    expect(outcome.votesFor + outcome.votesAgainst).toBe(attendees.length + 1);
  });
});
