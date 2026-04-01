'use client';

import { useRuntimeSnapshot } from '@/lib/runtime';
import { ENEMY_DEFS } from '@/lib/enemyDefs';
import { getElevation } from '@/lib/elevation';
import { Html } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, Material } from 'three';
import { useGameStore } from '@/lib/store';

type FadeMaterial = Material & {
  opacity: number;
  transparent: boolean;
  userData: {
    baseOpacity?: number;
    baseTransparent?: boolean;
  };
};

function collectFadeMaterials(group: Group | null): FadeMaterial[] {
  if (!group) return [];
  const fadeMaterials: FadeMaterial[] = [];

  group.traverse((object) => {
    const materialOrMaterials = (object as Mesh).material;
    if (!materialOrMaterials) return;

    const materials = Array.isArray(materialOrMaterials) ? materialOrMaterials : [materialOrMaterials];
    for (const material of materials) {
      if (!('opacity' in material) || !('transparent' in material)) continue;
      const fadeMaterial = material as FadeMaterial;
      if (fadeMaterial.userData.baseOpacity === undefined) {
        fadeMaterial.userData.baseOpacity = fadeMaterial.opacity;
      }
      if (fadeMaterial.userData.baseTransparent === undefined) {
        fadeMaterial.userData.baseTransparent = fadeMaterial.transparent;
      }
      fadeMaterials.push(fadeMaterial);
    }
  });

  return fadeMaterials;
}

function applySpawnOpacity(materials: FadeMaterial[], opacity: number) {
  for (const material of materials) {
    const baseOpacity = material.userData.baseOpacity as number;
    const baseTransparent = material.userData.baseTransparent as boolean;
    material.opacity = baseOpacity * opacity;
    material.transparent = baseTransparent || opacity < 0.999;
  }
}

