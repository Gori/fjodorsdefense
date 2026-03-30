import type { Vec2 } from './types';
import { getElevation } from './elevation';

// MUST match scripts/fetch-map-data.mjs bounds exactly
const BOUNDS = {
  minLat: 59.3040,
  maxLat: 59.3260,
  minLng: 18.0180,
  maxLng: 18.1150,
};

export const WORLD_SIZE = 100;

export function latLngToWorld(lat: number, lng: number): Vec2 {
  const x =
    ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * WORLD_SIZE -
    WORLD_SIZE / 2;
  const z =
    -(
      ((lat - BOUNDS.minLat) / (BOUNDS.maxLat - BOUNDS.minLat)) * WORLD_SIZE -
      WORLD_SIZE / 2
    );
  return { x, z };
}

export function distance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function isValidPlacement(
  pos: Vec2,
  towers: { position: Vec2 }[],
  minTowerDist = 1.5
): boolean {
  for (const t of towers) {
    if (distance(pos, t.position) < minTowerDist) return false;
  }
  return true;
}

export function snapToGrid(pos: Vec2, gridSize = 1): Vec2 {
  return {
    x: Math.round(pos.x / gridSize) * gridSize,
    z: Math.round(pos.z / gridSize) * gridSize,
  };
}

// ── Point-in-polygon (ray casting algorithm) ──────────────────────────
export function pointInPolygon(x: number, z: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], zi = polygon[i][1];
    const xj = polygon[j][0], zj = polygon[j][1];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ── Precompute which grid cells are blocked by buildings ──────────────
export function computeBlockedCells(
  buildings: { coords: [number, number][] }[],
  gridSize = 1
): Set<string> {
  const blocked = new Set<string>();

  for (const building of buildings) {
    if (building.coords.length < 3) continue;

    // Bounding box
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [x, z] of building.coords) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    // Snap bounds to grid (with 1-cell padding for tower footprint)
    const startX = Math.floor((minX - 0.5) / gridSize) * gridSize;
    const endX = Math.ceil((maxX + 0.5) / gridSize) * gridSize;
    const startZ = Math.floor((minZ - 0.5) / gridSize) * gridSize;
    const endZ = Math.ceil((maxZ + 0.5) / gridSize) * gridSize;

    for (let gx = startX; gx <= endX; gx += gridSize) {
      for (let gz = startZ; gz <= endZ; gz += gridSize) {
        if (pointInPolygon(gx, gz, building.coords)) {
          blocked.add(`${gx},${gz}`);
        }
      }
    }
  }

  return blocked;
}

export function getTerrainSurfaceY(x: number, z: number): number {
  const elev = getElevation(x, z);
  return elev > 0.3 ? Math.max(elev, 0.1) - 0.15 : -0.35;
}

export function getFootprintBaseElevation(
  polygon: [number, number][],
  sampleStep = 0.5,
): number {
  if (polygon.length === 0) return 0;

  let minElev = Infinity;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const [x, z] of polygon) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
    minElev = Math.min(minElev, getTerrainSurfaceY(x, z));
  }

  for (let i = 0; i < polygon.length; i++) {
    const [x1, z1] = polygon[i];
    const [x2, z2] = polygon[(i + 1) % polygon.length];
    const edgeLength = Math.hypot(x2 - x1, z2 - z1);
    const segments = Math.max(1, Math.ceil(edgeLength / sampleStep));

    for (let step = 1; step < segments; step++) {
      const t = step / segments;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      minElev = Math.min(minElev, getTerrainSurfaceY(x, z));
    }
  }

  for (let x = minX; x <= maxX; x += sampleStep) {
    for (let z = minZ; z <= maxZ; z += sampleStep) {
      if (pointInPolygon(x, z, polygon)) {
        minElev = Math.min(minElev, getTerrainSurfaceY(x, z));
      }
    }
  }

  return Number.isFinite(minElev) ? minElev : 0;
}
