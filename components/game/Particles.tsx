'use client';

import { startTransition, useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGameStore } from '@/lib/store';
import { getElevation } from '@/lib/elevation';
import * as THREE from 'three';

interface ParticleEffect {
  id: string;
  type: 'smoke' | 'explosion';
  position: THREE.Vector3;
  startTime: number;
  duration: number;
}

const SMOKE_DURATION = 600;
const EXPLOSION_DURATION = 400;

export function ParticleEffects() {
  const enemies = useGameStore((s) => s.enemies);
  const [effects, setEffects] = useState<ParticleEffect[]>([]);
  const prevEnemyIds = useRef<Set<string>>(new Set());
  const enemyPositions = useRef<Map<string, { x: number; z: number }>>(new Map());
  useFrame(() => {
    const now = Date.now();
    const currentIds = new Set(enemies.map((e) => e.id));
    const nextEffects: ParticleEffect[] = [];

    for (const enemy of enemies) {
      enemyPositions.current.set(enemy.id, { x: enemy.position.x, z: enemy.position.z });
      if (!prevEnemyIds.current.has(enemy.id)) {
        const y = getElevation(enemy.position.x, enemy.position.z);
        nextEffects.push({
          id: `smoke-${enemy.id}`,
          type: 'smoke',
          position: new THREE.Vector3(enemy.position.x, y + 0.5, enemy.position.z),
          startTime: now,
          duration: SMOKE_DURATION,
        });
      }
    }

    for (const id of prevEnemyIds.current) {
      if (!currentIds.has(id)) {
        const lastPosition = enemyPositions.current.get(id);
        const x = lastPosition?.x ?? 0;
        const z = lastPosition?.z ?? 0;
        const y = getElevation(x, z);
        nextEffects.push({
          id: `explode-${id}`,
          type: 'explosion',
          position: new THREE.Vector3(x, y + 1, z),
          startTime: now,
          duration: EXPLOSION_DURATION,
        });
        enemyPositions.current.delete(id);
      }
    }

    prevEnemyIds.current = currentIds;

    startTransition(() => {
      setEffects((prev) => {
        const active = prev.filter((effect) => now - effect.startTime < effect.duration);
        return nextEffects.length > 0 ? [...active, ...nextEffects] : active;
      });
    });
  });

  return (
    <>
      {effects.map(effect => (
        <ParticleCloud key={effect.id} effect={effect} />
      ))}
    </>
  );
}

function ParticleCloud({ effect }: { effect: ParticleEffect }) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<{ offset: THREE.Vector3; velocity: THREE.Vector3 }[]>([]);

  // Initialize particles once
  useEffect(() => {
    const count = effect.type === 'smoke' ? 12 : 16;
    particlesRef.current = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = effect.type === 'explosion' ? 2 + Math.random() * 4 : 0.5 + Math.random() * 1.5;
      const upSpeed = effect.type === 'explosion' ? 1 + Math.random() * 3 : 1 + Math.random() * 2;
      return {
        offset: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upSpeed,
          Math.sin(angle) * speed
        ),
      };
    });
  }, [effect.type]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const elapsed = Date.now() - effect.startTime;
    const t = elapsed / effect.duration;
    if (t >= 1) return;

    // Update particle positions
    particlesRef.current = particlesRef.current.map((particle) => ({
      offset: particle.offset.clone().addScaledVector(particle.velocity, delta),
      velocity: particle.velocity.clone().add(new THREE.Vector3(0, -delta * 3, 0)),
    }));

    // Fade out
    groupRef.current.children.forEach((child, i) => {
      const p = particlesRef.current[i];
      if (!p) return;
      child.position.copy(p.offset);
      const mesh = child as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.opacity = (1 - t) * (effect.type === 'smoke' ? 0.5 : 0.8);
      }
      // Scale down over time
      const s = effect.type === 'smoke' ? 0.3 + t * 0.4 : 0.2 * (1 - t * 0.5);
      child.scale.setScalar(s);
    });
  });

  const color = effect.type === 'smoke' ? '#aaaaaa' : '#ff6622';
  const count = effect.type === 'smoke' ? 12 : 16;

  return (
    <group ref={groupRef} position={effect.position}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
