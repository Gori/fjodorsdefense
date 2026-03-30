'use client';

import { useMemo, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGameStore } from '@/lib/store';
import {
  snapToGrid,
  computeBlockedCells,
  getFootprintBaseElevation,
  getTerrainSurfaceY,
} from '@/lib/mapUtils';
import { ALL_PATHS } from '@/lib/pathData';
import { TOWER_DEFS } from '@/lib/towerDefs';
import { Line } from '@react-three/drei';
import { createGroundTexture } from './GroundTexture';
import { useFlattenMaterial } from './FlattenMaterial';
import { getElevation } from '@/lib/elevation';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { TreeMeshes } from './Trees';

// ── Types ──────────────────────────────────────────────────────────────
interface BuildingData {
  id: number;
  coords: [number, number][];
  height: number;
  type: string;
}
interface RoadData { coords: [number, number][]; width: number; importance: number; name: string | null; }
interface ParkData { coords: [number, number][]; }
interface MapData {
  buildings: BuildingData[];
  roads: RoadData[];
  parks: ParkData[];
  coastlines: { coords: [number, number][] }[];
  waterAreas: { coords: [number, number][] }[];
}

interface LandZone { type: string; coords: [number, number][]; }

// ── Building colors by type ───────────────────────────────────────────
// Varied hues, unified through deep value — buildings differ in color
// but match the ground's darkness so nothing jumps out of Layer 1.
const BUILDING_TYPE_COLORS: Record<string, THREE.Color> = {
  apartments:      new THREE.Color('#6a5a28'),  // deep gold
  residential:     new THREE.Color('#4a6838'),  // deep sage
  house:           new THREE.Color('#4a6838'),
  detached:        new THREE.Color('#4a6838'),
  semidetached_house: new THREE.Color('#4a6838'),
  allotment_house: new THREE.Color('#3a6830'),  // deep garden green
  office:          new THREE.Color('#2a5858'),  // deep teal
  commercial:      new THREE.Color('#2a5858'),
  retail:          new THREE.Color('#5a5828'),  // deep olive-gold
  hotel:           new THREE.Color('#6a5830'),  // deep amber
  industrial:      new THREE.Color('#3a3a40'),  // deep blue-slate
  shed:            new THREE.Color('#2a3830'),  // deep dark green
  garage:          new THREE.Color('#2a3830'),
  garages:         new THREE.Color('#2a3830'),
  school:          new THREE.Color('#486838'),  // deep warm green
  kindergarten:    new THREE.Color('#486838'),
  university:      new THREE.Color('#486838'),
  church:          new THREE.Color('#5a5040'),  // deep warm stone
  cathedral:       new THREE.Color('#5a5040'),
  chapel:          new THREE.Color('#5a5040'),
  mosque:          new THREE.Color('#5a5040'),
  hospital:        new THREE.Color('#385858'),  // deep cool teal
  palace:          new THREE.Color('#5a5830'),  // deep golden
  government:      new THREE.Color('#384858'),  // deep slate-blue
  public:          new THREE.Color('#384858'),
  civic:           new THREE.Color('#384858'),
  theatre:         new THREE.Color('#583848'),  // deep wine
  museum:          new THREE.Color('#583848'),
  stadium:         new THREE.Color('#385830'),  // deep sport green
  sports_centre:   new THREE.Color('#385830'),
  sports_hall:     new THREE.Color('#385830'),
  grandstand:      new THREE.Color('#385830'),
  train_station:   new THREE.Color('#383840'),  // deep iron
  transportation:  new THREE.Color('#383840'),
  ship:            new THREE.Color('#283848'),  // deep maritime blue
  boat:            new THREE.Color('#283848'),
  construction:    new THREE.Color('#585028'),  // deep dusty gold
  kiosk:           new THREE.Color('#4a5830'),  // deep olive
  service:         new THREE.Color('#3a4838'),  // deep utility green
  roof:            new THREE.Color('#3a4830'),  // deep generic
  yes:             new THREE.Color('#4a5838'),  // deep sage default
};
const DEFAULT_BUILDING_COLOR = new THREE.Color('#4a5838');

