'use client';

import { useGameStore } from '@/lib/store';
import { ENEMY_DEFS } from '@/lib/enemyDefs';
import { getElevation } from '@/lib/elevation';
import { Html } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';

// ── Rat ──────────────────────────────────────────────────────────────
function RatMesh() {
  const bodyRef = useRef<Group>(null);
  useFrame(() => {
    if (bodyRef.current) {
      bodyRef.current.rotation.z = Math.sin(Date.now() * 0.015) * 0.1;
    }
  });

  return (
    <group ref={bodyRef}>
      <mesh scale={[0.8, 0.6, 1.3]}>
        <sphereGeometry args={[0.35, 12, 10]} />
        <meshStandardMaterial color="#8b7355" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.05, -0.42]} scale={[0.7, 0.65, 0.7]}>
        <sphereGeometry args={[0.25, 10, 8]} />
        <meshStandardMaterial color="#9a8265" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.02, -0.58]} scale={[0.5, 0.4, 0.6]}>
        <sphereGeometry args={[0.12, 8, 6]} />
        <meshStandardMaterial color="#b09575" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.0, -0.65]}>
        <sphereGeometry args={[0.04, 6, 4]} />
        <meshStandardMaterial color="#2a1a0a" />
      </mesh>
      <mesh position={[0.1, 0.1, -0.4]}>
        <sphereGeometry args={[0.04, 6, 4]} />
        <meshStandardMaterial color="#1a0a00" />
      </mesh>
      <mesh position={[-0.1, 0.1, -0.4]}>
        <sphereGeometry args={[0.04, 6, 4]} />
        <meshStandardMaterial color="#1a0a00" />
      </mesh>
      <mesh position={[0.14, 0.2, -0.32]} scale={[0.7, 1.0, 0.5]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color="#c4a882" roughness={0.85} />
      </mesh>
      <mesh position={[-0.14, 0.2, -0.32]} scale={[0.7, 1.0, 0.5]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color="#c4a882" roughness={0.85} />
      </mesh>
      <mesh position={[0.14, 0.22, -0.30]} scale={[0.4, 0.6, 0.3]}>
        <sphereGeometry args={[0.08, 6, 4]} />
        <meshStandardMaterial color="#d4a88a" roughness={0.8} />
      </mesh>
      <mesh position={[-0.14, 0.22, -0.30]} scale={[0.4, 0.6, 0.3]}>
        <sphereGeometry args={[0.08, 6, 4]} />
        <meshStandardMaterial color="#d4a88a" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.05, 0.48]} rotation={[0.5, 0, 0]}>
        <cylinderGeometry args={[0.035, 0.015, 0.8, 6]} />
        <meshStandardMaterial color="#a89070" roughness={0.85} />
      </mesh>
      {[[0.15, -0.2, -0.2], [-0.15, -0.2, -0.2], [0.15, -0.2, 0.15], [-0.15, -0.2, 0.15]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <cylinderGeometry args={[0.04, 0.05, 0.2, 5]} />
          <meshStandardMaterial color="#7a6345" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ── Pigeon ───────────────────────────────────────────────────────────
function PigeonMesh() {
  const rightWingRef = useRef<Mesh>(null);
  const leftWingRef = useRef<Mesh>(null);
  useFrame(() => {
    const flap = Math.sin(Date.now() * 0.01) * 0.4;
    if (rightWingRef.current) rightWingRef.current.rotation.z = -0.3 + flap;
    if (leftWingRef.current) leftWingRef.current.rotation.z = 0.3 - flap;
  });

  return (
    <group>
      <mesh scale={[0.7, 0.8, 1.1]}>
        <sphereGeometry args={[0.4, 12, 10]} />
        <meshStandardMaterial color="#8a8a90" roughness={0.75} />
      </mesh>
      <mesh position={[0, -0.05, -0.25]} scale={[0.5, 0.6, 0.5]}>
        <sphereGeometry args={[0.3, 10, 8]} />
        <meshStandardMaterial color="#6a7a6a" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[0, 0.28, -0.32]}>
        <sphereGeometry args={[0.18, 10, 8]} />
        <meshStandardMaterial color="#7a8090" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.22, -0.48]} rotation={[0.4, 0, 0]}>
        <coneGeometry args={[0.05, 0.14, 4]} />
        <meshStandardMaterial color="#e0c040" roughness={0.6} />
      </mesh>
      <mesh ref={rightWingRef} position={[0.3, 0.1, 0]} rotation={[0, 0, -0.3]} scale={[0.12, 0.5, 0.75]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8a9198" roughness={0.8} />
      </mesh>
      <mesh ref={leftWingRef} position={[-0.3, 0.1, 0]} rotation={[0, 0, 0.3]} scale={[0.12, 0.5, 0.75]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8a9198" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.05, 0.4]} rotation={[-0.3, 0, 0]} scale={[0.4, 0.15, 0.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#7a7a80" roughness={0.8} />
      </mesh>
      <mesh position={[0.1, 0.32, -0.38]}>
        <sphereGeometry args={[0.04, 6, 4]} />
        <meshStandardMaterial color="#cc6600" />
      </mesh>
      <mesh position={[-0.1, 0.32, -0.38]}>
        <sphereGeometry args={[0.04, 6, 4]} />
        <meshStandardMaterial color="#cc6600" />
      </mesh>
    </group>
  );
}

// ── Dog ──────────────────────────────────────────────────────────────
function DogMesh() {
  const tailRef = useRef<Mesh>(null);
  useFrame(() => {
    if (tailRef.current) tailRef.current.rotation.z = Math.sin(Date.now() * 0.008) * 0.4;
  });

  return (
    <group>
      <mesh scale={[0.9, 0.85, 1.4]}>
        <sphereGeometry args={[0.5, 12, 10]} />
        <meshStandardMaterial color="#92400e" roughness={0.85} />
      </mesh>
      <mesh position={[0, -0.15, 0]} scale={[0.7, 0.5, 1.2]}>
        <sphereGeometry args={[0.4, 10, 8]} />
        <meshStandardMaterial color="#b06020" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.15, -0.6]}>
        <sphereGeometry args={[0.32, 12, 10]} />
        <meshStandardMaterial color="#a05010" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.05, -0.88]} scale={[0.65, 0.55, 0.8]}>
        <sphereGeometry args={[0.2, 10, 8]} />
        <meshStandardMaterial color="#b86828" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.08, -1.0]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color="#1a0a00" roughness={0.5} />
      </mesh>
      <mesh position={[0.15, 0.22, -0.7]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color="#1a0a00" />
      </mesh>
      <mesh position={[-0.15, 0.22, -0.7]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color="#1a0a00" />
      </mesh>
      <mesh position={[0.16, 0.24, -0.72]}>
        <sphereGeometry args={[0.02, 4, 4]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.14, 0.24, -0.72]}>
        <sphereGeometry args={[0.02, 4, 4]} />
        <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.22, 0.35, -0.55]} rotation={[0, 0, 0.4]} scale={[0.4, 1.0, 0.25]}>
        <sphereGeometry args={[0.18, 8, 6]} />
        <meshStandardMaterial color="#7a3008" roughness={0.9} />
      </mesh>
      <mesh position={[-0.22, 0.35, -0.55]} rotation={[0, 0, -0.4]} scale={[0.4, 1.0, 0.25]}>
        <sphereGeometry args={[0.18, 8, 6]} />
        <meshStandardMaterial color="#7a3008" roughness={0.9} />
      </mesh>
      {[[0.25, -0.35, -0.3], [-0.25, -0.35, -0.3], [0.25, -0.35, 0.3], [-0.25, -0.35, 0.3]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <cylinderGeometry args={[0.08, 0.1, 0.4, 8]} />
          <meshStandardMaterial color="#7a3008" roughness={0.9} />
        </mesh>
      ))}
      {[[0.25, -0.55, -0.3], [-0.25, -0.55, -0.3], [0.25, -0.55, 0.3], [-0.25, -0.55, 0.3]].map(([x, y, z], i) => (
        <mesh key={`p${i}`} position={[x, y, z]} scale={[1.3, 0.5, 1.3]}>
          <sphereGeometry args={[0.08, 6, 4]} />
          <meshStandardMaterial color="#8a4010" roughness={0.9} />
        </mesh>
      ))}
      <mesh ref={tailRef} position={[0, 0.25, 0.65]} rotation={[-0.6, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.03, 0.5, 6]} />
        <meshStandardMaterial color="#a05010" roughness={0.85} />
      </mesh>
    </group>
  );
}

