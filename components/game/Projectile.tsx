'use client';

import { useRuntimeSnapshot } from '@/lib/runtime';
import { TOWER_DEFS } from '@/lib/towerDefs';
import { getElevation } from '@/lib/elevation';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

function ProjectileMesh({
  projectile,
}: {
  projectile: { position: { x: number; z: number }; towerDefId: string };
}) {
  const ref = useRef<Mesh>(null);
  const terrainY = getElevation(projectile.position.x, projectile.position.z);
  const y = terrainY + 1.5;
  const def = TOWER_DEFS[projectile.towerDefId];
  const color = def?.color || '#fbbf24';
  const isLaser = projectile.towerDefId === 'laserPointer';

  useFrame((_, delta) => {
    if (ref.current) {
      const currentY = getElevation(projectile.position.x, projectile.position.z) + 1.5;
      ref.current.position.set(projectile.position.x, currentY, projectile.position.z);
      ref.current.rotation.x += delta * 10;
      ref.current.rotation.y += delta * 8;
    }
  });

  if (isLaser) {
    // Laser shots: bright red elongated bolt, larger for visibility at high speed
    return (
      <mesh ref={ref} position={[projectile.position.x, y, projectile.position.z]} scale={[0.6, 0.6, 1.2]}>
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
    <mesh ref={ref} position={[projectile.position.x, y, projectile.position.z]}>
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
  const { projectiles } = useRuntimeSnapshot();

  return (
    <>
      {projectiles.map((proj) => (
        <ProjectileMesh key={proj.id} projectile={proj} />
      ))}
    </>
  );
}
