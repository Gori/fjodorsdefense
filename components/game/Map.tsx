'use client';

import { useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { useGameStore } from '@/lib/store';
import { snapToGrid } from '@/lib/mapUtils';
import { ALL_PATHS } from '@/lib/pathData';
import { TOWER_DEFS } from '@/lib/towerDefs';
import { Line, Html } from '@react-three/drei';
import { useFlattenMaterial } from './FlattenMaterial';
import { getElevation } from '@/lib/elevation';
import type { ThreeEvent } from '@react-three/fiber';

// ── Types ──────────────────────────────────────────────────────────────
interface BuildingData { id: number; coords: [number, number][]; height: number; }
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

// ── Stockholm building color palette ──────────────────────────────────
const STOCKHOLM_COLORS = [
  new THREE.Color('#c9a84c'), new THREE.Color('#c47a6b'),
  new THREE.Color('#a85a40'), new THREE.Color('#d8cdb8'),
  new THREE.Color('#8a857e'), new THREE.Color('#b8945c'),
  new THREE.Color('#cc9966'), new THREE.Color('#9b7653'),
];

const ROOF_COLORS = [
  new THREE.Color('#6b5a48'), new THREE.Color('#5a4a3a'),
  new THREE.Color('#7a6855'), new THREE.Color('#4a3a2c'),
];

function polygonArea(coords: [number, number][]): number {
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1];
  }
  return Math.abs(area) / 2;
}

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

