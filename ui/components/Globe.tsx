import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useStatecraftStore } from '../store';
import { getWorldLandTexture } from './worldLandTexture';

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
}

/**
 * A self-contained three.js globe — no textures/network assets, so it works
 * fully offline: a shaded sphere plus one marker per nation, sized and
 * color-graded (blue -> red) by military strength, positioned from real
 * approximate capital coordinates. Click a marker to select that nation;
 * drag to orbit, scroll to zoom.
 */
export function Globe({ selectedId, onSelect }: GlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, THREE.Mesh>>(new Map());
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

    markersRef.current.clear();
    for (const nation of nations) {
      const strength = nation.military.strength;
      const size = 0.06 + (strength / 100) * 0.16;
      const hue = 0.58 - (strength / 100) * 0.58; // blue (weak) -> red (strong)
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(size, 10, 10),
        new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 0.8, 0.55) })
      );
      marker.position.copy(latLngToVector3(nation.location.lat, nation.location.lng, GLOBE_RADIUS + 0.05));
      marker.userData.nationId = nation.id;
      scene.add(marker);
      markersRef.current.set(nation.id, marker);
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

  useEffect(() => {
    markersRef.current.forEach((mesh, id) => {
      mesh.scale.setScalar(id === selectedId ? 1.9 : 1);
    });
  }, [selectedId]);

  return <div ref={containerRef} className="globe-container" />;
}
