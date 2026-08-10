import type { CareerState, GameState } from '../engine';
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

const CAREER_SAVE_KEY = 'statecraft-career-v1';
const CAREER_SAVE_VERSION = 1;

export interface CareerSaveFile {
  version: typeof CAREER_SAVE_VERSION;
  savedAt: string;
  career: CareerState;
}

/** A separate save slot from the main game — a player can have an in-progress career with no GameState yet. */
export function saveCareer(career: CareerState): void {
  const save: CareerSaveFile = { version: CAREER_SAVE_VERSION, savedAt: new Date().toISOString(), career };
  localStorage.setItem(CAREER_SAVE_KEY, JSON.stringify(save));
}

export function loadCareer(): CareerSaveFile | null {
  const raw = localStorage.getItem(CAREER_SAVE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CareerSaveFile;
    if (parsed.version !== CAREER_SAVE_VERSION || !parsed.career) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function hasSavedCareer(): boolean {
  return localStorage.getItem(CAREER_SAVE_KEY) !== null;
}

export function clearSavedCareer(): void {
  localStorage.removeItem(CAREER_SAVE_KEY);
}

const HALL_OF_FAME_KEY = 'statecraft-hall-of-fame-v1';
const HALL_OF_FAME_MAX_ENTRIES = 25;

export interface HallOfFameEntry {
  name: string;
  countryName: string;
  turn: number;
  personalPower: number;
  partyDominance: number;
  nationalPrestige: number;
  contemporaryVerdict: number;
  historiansVerdict: number;
  achievements: string[];
  recordedAt: string;
}

/** Records one playthrough snapshot into the cross-playthrough hall of fame — newest first, capped at 25 entries. */
export function recordHallOfFameEntry(entry: HallOfFameEntry): void {
  const existing = getHallOfFame();
  const updated = [entry, ...existing].slice(0, HALL_OF_FAME_MAX_ENTRIES);
  localStorage.setItem(HALL_OF_FAME_KEY, JSON.stringify(updated));
}

export function getHallOfFame(): HallOfFameEntry[] {
  const raw = localStorage.getItem(HALL_OF_FAME_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearHallOfFame(): void {
  localStorage.removeItem(HALL_OF_FAME_KEY);
}

const ACCESSIBILITY_KEY = 'statecraft-accessibility-v1';

export type FontScale = 'normal' | 'large' | 'xlarge';

export interface AccessibilitySettings {
  colorblindMode: boolean;
  fontScale: FontScale;
  reducedMotion: boolean;
}

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  colorblindMode: false,
  fontScale: 'normal',
  reducedMotion: false,
};

export function saveAccessibilitySettings(settings: AccessibilitySettings): void {
  localStorage.setItem(ACCESSIBILITY_KEY, JSON.stringify(settings));
}

export function loadAccessibilitySettings(): AccessibilitySettings {
  const raw = localStorage.getItem(ACCESSIBILITY_KEY);
  if (!raw) return DEFAULT_ACCESSIBILITY_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ACCESSIBILITY_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }
}

const ONBOARDING_KEY = 'statecraft-onboarding-dismissed-v1';

export function hasSeenOnboarding(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === '1';
}

export function markOnboardingSeen(): void {
  localStorage.setItem(ONBOARDING_KEY, '1');
}