const ROOF_COLORS = [
  new THREE.Color('#2a3828'), new THREE.Color('#282830'),
  new THREE.Color('#383028'), new THREE.Color('#202830'),
];

// ── CRITICAL: Shape creation helper that negates Z ────────────────────
// THREE.Shape lives in XY plane. After rotateX(-PI/2), Y becomes -Z.
// To place shapes at the correct game Z, we must NEGATE Z in the shape.
function makeShape(coords: [number, number][]): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(coords[0][0], -coords[0][1]); // NEGATE Z
  for (let i = 1; i < coords.length; i++) {
    shape.lineTo(coords[i][0], -coords[i][1]); // NEGATE Z
  }
  shape.closePath();
  return shape;
}

// ── Building height multiplier (1 = original, 0.5 = half height) ─────
const BUILDING_HEIGHT_SCALE = 0.67;

// ── Build buildings with vertex colors ────────────────────────────────
function buildBuildings(buildings: BuildingData[]): {
  walls: THREE.BufferGeometry | null;
  roofs: THREE.BufferGeometry | null;
} {
  const wallGeos: THREE.BufferGeometry[] = [];
  const roofGeos: THREE.BufferGeometry[] = [];

  for (const raw of buildings) {
    if (raw.coords.length < 3) continue;
    const building = { ...raw, height: raw.height * BUILDING_HEIGHT_SCALE };

    try {
      const shape = makeShape(building.coords);
      const wallGeo = new THREE.ExtrudeGeometry(shape, {
        depth: building.height,
        bevelEnabled: false,
      });
      wallGeo.rotateX(-Math.PI / 2);
      // Anchor the footprint to the lowest sampled terrain point under it so no corner floats.
      const minElev = getFootprintBaseElevation(building.coords);
      wallGeo.translate(0, minElev, 0);

      // Vertex colors based on building type
      // Residential buildings — varied deep hues cycling per building
      const isResidential = ['apartments', 'residential', 'house', 'detached', 'semidetached_house', 'yes'].includes(building.type);
      let color: THREE.Color;
      if (isResidential) {
        const RESIDENTIAL_PALETTE = [
          new THREE.Color('#6a5a28'), // deep gold
          new THREE.Color('#4a6838'), // deep sage
          new THREE.Color('#5a4838'), // deep clay-rose
          new THREE.Color('#385848'), // deep teal-green
          new THREE.Color('#585028'), // deep olive
          new THREE.Color('#4a4850'), // deep cool mauve
          new THREE.Color('#586030'), // deep warm olive
          new THREE.Color('#3a5050'), // deep sea-green
        ];
        color = RESIDENTIAL_PALETTE[building.id % RESIDENTIAL_PALETTE.length];
      } else {
        color = BUILDING_TYPE_COLORS[building.type] || DEFAULT_BUILDING_COLOR;
      }
      const wallColors = new Float32Array(wallGeo.attributes.position.count * 3);
      for (let i = 0; i < wallGeo.attributes.position.count; i++) {
        const y = wallGeo.attributes.position.getY(i);
        const factor = 0.82 + (y / (building.height + 0.01)) * 0.18;
        wallColors[i * 3] = color.r * factor;
        wallColors[i * 3 + 1] = color.g * factor;
        wallColors[i * 3 + 2] = color.b * factor;
      }
      wallGeo.setAttribute('color', new THREE.Float32BufferAttribute(wallColors, 3));
      wallGeos.push(wallGeo);

      // Roof — compute bbox from game coords, build in 3D space directly
      const bbox = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
      for (const [x, z] of building.coords) {
        if (x < bbox.minX) bbox.minX = x;
        if (x > bbox.maxX) bbox.maxX = x;
        if (z < bbox.minZ) bbox.minZ = z;
        if (z > bbox.maxZ) bbox.maxZ = z;
      }
      const w = bbox.maxX - bbox.minX;
      const h = bbox.maxZ - bbox.minZ;
      const ridgeH = Math.min(building.height * 0.25, 0.5);
      const roofColor = ROOF_COLORS[building.id % ROOF_COLORS.length];
      const rv: number[] = [];
      const rc: number[] = [];
      const ri: number[] = [];
      const isWide = w > h;
      const cx = (bbox.minX + bbox.maxX) / 2;
      const cz = (bbox.minZ + bbox.maxZ) / 2;
      const bh = building.height;

      if (isWide) {
        const vi = rv.length / 3;
        rv.push(bbox.minX, bh, bbox.minZ); rc.push(roofColor.r*0.9, roofColor.g*0.9, roofColor.b*0.9);
        rv.push(bbox.maxX, bh, bbox.minZ); rc.push(roofColor.r*0.9, roofColor.g*0.9, roofColor.b*0.9);
        rv.push(bbox.maxX, bh+ridgeH, cz); rc.push(roofColor.r, roofColor.g, roofColor.b);
        rv.push(bbox.minX, bh+ridgeH, cz); rc.push(roofColor.r, roofColor.g, roofColor.b);
        ri.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
        const vi2 = rv.length / 3;
        rv.push(bbox.minX, bh+ridgeH, cz); rc.push(roofColor.r*1.05, roofColor.g*1.05, roofColor.b*1.05);
        rv.push(bbox.maxX, bh+ridgeH, cz); rc.push(roofColor.r*1.05, roofColor.g*1.05, roofColor.b*1.05);
        rv.push(bbox.maxX, bh, bbox.maxZ); rc.push(roofColor.r*0.85, roofColor.g*0.85, roofColor.b*0.85);
        rv.push(bbox.minX, bh, bbox.maxZ); rc.push(roofColor.r*0.85, roofColor.g*0.85, roofColor.b*0.85);
        ri.push(vi2, vi2+1, vi2+2, vi2, vi2+2, vi2+3);
      } else {
        const vi = rv.length / 3;
        rv.push(bbox.minX, bh, bbox.minZ); rc.push(roofColor.r*0.9, roofColor.g*0.9, roofColor.b*0.9);
        rv.push(cx, bh+ridgeH, bbox.minZ); rc.push(roofColor.r, roofColor.g, roofColor.b);
        rv.push(cx, bh+ridgeH, bbox.maxZ); rc.push(roofColor.r, roofColor.g, roofColor.b);
        rv.push(bbox.minX, bh, bbox.maxZ); rc.push(roofColor.r*0.9, roofColor.g*0.9, roofColor.b*0.9);
        ri.push(vi, vi+1, vi+2, vi, vi+2, vi+3);
        const vi2 = rv.length / 3;
        rv.push(cx, bh+ridgeH, bbox.minZ); rc.push(roofColor.r*1.05, roofColor.g*1.05, roofColor.b*1.05);
        rv.push(bbox.maxX, bh, bbox.minZ); rc.push(roofColor.r*0.85, roofColor.g*0.85, roofColor.b*0.85);
        rv.push(bbox.maxX, bh, bbox.maxZ); rc.push(roofColor.r*0.85, roofColor.g*0.85, roofColor.b*0.85);
        rv.push(cx, bh+ridgeH, bbox.maxZ); rc.push(roofColor.r*1.05, roofColor.g*1.05, roofColor.b*1.05);
        ri.push(vi2, vi2+1, vi2+2, vi2, vi2+2, vi2+3);
      }

      const roofGeo = new THREE.BufferGeometry();
      roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3));
      roofGeo.setAttribute('color', new THREE.Float32BufferAttribute(rc, 3));
      roofGeo.setIndex(ri);
      roofGeo.computeVertexNormals();
      roofGeos.push(roofGeo);
    } catch (e) {
      // Log failed buildings to diagnose western buildings issue
      console.warn(`[buildBuildings] Failed building id=${building.id}:`, e);
      continue;
    }
  }

  console.log(`[buildBuildings] Created ${wallGeos.length} wall geometries from input`);

  let walls: THREE.BufferGeometry | null = null;
  const roofs: THREE.BufferGeometry | null = null;
  if (wallGeos.length > 0) {
    try {
      walls = mergeGeometries(wallGeos, false);
      console.log(`[buildBuildings] Merged walls: ${walls.attributes.position.count} vertices`);
    } catch (e) {
      console.error('[buildBuildings] mergeGeometries failed:', e);
      walls = wallGeos[0];
    }
  }
  return { walls, roofs };
}

