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
});
