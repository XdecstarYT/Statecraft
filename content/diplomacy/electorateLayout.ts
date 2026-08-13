import { getCountryOuterRingLngLat } from './countryGeoIds';

/**
 * ELECTORATE SEED POINTS — a deterministic, purely-cosmetic point inside a
 * country's real border for each of its districts, used to carve the
 * country's real shape (on the 3D globe) into district-shaped cells via
 * nearest-seed classification. This is not real electoral geography: with
 * no electorate boundary data anywhere in this codebase (see
 * countryGeoIds.ts's coverage notes), a seed point's position has no
 * relation to where that named district's real-world boundary actually
 * sits — what's real is the country's own outline, the district count, and
 * (where authored) the district's name; the internal subdivision is a
 * deterministic approximation, not a survey.
 *
 * The seed generator's own PRNG is a tiny local mulberry32 keyed off the
 * country id, deliberately NOT the seeded gameplay RNG (rng.ts) — this is
 * cosmetic layout, not a game outcome, and must stay stable across a
 * session regardless of player actions (see the same reasoning in
 * CountryMapScene.tsx's cosmeticHash01).
 */

export interface ElectorateSeed {
  districtId: string;
  lng: number;
  lat: number;
}

function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ray-casting point-in-polygon test against a [lng, lat] ring. */
function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lngI, latI] = ring[i];
    const [lngJ, latJ] = ring[j];
    const intersects = latI > lat !== latJ > lat && lng < ((lngJ - lngI) * (lat - latI)) / (latJ - latI) + lngI;
    if (intersects) inside = !inside;
  }
  return inside;
}

const seedCache = new Map<string, ElectorateSeed[] | null>();

const MAX_ATTEMPTS_PER_POINT = 400;
const MASK_RESOLUTION = 400;

interface InsideMask {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Rasterizes the ring into an inside/outside bitmap ONCE via a native
 * canvas fill (fast, optimized scanline rasterizer), so the rejection-
 * sampling loop below can do an O(1) array lookup per candidate point
 * instead of an O(ring-vertex-count) ray-cast — for a several-hundred-
 * vertex coastline tested against up to hundreds of candidates per seed,
 * that ray-cast was the dominant cost of seeding a large nation. Returns
 * null outside a browser context (canvas unavailable), in which case the
 * caller falls back to the exact ray-cast test directly.
 */
function buildInsideMask(ring: number[][], minLng: number, maxLng: number, minLat: number, maxLat: number): InsideMask | null {
  if (typeof document === 'undefined') return null;
  const spanLng = Math.max(0.0001, maxLng - minLng);
  const spanLat = Math.max(0.0001, maxLat - minLat);
  const aspect = spanLng / spanLat;
  const width = Math.max(1, Math.round(aspect >= 1 ? MASK_RESOLUTION : MASK_RESOLUTION * aspect));
  const height = Math.max(1, Math.round(aspect >= 1 ? MASK_RESOLUTION / aspect : MASK_RESOLUTION));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.beginPath();
  ring.forEach(([lng, lat], i) => {
    const x = ((lng - minLng) / spanLng) * width;
    const y = ((maxLat - lat) / spanLat) * height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fill();
  return { data: ctx.getImageData(0, 0, width, height).data, width, height };
}

function isInsideMask(mask: InsideMask, minLng: number, maxLng: number, minLat: number, maxLat: number, lng: number, lat: number): boolean {
  const x = Math.min(mask.width - 1, Math.max(0, Math.floor(((lng - minLng) / Math.max(0.0001, maxLng - minLng)) * mask.width)));
  const y = Math.min(mask.height - 1, Math.max(0, Math.floor(((maxLat - lat) / Math.max(0.0001, maxLat - minLat)) * mask.height)));
  return mask.data[(y * mask.width + x) * 4 + 3] > 0;
}

/**
 * Deterministically places one seed point per district somewhere inside the
 * country's real outer ring, spread out via shrinking-radius Poisson-disc
 * rejection (dense district counts — e.g. ~150 for Australia — fall back to
 * a smaller minimum spacing automatically rather than failing to place all
 * points). Returns null if this country has no real geometry to seed
 * within (custom/fictional countries, or ids the low-res dataset lacks).
 */
export function computeElectorateSeedPoints(
  nationId: string,
  displayName: string,
  districtIds: string[]
): ElectorateSeed[] | null {
  const cacheKey = `${nationId}:${districtIds.join(',')}`;
  if (seedCache.has(cacheKey)) return seedCache.get(cacheKey) ?? null;

  const ring = getCountryOuterRingLngLat(nationId, displayName);
  if (!ring || districtIds.length === 0) {
    seedCache.set(cacheKey, null);
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
  const spanLng = Math.max(0.01, maxLng - minLng);
  const spanLat = Math.max(0.01, maxLat - minLat);
  const meanLat = (minLat + maxLat) / 2;
  const lngScale = Math.max(0.1, Math.cos((meanLat * Math.PI) / 180));

  const rng = mulberry32(hashString(nationId) ^ districtIds.length);
  const points: { lng: number; lat: number }[] = [];
  const mask = buildInsideMask(ring, minLng, maxLng, minLat, maxLat);
  const isInside = (lng: number, lat: number) =>
    mask ? isInsideMask(mask, minLng, maxLng, minLat, maxLat, lng, lat) : pointInRing(lng, lat, ring);

  // Physical (lngScale-corrected) diagonal of the bounding box, divided down
  // by roughly how many cells should fit across it — shrinks automatically
  // for large district counts (Australia) so placement never stalls.
  const diagonal = Math.hypot(spanLng * lngScale, spanLat);
  let minSpacing = diagonal / Math.sqrt(districtIds.length * 1.3);

  for (let i = 0; i < districtIds.length; i++) {
    let placed = false;
    for (let shrink = 0; shrink < 6 && !placed; shrink++) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_POINT && !placed; attempt++) {
        const lng = minLng + rng() * spanLng;
        const lat = minLat + rng() * spanLat;
        if (!isInside(lng, lat)) continue;
        const tooClose = points.some((p) => {
          const dx = (p.lng - lng) * lngScale;
          const dz = p.lat - lat;
          return Math.hypot(dx, dz) < minSpacing;
        });
        if (tooClose) continue;
        // The mask is a coarse (400px) approximation — verify with the
        // exact ray-cast before committing a seed, so accuracy near a
        // coastline never depends on mask resolution. Cheap here since
        // it's one exact check per ACCEPTED seed, not per candidate.
        if (mask && !pointInRing(lng, lat, ring)) continue;
        points.push({ lng, lat });
        placed = true;
      }
      if (!placed) minSpacing *= 0.6;
    }
    if (!placed) {
      // Pathological shapes (very thin/sliver countries): fall back to any
      // in-ring point at all, ignoring spacing, rather than under-filling.
      for (let attempt = 0; attempt < MAX_ATTEMPTS_PER_POINT; attempt++) {
        const lng = minLng + rng() * spanLng;
        const lat = minLat + rng() * spanLat;
        if (pointInRing(lng, lat, ring)) {
          points.push({ lng, lat });
          placed = true;
          break;
        }
      }
    }
    if (!placed) points.push({ lng: minLng + spanLng / 2, lat: minLat + spanLat / 2 });
  }

  const seeds = districtIds.map((districtId, i) => ({ districtId, lng: points[i].lng, lat: points[i].lat }));
  seedCache.set(cacheKey, seeds);
  return seeds;
}