const PATH_COLORS = ['#ff9f43', '#ee5a24', '#18dcff'];
const MIN_TOWER_SPACING = 1.5;

// ── Placement Preview ─────────────────────────────────────────────────
function PlacementPreview({
  x, z, range, canPlace, towerColor,
}: {
  x: number; z: number; range: number; canPlace: boolean; towerColor: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const y = getElevation(x, z);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    if (canPlace) {
      // Gentle breathing pulse
      const s = 1 + Math.sin(t * 4) * 0.07;
      groupRef.current.scale.set(s, 1, s);
    } else {
      groupRef.current.scale.set(1, 1, 1);
    }
  });

  const color = canPlace ? towerColor : '#ef4444';
  const ringColor = canPlace ? '#4ade80' : '#ef4444';
  const borderColor = canPlace ? '#22c55e' : '#dc2626';

  return (
    <group ref={groupRef} position={[x, y + 0.08, z]}>
      {/* Solid placement disc — shows tower color when valid */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={canPlace ? 0.6 : 0.4}
          transparent
          opacity={canPlace ? 0.75 : 0.55}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Border ring — green/red validity indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[0.45, 0.62, 24]} />
        <meshStandardMaterial
          color={borderColor}
          emissive={borderColor}
          emissiveIntensity={1.0}
          transparent
          opacity={0.9}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Range ring — clear visible ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[range - 0.12, range + 0.08, 64]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={canPlace ? 0.35 : 0.2}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Range fill — subtle area indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[range, 64]} />
        <meshBasicMaterial
          color={ringColor}
          transparent
          opacity={canPlace ? 0.06 : 0.03}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export const MAP_FADE_DURATION = 0.9;
