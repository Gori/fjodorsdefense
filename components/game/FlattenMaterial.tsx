'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useRuntimeSnapshot } from '@/lib/runtime';
import * as THREE from 'three';
import { getElevation } from '@/lib/elevation';

const MAX_ENEMIES = 30;
const FLATTEN_RADIUS = 6.5;
const FLATTEN_HEIGHT = 0.2;
const RAMP_SPEED = 3.0; // intensity units per second (0→1 in ~0.33s)

function createElevationTexture(): THREE.DataTexture {
  const size = 128;
  const data = new Float32Array(size * size);
  for (let zi = 0; zi < size; zi++) {
    for (let xi = 0; xi < size; xi++) {
      const x = -50 + (xi / (size - 1)) * 100;
      const z = 50 - (zi / (size - 1)) * 100;
      data[zi * size + xi] = getElevation(x, z);
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RedFormat, THREE.FloatType);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function useFlattenMaterial(opts: {
  vertexColors?: boolean;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  side?: THREE.Side;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const { enemies } = useRuntimeSnapshot();
  const elevTex = useMemo(() => createElevationTexture(), []);

  // Track smoothed intensity per enemy slot — ramps up on appear, down on disappear
  const smoothedSlots = useRef<{ x: number; z: number; intensity: number; active: boolean }[]>(
    Array.from({ length: MAX_ENEMIES }, () => ({ x: 0, z: 0, intensity: 0, active: false }))
  );

  // 3 floats per enemy: x, z, intensity
  const uniforms = useMemo(() => ({
    uEnemyData: { value: new Float32Array(MAX_ENEMIES * 3) },
    uEnemyCount: { value: 0 },
    uFlattenRadius: { value: FLATTEN_RADIUS },
    uFlattenHeight: { value: FLATTEN_HEIGHT },
    uElevationMap: { value: elevTex },
  }), [elevTex]);
  const enemyDataRef = useRef(uniforms.uEnemyData.value);
  const enemyCountRef = useRef(uniforms.uEnemyCount);

  useFrame((_, delta) => {
    if (!matRef.current) return;

    const slots = smoothedSlots.current;
    const count = Math.min(enemies.length, MAX_ENEMIES);

    // Update active enemy slots
    for (let i = 0; i < MAX_ENEMIES; i++) {
      if (i < count) {
        slots[i].x = enemies[i].position.x;
        slots[i].z = enemies[i].position.z;
        slots[i].active = true;
        // Ramp intensity up
        slots[i].intensity = Math.min(1, slots[i].intensity + RAMP_SPEED * delta);
      } else {
        slots[i].active = false;
        // Ramp intensity down
        slots[i].intensity = Math.max(0, slots[i].intensity - RAMP_SPEED * delta);
      }
    }

    // Write to uniform
    const arr = enemyDataRef.current;
    let activeCount = 0;
    for (let i = 0; i < MAX_ENEMIES; i++) {
      if (slots[i].intensity > 0.01) {
        arr[activeCount * 3] = slots[i].x;
        arr[activeCount * 3 + 1] = slots[i].z;
        arr[activeCount * 3 + 2] = slots[i].intensity;
        activeCount++;
      }
    }
    arr.fill(0, activeCount * 3);
    enemyCountRef.current.value = activeCount;
  });

  const onBeforeCompile = useMemo(() => (shader: THREE.WebGLProgramParametersWithUniforms) => {
    shader.uniforms.uEnemyData = uniforms.uEnemyData;
    shader.uniforms.uEnemyCount = uniforms.uEnemyCount;
    shader.uniforms.uFlattenRadius = uniforms.uFlattenRadius;
    shader.uniforms.uFlattenHeight = uniforms.uFlattenHeight;
    shader.uniforms.uElevationMap = uniforms.uElevationMap;

    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      `
      uniform float uEnemyData[${MAX_ENEMIES * 3}];
      uniform int uEnemyCount;
      uniform float uFlattenRadius;
      uniform float uFlattenHeight;
      uniform sampler2D uElevationMap;

      float getTerrainY(float wx, float wz) {
        float u = (wx + 50.0) / 100.0;
        float v = 1.0 - (wz + 50.0) / 100.0;
        return texture2D(uElevationMap, vec2(u, v)).r;
      }

      void main() {
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>

      // Find strongest flatten effect from all enemies (with intensity)
      float maxFlatten = 0.0;
      for (int i = 0; i < ${MAX_ENEMIES}; i++) {
        if (i >= uEnemyCount) break;
        float ex = uEnemyData[i * 3];
        float ez = uEnemyData[i * 3 + 1];
        float intensity = uEnemyData[i * 3 + 2];
        float d = length(vec2(transformed.x - ex, transformed.z - ez));
        float f = smoothstep(0.0, uFlattenRadius, d);
        f = f * f; // sharper falloff
        float flattenAmount = (1.0 - f) * intensity;
        maxFlatten = max(maxFlatten, flattenAmount);
      }

      if (maxFlatten > 0.01) {
        float terrainY = getTerrainY(transformed.x, transformed.z);
        float flatY = terrainY + uFlattenHeight;
        transformed.y = mix(transformed.y, flatY, maxFlatten);
      }
      `
    );
  }, [uniforms]);

  return {
    ref: matRef,
    props: {
      ref: matRef,
      vertexColors: opts.vertexColors ?? false,
      roughness: opts.roughness ?? 0.75,
      metalness: opts.metalness ?? 0,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.DoubleSide,
      onBeforeCompile,
    },
  };
}
