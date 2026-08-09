import * as THREE from 'three';
import { feature } from 'topojson-client';
import type { Feature, Geometry, MultiPolygon, Polygon } from 'geojson';
import type { Topology } from 'topojson-specification';
// world-atlas ships plain JSON with no type declarations; a low-resolution
// (110m) landmass outline is all a stylized globe needs, and it's ~55KB.
// Bundled at build time — no runtime network fetch.
import land110 from 'world-atlas/land-110m.json';

const TEXTURE_WIDTH = 2048;
const TEXTURE_HEIGHT = 1024;

const OCEAN_COLOR = '#0a1424';
const LAND_COLOR = '#233b52';
const LAND_STROKE = '#3a5a78';
const GRATICULE_COLOR = 'rgba(120, 150, 190, 0.12)';

function project(lng: number, lat: number): [number, number] {
  const x = ((lng + 180) / 360) * TEXTURE_WIDTH;
  const y = ((90 - lat) / 180) * TEXTURE_HEIGHT;
  return [x, y];
}

/**
 * Draws one ring (array of [lng, lat] points), breaking the path wherever
 * consecutive points jump more than 180deg in longitude — a cheap guard
 * against the antimeridian-crossing streaks a naive equirectangular
 * projection would otherwise draw across the whole canvas.
 */
function tracePath(ctx: CanvasRenderingContext2D, ring: number[][]) {
  let prevLng: number | null = null;
  ring.forEach(([lng, lat], i) => {
    const [x, y] = project(lng, lat);
    const jumped = prevLng !== null && Math.abs(lng - prevLng) > 180;
    if (i === 0 || jumped) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    prevLng = lng;
  });
  ctx.closePath();
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

let cachedTexture: THREE.CanvasTexture | null = null;

/** Builds (once) an equirectangular canvas texture of world landmasses, matching SphereGeometry's default UV layout. */
export function getWorldLandTexture(): THREE.CanvasTexture {
  if (cachedTexture) return cachedTexture;

  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = OCEAN_COLOR;
  ctx.fillRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

  drawGraticule(ctx);

  const topology = land110 as unknown as Topology;
  const landFeature = feature(topology, topology.objects.land) as
    | Feature<Geometry>
    | { type: 'FeatureCollection'; features: Feature<Geometry>[] };
  const features = landFeature.type === 'FeatureCollection' ? landFeature.features : [landFeature];

  ctx.fillStyle = LAND_COLOR;
  ctx.strokeStyle = LAND_STROKE;
  ctx.lineWidth = 1.2;

  for (const f of features) {
    const geometry = f.geometry;
    const polygons: number[][][][] =
      geometry.type === 'Polygon'
        ? [(geometry as Polygon).coordinates]
        : geometry.type === 'MultiPolygon'
          ? (geometry as MultiPolygon).coordinates
          : [];

    for (const polygon of polygons) {
      ctx.beginPath();
      for (const ring of polygon) tracePath(ctx, ring);
      ctx.fill();
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cachedTexture = texture;
  return texture;
}