const MAP_ENTRY_OFFSET = new THREE.Vector3(0, -0.8, 3.5);
const MAP_ENTRY_SCALE = 0.985;

function applyFadeOpacity(group: THREE.Group | null, opacity: number) {
  if (!group) return;

  group.traverse((object) => {
    const materialOrMaterials = (object as THREE.Mesh).material;
    if (!materialOrMaterials) return;

    const materials = Array.isArray(materialOrMaterials) ? materialOrMaterials : [materialOrMaterials];
    for (const material of materials) {
      if (!('opacity' in material) || !('transparent' in material)) continue;

      if (material.userData.baseOpacity === undefined) {
        material.userData.baseOpacity = material.opacity;
      }
      if (material.userData.baseTransparent === undefined) {
        material.userData.baseTransparent = material.transparent;
      }

      const baseOpacity = material.userData.baseOpacity as number;
      const baseTransparent = material.userData.baseTransparent as boolean;
      material.opacity = baseOpacity * opacity;
      material.transparent = baseTransparent || opacity < 0.999;
    }
  });
}

function applyEntryTransform(group: THREE.Group | null, progress: number) {
  if (!group) return;

  const eased = 1 - Math.pow(1 - progress, 3);
  group.position.set(
    MAP_ENTRY_OFFSET.x * (1 - eased),
    MAP_ENTRY_OFFSET.y * (1 - eased),
    MAP_ENTRY_OFFSET.z * (1 - eased)
  );
  const scale = MAP_ENTRY_SCALE + (1 - MAP_ENTRY_SCALE) * eased;
  group.scale.setScalar(scale);
}

