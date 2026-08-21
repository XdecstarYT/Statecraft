import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getCountrySilhouette } from '../../content/diplomacy/countryGeoIds';
import { getProvinces, resolveFPTPDistrict, type District } from '../../engine';
import { axialToPixel, computeDistrictLayoutByProvince } from './hexLayout';
import { useStatecraftStore } from '../store';

const HEX_SIZE = 1;
const HEX_GAP = 0.035;
const BASE_HEIGHT = 0.35;
const WATER_LEVEL = -0.4;

/** A stable, vivid color per party, hashed from its id — no hand-authored palette to keep in sync as parties merge/split/get founded mid-game. */
function partyColor(partyId: string): THREE.Color {
  let hash = 0;
  for (let i = 0; i < partyId.length; i++) hash = (hash * 31 + partyId.charCodeAt(i)) >>> 0;
  const hue = (hash % 360) / 360;
  return new THREE.Color().setHSL(hue, 0.62, 0.48);
}

/** A tiny, purely cosmetic deterministic hash used only for terrain-like height jitter — never gameplay-affecting, so this deliberately isn't the seeded game RNG. */
function cosmeticHash01(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 1000;
}

/** A muted, stable backdrop color per province — deliberately lower saturation/lightness than partyColor's district tiles, so the plate reads as a neutral base a province's tiles sit on rather than competing with the (gameplay-real) party coloring above it. */
function provincePlateColor(provinceId: string): THREE.Color {
  let hash = 0;
  for (let i = 0; i < provinceId.length; i++) hash = (hash * 31 + provinceId.charCodeAt(i)) >>> 0;
  const hue = (hash % 360) / 360;
  return new THREE.Color().setHSL(hue, 0.32, 0.14);
}

/** A camera-facing text label sprite, rendered once onto a canvas texture — used for province name tags floating over the map. */
function createLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const fontSize = 42;
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  const textWidth = ctx.measureText(text).width;
  canvas.width = Math.ceil(textWidth + 40);
  canvas.height = fontSize + 24;
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(8, 12, 20, 0.72)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#e8edf7';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({ map: texture, depthWrite: false, transparent: true });
  const sprite = new THREE.Sprite(material);
  const aspect = canvas.width / canvas.height;
  const spriteHeight = 0.55;
  sprite.scale.set(spriteHeight * aspect, spriteHeight, 1);
  return sprite;
}

function hexTileGeometry(height: number): THREE.CylinderGeometry {
  return new THREE.CylinderGeometry(HEX_SIZE, HEX_SIZE * 1.02, height, 6, 1);
}

interface CountryMapSceneProps {
  onSelectDistrict?: (districtId: string) => void;
  selectedDistrictId?: string | null;
}

/**
 * A 3D extruded hex-tile map of the player's own districts — same
 * "stylized, not real geography" approach as the flat SVG version it
 * replaces, just rendered as a raised game-board with real lighting,
 * shadows, and a surrounding sea rather than flat outlines. Built with the
 * exact three.js rig (renderer/camera/OrbitControls/raycaster/cleanup) the
 * World tab's Globe already uses, for consistency and reliability.
 */
