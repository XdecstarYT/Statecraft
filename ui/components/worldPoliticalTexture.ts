import * as THREE from 'three';
import { feature, mesh } from 'topojson-client';
import type { Feature, Geometry, MultiLineString, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, GeometryObject } from 'topojson-specification';
import { findCountryGeoId, worldCountriesTopology } from '../../content/diplomacy/countryGeoIds';
import type { ForeignCounterpart, GameState } from '../../engine';
import { computeMarkerAppearance, sumProduction, type GlobeFilter } from '../worldFilterAppearance';

const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;

const OCEAN_COLOR = '#1c5c8a';
/** A real country/territory the topology has a shape for, but our roster has no game data for (see countryGeoIds.ts's doc comment on coverage gaps). */
const UNMAPPED_LAND_COLOR = '#3c5240';
const BORDER_COLOR = 'rgba(8, 14, 11, 0.55)';
const SELECTED_BORDER_COLOR = '#ffe27a';
const GRATICULE_COLOR = 'rgba(230, 245, 255, 0.12)';

function project(lng: number, lat: number): [number, number] {
  const x = ((lng + 180) / 360) * TEXTURE_WIDTH;
  const y = ((90 - lat) / 180) * TEXTURE_HEIGHT;
  return [x, y];
}

/** Traces one ring/line (array of [lng, lat] points), breaking wherever consecutive points jump >180deg in longitude to avoid antimeridian streaks. */
function tracePath(ctx: CanvasRenderingContext2D, line: number[][], close: boolean) {
  let prevLng: number | null = null;
  line.forEach(([lng, lat], i) => {
    const [x, y] = project(lng, lat);
    const jumped = prevLng !== null && Math.abs(lng - prevLng) > 180;
    if (i === 0 || jumped) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    prevLng = lng;
  });
  if (close) ctx.closePath();
}

function drawGraticule(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = GRATICULE_COLOR;
  ctx.lineWidth = 1;
  for (let lng = -180; lng <= 180; lng += 30) {
    const [x] = project(lng, 0);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TEXTURE_HEIGHT);
    ctx.stroke();
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const [, y] = project(0, lat);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(TEXTURE_WIDTH, y);
    ctx.stroke();
  }
}

function polygonRingsOf(f: Feature<Geometry>): number[][][] {
  const geometry = f.geometry;
  if (geometry.type === 'Polygon') return (geometry as Polygon).coordinates;
  if (geometry.type === 'MultiPolygon') return (geometry as MultiPolygon).coordinates.flat();
  return [];
}

function fillPolygon(ctx: CanvasRenderingContext2D, f: Feature<Geometry>) {
  ctx.beginPath();
  for (const ring of polygonRingsOf(f)) tracePath(ctx, ring, true);
  ctx.fill();
}

function strokePolygon(ctx: CanvasRenderingContext2D, f: Feature<Geometry>) {
  ctx.beginPath();
  for (const ring of polygonRingsOf(f)) tracePath(ctx, ring, true);
  ctx.stroke();
}

function strokeMultiLine(ctx: CanvasRenderingContext2D, multiLine: MultiLineString) {
  ctx.beginPath();
  for (const line of multiLine.coordinates) tracePath(ctx, line, false);
  ctx.stroke();
}

function fillColorFor(hue: number): string {
  return `hsl(${Math.round(hue * 360)}, 62%, 42%)`;
}

/**
 * An equirectangular canvas texture (same UV layout as getWorldLandTexture)
 * shaded per country by whichever filter is active — a real political map
 * instead of a flat landmass blob with dot markers. Countries the topology
 * has a shape for but our roster has no data for (see countryGeoIds.ts)
 * render in a neutral "recognized, untracked" shade rather than being
 * silently omitted. Built fresh on every call — cheap enough (one canvas,
 * ~177 country polygons) to regenerate on every filter/selection/game-data
 * change rather than needing an internal cache.
 */
export function buildWorldPoliticalTexture(
  nations: ForeignCounterpart[],
  game: GameState | null,
  filter: GlobeFilter,
  selectedId: string | null
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = OCEAN_COLOR;
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
  drawGraticule(ctx);

  const geoIdToNation = new Map<string, ForeignCounterpart>();
  for (const nation of nations) {
    const geoId = findCountryGeoId(nation.id, nation.name);
    if (geoId) geoIdToNation.set(geoId, nation);
  }
  const maxProduction = Math.max(1, ...nations.map(sumProduction));

  const countriesObject = worldCountriesTopology.objects.countries as GeometryCollection;
  const geometries = countriesObject.geometries;

  ctx.strokeStyle = 'transparent';
  for (const geometry of geometries) {
    const geoId = String(geometry.id);
    const nation = geoIdToNation.get(geoId);
    const f = feature(worldCountriesTopology, geometry as GeometryObject) as Feature<Geometry>;
    if (nation) {
      const appearance = computeMarkerAppearance(filter, nation, game, maxProduction);
      ctx.fillStyle = fillColorFor(appearance.hue);
    } else {
      ctx.fillStyle = UNMAPPED_LAND_COLOR;
    }
    fillPolygon(ctx, f);
  }

  // Borders drawn as a single mesh pass (shared edges, not double-stroked per polygon).
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  strokeMultiLine(ctx, mesh(worldCountriesTopology, countriesObject) as MultiLineString);

  const selectedNation = selectedId ? nations.find((n) => n.id === selectedId) : undefined;
  const selectedGeoId = selectedNation ? findCountryGeoId(selectedNation.id, selectedNation.name) : undefined;
  if (selectedGeoId) {
    const selectedGeometry = geometries.find((g) => String(g.id) === selectedGeoId);
    if (selectedGeometry) {
      const f = feature(worldCountriesTopology, selectedGeometry as GeometryObject) as Feature<Geometry>;
      ctx.strokeStyle = SELECTED_BORDER_COLOR;
      ctx.lineWidth = 2.4;
      strokePolygon(ctx, f);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