// ── Rat ──────────────────────────────────────────────────────────────
function RatMesh() {
  const bodyRef = useRef<Group>(null);
  useFrame((state) => {
    if (bodyRef.current) {
      bodyRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 15) * 0.1;
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
  useFrame((state) => {
    const flap = Math.sin(state.clock.elapsedTime * 10) * 0.4;
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
  useFrame((state) => {
    if (tailRef.current) tailRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 8) * 0.4;
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

function SeagullMesh() {
  const wingRef = useRef<Group>(null);
  useFrame((state) => {
    if (!wingRef.current) return;
    wingRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 11) * 0.3;
  });

  return (
    <group>
      <mesh scale={[0.75, 0.55, 1.2]}>
        <sphereGeometry args={[0.4, 12, 10]} />
        <meshStandardMaterial color="#f1eee2" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.12, -0.42]} scale={[0.45, 0.42, 0.55]}>
        <sphereGeometry args={[0.25, 10, 8]} />
        <meshStandardMaterial color="#f8f6ee" roughness={0.45} />
      </mesh>
      <group ref={wingRef}>
        <mesh position={[0.42, 0.08, 0]} rotation={[0, 0, -0.35]} scale={[0.12, 0.45, 0.85]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#d7dbe2" roughness={0.6} />
        </mesh>
        <mesh position={[-0.42, 0.08, 0]} rotation={[0, 0, 0.35]} scale={[0.12, 0.45, 0.85]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#d7dbe2" roughness={0.6} />
        </mesh>
      </group>
      <mesh position={[0, 0.08, -0.63]} rotation={[0.35, 0, 0]}>
        <coneGeometry args={[0.06, 0.16, 4]} />
        <meshStandardMaterial color="#f6c64e" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.45]} rotation={[-0.25, 0, 0]} scale={[0.4, 0.12, 0.5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#c9ced8" roughness={0.6} />
      </mesh>
    </group>
  );
}

function BoarMesh() {
  const shoulderRef = useRef<Group>(null);
  useFrame((state) => {
    if (!shoulderRef.current) return;
    shoulderRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 4) * 0.05;
  });

  return (
    <group>
      <group ref={shoulderRef}>
        <mesh scale={[1.05, 0.85, 1.55]}>
          <sphereGeometry args={[0.52, 14, 10]} />
          <meshStandardMaterial color="#4a2b1d" roughness={0.95} />
        </mesh>
        <mesh position={[0, -0.08, 0.15]} scale={[0.85, 0.55, 1.25]}>
          <sphereGeometry args={[0.4, 12, 8]} />
          <meshStandardMaterial color="#5d3624" roughness={0.95} />
        </mesh>
      </group>
      <mesh position={[0, 0.05, -0.72]} scale={[0.72, 0.55, 0.92]}>
        <sphereGeometry args={[0.3, 12, 8]} />
        <meshStandardMaterial color="#6b412b" roughness={0.92} />
      </mesh>
      <mesh position={[0.18, 0.05, -0.97]} rotation={[0.2, 0, -0.1]}>
        <coneGeometry args={[0.07, 0.24, 5]} />
        <meshStandardMaterial color="#ead8bd" roughness={0.55} />
      </mesh>
      <mesh position={[-0.18, 0.05, -0.97]} rotation={[0.2, 0, 0.1]}>
        <coneGeometry args={[0.07, 0.24, 5]} />
        <meshStandardMaterial color="#ead8bd" roughness={0.55} />
      </mesh>
      {[[0.28, -0.42, -0.25], [-0.28, -0.42, -0.25], [0.28, -0.42, 0.35], [-0.28, -0.42, 0.35]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <cylinderGeometry args={[0.1, 0.12, 0.45, 7]} />
          <meshStandardMaterial color="#2b180f" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function FoxMesh() {
  const tailRef = useRef<Group>(null);
  useFrame((state) => {
    if (!tailRef.current) return;
    tailRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 7) * 0.35;
  });

  return (
    <group>
      <mesh scale={[0.8, 0.65, 1.3]}>
        <sphereGeometry args={[0.42, 12, 10]} />
        <meshStandardMaterial color="#c9652e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.1, -0.52]} scale={[0.55, 0.45, 0.7]}>
        <sphereGeometry args={[0.25, 10, 8]} />
        <meshStandardMaterial color="#d87a3a" roughness={0.75} />
      </mesh>
      <mesh position={[0, 0.05, -0.8]} scale={[0.45, 0.35, 0.55]}>
        <sphereGeometry args={[0.14, 8, 6]} />
        <meshStandardMaterial color="#f0ede4" roughness={0.7} />
      </mesh>
      <mesh position={[0.18, 0.28, -0.45]} rotation={[0, 0, 0.3]} scale={[0.35, 0.95, 0.2]}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial color="#7a2f12" roughness={0.85} />
      </mesh>
      <mesh position={[-0.18, 0.28, -0.45]} rotation={[0, 0, -0.3]} scale={[0.35, 0.95, 0.2]}>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial color="#7a2f12" roughness={0.85} />
      </mesh>
      <group ref={tailRef} position={[0, 0.2, 0.62]} rotation={[-0.3, 0, 0]}>
        <mesh scale={[0.35, 0.35, 1.0]}>
          <sphereGeometry args={[0.25, 8, 6]} />
          <meshStandardMaterial color="#c9652e" roughness={0.8} />
        </mesh>
        <mesh position={[0, 0, 0.34]} scale={[0.28, 0.28, 0.55]}>
          <sphereGeometry args={[0.22, 8, 6]} />
          <meshStandardMaterial color="#f1efe8" roughness={0.7} />
        </mesh>
      </group>
    </group>
  );
}

function EmberWispMesh() {
  const ringRef = useRef<Group>(null);
  useFrame((state) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.y = state.clock.elapsedTime * 1.8;
    ringRef.current.position.y = Math.sin(state.clock.elapsedTime * 3.2) * 0.08;
  });

  return (
    <group>
      <mesh scale={[0.45, 0.7, 0.45]}>
        <sphereGeometry args={[0.34, 10, 10]} />
        <meshStandardMaterial color="#ffb36b" emissive="#ff8f4b" emissiveIntensity={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[0, 0.35, 0]} scale={[0.22, 0.4, 0.22]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#ffe4a3" emissive="#ffd08a" emissiveIntensity={0.9} roughness={0.25} />
      </mesh>
      <group ref={ringRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0.22, 0.05, 0]}>
          <torusGeometry args={[0.2, 0.035, 6, 18]} />
          <meshStandardMaterial color="#ff7b42" emissive="#ff7b42" emissiveIntensity={0.6} roughness={0.3} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0.7, 0]} position={[-0.22, -0.04, 0]}>
          <torusGeometry args={[0.18, 0.03, 6, 18]} />
          <meshStandardMaterial color="#ffc067" emissive="#ff9b57" emissiveIntensity={0.6} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}

function CinderHoundMesh() {
  const maneRef = useRef<Group>(null);
  useFrame((state) => {
    if (!maneRef.current) return;
    maneRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 9) * 0.08;
  });

  return (
    <group>
      <mesh scale={[0.92, 0.78, 1.45]}>
        <sphereGeometry args={[0.48, 12, 10]} />
        <meshStandardMaterial color="#8c2f17" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.04, -0.62]} scale={[0.58, 0.48, 0.82]}>
        <sphereGeometry args={[0.28, 10, 8]} />
        <meshStandardMaterial color="#b84b24" roughness={0.78} />
      </mesh>
      <group ref={maneRef} position={[0, 0.14, -0.14]}>
        {[
          [0.22, 0.18, -0.2],
          [0, 0.22, -0.08],
          [-0.22, 0.18, -0.2],
          [0.12, 0.1, 0.18],
          [-0.12, 0.1, 0.18],
        ].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]}>
            <octahedronGeometry args={[0.14, 0]} />
            <meshStandardMaterial color="#ff9b57" emissive="#ff7b42" emissiveIntensity={0.65} roughness={0.4} />
          </mesh>
        ))}
      </group>
      {[[0.26, -0.36, -0.28], [-0.26, -0.36, -0.28], [0.26, -0.36, 0.28], [-0.26, -0.36, 0.28]].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]}>
          <cylinderGeometry args={[0.08, 0.1, 0.38, 7]} />
          <meshStandardMaterial color="#492014" roughness={0.92} />
        </mesh>
      ))}
    </group>
  );
}

