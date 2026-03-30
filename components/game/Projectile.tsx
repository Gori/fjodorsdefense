'use client';

import { useGameStore } from '@/lib/store';
import { TOWER_DEFS } from '@/lib/towerDefs';
import { getElevation } from '@/lib/elevation';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

function ProjectileMesh({ position, towerDefId }: { position: { x: number; z: number }; towerDefId: string }) {
  const ref = useRef<Mesh>(null);
  const terrainY = getElevation(position.x, position.z);
  const y = terrainY + 1.5;
  const def = TOWER_DEFS[towerDefId];
  const color = def?.color || '#fbbf24';
  const isLaser = towerDefId === 'laserPointer';

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 10;
      ref.current.rotation.y += delta * 8;
    }
  });

  if (isLaser) {
    // Laser shots: bright red elongated bolt, larger for visibility at high speed
    return (
      <mesh ref={ref} position={[position.x, y, position.z]} scale={[0.6, 0.6, 1.2]}>
        <octahedronGeometry args={[0.25, 0]} />
        <meshStandardMaterial
          color="#ff0000"
          emissive="#ff0000"
          emissiveIntensity={1.5}
          roughness={0.1}
        />
      </mesh>
    );
  }

  return (
    <mesh ref={ref} position={[position.x, y, position.z]}>
      <octahedronGeometry args={[0.2, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.8}
        roughness={0.3}
      />
    </mesh>
  );
}

export function Projectiles() {
  const projectiles = useGameStore((s) => s.projectiles);

  return (
    <>
      {projectiles.map((proj) => (
        <ProjectileMesh key={proj.id} position={proj.position} towerDefId={proj.towerDefId} />
      ))}
    </>
  );
}
