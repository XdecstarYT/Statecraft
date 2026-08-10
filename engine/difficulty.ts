/**
 * A realism/difficulty setting with real mechanical effects — not just how
 * much bookkeeping is shown, but how volatile the economy is, how often
 * crises hit, and how easily corruption gets caught.
 */

export type Difficulty = 'easy' | 'standard' | 'hard';

export interface DifficultySettings {
  /** Scales the magnitude of per-turn economic drift and noise. */
  economyVolatilityMultiplier: number;
  /** Scales the base chance a crisis event fires each turn. */
  eventChanceMultiplier: number;
  /** Scales corruption detection chance. */
  corruptionDetectionMultiplier: number;
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: {
    economyVolatilityMultiplier: 0.6,
    eventChanceMultiplier: 0.6,
    corruptionDetectionMultiplier: 0.7,
  },
  standard: {
    economyVolatilityMultiplier: 1,
    eventChanceMultiplier: 1,
    corruptionDetectionMultiplier: 1,
  },
  hard: {
    economyVolatilityMultiplier: 1.5,
    eventChanceMultiplier: 1.5,
    corruptionDetectionMultiplier: 1.3,
  },
};

export function getDifficultySettings(difficulty: Difficulty): DifficultySettings {
  return DIFFICULTY_SETTINGS[difficulty];
}
