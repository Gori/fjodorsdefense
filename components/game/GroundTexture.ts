import * as THREE from 'three';
import { getElevation } from '@/lib/elevation';

interface MapData {
  buildings: { coords: [number, number][]; type: string }[];
  roads: { coords: [number, number][]; width: number; importance: number; name: string | null }[];
  parks: { coords: [number, number][] }[];
}

interface LandZone { type: string; coords: [number, number][]; }
interface Pitch { name: string | null; sport: string | null; surface: string | null; coords: [number, number][]; }

const TEX_SIZE = 2048;
// Must cover full data extent (buildings go to ±57, roads to ±57)
const WORLD_MIN = -60;
const WORLD_MAX = 60;
const WORLD_RANGE = WORLD_MAX - WORLD_MIN;

function worldToTex(x: number, z: number): [number, number] {
  const tx = ((x - WORLD_MIN) / WORLD_RANGE) * TEX_SIZE;
  const ty = ((WORLD_MAX - z) / WORLD_RANGE) * TEX_SIZE; // flip z
  return [tx, ty];
}

function fillPolygon(ctx: CanvasRenderingContext2D, coords: [number, number][], color: string) {
  if (coords.length < 3) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  const [sx, sy] = worldToTex(coords[0][0], coords[0][1]);
  ctx.moveTo(sx, sy);
  for (let i = 1; i < coords.length; i++) {
    const [tx, ty] = worldToTex(coords[i][0], coords[i][1]);
    ctx.lineTo(tx, ty);
  }
  ctx.closePath();
  ctx.fill();
}

function drawRoad(ctx: CanvasRenderingContext2D, coords: [number, number][], width: number, color: string) {
  if (coords.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = (width / WORLD_RANGE) * TEX_SIZE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const [sx, sy] = worldToTex(coords[0][0], coords[0][1]);
  ctx.moveTo(sx, sy);
  for (let i = 1; i < coords.length; i++) {
    const [tx, ty] = worldToTex(coords[i][0], coords[i][1]);
    ctx.lineTo(tx, ty);
  }
  ctx.stroke();
}

const ZONE_COLORS: Record<string, string> = {
  park: '#2a8520',
  grass: '#359228',
  forest: '#1a5010',
  scrub: '#257018',
  allotments: '#328a28',
  cemetery: '#1c5815',
  playground: '#5a9228',
  pitch: '#2a9022',
  rock: '#4a7038',
  beach: '#8a9a48',
  residential: '#4a6a35',
  commercial: '#3a5a28',
  railway: '#2a4020',
  construction: '#588028',
};

const SURFACE_COLORS: Record<string, string> = {
  artificial_turf: '#2a9020',
  grass: '#2a8520',
  asphalt: '#4a6238',
  concrete: '#5a7048',
  gravel: '#687a48',
  fine_gravel: '#687a48',
  sand: '#8a9a48',
  rubber: '#3a5820',
  tartan: '#5a7028',
  paving_stones: '#4a6238',
  plastic: '#2a9020',
};

export function createGroundTexture(
  mapData: MapData,
  landZones: LandZone[],
  pitches: Pitch[]
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_SIZE;
  canvas.height = TEX_SIZE;
  const ctx = canvas.getContext('2d')!;

  // 1. Paint per-pixel: water blue where elevation=0, green where land
  const imgData = ctx.createImageData(TEX_SIZE, TEX_SIZE);
  const waterRGB = [26, 48, 96]; // #1a3060
  const landRGB = [52, 80, 38]; // #345026 — deep lush green

  for (let py = 0; py < TEX_SIZE; py++) {
    for (let px = 0; px < TEX_SIZE; px++) {
      const wx = WORLD_MIN + (px / TEX_SIZE) * WORLD_RANGE;
      const wz = WORLD_MAX - (py / TEX_SIZE) * WORLD_RANGE;
      const elev = getElevation(wx, wz);
      const idx = (py * TEX_SIZE + px) * 4;
      const isLand = elev > 0.3;
      const rgb = isLand ? landRGB : waterRGB;
      imgData.data[idx] = rgb[0];
      imgData.data[idx + 1] = rgb[1];
      imgData.data[idx + 2] = rgb[2];
      imgData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // 2. Land zones (parks, forests, etc.) — painted ON TOP of base
  for (const zone of landZones) {
    const color = ZONE_COLORS[zone.type];
    if (color) fillPolygon(ctx, zone.coords, color);
  }

  // 3. Parks from main data
  for (const park of mapData.parks) {
    fillPolygon(ctx, park.coords, '#2a8520');
  }

  // 4. Sports pitches
  for (const pitch of pitches) {
    const color = (pitch.surface && SURFACE_COLORS[pitch.surface]) || '#4a8a3a';
    fillPolygon(ctx, pitch.coords, color);
  }

  // 5. Roads — draw minor first, then major on top
  // Minor roads
  for (const road of mapData.roads) {
    if (road.importance <= 1) {
      const w = road.width * 0.8;
      drawRoad(ctx, road.coords, w, '#586a45');
    }
  }
  // Major roads (wider, lighter)
  for (const road of mapData.roads) {
    if (road.importance >= 2) {
      const w = road.width * 1.2;
      drawRoad(ctx, road.coords, w, '#687a52');
    }
  }

  // 6. Building footprints (subtle dark outline)
  for (const building of mapData.buildings) {
    if (building.coords.length >= 3) {
      fillPolygon(ctx, building.coords, '#2a3a1e');
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  return texture;
}
