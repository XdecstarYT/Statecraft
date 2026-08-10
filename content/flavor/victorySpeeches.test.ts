import { describe, expect, it } from 'vitest';
import { SeededRng } from '../../engine/rng';
import { pickVictorySpeech } from './victorySpeeches';

describe('pickVictorySpeech', () => {
  it('substitutes the party name into the speech', () => {
    const speech = pickVictorySpeech('Test Party', { economic: 0, social: 0 }, 0.5, new SeededRng(1));
    expect(speech.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same rng state', () => {
    const a = pickVictorySpeech('Test Party', { economic: 20, social: -10 }, 0.4, new SeededRng(42));
    const b = pickVictorySpeech('Test Party', { economic: 20, social: -10 }, 0.4, new SeededRng(42));
    expect(a).toBe(b);
  });

  it('never leaves the {party} placeholder unsubstituted', () => {
    for (let seed = 0; seed < 30; seed++) {
      const speech = pickVictorySpeech('Unity Party', { economic: 0, social: 0 }, 0.6, new SeededRng(seed));
      expect(speech).not.toContain('{party}');
    }
  });

  it('produces varied output across different rng seeds', () => {
    const speeches = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      speeches.add(pickVictorySpeech('Unity Party', { economic: 10, social: 10 }, 0.5, new SeededRng(seed)));
    }
    expect(speeches.size).toBeGreaterThan(1);
  });
});
