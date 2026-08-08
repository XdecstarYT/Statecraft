/**
 * Single seeded PRNG source for the whole engine. Do NOT use Math.random()
 * anywhere in game logic — every random outcome must be reproducible from
 * (seed, sequence of calls).
 *
 * Algorithm: mulberry32. Its entire state is one uint32, which is what
 * makes it cheap to store on GameState and resume deterministically.
 */

export type RngState = number;

export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  static fromState(state: RngState): SeededRng {
    const rng = new SeededRng(0);
    rng.state = state >>> 0;
    return rng;
  }

  /** Returns a float in [0, 1). Advances internal state by one step. */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Picks a uniformly random element from a non-empty array. */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from an empty array');
    }
    return items[this.nextInt(0, items.length - 1)];
  }

  getState(): RngState {
    return this.state;
  }
}
