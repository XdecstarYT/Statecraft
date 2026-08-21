import * as THREE from 'three';
import { feature, mesh } from 'topojson-client';
import type { Feature, Geometry, MultiLineString, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, GeometryObject } from 'topojson-specification';
import { findCountryGeoId, getCountryOuterRingLngLat, worldCountriesTopology } from '../../content/diplomacy/countryGeoIds';
import { computeElectorateSeedPoints } from '../../content/diplomacy/electorateLayout';
import { resolveFPTPDistrict, type District, type ElectionOutcome, type ForeignCounterpart, type GameState } from '../../engine';
import { computeMarkerAppearance, sumProduction, type GlobeFilter } from '../worldFilterAppearance';
import { partyColor } from '../partyColor';

const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;

const OCEAN_COLOR = '#1c5c8a';
/** A real country/territory the topology has a shape for, but our roster has no game data for (see countryGeoIds.ts's doc comment on coverage gaps). */
const UNMAPPED_LAND_COLOR = '#3c5240';
/** The player's own nation, before any electorate/election detail is painted on top — distinct from UNMAPPED_LAND_COLOR so home territory is always recognizable even pre-election. */
const PLAYER_HOME_BASE_COLOR = '#8a6a2a';
const BORDER_COLOR = 'rgba(8, 14, 11, 0.55)';
const SELECTED_BORDER_COLOR = '#ffe27a';
const GRATICULE_COLOR = 'rgba(230, 245, 255, 0.12)';
/** How much an electorate cell boundary pixel is darkened relative to its fill, so district edges read without needing a separate stroke pass. */
const ELECTORATE_BOUNDARY_DARKEN = 0.45;

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
 * ELECTORATE RASTERIZATION — carves a country's real shape (on this same
 * equirectangular canvas) into its district-shaped cells, so the player's
 * own territory (and, as a showcase, Australia) reads as genuinely
 * subdivided rather than one flat blob. See content/diplomacy/
 * electorateLayout.ts's doc comment: cell POSITIONS are a deterministic
 * approximation, not real electoral boundaries — what's real here is the
 * country's own coastline (from the same world-atlas data as the rest of
 * this file) and the district count/names.
 *
 * The expensive part — which pixel belongs to which cell — depends only on
 * the country's geometry and district id list, never on election results,
 * so it's computed once per (country, district-list) pair and cached;
 * every texture rebuild (which happens on most game-state changes) just
 * recolors the cached cells, not recomputes them.
 */
interface ElectorateRaster {
  minX: number;
  minY: number;
  width: number;
  height: number;
  /** width*height, -1 = outside the country's own shape, else an index into districtIds. */
  cellIndex: Int16Array;
  /** width*height, 1 = this pixel sits on a cell boundary and should be darkened. */
  boundary: Uint8Array;
  districtIds: string[];
}

/**
 * Builds a spatial-hash-accelerated nearest-seed lookup: brute-force
 * distance to every seed per pixel is O(pixels * seeds), which blows well
 * past a second for a large nation's several-hundred-seat roster times its
 * bounding box — this buckets seeds into a coarse grid sized so each
 * bucket holds roughly one seed, and a query only widens its search ring
 * until it's found candidates plus one extra ring for safety, instead of
 * ever touching every seed. A tiny, cosmetically-invisible chance of
 * picking a not-quite-nearest seed right at a cell boundary in exchange for
 * roughly two orders of magnitude less work — this is a display cell
 * assignment, not a real boundary survey (see this file's own doc comment).
 */