// ── Main Map Component ─────────────────────────────────────────────────
export function Map({ onRevealChange }: { onRevealChange?: (isRevealed: boolean) => void }) {
  const selectedTowerDef = useGameStore((s) => s.selectedTowerDef);
  const placeTower = useGameStore((s) => s.placeTower);
  const phase = useGameStore((s) => s.phase);
  const towers = useGameStore((s) => s.towers);
  const money = useGameStore((s) => s.money);
  const levelIndex = useGameStore((s) => s.levelIndex);
  const waveIndex = useGameStore((s) => s.waveIndex);

  const [mapData, setMapData] = useState<MapData | null>(null);
  const [landZones, setLandZones] = useState<LandZone[]>([]);
  const [pitches, setPitches] = useState<{ name: string | null; sport: string | null; surface: string | null; coords: [number, number][] }[]>([]);
  const [hoverPos, setHoverPos] = useState<{ x: number; z: number } | null>(null);
  const [canPlace, setCanPlace] = useState(false);
  const [landZonesSettled, setLandZonesSettled] = useState(false);
  const [pitchesSettled, setPitchesSettled] = useState(false);
  const mapGroupRef = useRef<THREE.Group>(null);
  const terrainPickMeshRef = useRef<THREE.Mesh>(null);
  const fadeOpacityRef = useRef(0);
  const fadeStartTimeRef = useRef<number | null>(null);
  const fadeFrameRef = useRef<number | null>(null);
  const placementLockUntilRef = useRef(0);

  useEffect(() => {
    fetch('/data/sodermalm.json?v=11')
      .then((r) => r.json())
      .then((data: MapData) => setMapData(data))
      .catch((err) => console.error('Failed to load map data:', err));
    fetch('/data/landuse.json')
      .then((r) => r.json())
      .then((data: LandZone[]) => setLandZones(data))
      .catch(() => {})
      .finally(() => setLandZonesSettled(true));
    fetch('/data/pitches.json')
      .then((r) => r.json())
      .then(setPitches)
      .catch(() => {})
      .finally(() => setPitchesSettled(true));
  }, []);

  const isPlacing = selectedTowerDef && (phase === 'playing' || phase === 'between-waves');

  useEffect(() => {
    if (phase === 'playing' || phase === 'between-waves') {
      placementLockUntilRef.current = performance.now() + 300;
    }
  }, [phase, waveIndex, levelIndex, selectedTowerDef]);

  // ── Precompute cells blocked by buildings ──────────────────────────
  const blockedCells = useMemo(() => {
    if (!mapData) return new Set<string>();
    return computeBlockedCells(mapData.buildings);
  }, [mapData]);

  // ── Unified placement validation ───────────────────────────────────
  const isPositionValid = (pos: { x: number; z: number }): boolean => {
    if (!selectedTowerDef) return false;
    const def = TOWER_DEFS[selectedTowerDef];
    if (!def || money < def.cost) return false;

    // Water check
    if (getElevation(pos.x, pos.z) <= 0.3) return false;

    // Building check
    if (blockedCells.has(`${pos.x},${pos.z}`)) return false;

    // Spacing from other towers
    for (const t of towers) {
      const dx = t.position.x - pos.x, dz = t.position.z - pos.z;
      if (Math.sqrt(dx * dx + dz * dz) < MIN_TOWER_SPACING) return false;
    }

    return true;
  };

  const getPlacementPoint = (ray: THREE.Ray) => {
    const terrainMesh = terrainPickMeshRef.current;
    if (!terrainMesh) return null;

    terrainMesh.updateMatrixWorld();
    const raycaster = new THREE.Raycaster(ray.origin, ray.direction.clone());
    const hits = raycaster.intersectObject(terrainMesh, false);
    if (hits.length === 0) return null;

    return hits[0].point;
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!selectedTowerDef) return;
    if (phase !== 'playing' && phase !== 'between-waves') return;
    if (performance.now() < placementLockUntilRef.current) return;
    e.stopPropagation();
    const point = getPlacementPoint(e.ray);
    if (!point) return;
    const snapped = snapToGrid({ x: point.x, z: point.z });
    if (!isPositionValid(snapped)) return;
    placeTower(selectedTowerDef, snapped);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isPlacing || !selectedTowerDef) { setHoverPos(null); return; }
    const point = getPlacementPoint(e.ray);
    if (!point) {
      setHoverPos(null);
      setCanPlace(false);
      return;
    }
    const snapped = snapToGrid({ x: point.x, z: point.z });
    setHoverPos(snapped);
    setCanPlace(isPositionValid(snapped));
  };

  const handlePointerLeave = () => setHoverPos(null);

  const westMat = useFlattenMaterial({
    vertexColors: true, roughness: 0.75, side: THREE.DoubleSide,
  });
  const eastMat = useFlattenMaterial({
    vertexColors: true, roughness: 0.75, side: THREE.DoubleSide,
  });

  // ── Island/shore shape geometry ──────────────────────────────────
  // Compute island ground shape from actual building positions at runtime
  const islandGeo = useMemo(() => {
    if (!mapData) return null;

    // Get centers of ALL buildings on Södermalm (loose filter for island shape)
    const centers: [number, number][] = [];
    for (const b of mapData.buildings) {
      let sx = 0, sz = 0;
      for (const [x, z] of b.coords) { sx += x; sz += z; }
      const cx = sx / b.coords.length, cz = sz / b.coords.length;
      // Only exclude clearly other islands
      if (cz < -26 || cz > 44 || cx < -48 || cx > 48) continue;
      centers.push([cx, cz]);
    }

    if (centers.length < 3) return null;

    // Compute convex hull
    centers.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    function cross(O: [number, number], A: [number, number], B: [number, number]) {
      return (A[0] - O[0]) * (B[1] - O[1]) - (A[1] - O[1]) * (B[0] - O[0]);
    }
    const lower: [number, number][] = [];
    for (const p of centers) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper: [number, number][] = [];
    for (const p of [...centers].reverse()) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    lower.pop();
    upper.pop();
    const hull = lower.concat(upper);

    // Simplify to ~30 points and add slight padding
    const step = Math.max(1, Math.floor(hull.length / 30));
    const simplified: [number, number][] = [];
    for (let i = 0; i < hull.length; i += step) simplified.push(hull[i]);
    if (simplified.length > 0 && simplified[simplified.length - 1] !== hull[hull.length - 1]) {
      simplified.push(hull[hull.length - 1]);
    }

    // Terrain mesh with elevation displacement + texture for coloring
    const gridRes = 200;
    const size = 300;
    const geo = new THREE.PlaneGeometry(size, size, gridRes, gridRes);
    geo.rotateX(-Math.PI / 2);

    // Apply elevation to vertices
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, getTerrainSurfaceY(x, z));
    }
    pos.needsUpdate = true;

    // Set UVs to match ground texture coords (-60..60)
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      uv.setXY(i, (x + 60) / 120, (z + 60) / 120);
    }
    uv.needsUpdate = true;

    geo.computeVertexNormals();
    return geo;
  }, [mapData]);

  // ── Ground texture (roads, parks, pitches, building footprints) ──
  const groundTexture = useMemo(() => {
    if (!mapData) return null;
    return createGroundTexture(mapData, landZones, pitches);
  }, [mapData, landZones, pitches]);

  // ── Process OSM data into geometry ──────────────────────────────
  const geos = useMemo(() => {
    if (!mapData) return null;

    // Exclude other islands (Gamla Stan) and tiny buildings (sheds, garages)
    const sodermalm = mapData.buildings.filter(b => {
      let sz = 0;
      for (const [, z] of b.coords) sz += z;
      if (sz / b.coords.length < -26) return false;
      // No size filter — keep all buildings including kolonistugor
      return true;
    });

    // Split buildings into west and east chunks to avoid merge issues
    const westBuildings = sodermalm.filter(b => {
      let sx = 0; for (const [x] of b.coords) sx += x;
      return sx / b.coords.length < -15;
    });
    const eastBuildings = sodermalm.filter(b => {
      let sx = 0; for (const [x] of b.coords) sx += x;
      return sx / b.coords.length >= -15;
    });

    const west = buildBuildings(westBuildings);
    const east = buildBuildings(eastBuildings);

    return { westWalls: west.walls, eastWalls: east.walls };
  }, [mapData]);

  const isMapReady = Boolean(mapData && islandGeo && geos && landZonesSettled && pitchesSettled);

  useEffect(() => {
    if (fadeFrameRef.current !== null) {
      cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }

    if (!isMapReady) {
      onRevealChange?.(false);
      fadeStartTimeRef.current = null;
      fadeOpacityRef.current = 0;
      applyFadeOpacity(mapGroupRef.current, 0);
      applyEntryTransform(mapGroupRef.current, 0);
      return;
    }

    fadeStartTimeRef.current = null;
    fadeOpacityRef.current = 0;
    applyFadeOpacity(mapGroupRef.current, 0);
    applyEntryTransform(mapGroupRef.current, 0);

    let firstFrame: number | null = null;
    firstFrame = requestAnimationFrame(() => {
      fadeFrameRef.current = requestAnimationFrame(() => {
        onRevealChange?.(true);
        fadeStartTimeRef.current = performance.now();
        fadeFrameRef.current = null;
      });
    });
    fadeFrameRef.current = firstFrame;

    return () => {
      if (firstFrame !== null) cancelAnimationFrame(firstFrame);
      if (fadeFrameRef.current !== null) {
        cancelAnimationFrame(fadeFrameRef.current);
        fadeFrameRef.current = null;
      }
    };
  }, [isMapReady, onRevealChange]);

  useFrame(() => {
    if (!isMapReady) return;

    const fadeStartTime = fadeStartTimeRef.current;
    if (fadeStartTime === null) return;

    const progress = Math.min((performance.now() - fadeStartTime) / (MAP_FADE_DURATION * 1000), 1);
    if (progress === fadeOpacityRef.current) return;

    fadeOpacityRef.current = progress;
    applyFadeOpacity(mapGroupRef.current, progress);
    applyEntryTransform(mapGroupRef.current, progress);
  });

  return (
    <group>
      <group ref={mapGroupRef}>
        {islandGeo && (
          <mesh
            ref={terrainPickMeshRef}
            geometry={islandGeo}
            visible={false}
          />
        )}

        {/* ── Water ── */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
          <planeGeometry args={[300, 300]} />
          <meshStandardMaterial color="#1a3858" roughness={0.05} metalness={0.3} />
        </mesh>

        {/* ── Terrain mesh with ground texture ── */}
        {islandGeo && (
          <mesh geometry={islandGeo}>
            {groundTexture ? (
              <meshStandardMaterial map={groundTexture} roughness={0.85} side={THREE.DoubleSide} />
            ) : (
              <meshStandardMaterial color="#606060" roughness={0.85} side={THREE.DoubleSide} />
            )}
          </mesh>
        )}

        {/* Parks and roads are now in the ground texture */}

        {/* ── Buildings (flatten near enemies) ── */}
        {geos?.westWalls && (
          <mesh geometry={geos.westWalls}>
            <meshStandardMaterial {...westMat.props} />
          </mesh>
        )}
        {geos?.eastWalls && (
          <mesh geometry={geos.eastWalls}>
            <meshStandardMaterial {...eastMat.props} />
          </mesh>
        )}

        <TreeMeshes />

        {/* ── Enemy path glow (visible through buildings) ── */}
        {/* ── Enemy path (main only) ── */}
        <Line points={ALL_PATHS[0].map(p => [p.x, getElevation(p.x, p.z) + 0.6, p.z] as [number, number, number])}
          color={PATH_COLORS[0]} lineWidth={10} opacity={0.15} transparent
          depthTest={true} depthWrite={false} />
        <Line points={ALL_PATHS[0].map(p => [p.x, getElevation(p.x, p.z) + 0.6, p.z] as [number, number, number])}
          color={PATH_COLORS[0]} lineWidth={4} opacity={0.8} transparent
          depthTest={true} depthWrite={false} />
      </group>

      {/* ── Click plane for tower placement (barely visible, above buildings) ── */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 4.0, 0]}
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <planeGeometry args={[150, 150]} />
        <meshBasicMaterial transparent opacity={0.01} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>

      {/* ── Placement preview ── */}
      {hoverPos && isPlacing && selectedTowerDef && (
        <PlacementPreview
          x={hoverPos.x}
          z={hoverPos.z}
          range={TOWER_DEFS[selectedTowerDef].range}
          canPlace={canPlace}
          towerColor={TOWER_DEFS[selectedTowerDef].color}
        />
      )}

    </group>
  );
}
