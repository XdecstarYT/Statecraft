import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MAX_IDEOLOGICAL_DISTANCE, ideologicalDistance, type ForeignCounterpart, type GameState } from '../../engine';
import { useStatecraftStore } from '../store';
import { getWorldLandTexture } from './worldLandTexture';

const GLOBE_RADIUS = 5;

/**
 * Every filter is driven by data the engine actually tracks — no
 * placeholder numbers. "military" is the original default; the other
 * three reuse foreignRelations, each nation's own trade.production, and
 * ideological distance from the player's own politician respectively.
 */
export type GlobeFilter = 'military' | 'relations' | 'trade' | 'ideology';

export const GLOBE_FILTER_LABELS: Record<GlobeFilter, string> = {
  military: 'Military Strength',
  relations: 'Foreign Relations',
  trade: 'Economic Activity',
  ideology: 'Ideological Alignment',
};

interface MarkerAppearance {
  hue: number;
  /** A scale multiplier on the marker's fixed base geometry, not an absolute radius — cheap to update without rebuilding meshes. */
  scale: number;
}

function sumProduction(nation: ForeignCounterpart): number {
  return Object.values(nation.trade.production).reduce((a, b) => a + b, 0);
}

const MIN_SCALE = 0.55;
const MAX_SCALE = 1.85;

function computeMarkerAppearance(
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

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

interface GlobeProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: GlobeFilter;
}

/**
 * A self-contained three.js globe — no textures/network assets, so it works
 * fully offline: a shaded sphere plus one marker per nation, sized and
 * color-graded (blue -> red) by military strength, positioned from real
 * approximate capital coordinates. A pulsing red ring flags any nation
 * currently at active war with the player, independent of whichever filter
 * is selected — real state.wars data, not a placeholder effect. Click a
 * marker to select that nation; drag to orbit, scroll to zoom.
 */
export function Globe({ selectedId, onSelect, filter }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const warRingsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const game = useStatecraftStore((s) => s.game);
  const seed = game?.seed;

  useEffect(() => {
    const container = containerRef.current;
    const nations = game?.foreignCounterparts ?? [];
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05070d);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 13);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 7;
    controls.maxDistance = 25;
    controls.rotateSpeed = 0.5;

    // Bright, evenly-lit "daytime" globe: a strong sun-like directional
    // light plus a dimmer fill light from the opposite side, so there's no
    // dark unlit hemisphere, and a high enough ambient floor that the whole
    // sphere reads as sunlit rather than dim/night-like.
    scene.add(new THREE.AmbientLight(0xffffff, 1.15));
    const sunLight = new THREE.DirectionalLight(0xfff4e0, 1.6);
    sunLight.position.set(12, 8, 14);
    scene.add(sunLight);
    const fillLight = new THREE.DirectionalLight(0xcfe4ff, 0.5);
    fillLight.position.set(-14, -6, -10);
    scene.add(fillLight);

    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64),
      new THREE.MeshPhongMaterial({ map: getWorldLandTexture(), shininess: 10, specular: 0x1a2a3a })
    );
    scene.add(globe);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.02, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.1, side: THREE.BackSide })
    );
    scene.add(atmosphere);

    const BASE_MARKER_RADIUS = 0.11;
    // Sized to clear the largest possible marker (BASE_MARKER_RADIUS * MAX_SCALE
    // * the 1.9x selection bump) with room to spare, so the ring is never
    // occluded by a big, selected, high-value marker underneath it.
    const WAR_RING_RADIUS = 0.5;
    markersRef.current.clear();
    warRingsRef.current.clear();
    for (const nation of nations) {
      const position = latLngToVector3(nation.location.lat, nation.location.lng, GLOBE_RADIUS + 0.05);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(BASE_MARKER_RADIUS, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      marker.position.copy(position);
      marker.userData.nationId = nation.id;
      marker.userData.baseScale = 1;
      scene.add(marker);
      markersRef.current.set(nation.id, marker);

      // A pulsing red ring flags an active war regardless of which filter
      // is showing — real state (state.wars), not a placeholder effect.
      // Hidden by default; the appearance effect below toggles visibility.
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(WAR_RING_RADIUS * 0.85, WAR_RING_RADIUS, 24),
        new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
      );
      ring.position.copy(position);
      ring.lookAt(0, 0, 0);
      ring.visible = false;
      scene.add(ring);
      warRingsRef.current.set(nation.id, ring);
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
      // Only treat this as a click if the pointer barely moved (an orbit drag shouldn't select).
      if (Math.abs(event.clientX - downX) > 4 || Math.abs(event.clientY - downY) > 4) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const meshes = Array.from(markersRef.current.values());
      const intersects = raycaster.intersectObjects(meshes);
      if (intersects.length > 0) {
        const id = intersects[0].object.userData.nationId as string;
        onSelectRef.current(id);
      }
    }

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    let frameId: number;
    function animate() {
      frameId = requestAnimationFrame(animate);
      controls.update();
      const pulse = 1 + 0.18 * Math.sin(performance.now() * 0.004);
      warRingsRef.current.forEach((ring) => {
        if (ring.visible) ring.scale.setScalar(pulse);
      });
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
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
    // Rebuilt only when the game itself changes (new game) — the roster's
    // military numbers are static within a session, so there's no need to
    // tear down and rebuild the WebGL scene on every selection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  // Recolors and rescales markers per the active filter — cheap (material
  // color + mesh scale only, no geometry rebuild), so this can safely run
  // on every filter switch, selection change, or live game-state update
  // (relations shift from diplomacy, trade deals, etc.) without touching
  // the WebGL scene itself.
  useEffect(() => {
    if (!game) return;
    const nations = game.foreignCounterparts;
    const maxProduction = Math.max(1, ...nations.map(sumProduction));
    const activeWarCounterpartIds = new Set(
      game.wars.filter((w) => w.status === 'active').map((w) => w.counterpartId)
    );
    markersRef.current.forEach((mesh, id) => {
      const nation = nations.find((n) => n.id === id);
      if (!nation) return;
      const appearance = computeMarkerAppearance(filter, nation, game, maxProduction);
      (mesh.material as THREE.MeshBasicMaterial).color.setHSL(appearance.hue, 0.8, 0.55);
      mesh.userData.baseScale = appearance.scale;
      mesh.scale.setScalar(appearance.scale * (id === selectedId ? 1.9 : 1));
    });
    warRingsRef.current.forEach((ring, id) => {
      ring.visible = activeWarCounterpartIds.has(id);
    });
  }, [filter, game, selectedId]);

  return <div ref={containerRef} className="globe-container" />;
}
