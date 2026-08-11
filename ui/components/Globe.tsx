import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStatecraftStore } from '../store';
import type { GlobeFilter } from '../worldFilterAppearance';
import { buildWorldPoliticalTexture } from './worldPoliticalTexture';

export { GLOBE_FILTER_LABELS, type GlobeFilter } from '../worldFilterAppearance';

const GLOBE_RADIUS = 5;

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
 * A self-contained three.js globe, built from the real country-boundary
 * data already bundled for the land texture (world-atlas countries-110m):
 * every country the roster has data for is shaded by whichever filter is
 * active (military/relations/trade/ideology), with visible political
 * borders, instead of a flat landmass blob with colored dots. A small
 * marker still sits at each capital as a click target; a pulsing red ring
 * flags any nation currently at active war with the player, independent of
 * whichever filter is selected — real state.wars data, not a placeholder
 * effect. Click a marker to select that nation; drag to orbit, scroll to
 * zoom.
 */
export function Globe({ selectedId, onSelect, filter }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const globeMeshRef = useRef<THREE.Mesh | null>(null);
  const markersRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const warRingsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const filterRef = useRef(filter);
  filterRef.current = filter;
  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

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

    const initialTexture = buildWorldPoliticalTexture(nations, game ?? null, filterRef.current, selectedIdRef.current);
    const globe = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64),
      new THREE.MeshPhongMaterial({ map: initialTexture, shininess: 10, specular: 0x1a2a3a })
    );
    scene.add(globe);
    globeMeshRef.current = globe;

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.02, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x7ec8ff, transparent: true, opacity: 0.1, side: THREE.BackSide })
    );
    scene.add(atmosphere);

    // Markers are now just capital-city click targets, sized fixed and dim —
    // the country shading itself carries the filter's data signal, so a
    // marker no longer needs to be individually sized/colored by it.
    const BASE_MARKER_RADIUS = 0.06;
    const WAR_RING_RADIUS = 0.5;
    markersRef.current.clear();
    warRingsRef.current.clear();
    for (const nation of nations) {
      const position = latLngToVector3(nation.location.lat, nation.location.lng, GLOBE_RADIUS + 0.05);
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(BASE_MARKER_RADIUS, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xf4f6fb, transparent: true, opacity: 0.85 })
      );
      marker.position.copy(position);
      marker.userData.nationId = nation.id;
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
          const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of materials) {
            if ('map' in m && m.map) (m.map as THREE.Texture).dispose();
            m.dispose();
          }
        }
      });
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      globeMeshRef.current = null;
    };
    // Rebuilt only when the game itself changes (new game) — the roster's
    // military numbers are static within a session, so there's no need to
    // tear down and rebuild the WebGL scene on every selection change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  // Rebuilds the political texture (the primary data signal now) and
  // updates marker/war-ring state per the active filter and selection —
  // cheap enough (one canvas redraw, no geometry rebuild) to run on every
  // filter switch, selection change, or live game-state update (relations
  // shift from diplomacy, trade deals, etc.) without touching the rest of
  // the WebGL scene.
  useEffect(() => {
    if (!game) return;
    const nations = game.foreignCounterparts;
    const activeWarCounterpartIds = new Set(
      game.wars.filter((w) => w.status === 'active').map((w) => w.counterpartId)
    );

    const globeMesh = globeMeshRef.current;
    if (globeMesh) {
      const material = globeMesh.material as THREE.MeshPhongMaterial;
      const oldTexture = material.map;
      material.map = buildWorldPoliticalTexture(nations, game, filter, selectedId);
      material.needsUpdate = true;
      oldTexture?.dispose();
    }

    markersRef.current.forEach((mesh, id) => {
      const isSelected = id === selectedId;
      mesh.scale.setScalar(isSelected ? 2.4 : 1);
      (mesh.material as THREE.MeshBasicMaterial).color.set(isSelected ? 0xffe27a : 0xf4f6fb);
    });
    warRingsRef.current.forEach((ring, id) => {
      ring.visible = activeWarCounterpartIds.has(id);
    });
  }, [filter, game, selectedId]);

  return <div ref={containerRef} className="globe-container" />;
}
