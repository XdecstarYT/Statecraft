import { feature } from 'topojson-client';
import land110 from 'world-atlas/countries-110m.json';
import type { Feature, Geometry, MultiPolygon, Polygon } from 'geojson';
import type { GeometryCollection, GeometryObject, Topology } from 'topojson-specification';

/**
 * Maps a nation/country id (as used by both content/diplomacy/nations.ts's
 * roster and content/countries/registry.ts's real-world starter picks —
 * they deliberately share the same id space, e.g. both use 'united-states')
 * to the matching country polygon in world-atlas's countries-110m
 * topology, so the globe and district map can draw real borders instead of
 * an abstract blob.
 *
 * Most ids resolve automatically: our content's display names are either
 * already the plain common name (the ~160 generated nations) or, for the
 * ~30 hand-authored major powers, an explicit alias below maps a formal
 * name like "Federative Republic of Brazil" to world-atlas's "Brazil".
 * A further handful of aliases fix known abbreviation mismatches (e.g.
 * "Dem. Rep. Congo" vs "Democratic Republic of the Congo").
 *
 * At the 110m (low) resolution this bundle stays small at, dozens of small
 * island nations and city-states (Singapore, Malta, Monaco, most Pacific
 * and Caribbean microstates, ...) simply aren't present in the topology at
 * all — real limitation of the low-res dataset, not a mapping bug. Those
 * ids resolve to undefined and the caller renders them with the neutral
 * no-data treatment, exactly like every other unmapped territory.
 */
const NAME_ALIASES: Record<string, string> = {
  // Hand-authored major powers: formal constitutional name -> world-atlas's plain name.
  'united-states': 'United States of America',
  china: 'China',
  russia: 'Russia',
  india: 'India',
  'united-kingdom': 'United Kingdom',
  france: 'France',
  'south-korea': 'South Korea',
  japan: 'Japan',
  pakistan: 'Pakistan',
  israel: 'Israel',
  turkey: 'Turkey',
  italy: 'Italy',
  germany: 'Germany',
  iran: 'Iran',
  'saudi-arabia': 'Saudi Arabia',
  brazil: 'Brazil',
  egypt: 'Egypt',
  indonesia: 'Indonesia',
  vietnam: 'Vietnam',
  poland: 'Poland',
  australia: 'Australia',
  spain: 'Spain',
  mexico: 'Mexico',
  canada: 'Canada',
  nigeria: 'Nigeria',
  netherlands: 'Netherlands',
  'south-africa': 'South Africa',
  sweden: 'Sweden',
  switzerland: 'Switzerland',
  argentina: 'Argentina',
  // Generated-roster abbreviation/naming mismatches against world-atlas.
  'congo-republic': 'Congo',
  'congo-drc': 'Dem. Rep. Congo',
  'ivory-coast': "Côte d'Ivoire",
  'czech-republic': 'Czechia',
  'north-macedonia': 'Macedonia',
  'equatorial-guinea': 'Eq. Guinea',
  'bosnia-and-herzegovina': 'Bosnia and Herz.',
  eswatini: 'eSwatini',
  'central-african-republic': 'Central African Rep.',
  'dominican-republic': 'Dominican Rep.',
  'south-sudan': 'S. Sudan',
  'solomon-islands': 'Solomon Is.',
  kosovo: 'Kosovo',
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const topology = land110 as unknown as Topology;
const countryGeometries = (topology.objects.countries as GeometryCollection).geometries;

const byExactName = new Map<string, string>();
const byNormalizedName = new Map<string, string>();
for (const geometry of countryGeometries) {
  const id = String(geometry.id);
  const name = (geometry.properties as { name?: string } | undefined)?.name;
  if (!name) continue;
  byExactName.set(name, id);
  byNormalizedName.set(normalizeName(name), id);
}

/** The topojson numeric country id matching a given nation id, or undefined if this dataset doesn't include that territory. */
export function findCountryGeoId(nationId: string, displayName: string): string | undefined {
  const alias = NAME_ALIASES[nationId];
  if (alias && byExactName.has(alias)) return byExactName.get(alias);
  return byNormalizedName.get(normalizeName(displayName));
}

export { topology as worldCountriesTopology };

export interface SilhouettePoint {
  x: number;
  z: number;
}

/**
 * Shoelace-formula area, with longitude scaled by cos(mean latitude) first
 * so the comparison is apples-to-apples in real physical area rather than
 * raw lng/lat degrees — without this, a high-latitude ring that's wide in
 * longitude (e.g. Alaska) can score as "bigger" than a country's true main
 * landmass (e.g. the continental US) purely because a degree of longitude
 * covers far less real distance up there. Still just a rough estimate, but
 * plenty accurate for picking which ring of a multi-polygon country is
 * actually its largest.
 */
function ringArea(ring: number[][]): number {
  const meanLat = ring.reduce((sum, [, lat]) => sum + lat, 0) / ring.length;
  const lngScale = Math.cos((meanLat * Math.PI) / 180);
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [lng1, lat1] = ring[i];
    const [lng2, lat2] = ring[(i + 1) % ring.length];
    area += lng1 * lngScale * lat2 - lng2 * lngScale * lat1;
  }
  return Math.abs(area) / 2;
}