function TunnelDroneMesh() {
  const rotorRef = useRef<Group>(null);
  useFrame((state) => {
    if (!rotorRef.current) return;
    rotorRef.current.rotation.y = state.clock.elapsedTime * 7;
  });

  return (
    <group>
      <mesh scale={[0.82, 0.4, 1.05]}>
        <boxGeometry args={[0.9, 0.6, 1.1]} />
        <meshStandardMaterial color="#6e8a98" metalness={0.5} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.18, -0.08]} scale={[0.54, 0.3, 0.42]}>
        <boxGeometry args={[0.7, 0.44, 0.7]} />
        <meshStandardMaterial color="#9cb9c8" metalness={0.55} roughness={0.4} />
      </mesh>
      <group ref={rotorRef}>
        <mesh position={[0.44, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 1.15, 8]} />
          <meshStandardMaterial color="#b7d4e0" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-0.44, 0.08, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 1.15, 8]} />
          <meshStandardMaterial color="#b7d4e0" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>
      <mesh position={[0, 0.05, -0.62]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color="#7dd3fc" emissive="#7dd3fc" emissiveIntensity={0.6} metalness={0.45} roughness={0.25} />
      </mesh>
    </group>
  );
}

function DragonMarkedMesh() {
  const crestRef = useRef<Group>(null);
  useFrame((state) => {
    if (!crestRef.current) return;
    crestRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2.4) * 0.08;
  });

  return (
    <group>
      <mesh scale={[1.0, 0.9, 1.5]}>
        <sphereGeometry args={[0.54, 14, 10]} />
        <meshStandardMaterial color="#5b3a20" roughness={0.82} />
      </mesh>
      <mesh position={[0, 0.1, -0.66]} scale={[0.76, 0.6, 0.92]}>
        <sphereGeometry args={[0.32, 12, 8]} />
        <meshStandardMaterial color="#7b522e" roughness={0.78} />
      </mesh>
      <group ref={crestRef}>
        {[
          [0.18, 0.42, -0.22],
          [0, 0.5, -0.1],
          [-0.18, 0.42, -0.22],
        ].map(([x, y, z], i) => (
          <mesh key={i} position={[x, y, z]} rotation={[0.15, 0, 0]}>
            <coneGeometry args={[0.1, 0.34, 5]} />
            <meshStandardMaterial color="#ffd27f" emissive="#ffb366" emissiveIntensity={0.55} roughness={0.45} />
          </mesh>
        ))}
      </group>
      <mesh position={[0.24, 0.08, -0.9]} rotation={[0.2, 0, -0.18]}>
        <coneGeometry args={[0.08, 0.26, 5]} />
        <meshStandardMaterial color="#f7e4bf" roughness={0.5} />
      </mesh>
      <mesh position={[-0.24, 0.08, -0.9]} rotation={[0.2, 0, 0.18]}>
        <coneGeometry args={[0.08, 0.26, 5]} />
        <meshStandardMaterial color="#f7e4bf" roughness={0.5} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.22, 0.1]}>
        <ringGeometry args={[0.34, 0.5, 18]} />
        <meshBasicMaterial color="#ffba73" transparent opacity={0.24} depthWrite={false} />
      </mesh>
    </group>
  );
}

