'use client';

import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/lib/store';
import * as THREE from 'three';
import { getElevation } from '@/lib/elevation';

const MAX_ENEMIES = 30;
const FLATTEN_RADIUS = 6.5;
const FLATTEN_HEIGHT = 0.2; // game units above terrain when flattened

function createElevationTexture(): THREE.DataTexture {
  const size = 128; // enough resolution for the shader lookup
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
  const enemies = useGameStore((s) => s.enemies);

  const elevTex = useMemo(() => createElevationTexture(), []);

  const uniforms = useMemo(() => ({
    uEnemyPositions: { value: new Float32Array(MAX_ENEMIES * 2) },
    uEnemyCount: { value: 0 },
    uFlattenRadius: { value: FLATTEN_RADIUS },
    uFlattenHeight: { value: FLATTEN_HEIGHT },
    uElevationMap: { value: elevTex },
  }), [elevTex]);

  useFrame(() => {
    if (!matRef.current) return;
    const posArr = uniforms.uEnemyPositions.value;
    const count = Math.min(enemies.length, MAX_ENEMIES);
    for (let i = 0; i < count; i++) {
      posArr[i * 2] = enemies[i].position.x;
      posArr[i * 2 + 1] = enemies[i].position.z;
    }
    uniforms.uEnemyCount.value = count;
  });

  const onBeforeCompile = useMemo(() => (shader: THREE.WebGLProgramParameters) => {
    shader.uniforms.uEnemyPositions = uniforms.uEnemyPositions;
    shader.uniforms.uEnemyCount = uniforms.uEnemyCount;
    shader.uniforms.uFlattenRadius = uniforms.uFlattenRadius;
    shader.uniforms.uFlattenHeight = uniforms.uFlattenHeight;
    shader.uniforms.uElevationMap = uniforms.uElevationMap;

    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      `
      uniform float uEnemyPositions[${MAX_ENEMIES * 2}];
      uniform int uEnemyCount;
      uniform float uFlattenRadius;
      uniform float uFlattenHeight;
      uniform sampler2D uElevationMap;

      float getTerrainY(float wx, float wz) {
        // Map world coords (-50..50) to UV (0..1)
        float u = (wx + 50.0) / 100.0;
        float v = 1.0 - (wz + 50.0) / 100.0; // z is flipped
        return texture2D(uElevationMap, vec2(u, v)).r;
      }

      void main() {
      `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>

      float minDist = 9999.0;
      for (int i = 0; i < ${MAX_ENEMIES}; i++) {
        if (i >= uEnemyCount) break;
        float ex = uEnemyPositions[i * 2];
        float ez = uEnemyPositions[i * 2 + 1];
        float d = length(vec2(transformed.x - ex, transformed.z - ez));
        minDist = min(minDist, d);
      }
      // Sharper falloff — buildings snap down quickly
      float flattenFactor = smoothstep(0.0, uFlattenRadius, minDist);
      flattenFactor = flattenFactor * flattenFactor; // square for steeper curve

      // Sample terrain height at this vertex's XZ position
      float terrainY = getTerrainY(transformed.x, transformed.z);
      float flatY = terrainY + uFlattenHeight;

      // Lerp between flattened (at terrain+offset) and original Y
      transformed.y = mix(flatY, transformed.y, flattenFactor);
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
      transparent: opts.transparent ?? true,
      opacity: opts.opacity ?? 1,
      side: opts.side ?? THREE.DoubleSide,
      onBeforeCompile,
    },
  };
}
