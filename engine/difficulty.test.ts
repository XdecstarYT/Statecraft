import { describe, expect, it } from 'vitest';
import { DIFFICULTY_SETTINGS, getDifficultySettings } from './difficulty';

describe('difficulty settings', () => {
  it('orders volatility, event chance, and detection from easy to hard', () => {
    expect(DIFFICULTY_SETTINGS.easy.economyVolatilityMultiplier).toBeLessThan(
      DIFFICULTY_SETTINGS.standard.economyVolatilityMultiplier
    );
    expect(DIFFICULTY_SETTINGS.standard.economyVolatilityMultiplier).toBeLessThan(
      DIFFICULTY_SETTINGS.hard.economyVolatilityMultiplier
    );

    expect(DIFFICULTY_SETTINGS.easy.eventChanceMultiplier).toBeLessThan(
      DIFFICULTY_SETTINGS.hard.eventChanceMultiplier
    );
    expect(DIFFICULTY_SETTINGS.easy.corruptionDetectionMultiplier).toBeLessThan(
      DIFFICULTY_SETTINGS.hard.corruptionDetectionMultiplier
    );
  });

  it('standard is a no-op multiplier (1) across the board', () => {
    expect(DIFFICULTY_SETTINGS.standard).toEqual({
      economyVolatilityMultiplier: 1,
      eventChanceMultiplier: 1,
      corruptionDetectionMultiplier: 1,
    });
  });

  it('getDifficultySettings returns the matching config', () => {
    expect(getDifficultySettings('hard')).toBe(DIFFICULTY_SETTINGS.hard);
  });
});