const ENEMY_MESHES: Record<string, React.FC> = {
  rat: RatMesh,
  pigeon: PigeonMesh,
  dog: DogMesh,
  seagull: SeagullMesh,
  boar: BoarMesh,
  fox: FoxMesh,
  emberWisp: EmberWispMesh,
  cinderHound: CinderHoundMesh,
  tunnelDrone: TunnelDroneMesh,
  dragonMarked: DragonMarkedMesh,
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
    sizeMultiplier?: number;
    shield: number;
    traits: string[];
    hazardBoosted?: boolean;
  };
}) {
  const def = ENEMY_DEFS[enemy.defId];
  const hpPercent = enemy.hp / enemy.maxHp;
  const isFlying = def.traits?.includes('flying') || def.flying;
  const isShielded = enemy.shield > 0 || def.traits?.includes('shielded');
  const isPackLeader = enemy.traits.includes('packLeader');
  const isHazardBoosted = Boolean(enemy.hazardBoosted);
  const terrainY = getElevation(enemy.position.x, enemy.position.z);
  const y = terrainY + (isFlying ? 5.0 : 0.5);
  const groupRef = useRef<Group>(null);
  const prevPos = useRef({ x: enemy.position.x, z: enemy.position.z });
  const spawnTime = useRef<number | null>(null);
  const fadeMaterialsRef = useRef<FadeMaterial[] | null>(null);
  const healthBarRef = useRef<HTMLDivElement>(null);
  const healthWrapRef = useRef<HTMLDivElement>(null);
  const SPAWN_FADE_DURATION = 0.8;

  const MeshComponent = ENEMY_MESHES[enemy.defId];
  const currentWorld = useGameStore((s) => s.currentWorld);

  const groundGlow = currentWorld?.accent ?? '#ff6622';

  // Bigger enemies so they're visible at zoom level
  const scaleMap: Record<string, number> = {
    rat: 3.5,
    pigeon: 4.0,
    dog: 5.0,
    seagull: 4.3,
    boar: 5.6,
    fox: 4.6,
    emberWisp: 4.8,
    cinderHound: 5.3,
    tunnelDrone: 5.1,
    dragonMarked: 6.1,
  };
  const scale = (scaleMap[enemy.defId] ?? 3.8) * 0.4 * (enemy.sizeMultiplier ?? 1);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (spawnTime.current === null) {
      spawnTime.current = performance.now() / 1000;
    }
    if (fadeMaterialsRef.current === null) {
      fadeMaterialsRef.current = collectFadeMaterials(groupRef.current);
    }

    const lerp = 1 - Math.pow(0.001, delta);
    const targetX = enemy.position.x;
    const targetZ = enemy.position.z;
    groupRef.current.position.x += (targetX - groupRef.current.position.x) * lerp;
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * lerp;
    // Follow terrain elevation at current interpolated position
    const currentTerrainY = getElevation(groupRef.current.position.x, groupRef.current.position.z);
    const targetY = currentTerrainY + (isFlying ? 5.0 : 0.5);
    // Fade in without changing the enemy's size or position.
    const elapsed = performance.now() / 1000 - spawnTime.current;
    const spawnT = Math.min(1, elapsed / SPAWN_FADE_DURATION);
    applySpawnOpacity(fadeMaterialsRef.current, spawnT);
    groupRef.current.position.y = targetY;

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

    if (healthBarRef.current && healthWrapRef.current) {
      const currentHpPercent = Math.max(0, enemy.hp / enemy.maxHp);
      healthWrapRef.current.style.opacity = currentHpPercent < 0.999 ? '1' : '0';
      healthBarRef.current.style.width = `${currentHpPercent * 100}%`;
      healthBarRef.current.style.background =
        currentHpPercent > 0.5 ? '#4ade80' : currentHpPercent > 0.25 ? '#fbbf24' : '#ef4444';
    }
  });

  return (
    <group ref={groupRef} position={[enemy.position.x, y, enemy.position.z]}>
      <group scale={scale}>
        {MeshComponent ? (
          <MeshComponent />
        ) : (
          <mesh>
            <octahedronGeometry args={[0.42, 0]} />
            <meshStandardMaterial color={def.color} emissive={def.color} emissiveIntensity={0.35} roughness={0.45} />
          </mesh>
        )}
      </group>
      {isShielded && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -y + terrainY + 0.45, 0]}>
            <ringGeometry args={[scale * 1.7, scale * 2.1, 28]} />
            <meshBasicMaterial color="#7dd3fc" transparent opacity={Math.min(0.7, 0.22 + enemy.shield * 0.015)} depthWrite={false} />
          </mesh>
          <mesh position={[0, scale * 0.22, 0]}>
            <sphereGeometry args={[scale * 0.28, 12, 10]} />
            <meshBasicMaterial color="#bfe9ff" transparent opacity={0.16} depthWrite={false} />
          </mesh>
        </>
      )}
      {isPackLeader && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -y + terrainY + 0.18, 0]}>
          <ringGeometry args={[scale * 2.2, scale * 2.55, 36]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.28} depthWrite={false} />
        </mesh>
      )}
      {isHazardBoosted && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -y + terrainY + 0.2, 0]}>
            <ringGeometry args={[scale * 1.9, scale * 2.3, 34]} />
            <meshBasicMaterial color="#ff935c" transparent opacity={0.34} depthWrite={false} />
          </mesh>
          <mesh position={[0, scale * 0.25, 0]}>
            <sphereGeometry args={[scale * 0.2, 10, 8]} />
            <meshBasicMaterial color="#ffb374" transparent opacity={0.1} depthWrite={false} />
          </mesh>
        </>
      )}
      {/* Ground glow at terrain level */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -y + terrainY + 0.15, 0]}>
        <circleGeometry args={[scale * 3, 24]} />
        <meshBasicMaterial color={groundGlow} transparent opacity={0.15} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -y + terrainY + 0.16, 0]}>
        <circleGeometry args={[scale * 1.5, 20]} />
        <meshBasicMaterial color={groundGlow} transparent opacity={0.3} depthWrite={false} />
      </mesh>

      <Html position={[0, scale * 0.5 + 0.5, 0]} center style={{ pointerEvents: 'none' }}>
        <div
          ref={healthWrapRef}
          style={{
            width: 40,
            height: 5,
            background: 'rgba(0,0,0,0.7)',
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.15)',
            opacity: hpPercent < 1 ? 1 : 0,
          }}
        >
          <div
            ref={healthBarRef}
            style={{
              width: `${hpPercent * 100}%`,
              height: '100%',
              background: hpPercent > 0.5 ? '#4ade80' : hpPercent > 0.25 ? '#fbbf24' : '#ef4444',
              transition: 'width 0.15s ease',
              borderRadius: 2,
            }}
          />
        </div>
      </Html>
    </group>
  );
}

export function Enemies() {
  const { enemies } = useRuntimeSnapshot();
  return (
    <>
      {enemies.map((enemy) => (
        <EnemyUnit key={enemy.id} enemy={enemy} />
      ))}
    </>
  );
}
