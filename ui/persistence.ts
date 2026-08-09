import type { GameState } from '../engine';
import type { EconomySnapshot } from './store';

/**
 * localStorage save/load — deliberately kept out of /engine, which must
 * stay framework/browser-free. GameState is plain JSON-serializable data
 * (no class instances), so this is a straight stringify/parse.
 */

const SAVE_KEY = 'statecraft-save-v1';
const SAVE_VERSION = 1;

export interface SaveFile {
  version: typeof SAVE_VERSION;
  savedAt: string;
  game: GameState;
  economyHistory: EconomySnapshot[];
}

export function saveGame(game: GameState, economyHistory: EconomySnapshot[]): void {
  const save: SaveFile = { version: SAVE_VERSION, savedAt: new Date().toISOString(), game, economyHistory };
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function loadGame(): SaveFile | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SaveFile;
    if (parsed.version !== SAVE_VERSION || !parsed.game) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasSavedGame(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}

export function clearSavedGame(): void {
  localStorage.removeItem(SAVE_KEY);
}

const ONBOARDING_KEY = 'statecraft-onboarding-dismissed-v1';

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export function markOnboardingSeen(): void {
  localStorage.setItem(ONBOARDING_KEY, '1');
}
