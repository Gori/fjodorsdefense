'use client';

import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { gameRuntime, useRuntimeSnapshot } from '@/lib/runtime';
import { getElevation } from '@/lib/elevation';
import * as THREE from 'three';
import { useGameStore } from '@/lib/store';

interface ParticleEffect {
  id: string;
  type: 'smoke' | 'explosion';
  position: THREE.Vector3;
  startTime: number;
  duration: number;
  particleCount: number;
}

const SMOKE_DURATION = 600;
const EXPLOSION_DURATION = 400;

export function ParticleEffects() {
  const { enemyCount, projectiles } = useRuntimeSnapshot();
  const [effects, setEffects] = useState<ParticleEffect[]>([]);
  const nextEffectId = useRef(0);
  const cleanupTimer = useRef(0);
  const loadScore = enemyCount + projectiles.length;
  const loadRef = useRef(loadScore);
  const effectBudget = useMemo(() => {
    if (loadScore >= 110) return 12;
    if (loadScore >= 80) return 18;
    if (loadScore >= 55) return 26;
    return 40;
  }, [loadScore]);
  const effectBudgetRef = useRef(effectBudget);
  const effectCountRef = useRef(0);

  useEffect(() => {
    loadRef.current = loadScore;
    effectBudgetRef.current = effectBudget;
  }, [effectBudget, loadScore]);

  useEffect(() => {
    effectCountRef.current = effects.length;
  }, [effects.length]);

  useEffect(() => {
    const unsubscribe = gameRuntime.subscribeEvents((event) => {
      let effect: ParticleEffect | null = null;
      const stress = loadRef.current;
      const overBudget = effectCountRef.current >= effectBudgetRef.current;

      if (event.type === 'enemy_spawned') {
        if (stress >= 80 || overBudget) return;
        const y = getElevation(event.position.x, event.position.z);
        effect = {
          id: `smoke-${nextEffectId.current++}`,
          type: 'smoke',
          position: new THREE.Vector3(event.position.x, y + 0.5, event.position.z),
          startTime: Date.now(),
          duration: SMOKE_DURATION,
          particleCount: stress >= 55 ? 6 : 12,
        };
      }

      if (event.type === 'enemy_killed' || event.type === 'enemy_escaped') {
        const y = getElevation(event.position.x, event.position.z);
        effect = {
          id: `explode-${nextEffectId.current++}`,
          type: 'explosion',
          position: new THREE.Vector3(event.position.x, y + 1, event.position.z),
          startTime: Date.now(),
          duration: EXPLOSION_DURATION,
          particleCount: stress >= 110 ? 6 : stress >= 80 ? 8 : stress >= 55 ? 12 : 16,
        };
      }

      if (!effect) return;

      startTransition(() => {
        setEffects((prev) => {
          if (effect.type === 'smoke' && prev.length >= effectBudgetRef.current) {
            return prev;
          }
          if (prev.length < effectBudgetRef.current) {
            return [...prev, effect];
          }
          return [...prev.slice(1), effect];
        });
      });
    });

    return unsubscribe;
  }, []);

  useFrame((_, delta) => {
    if (effects.length === 0) return;
    cleanupTimer.current += delta;
    if (cleanupTimer.current < 0.12) return;
    cleanupTimer.current = 0;
    const now = Date.now();
    startTransition(() => {
      setEffects((prev) => {
        const active = prev.filter((effect) => now - effect.startTime < effect.duration);
        return active.length === prev.length ? prev : active;
      });
    });
  });

  return (
    <>
      {effects.map((effect) => (
        <ParticleCloud key={effect.id} effect={effect} />
      ))}
    </>
  );
}

function ParticleCloud({ effect }: { effect: ParticleEffect }) {
  const groupRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<{ offset: THREE.Vector3; velocity: THREE.Vector3 }[]>([]);
  const currentWorld = useGameStore((s) => s.currentWorld);

  useEffect(() => {
    particlesRef.current = Array.from({ length: effect.particleCount }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = effect.type === 'explosion' ? 2 + Math.random() * 4 : 0.5 + Math.random() * 1.5;
      const upSpeed = effect.type === 'explosion' ? 1 + Math.random() * 3 : 1 + Math.random() * 2;
      return {
        offset: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          upSpeed,
          Math.sin(angle) * speed,
        ),
      };
    });
  }, [effect.particleCount, effect.type]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const elapsed = Date.now() - effect.startTime;
    const t = elapsed / effect.duration;
    if (t >= 1) return;

    particlesRef.current = particlesRef.current.map((particle) => ({
      offset: particle.offset.clone().addScaledVector(particle.velocity, delta),
      velocity: particle.velocity.clone().add(new THREE.Vector3(0, -delta * 3, 0)),
    }));

    groupRef.current.children.forEach((child, i) => {
      const particle = particlesRef.current[i];
      if (!particle) return;
      child.position.copy(particle.offset);
      const mesh = child as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.opacity = (1 - t) * (effect.type === 'smoke' ? 0.5 : 0.8);
      }
      const s = effect.type === 'smoke' ? 0.3 + t * 0.4 : 0.2 * (1 - t * 0.5);
      child.scale.setScalar(s);
    });
  });

  const color = effect.type === 'smoke' ? '#aaaaaa' : currentWorld?.accent ?? '#ff6622';

  return (
    <group ref={groupRef} position={effect.position}>
      {Array.from({ length: effect.particleCount }, (_, i) => (
        <mesh key={i}>
          <octahedronGeometry args={[0.3, 0]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