/**
 * The real, unprojected [lng, lat] outer ring of one country's largest
 * landmass (small offshore islands/exclaves are dropped, same "biggest ring
 * wins" rule as getCountrySilhouette below) — no normalization, no
 * projection, just the raw coordinates straight out of the topology. Used
 * wherever a caller needs real geographic position (e.g. seeding electorate
 * cells inside the country's true shape) rather than a display-ready
 * backdrop. Returns null for the same cases getCountrySilhouette does.
 */
export function getCountryOuterRingLngLat(nationId: string, displayName: string): number[][] | null {
  const geoId = findCountryGeoId(nationId, displayName);
  if (!geoId) return null;
  const geometry = countryGeometries.find((g) => String(g.id) === geoId);
  if (!geometry) return null;

  const f = feature(topology, geometry as GeometryObject) as Feature<Geometry>;
  const polygons: number[][][][] =
    f.geometry.type === 'Polygon'
      ? [(f.geometry as Polygon).coordinates]
      : f.geometry.type === 'MultiPolygon'
        ? (f.geometry as MultiPolygon).coordinates
        : [];
  if (polygons.length === 0) return null;

  let outerRing: number[][] | null = null;
  let bestArea = -Infinity;
  for (const polygon of polygons) {
    const outer = polygon[0];
    const area = ringArea(outer);
    if (area > bestArea) {
      bestArea = area;
      outerRing = outer;
    }
  }
  if (!outerRing || outerRing.length < 3) return null;
  return outerRing;
}

/**
 * A flat, locally-projected silhouette of one country's largest landmass
 * ring (small offshore islands/exclaves are dropped — a stylized backdrop
 * doesn't need every enclave), normalized so its largest half-extent is 1
 * and centered on its own centroid. Callers rescale/recenter to whatever
 * on-screen size they need. Returns null for ids with no geometry —
 * custom/fictional countries, or real countries this low-res dataset
 * doesn't include (see the coverage note above findCountryGeoId).
 */
export function getCountrySilhouette(nationId: string, displayName: string): SilhouettePoint[] | null {
  const outerRing = getCountryOuterRingLngLat(nationId, displayName);
  if (!outerRing) return null;

  const centerLat = outerRing.reduce((sum, [, lat]) => sum + lat, 0) / outerRing.length;
  const centerLng = outerRing.reduce((sum, [lng]) => sum + lng, 0) / outerRing.length;
  const lngScale = Math.cos((centerLat * Math.PI) / 180);

  const projected = outerRing.map(([lng, lat]) => ({
    x: (lng - centerLng) * lngScale,
    z: -(lat - centerLat),
  }));

  const maxExtent = projected.reduce((m, p) => Math.max(m, Math.abs(p.x), Math.abs(p.z)), 0.0001);
  return projected.map((p) => ({ x: p.x / maxExtent, z: p.z / maxExtent }));
}