// ── Build buildings with vertex colors ────────────────────────────────
function buildBuildings(buildings: BuildingData[]): {
  walls: THREE.BufferGeometry | null;
  roofs: THREE.BufferGeometry | null;
} {
  const wallGeos: THREE.BufferGeometry[] = [];
  const roofGeos: THREE.BufferGeometry[] = [];

  for (const building of buildings) {
    if (building.coords.length < 3) continue;

    try {
      const shape = makeShape(building.coords);
      const wallGeo = new THREE.ExtrudeGeometry(shape, {
        depth: building.height,
        bevelEnabled: false,
      });
      wallGeo.rotateX(-Math.PI / 2);
      // Raise building to LOWEST elevation beneath it (avoids floating on cliffs)
      let minElev = Infinity;
      for (const [x, z] of building.coords) {
        const e = getElevation(x, z);
        if (e < minElev) minElev = e;
      }
      wallGeo.translate(0, minElev, 0);

      // Vertex colors
      const color = STOCKHOLM_COLORS[building.id % STOCKHOLM_COLORS.length];
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
  let roofs: THREE.BufferGeometry | null = null;
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

// ── Build road strip geometry (directly in 3D, no rotation needed) ────
function buildRoadGeo(roads: RoadData[], widthMultiplier = 1): THREE.BufferGeometry | null {
  const verts: number[] = [];
  const idx: number[] = [];

  for (const road of roads) {
    if (road.coords.length < 2) continue;
    const w = road.width * widthMultiplier;

    for (let i = 0; i < road.coords.length - 1; i++) {
      const [cx, cz] = road.coords[i];
      const [nx, nz] = road.coords[i + 1];
      const dx = nx - cx, dz = nz - cz;
      const len = Math.sqrt(dx * dx + dz * dz);
      if (len < 0.01) continue;
      const px = (-dz / len) * w * 0.5, pz = (dx / len) * w * 0.5;
      const vi = verts.length / 3;
      const ey1 = getElevation(cx, cz) + 0.08;
      const ey2 = getElevation(nx, nz) + 0.08;
      verts.push(cx + px, ey1, cz + pz);
      verts.push(cx - px, ey1, cz - pz);
      verts.push(nx + px, ey2, nz + pz);
      verts.push(nx - px, ey2, nz - pz);
      idx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2);
    }
  }

  if (verts.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ── Build park geometry ───────────────────────────────────────────────
function buildParkGeo(parks: ParkData[]): THREE.BufferGeometry | null {
  const geos: THREE.BufferGeometry[] = [];
  for (const park of parks) {
    if (park.coords.length < 3) continue;
    try {
      const shape = makeShape(park.coords); // Uses negated Z
      const geo = new THREE.ShapeGeometry(shape);
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, 0.05, 0);
      geos.push(geo);
    } catch { continue; }
  }
  if (geos.length === 0) return null;
  try { return mergeGeometries(geos, false); } catch { return geos[0]; }
}

// ── Street labels ─────────────────────────────────────────────────────
interface StreetLabel { name: string; position: [number, number, number]; }
const LABEL_STREETS = ['Götgatan', 'Hornsgatan', 'Ringvägen', 'Rosenlundsgatan', 'Folkungagatan'];
function findLabels(roads: RoadData[]): StreetLabel[] {
  const labels: StreetLabel[] = [];
  const found = new Set<string>();
  for (const road of roads) {
    if (!road.name || found.has(road.name)) continue;
    if (!LABEL_STREETS.includes(road.name)) continue;
    if (road.coords.length < 2) continue;
    found.add(road.name);
    const mid = Math.floor(road.coords.length / 2);
    const [x, z] = road.coords[mid];
    labels.push({ name: road.name, position: [x, 2.5, z] });
  }
  return labels;
}

const PATH_COLORS = ['#ff9f43', '#ee5a24', '#18dcff'];

// ── Main Map Component ─────────────────────────────────────────────────
export function Map() {
  const selectedTowerDef = useGameStore((s) => s.selectedTowerDef);
  const placeTower = useGameStore((s) => s.placeTower);
  const phase = useGameStore((s) => s.phase);
  const towers = useGameStore((s) => s.towers);
  const money = useGameStore((s) => s.money);

  const [mapData, setMapData] = useState<MapData | null>(null);
  const [landZones, setLandZones] = useState<LandZone[]>([]);
  const [hoverPos, setHoverPos] = useState<{ x: number; z: number } | null>(null);
  const [canPlace, setCanPlace] = useState(false);
  const [buildingsHovered, setBuildingsHovered] = useState(false);

  useEffect(() => {
    fetch('/data/sodermalm.json?v=8')
      .then((r) => r.json())
      .then((data: MapData) => setMapData(data))
      .catch((err) => console.error('Failed to load map data:', err));
    fetch('/data/landuse.json')
      .then((r) => r.json())
      .then((data: LandZone[]) => setLandZones(data))
      .catch(() => {});
  }, []);

  const isPlacing = selectedTowerDef && (phase === 'playing' || phase === 'between-waves');

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (!selectedTowerDef) return;
    if (phase !== 'playing' && phase !== 'between-waves') return;
    e.stopPropagation();
    const snapped = snapToGrid({ x: e.point.x, z: e.point.z });
    placeTower(selectedTowerDef, snapped);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isPlacing || !selectedTowerDef) { setHoverPos(null); return; }
    const snapped = snapToGrid({ x: e.point.x, z: e.point.z });
    setHoverPos(snapped);
    const def = TOWER_DEFS[selectedTowerDef];
    if (!def || money < def.cost) { setCanPlace(false); return; }
    setCanPlace(!towers.some(t => {
      const dx = t.position.x - snapped.x, dz = t.position.z - snapped.z;
      return Math.sqrt(dx * dx + dz * dz) < 2.5;
    }));
  };

  const handlePointerLeave = () => setHoverPos(null);

  // Building materials with enemy-proximity flattening
  const westMat = useFlattenMaterial({
    vertexColors: true, roughness: 0.75, transparent: true,
    opacity: buildingsHovered ? 0.75 : 1, side: THREE.DoubleSide,
  });
  const eastMat = useFlattenMaterial({
    vertexColors: true, roughness: 0.75, transparent: true,
    opacity: buildingsHovered ? 0.75 : 1, side: THREE.DoubleSide,
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

    // Pad outward slightly so green extends just past building edges
    const hcx = simplified.reduce((s, p) => s + p[0], 0) / simplified.length;
    const hcz = simplified.reduce((s, p) => s + p[1], 0) / simplified.length;
    const padded = simplified.map(([x, z]) => [
      hcx + (x - hcx) * 1.08,
      hcz + (z - hcz) * 1.08,
    ] as [number, number]);

    // High-res terrain mesh that follows real elevation
    // Colored by land use: roads=gray, parks=green, urban=beige/gray, water=purple/blue
    const gridRes = 250;
    const size = 300;
    const geo = new THREE.PlaneGeometry(size, size, gridRes, gridRes);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const ZONE_COLORS: Record<string, THREE.Color> = {
      park: new THREE.Color('#3a5a30'),
      garden: new THREE.Color('#3a5a30'),
      grass: new THREE.Color('#4a6a38'),
      forest: new THREE.Color('#2a4a20'),
      scrub: new THREE.Color('#3a5528'),
      allotments: new THREE.Color('#4a6a3a'),
      cemetery: new THREE.Color('#2a4028'),
      playground: new THREE.Color('#8a7a60'),
      pitch: new THREE.Color('#4a7a3a'),
      rock: new THREE.Color('#7a7570'),
      beach: new THREE.Color('#c0b090'),
      residential: new THREE.Color('#656055'),
      commercial: new THREE.Color('#5a5550'),
      railway: new THREE.Color('#4a4540'),
      construction: new THREE.Color('#7a7060'),
    };
    const urbanColor = new THREE.Color('#606060');
    const waterColor = new THREE.Color('#1a3060');

    // Build zone polygons for point-in-polygon testing
    const zonePolys: { type: string; coords: [number, number][] }[] = [];
    for (const z of landZones) {
      if (z.coords.length >= 3) zonePolys.push(z);
    }
    // Also add parks from mapData
    if (mapData) {
      for (const park of mapData.parks) {
        if (park.coords.length >= 3) zonePolys.push({ type: 'park', coords: park.coords });
      }
    }

    function pointInPoly(px: number, pz: number, poly: [number, number][]): boolean {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, zi] = poly[i];
        const [xj, zj] = poly[j];
        if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) {
          inside = !inside;
        }
      }
      return inside;
    }

    function getZoneType(px: number, pz: number): string | null {
      for (const zone of zonePolys) {
        if (pointInPoly(px, pz, zone.coords)) return zone.type;
      }
      return null;
    }

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const elev = getElevation(x, z);
      const isLand = elev > 0.3;
      const groundY = isLand ? Math.max(elev, 0.1) - 0.15 : -0.35;
      pos.setY(i, groundY);

      let c: THREE.Color;
      if (!isLand) {
        c = waterColor;
      } else {
        const zone = getZoneType(x, z);
        c = (zone && ZONE_COLORS[zone]) ? ZONE_COLORS[zone] : urbanColor;
      }

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    pos.needsUpdate = true;
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    return geo;
  }, [mapData, landZones]);

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

    const minorRoads = buildRoadGeo(mapData.roads.filter(r => r.importance <= 1));
    const majorRoads = buildRoadGeo(mapData.roads.filter(r => r.importance >= 2), 1.5);
    const parks = buildParkGeo(mapData.parks);
    const labels = findLabels(mapData.roads);

    return { westWalls: west.walls, eastWalls: east.walls, minorRoads, majorRoads, parks, labels };
  }, [mapData]);

  return (
    <group>
      {/* ── Water ── */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial color="#1a3858" roughness={0.05} metalness={0.3} />
      </mesh>

      {/* ── Terrain mesh (green land with elevation, blue water) ── */}
      {islandGeo && (
        <mesh geometry={islandGeo}>
          <meshStandardMaterial vertexColors roughness={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}

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
        <group position={[hoverPos.x, getElevation(hoverPos.x, hoverPos.z) + 0.1, hoverPos.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[TOWER_DEFS[selectedTowerDef].range - 0.2, TOWER_DEFS[selectedTowerDef].range, 48]} />
            <meshBasicMaterial color={canPlace ? '#5cb85c' : '#e74c3c'} transparent opacity={0.15} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.2, 16]} />
            <meshBasicMaterial color={canPlace ? '#5cb85c' : '#e74c3c'} transparent opacity={0.3} />
          </mesh>
        </group>
      )}

      {/* ── Parks ── */}
      {geos?.parks && <mesh geometry={geos.parks}><meshStandardMaterial color="#2d5a25" roughness={0.85} side={THREE.DoubleSide} /></mesh>}

      {/* ── Minor roads (gray against green ground) ── */}
      {geos?.minorRoads && <mesh geometry={geos.minorRoads}><meshStandardMaterial color="#7a756a" roughness={0.75} /></mesh>}

      {/* ── Major roads (wider, brighter) ── */}
      {geos?.majorRoads && <mesh geometry={geos.majorRoads} position={[0, 0.01, 0]}><meshStandardMaterial color="#9a958a" roughness={0.6} /></mesh>}

      {/* ── Buildings (flatten near enemies) ── */}
      {geos?.westWalls && (
        <mesh geometry={geos.westWalls}
          onPointerEnter={() => setBuildingsHovered(true)}
          onPointerLeave={() => setBuildingsHovered(false)}>
          <meshStandardMaterial {...westMat.props} />
        </mesh>
      )}
      {geos?.eastWalls && (
        <mesh geometry={geos.eastWalls}
          onPointerEnter={() => setBuildingsHovered(true)}
          onPointerLeave={() => setBuildingsHovered(false)}>
          <meshStandardMaterial {...eastMat.props} />
        </mesh>
      )}

      {/* ── Enemy path glow (visible through buildings) ── */}
      {/* ── Enemy path (main only) ── */}
      <Line points={ALL_PATHS[0].map(p => [p.x, getElevation(p.x, p.z) + 0.6, p.z] as [number, number, number])}
        color={PATH_COLORS[0]} lineWidth={10} opacity={0.15} transparent
        depthTest={true} depthWrite={false} />
      <Line points={ALL_PATHS[0].map(p => [p.x, getElevation(p.x, p.z) + 0.6, p.z] as [number, number, number])}
        color={PATH_COLORS[0]} lineWidth={4} opacity={0.8} transparent
        depthTest={true} depthWrite={false} />

      {/* ── Street labels ── */}
      {geos?.labels?.map((l) => (
        <Html key={l.name} position={l.position} center transform scale={0.5}
          style={{ pointerEvents: 'none', userSelect: 'none' }}>
          <div style={{
            color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 800,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            textShadow: '0 0 8px rgba(0,0,0,0.9)', whiteSpace: 'nowrap',
          }}>{l.name}</div>
        </Html>
      ))}
    </group>
  );
}
