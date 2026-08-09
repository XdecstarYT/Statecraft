import { describe, expect, it } from 'vitest';
import { SeededRng } from './rng';

describe('SeededRng', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new SeededRng(1);
    const b = new SeededRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('always returns values in [0, 1)', () => {
    const rng = new SeededRng(12345);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('resumes deterministically from a saved state', () => {
    const rng = new SeededRng(999);
    rng.next();
    rng.next();
    const savedState = rng.getState();
    const expected = rng.next();

    const resumed = SeededRng.fromState(savedState);
    expect(resumed.next()).toBe(expected);
  });

  it('nextInt stays within the inclusive bounds', () => {
    const rng = new SeededRng(7);
    for (let i = 0; i < 500; i++) {
      const v = rng.nextInt(3, 8);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(8);
      expect(Number.isInteger(v)).toBe(true);
    }
  });

  it('pick throws on an empty array', () => {
    const rng = new SeededRng(1);
    expect(() => rng.pick([])).toThrow();
  });

  describe('pickWeighted', () => {
    it('always picks the only entry when there is just one', () => {
      const rng = new SeededRng(1);
      expect(rng.pickWeighted([{ item: 'only', weight: 5 }])).toBe('only');
    });

    it('never picks a zero-weight entry when a positive-weight one exists', () => {
      const rng = new SeededRng(3);
      for (let i = 0; i < 200; i++) {
        const picked = rng.pickWeighted([
          { item: 'never', weight: 0 },
          { item: 'always', weight: 1 },
        ]);
        expect(picked).toBe('always');
      }
    });

    it('roughly matches configured proportions over many draws', () => {
      const rng = new SeededRng(2024);
      const counts = { heavy: 0, light: 0 };
      const trials = 5000;
      for (let i = 0; i < trials; i++) {
        const picked = rng.pickWeighted([
          { item: 'heavy' as const, weight: 9 },
          { item: 'light' as const, weight: 1 },
        ]);
        counts[picked]++;
      }
      expect(counts.heavy / trials).toBeGreaterThan(0.8);
      expect(counts.heavy / trials).toBeLessThan(0.98);
    });

    it('throws on an empty list', () => {
      const rng = new SeededRng(1);
      expect(() => rng.pickWeighted([])).toThrow();
    });

    it('throws when every weight is zero', () => {
      const rng = new SeededRng(1);
      expect(() => rng.pickWeighted([{ item: 'a', weight: 0 }])).toThrow();
    });

    it('is deterministic for a given rng state', () => {
      const entries = [
        { item: 'a', weight: 3 },
        { item: 'b', weight: 5 },
        { item: 'c', weight: 2 },
      ];
      const a = new SeededRng(77).pickWeighted(entries);
      const b = new SeededRng(77).pickWeighted(entries);
      expect(a).toBe(b);
    });
  });
});
