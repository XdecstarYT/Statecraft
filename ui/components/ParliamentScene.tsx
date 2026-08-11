import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Party } from '../../engine';
import { layoutHemicycleSeats, MIN_RADIUS, SEAT_RADIUS, type HemicycleSeat } from './ParliamentHemicycle';

/** Same party-color hash CountryMapScene uses, just returning a THREE.Color instead of a CSS string. */
function partyThreeColor(partyId: string): THREE.Color {
  let hash = 0;
  for (let i = 0; i < partyId.length; i++) hash = (hash * 31 + partyId.charCodeAt(i)) >>> 0;
  const hue = (hash % 360) / 360;
  return new THREE.Color().setHSL(hue, 0.62, 0.48);
}

const DIM_COLOR = new THREE.Color(0x3a4358);
const HEAD_COLOR = new THREE.Color(0xd9a066);
const BENCH_COLOR = new THREE.Color(0x2a3348);

interface ParliamentSceneProps {
  parties: Party[];
  hoveredPartyId: string | null;
}

/**
 * A procedural 3D hemicycle — simple low-poly seated-figure meshes (no
 * external art assets, same approach as CountryMapScene's hex tiles) fanned
 * out via the exact seat math ParliamentHemicycle.tsx's 2D fallback used to
 * use, now shared between both. Built with the same three.js rig
 * (renderer/camera/OrbitControls/cleanup) as CountryMapScene for
 * consistency and reliability.
 */
export function ParliamentScene({ parties, hoveredPartyId }: ParliamentSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const torsoMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const seatsRef = useRef<HemicycleSeat[]>([]);

  const partiesKey = parties.map((p) => `${p.id}:${p.seats}:${p.ideology.economic}`).join(',');

  useEffect(() => {
    const container = containerRef.current;
    const seats = layoutHemicycleSeats(parties);
    seatsRef.current = seats;
    if (!container || seats.length === 0) return;

    const maxRadius = seats.reduce((max, s) => Math.max(max, Math.hypot(s.x, s.y)), MIN_RADIUS);

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 420;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0d1220);
    scene.fog = new THREE.Fog(0x0d1220, maxRadius * 1.3, maxRadius * 4.5);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
    camera.position.set(0, maxRadius * 0.95, maxRadius * 0.85);
    const target = new THREE.Vector3(0, 0, -maxRadius * 0.45);
    camera.lookAt(target);

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
    controls.minDistance = maxRadius * 0.4;
    controls.maxDistance = maxRadius * 2.2;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.copy(target);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xfff4e0, 1.3);
    key.position.set(maxRadius * 0.6, maxRadius * 1.3, maxRadius * 0.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const shadowSpan = maxRadius * 1.2;
    key.shadow.camera.left = -shadowSpan;
    key.shadow.camera.right = shadowSpan;
    key.shadow.camera.top = shadowSpan;
    key.shadow.camera.bottom = -shadowSpan;
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9fc7ff, 0.35);
    fill.position.set(-maxRadius * 0.6, maxRadius * 0.7, -maxRadius * 0.5);
    scene.add(fill);

    // Chamber floor.
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(maxRadius * 1.5, 48),
      new THREE.MeshPhongMaterial({ color: 0x171d2c, shininess: 10 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.02, -maxRadius * 0.3);
    floor.receiveShadow = true;
    scene.add(floor);

    // Speaker's podium at the open front of the fan.
    const podium = new THREE.Mesh(
      new THREE.CylinderGeometry(SEAT_RADIUS * 0.85, SEAT_RADIUS * 1.05, 0.55, 8),
      new THREE.MeshPhongMaterial({ color: 0x4a3826, shininess: 20 })
    );
    podium.position.set(0, 0.28, 1.1);
    podium.castShadow = true;
    podium.receiveShadow = true;
    scene.add(podium);

    const seatCount = seats.length;
    const benchGeo = new THREE.BoxGeometry(SEAT_RADIUS * 1.9, 0.22, SEAT_RADIUS * 1.7);
    const benchMesh = new THREE.InstancedMesh(
      benchGeo,
      new THREE.MeshPhongMaterial({ color: BENCH_COLOR, shininess: 20 }),
      seatCount
    );
    benchMesh.castShadow = true;
    benchMesh.receiveShadow = true;

    const torsoGeo = new THREE.BoxGeometry(SEAT_RADIUS * 1.15, 0.72, SEAT_RADIUS * 0.95);
    const torsoMesh = new THREE.InstancedMesh(torsoGeo, new THREE.MeshPhongMaterial({ shininess: 25 }), seatCount);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    torsoMeshRef.current = torsoMesh;

    const headGeo = new THREE.SphereGeometry(SEAT_RADIUS * 0.42, 10, 8);
    const headMesh = new THREE.InstancedMesh(
      headGeo,
      new THREE.MeshPhongMaterial({ color: HEAD_COLOR, shininess: 15 }),
      seatCount
    );
    headMesh.castShadow = true;

    const dummy = new THREE.Object3D();
    seats.forEach((seat, i) => {
      const x = seat.x;
      const z = seat.y - maxRadius * 0.3;
      // Face the podium.
      const angleToCenter = Math.atan2(x - 0, z - (1.1 - maxRadius * 0.3));

      dummy.position.set(x, 0.11, z);
      dummy.rotation.set(0, angleToCenter, 0);
      dummy.updateMatrix();
      benchMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, 0.58, z);
      dummy.updateMatrix();
      torsoMesh.setMatrixAt(i, dummy.matrix);
      torsoMesh.setColorAt(i, seat.partyId ? partyThreeColor(seat.partyId) : DIM_COLOR);

      dummy.position.set(x, 1.12, z);
      dummy.updateMatrix();
      headMesh.setMatrixAt(i, dummy.matrix);
    });
    benchMesh.instanceMatrix.needsUpdate = true;
    torsoMesh.instanceMatrix.needsUpdate = true;
    if (torsoMesh.instanceColor) torsoMesh.instanceColor.needsUpdate = true;
    headMesh.instanceMatrix.needsUpdate = true;

    scene.add(benchMesh, torsoMesh, headMesh);

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
      controls.dispose();
      renderer.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      });
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      torsoMeshRef.current = null;
    };
    // Rebuilt only when party seat composition actually changes — hover
    // dimming is handled by the cheap color-only effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partiesKey]);

  // Dims every seat that isn't the hovered party's — instance color update
  // only, safe to run on every hover change without rebuilding the scene.
  useEffect(() => {
    const torsoMesh = torsoMeshRef.current;
    const seats = seatsRef.current;
    if (!torsoMesh || seats.length === 0) return;
    seats.forEach((seat, i) => {
      const base = seat.partyId ? partyThreeColor(seat.partyId) : DIM_COLOR;
      const dimmed = hoveredPartyId && hoveredPartyId !== seat.partyId;
      torsoMesh.setColorAt(i, dimmed ? base.clone().multiplyScalar(0.35) : base);
    });
    if (torsoMesh.instanceColor) torsoMesh.instanceColor.needsUpdate = true;
  }, [hoveredPartyId]);

  return <div ref={containerRef} className="parliament-scene-3d-container" />;
}