export function CountryMapScene({ onSelectDistrict, selectedDistrictId }: CountryMapSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tilesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const onSelectRef = useRef(onSelectDistrict);
  onSelectRef.current = onSelectDistrict;

  const game = useStatecraftStore((s) => s.game);
  const lastElection = useStatecraftStore((s) => s.lastElection);
  const districts: District[] = game?.country.legislature.districts ?? [];
  const districtsKey = districts.map((d) => d.id).join(',');

  useEffect(() => {
    const container = containerRef.current;
    if (!container || districts.length === 0) return;

    const provinces = game ? getProvinces(game.country) : [];
    const layout = computeDistrictLayoutByProvince(districts.map((d) => d.id), provinces);
    const districtsById = new Map(districts.map((d) => [d.id, d]));

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060a12);
    scene.fog = new THREE.Fog(0x060a12, 9, 22);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
    camera.position.set(0, 7, 6.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3.5;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.target.set(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.65));
    const sun = new THREE.DirectionalLight(0xfff4e0, 1.4);
    sun.position.set(10, 16, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -8;
    sun.shadow.camera.right = 8;
    sun.shadow.camera.top = 8;
    sun.shadow.camera.bottom = -8;
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0x9fc7ff, 0.35);
    fill.position.set(-10, 6, -8);
    scene.add(fill);

    // A dark water plane beneath and around the island of hex tiles, so the
    // map reads as a landmass rather than tiles floating in a void.
    const water = new THREE.Mesh(
      new THREE.CircleGeometry(12, 48),
      new THREE.MeshPhongMaterial({ color: 0x0b2a4a, shininess: 60, specular: 0x2a5a8a })
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = WATER_LEVEL;
    water.receiveShadow = true;
    scene.add(water);

    // For a real-world country pick, trace its actual coastline (from the
    // same world-atlas data the globe uses) as a flat landmass slab under
    // the hex tiles, scaled to comfortably contain them — so the districts
    // read as sitting inside that country's real shape, not floating in
    // empty water. Custom/fictional countries, or real ones this low-res
    // dataset doesn't cover, simply keep the plain circular water above.
    const tilePositions = layout.map((cell) => axialToPixel(cell.q, cell.r, HEX_SIZE + HEX_GAP));
    const maxTileRadius = tilePositions.reduce((m, p) => Math.max(m, Math.hypot(p.x, p.y)), HEX_SIZE);
    const silhouette = game ? getCountrySilhouette(game.country.id, game.country.name) : null;
    if (silhouette && silhouette.length >= 3) {
      // Orient the country's longer geographic axis onto the scene's
      // lateral (X) axis rather than its depth (Z) axis: at this camera's
      // elevated, close-in angle, fog and near-clipping are far more
      // forgiving sideways than in depth, so a tall north-south country
      // (South Korea) needs its axes swapped to stay visible, while a wide
      // east-west one (the US) doesn't. Purely a display reorientation of
      // an already-stylized backdrop (see hexLayout.ts) — this map never
      // claimed real compass alignment in the first place.
      const xExtent = silhouette.reduce((m, p) => Math.max(m, Math.abs(p.x)), 0);
      const zExtent = silhouette.reduce((m, p) => Math.max(m, Math.abs(p.z)), 0);
      const swapAxes = zExtent > xExtent;
      const majorExtent = Math.max(xExtent, zExtent) || 1;
      const minorExtent = Math.min(xExtent, zExtent) || 1;

      // A real coastline isn't star-convex around its own centroid, so a
      // single uniform scale only guarantees ONE extreme point reaches past
      // the outermost tile — everywhere else, the shorter axis stays well
      // inside the tile radius and just disappears under the opaque tiles.
      // Scaling each axis independently to its own target instead makes
      // both the long and short axis actually reach out past the tiles.
      // The major (lateral, X) axis can go generously wide; the minor
      // (depth, Z) axis stays deliberately more modest so it doesn't run
      // into the fog(9, 22)/camera-distance tuning below.
      const majorRadius = maxTileRadius * 1.6;
      const minorRadius = maxTileRadius * 1.25;
      const scenePoints = silhouette.map((p) => {
        const major = swapAxes ? p.z : p.x;
        const minor = swapAxes ? p.x : p.z;
        return {
          x: (major / majorExtent) * majorRadius,
          z: (minor / minorExtent) * minorRadius,
        };
      });

      // ShapeGeometry builds vertices in its local XY plane, and the mesh
      // is then rotated -90deg about X to lie flat — that rotation maps
      // local (x, y, 0) to world (x, 0, -y), so the shape's y coordinate
      // must be pre-negated here to land on world Z = +scenePoint.z,
      // matching the unrotated coastline LineLoop below (and the tiles'
      // own axialToPixel convention) exactly. Without this the fill and
      // its outline end up mirrored across the X axis from each other.
      const shape = new THREE.Shape();
      scenePoints.forEach((p, i) => {
        if (i === 0) shape.moveTo(p.x, -p.z);
        else shape.lineTo(p.x, -p.z);
      });
      shape.closePath();

      const land = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshPhongMaterial({ color: 0x24301f, shininess: 5 })
      );
      land.rotation.x = -Math.PI / 2;
      land.position.y = WATER_LEVEL + 0.03;
      land.receiveShadow = true;
      scene.add(land);

      const coastlinePoints = scenePoints.map((p) => new THREE.Vector3(p.x, WATER_LEVEL + 0.04, p.z));
      const coastline = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(coastlinePoints),
        new THREE.LineBasicMaterial({ color: 0x5a7a4f })
      );
      scene.add(coastline);
    }

    tilesRef.current.clear();

    // Group each province's own tiles to drop a low background plate + a
    // floating name label beneath/above its cluster (see
    // computeDistrictLayoutByProvince in hexLayout.ts) — a purely visual
    // decluttering aid; per-seat party coloring below is unaffected. Skipped
    // entirely when there's nothing real to group (a single province, or a
    // PR legislature with no district-level provinces at all).
    const provinceGroups = new Map<string, { name: string; positions: { x: number; z: number }[] }>();
    for (const cell of layout) {
      if (!cell.provinceId) continue;
      const pos = axialToPixel(cell.q, cell.r, HEX_SIZE + HEX_GAP);
      let group = provinceGroups.get(cell.provinceId);
      if (!group) {
        group = { name: cell.provinceName, positions: [] };
        provinceGroups.set(cell.provinceId, group);
      }
      group.positions.push({ x: pos.x, z: pos.y });
    }
    if (provinceGroups.size > 1) {
      provinceGroups.forEach((group, provinceId) => {
        const centerX = group.positions.reduce((sum, p) => sum + p.x, 0) / group.positions.length;
        const centerZ = group.positions.reduce((sum, p) => sum + p.z, 0) / group.positions.length;
        const radius =
          group.positions.reduce((m, p) => Math.max(m, Math.hypot(p.x - centerX, p.z - centerZ)), HEX_SIZE) + HEX_SIZE * 1.1;

        const plate = new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, 0.08, 24),
          new THREE.MeshPhongMaterial({ color: provincePlateColor(provinceId), shininess: 5 })
        );
        plate.position.set(centerX, -0.05, centerZ);
        plate.receiveShadow = true;
        scene.add(plate);

        const label = createLabelSprite(group.name);
        label.position.set(centerX, 1.0, centerZ);
        scene.add(label);
      });
    }

    for (const cell of layout) {
      const { x, y: z } = axialToPixel(cell.q, cell.r, HEX_SIZE + HEX_GAP);
      const jitter = cosmeticHash01(cell.districtId);
      const tileHeight = BASE_HEIGHT + jitter * 0.25;
      const mesh = new THREE.Mesh(
        hexTileGeometry(tileHeight),
        new THREE.MeshPhongMaterial({ color: 0x2a3348, shininess: 15 })
      );
      mesh.position.set(x, tileHeight / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.districtId = cell.districtId;
      mesh.userData.districtName = districtsById.get(cell.districtId)?.name ?? cell.districtId;
      mesh.userData.baseY = tileHeight / 2;
      scene.add(mesh);
      tilesRef.current.set(cell.districtId, mesh);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;

    function handlePointerDown(event: PointerEvent) {
      downX = event.clientX;
      downY = event.clientY;
    }

    function handlePointerUp(event: PointerEvent) {
      if (Math.abs(event.clientX - downX) > 4 || Math.abs(event.clientY - downY) > 4) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes = Array.from(tilesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        const id = intersects[0].object.userData.districtId as string;
        onSelectRef.current?.(id);
      }
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    let frameId: number;
    function animate() {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }
    animate();

    function handleResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 420;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Line) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        } else if (obj instanceof THREE.Sprite) {
          obj.material.map?.dispose();
          obj.material.dispose();
        }
      });
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
    // Rebuilt only when the district roster itself changes (new game /
    // different country) — coloring and selection are handled by the
    // cheap material-update effect below without tearing down the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtsKey]);

  // Recolors tiles (winner party / neutral) and lifts the selected tile —
  // cheap material + position updates only, safe to run on every game or
  // selection change without rebuilding the WebGL scene.
  useEffect(() => {
    if (!game) return;
    const winnerByDistrict = new Map<string, string>();
    if (lastElection?.districtResults) {
      for (const result of lastElection.districtResults) {
        winnerByDistrict.set(result.districtId, resolveFPTPDistrict(result));
      }
    }
    tilesRef.current.forEach((mesh, id) => {
      const winnerPartyId = winnerByDistrict.get(id);
      const material = mesh.material as THREE.MeshPhongMaterial;
      material.color = winnerPartyId ? partyColor(winnerPartyId) : new THREE.Color(0x2a3348);
      const baseY = mesh.userData.baseY as number;
      mesh.position.y = id === selectedDistrictId ? baseY + 0.22 : baseY;
    });
  }, [game, lastElection, selectedDistrictId]);

  return <div ref={containerRef} className="country-map-3d-container" />;
}
