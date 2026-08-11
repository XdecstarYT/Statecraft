import { MAX_IDEOLOGICAL_DISTANCE, ideologicalDistance, type ForeignCounterpart, type GameState } from '../engine';

/**
 * Every filter is driven by data the engine actually tracks — no
 * placeholder numbers. "military" is the original default; the other
 * three reuse foreignRelations, each nation's own trade.production, and
 * ideological distance from the player's own politician respectively.
 * Shared between Globe.tsx (marker appearance) and worldPoliticalTexture.ts
 * (country choropleth fill) so both read the exact same signal.
 */
export type GlobeFilter = 'military' | 'relations' | 'trade' | 'ideology';

export const GLOBE_FILTER_LABELS: Record<GlobeFilter, string> = {
  military: 'Military Strength',
  relations: 'Foreign Relations',
  trade: 'Economic Activity',
  ideology: 'Ideological Alignment',
};

export interface MarkerAppearance {
  hue: number;
  /** A scale multiplier on the marker's fixed base geometry, not an absolute radius — cheap to update without rebuilding meshes. */
  scale: number;
}

export function sumProduction(nation: ForeignCounterpart): number {
  return Object.values(nation.trade.production).reduce((a, b) => a + b, 0);
}

export const MIN_SCALE = 0.55;
export const MAX_SCALE = 1.85;

export function computeMarkerAppearance(
  filter: GlobeFilter,
  nation: ForeignCounterpart,
  game: GameState | null,
  maxProduction: number
): MarkerAppearance {
  if (filter === 'relations') {
    const relation = game?.foreignRelations[nation.id] ?? 0; // -100..100
    const normalized = (relation + 100) / 200; // 0 (hostile) .. 1 (friendly)
    return { hue: normalized * 0.35, scale: MIN_SCALE + (Math.abs(relation) / 100) * (MAX_SCALE - MIN_SCALE) };
  }
  if (filter === 'trade') {
    const normalized = maxProduction > 0 ? sumProduction(nation) / maxProduction : 0;
    return { hue: 0.13 - normalized * 0.13, scale: MIN_SCALE + normalized * (MAX_SCALE - MIN_SCALE) }; // gold (high) -> dim red (low)
  }
  if (filter === 'ideology') {
    const player = game?.politicians.find((p) => p.isPlayer);
    const distance = player ? ideologicalDistance(nation.ideology, player.ideology) : MAX_IDEOLOGICAL_DISTANCE / 2;
    const normalized = 1 - distance / MAX_IDEOLOGICAL_DISTANCE; // 1 (aligned) .. 0 (opposed)
    return { hue: normalized * 0.35, scale: MIN_SCALE + normalized * (MAX_SCALE - MIN_SCALE) };
  }
  const strength = nation.military.strength;
  return { hue: 0.58 - (strength / 100) * 0.58, scale: MIN_SCALE + (strength / 100) * (MAX_SCALE - MIN_SCALE) };
}