function buildSeedFinder(seedPx: [number, number][], originX: number, originY: number): (x: number, y: number) => number {
  let seedMinX = Infinity;
  let seedMaxX = -Infinity;
  let seedMinY = Infinity;
  let seedMaxY = -Infinity;
  for (const [sx, sy] of seedPx) {
    if (sx < seedMinX) seedMinX = sx;
    if (sx > seedMaxX) seedMaxX = sx;
    if (sy < seedMinY) seedMinY = sy;
    if (sy > seedMaxY) seedMaxY = sy;
  }
  const seedArea = Math.max(1, (seedMaxX - seedMinX) * (seedMaxY - seedMinY));
  const cellSize = Math.max(2, Math.sqrt(seedArea / Math.max(1, seedPx.length)));
  const buckets = new Map<string, number[]>();
  const bucketKey = (bx: number, by: number) => `${bx}:${by}`;
  for (let i = 0; i < seedPx.length; i++) {
    const bx = Math.floor((seedPx[i][0] - originX) / cellSize);
    const by = Math.floor((seedPx[i][1] - originY) / cellSize);
    const key = bucketKey(bx, by);
    const bucket = buckets.get(key);
    if (bucket) bucket.push(i);
    else buckets.set(key, [i]);
  }

  return (x: number, y: number): number => {
    const bx = Math.floor((x - originX) / cellSize);
    const by = Math.floor((y - originY) / cellSize);
    let bestIdx = 0;
    let bestDist = Infinity;
    let radius = 0;
    let foundAtRadius = -1;
    while (foundAtRadius === -1 || radius <= foundAtRadius + 1) {
      for (let gy = by - radius; gy <= by + radius; gy++) {
        for (let gx = bx - radius; gx <= bx + radius; gx++) {
          if (radius > 0 && Math.max(Math.abs(gx - bx), Math.abs(gy - by)) !== radius) continue;
          const bucket = buckets.get(bucketKey(gx, gy));
          if (!bucket) continue;
          for (const idx of bucket) {
            const dx = seedPx[idx][0] - x;
            const dy = seedPx[idx][1] - y;
            const d = dx * dx + dy * dy;
            if (d < bestDist) {
              bestDist = d;
              bestIdx = idx;
            }
          }
          if (bucket.length > 0 && foundAtRadius === -1) foundAtRadius = radius;
        }
      }
      radius++;
      if (radius > 4000) break; // pathological safety valve — never expected in practice
    }
    return bestIdx;
  };
}

const electorateRasterCache = new Map<string, ElectorateRaster | null>();

function buildElectorateRaster(nationId: string, displayName: string, districtIds: string[]): ElectorateRaster | null {
  const cacheKey = `${nationId}:${districtIds.join(',')}`;
  if (electorateRasterCache.has(cacheKey)) return electorateRasterCache.get(cacheKey) ?? null;

  const ring = getCountryOuterRingLngLat(nationId, displayName);
  const seeds = ring ? computeElectorateSeedPoints(nationId, displayName, districtIds) : null;
  if (!ring || !seeds || seeds.length === 0) {
    electorateRasterCache.set(cacheKey, null);
    return null;
  }

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  const [px1, py1] = project(minLng, maxLat);
  const [px2, py2] = project(maxLng, minLat);
  const minX = Math.max(0, Math.floor(Math.min(px1, px2)) - 1);
  const maxX = Math.min(TEXTURE_WIDTH - 1, Math.ceil(Math.max(px1, px2)) + 1);
  const minY = Math.max(0, Math.floor(Math.min(py1, py2)) - 1);
  const maxY = Math.min(TEXTURE_HEIGHT - 1, Math.ceil(Math.max(py1, py2)) + 1);
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  const seedPx = seeds.map((s) => project(s.lng, s.lat));
  const findNearestSeed = buildSeedFinder(seedPx, minX, minY);
  const cellIndex = new Int16Array(width * height).fill(-1);

  // "Inside the country's own ring" is tested via a native canvas fill —
  // its scanline rasterizer is far faster than a manual per-pixel ray-cast
  // against a several-hundred-vertex ring (which, done pixel-by-pixel
  // across a large country's whole bounding box, was the actual cost
  // behind a multi-second first World-tab render before this).
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d')!;
  maskCtx.beginPath();
  ring.forEach(([lng, lat], i) => {
    const [x, y] = project(lng, lat);
    if (i === 0) maskCtx.moveTo(x - minX, y - minY);
    else maskCtx.lineTo(x - minX, y - minY);
  });
  maskCtx.closePath();
  maskCtx.fill();
  const mask = maskCtx.getImageData(0, 0, width, height).data;

  for (let row = 0; row < height; row++) {
    const canvasY = minY + row;
    for (let col = 0; col < width; col++) {
      if (mask[(row * width + col) * 4 + 3] === 0) continue;
      const canvasX = minX + col;
      cellIndex[row * width + col] = findNearestSeed(canvasX, canvasY);
    }
  }

  const boundary = new Uint8Array(width * height);
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = cellIndex[row * width + col];
      if (idx < 0) continue;
      const right = col + 1 < width ? cellIndex[row * width + col + 1] : idx;
      const down = row + 1 < height ? cellIndex[(row + 1) * width + col] : idx;
      if (right !== idx || down !== idx) boundary[row * width + col] = 1;
    }
  }

  const raster: ElectorateRaster = { minX, minY, width, height, cellIndex, boundary, districtIds: seeds.map((s) => s.districtId) };
  electorateRasterCache.set(cacheKey, raster);
  return raster;
}