const ENEMY_MESHES: Record<string, React.FC> = {
  rat: RatMesh,
  pigeon: PigeonMesh,
  dog: DogMesh,
};

function EnemyUnit({
  enemy,
}: {
  enemy: {
    id: string;
    defId: string;
    position: { x: number; z: number };
    hp: number;
    maxHp: number;
    waypointIndex: number;
    pathIndex: number;
  };
}) {
  const def = ENEMY_DEFS[enemy.defId];
  const hpPercent = enemy.hp / enemy.maxHp;
  const terrainY = getElevation(enemy.position.x, enemy.position.z);
  const y = terrainY + (def.flying ? 5.0 : 0.5);
  const groupRef = useRef<Group>(null);
  const prevPos = useRef({ x: enemy.position.x, z: enemy.position.z });

  const MeshComponent = ENEMY_MESHES[enemy.defId];

  // Bigger enemies so they're visible at zoom level
  const scale = (enemy.defId === 'dog' ? 5.0 : enemy.defId === 'pigeon' ? 4.0 : 3.5) * 0.4;

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const lerp = 1 - Math.pow(0.001, delta);
    const targetX = enemy.position.x;
    const targetZ = enemy.position.z;
    groupRef.current.position.x += (targetX - groupRef.current.position.x) * lerp;
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * lerp;
    groupRef.current.position.y = y;

    // Rotate to face movement direction (models face -Z, so add PI)
    const dx = targetX - prevPos.current.x;
    const dz = targetZ - prevPos.current.z;
    if (Math.abs(dx) > 0.001 || Math.abs(dz) > 0.001) {
      const targetAngle = Math.atan2(dx, dz) + Math.PI;
      const currentAngle = groupRef.current.rotation.y;
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      groupRef.current.rotation.y += diff * lerp;
    }

    prevPos.current = { x: targetX, z: targetZ };
  });

  return (
    <group ref={groupRef} position={[enemy.position.x, y, enemy.position.z]}>
      <group scale={scale}>
        {MeshComponent && <MeshComponent />}
      </group>
      {/* Ground marker at terrain level */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -y + terrainY + 0.15, 0]}>
        <circleGeometry args={[scale * 0.5, 16]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.35} depthWrite={false} />
      </mesh>

      {hpPercent < 1 && (
        <Html position={[0, scale * 0.5 + 0.5, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            width: 40, height: 5,
            background: 'rgba(0,0,0,0.7)',
            borderRadius: 3, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <div style={{
              width: `${hpPercent * 100}%`, height: '100%',
              background: hpPercent > 0.5 ? '#4ade80' : hpPercent > 0.25 ? '#fbbf24' : '#ef4444',
              transition: 'width 0.15s ease', borderRadius: 2,
            }} />
          </div>
        </Html>
      )}
    </group>
  );
}

export function Enemies() {
  const enemies = useGameStore((s) => s.enemies);
  return (
    <>
      {enemies.map((enemy) => (
        <EnemyUnit key={enemy.id} enemy={enemy} />
      ))}
    </>
  );
}
