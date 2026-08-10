/**
 * A deterministic, stylized hex-grid layout for a legislature's districts —
 * not real geography. Statecraft's districts (real-world or custom-nation)
 * only ever carry an id/name, never boundary geometry, so there's no real
 * shape to draw; this produces a plausible, roughly-circular "map" purely
 * from the district list itself, via a standard axial-coordinate hex-ring
 * spiral (see redblobgames.com/grids/hexagons/#rings). Same district list
 * in, same layout out — no randomness involved.
 */

export interface AxialCoord {
  districtId: string;
  q: number;
  r: number;
}

const RING_DIRECTIONS: { q: number; r: number }[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function computeDistrictLayout(districtIds: string[]): AxialCoord[] {
  const layout: AxialCoord[] = [];
  if (districtIds.length === 0) return layout;

  layout.push({ districtId: districtIds[0], q: 0, r: 0 });

  let index = 1;
  let ring = 1;
  while (index < districtIds.length) {
    let q = RING_DIRECTIONS[4].q * ring;
    let r = RING_DIRECTIONS[4].r * ring;
    for (let side = 0; side < 6 && index < districtIds.length; side++) {
      const step = RING_DIRECTIONS[side];
      const stepsThisSide = ring;
      for (let i = 0; i < stepsThisSide && index < districtIds.length; i++) {
        layout.push({ districtId: districtIds[index], q, r });
        index++;
        q += step.q;
        r += step.r;
      }
    }
    ring++;
  }
  return layout;
}

/** Flat-topped axial -> planar (x, z in the 3D scene) conversion. */
export function axialToPixel(q: number, r: number, hexSize: number): { x: number; y: number } {
  const x = hexSize * ((3 / 2) * q);
  const y = hexSize * (Math.sqrt(3) * (r + q / 2));
  return { x, y };
}