const rgbParseCanvas = document.createElement('canvas');
rgbParseCanvas.width = 1;
rgbParseCanvas.height = 1;
const rgbParseCtx = rgbParseCanvas.getContext('2d')!;

/** Resolves any CSS color string (hsl(...), hex, ...) to 0..255 RGB via a throwaway 1x1 canvas — simplest way to stay correct across every color format this file already uses. */
function parseColorToRgb(cssColor: string): [number, number, number] {
  rgbParseCtx.clearRect(0, 0, 1, 1);
  rgbParseCtx.fillStyle = cssColor;
  rgbParseCtx.fillRect(0, 0, 1, 1);
  const [r, g, b] = rgbParseCtx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** Paints a cached electorate raster's cells onto the canvas, darkening boundary pixels — one getImageData/putImageData round trip over the country's own bounding box, not the whole canvas. */
function paintElectorates(
  ctx: CanvasRenderingContext2D,
  raster: ElectorateRaster,
  colorForDistrict: (districtId: string) => string
) {
  const imageData = ctx.getImageData(raster.minX, raster.minY, raster.width, raster.height);
  const data = imageData.data;
  const rgbCache = new Map<string, [number, number, number]>();

  for (let i = 0; i < raster.cellIndex.length; i++) {
    const cellIdx = raster.cellIndex[i];
    if (cellIdx < 0) continue;
    const districtId = raster.districtIds[cellIdx];
    let rgb = rgbCache.get(districtId);
    if (!rgb) {
      rgb = parseColorToRgb(colorForDistrict(districtId));
      rgbCache.set(districtId, rgb);
    }
    const isBoundary = raster.boundary[i] === 1;
    const scale = isBoundary ? ELECTORATE_BOUNDARY_DARKEN : 1;
    const p = i * 4;
    data[p] = Math.round(rgb[0] * scale);
    data[p + 1] = Math.round(rgb[1] * scale);
    data[p + 2] = Math.round(rgb[2] * scale);
    data[p + 3] = 255;
  }

  ctx.putImageData(imageData, raster.minX, raster.minY);
}

/**
 * An equirectangular canvas texture (same UV layout as getWorldLandTexture)
 * shaded per country by whichever filter is active — a real political map
 * instead of a flat landmass blob with dot markers. Countries the topology
 * has a shape for but our roster has no data for (see countryGeoIds.ts)
 * render in a neutral "recognized, untracked" shade rather than being
 * silently omitted. The player's own country is never one of `nations`
 * (see Globe.tsx) — it gets its own distinct base color. Every nation with
 * real geometry and a recorded district roster — the player's own country
 * AND, since engine/systems/worldElections.ts now runs a genuine per-seat
 * FPTP election for all ~194 world nations, every one of them — gets a
 * full electorate subdivision colored by that nation's own last election's
 * real per-district winners (or, before its first election resolves, a
 * flat boundary-only showcase of its real seat count). Built fresh on
 * every call — cheap enough (one canvas, ~194 country polygons, electorate
 * cell *assignment* cached separately per nation) to regenerate on every
 * filter/selection/game-data change rather than needing an internal cache.
 */
export function buildWorldPoliticalTexture(
  nations: ForeignCounterpart[],
  game: GameState | null,
  filter: GlobeFilter,
  selectedId: string | null,
  lastElection: ElectionOutcome | null = null
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

  const playerGeoId = game ? findCountryGeoId(game.country.id, game.country.name) : undefined;
  const nationAppearanceColor = new Map<string, string>();
  const nationFeature = new Map<string, Feature<Geometry>>();
  let playerFeature: Feature<Geometry> | undefined;

  const countriesObject = worldCountriesTopology.objects.countries as GeometryCollection;
  const geometries = countriesObject.geometries;

  ctx.strokeStyle = 'transparent';
  for (const geometry of geometries) {
    const geoId = String(geometry.id);
    const nation = geoIdToNation.get(geoId);
    const f = feature(worldCountriesTopology, geometry as GeometryObject) as Feature<Geometry>;
    if (geoId === playerGeoId) playerFeature = f;
    if (nation) nationFeature.set(nation.id, f);
    if (nation) {
      const appearance = computeMarkerAppearance(filter, nation, game, maxProduction);
      const color = fillColorFor(appearance.hue);
      nationAppearanceColor.set(nation.id, color);
      ctx.fillStyle = color;
    } else if (geoId === playerGeoId) {
      ctx.fillStyle = PLAYER_HOME_BASE_COLOR;
    } else {
      ctx.fillStyle = UNMAPPED_LAND_COLOR;
    }
    fillPolygon(ctx, f);
  }

  // Borders drawn as a single mesh pass (shared edges, not double-stroked per polygon).
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  strokeMultiLine(ctx, mesh(worldCountriesTopology, countriesObject) as MultiLineString);

  const detailedFeatures: Feature<Geometry>[] = [];

  // Player's own electorates, colored by the last election's real per-district winners.
  if (game && playerGeoId) {
    const districts: District[] = game.country.legislature.districts;
    if (districts.length > 0) {
      const raster = buildElectorateRaster(
        game.country.id,
        game.country.name,
        districts.map((d) => d.id)
      );
      if (raster) {
        const winnerByDistrict = new Map<string, string>();
        if (lastElection?.districtResults) {
          for (const result of lastElection.districtResults) {
            winnerByDistrict.set(result.districtId, resolveFPTPDistrict(result));
          }
        }
        paintElectorates(ctx, raster, (districtId) => {
          const winnerPartyId = winnerByDistrict.get(districtId);
          return winnerPartyId ? partyColor(winnerPartyId) : PLAYER_HOME_BASE_COLOR;
        });
        if (playerFeature) detailedFeatures.push(playerFeature);
      }
    }
  }

  // Every foreign nation's own electorates, colored by ITS OWN real last
  // election's per-district winners (engine/systems/worldElections.ts runs
  // a genuine per-seat FPTP race for every nation in the roster) — before
  // that nation's first election resolves, cells fall back to its single
  // appearance color with boundary lines only, same shape as the player's
  // own pre-election state above.
  if (game) {
    for (const nation of nations) {
      const districts = game.foreignDistricts[nation.id];
      const color = nationAppearanceColor.get(nation.id);
      if (!districts || districts.length === 0 || !color) continue;
      const raster = buildElectorateRaster(
        nation.id,
        nation.name,
        districts.map((d) => d.id)
      );
      if (!raster) continue;

      const districtResults = game.foreignDistrictResults[nation.id];
      const parties = game.foreignParties[nation.id];
      const winnerByDistrict = new Map<string, string>();
      if (districtResults) {
        for (const result of districtResults) winnerByDistrict.set(result.districtId, resolveFPTPDistrict(result));
      }
      paintElectorates(ctx, raster, (districtId) => {
        const winnerPartyId = winnerByDistrict.get(districtId);
        if (!winnerPartyId) return color;
        const party = parties?.find((p) => p.id === winnerPartyId);
        return party ? partyColor(party.id) : color;
      });

      const f = nationFeature.get(nation.id);
      if (f) detailedFeatures.push(f);
    }
  }

  // Electorate painting overwrites raw pixels within each detailed
  // country's own bounding box, including the coastline stroke drawn just
  // inside its edge — re-stroking just those countries' outlines restores
  // a crisp border on top rather than leaving a half-erased coastline.
  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  for (const f of detailedFeatures) strokePolygon(ctx, f);

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
