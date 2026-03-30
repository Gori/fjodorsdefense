'use client';

import { useGameStore } from '@/lib/store';
import { TOWER_DEFS } from '@/lib/towerDefs';
import { getElevation } from '@/lib/elevation';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import type { Group } from 'three';

const TOWER_SCALE = 0.45;

// ── Scratching Post ──────────────────────────────────────────────────
// The dangling toy swings like a pendulum, and the string follows it.
function ScratchingPost({ position }: { position: [number, number, number] }) {
  const toyGroupRef = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (toyGroupRef.current) {
      // Pendulum swing from the platform attachment point
      toyGroupRef.current.rotation.z = Math.sin(t * 2.2) * 0.4;
      toyGroupRef.current.rotation.x = Math.sin(t * 1.7 + 0.5) * 0.2;
    }
  });

  return (
    <group position={position} scale={TOWER_SCALE}>
      {/* Wide base */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.0, 1.15, 0.2, 16]} />
        <meshStandardMaterial color="#5a4230" roughness={0.9} />
      </mesh>
      {/* Post body */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 1.5, 12]} />
        <meshStandardMaterial color="#c4a672" roughness={0.95} />
      </mesh>
      {/* Rope wrapping */}
      {[0.35, 0.55, 0.75, 0.95, 1.15, 1.35].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, y * 2]}>
          <torusGeometry args={[0.32, 0.04, 6, 16]} />
          <meshStandardMaterial color="#d4b896" roughness={1} />
        </mesh>
      ))}
      {/* Top platform */}
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.75, 0.65, 0.12, 16]} />
        <meshStandardMaterial color="#5a4230" roughness={0.85} />
      </mesh>
      {/* Cushion on top */}
      <mesh position={[0, 1.82, 0]}>
        <sphereGeometry args={[0.55, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c4443b" roughness={0.7} />
      </mesh>
      {/* Dangling toy + string as one group, pivoting from platform edge */}
      <group ref={toyGroupRef} position={[0.5, 1.7, 0]}>
        {/* String */}
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.6, 4]} />
          <meshStandardMaterial color="#aaa" />
        </mesh>
        {/* Toy ball at end of string */}
        <mesh position={[0, -0.65, 0]}>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshStandardMaterial color="#e8c840" emissive="#e8c840" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// ── Yarn Launcher ────────────────────────────────────────────────────
// The yarn ball tumbles and bounces as if being batted around by a cat.
function YarnLauncher({ position }: { position: [number, number, number] }) {
  const ballRef = useRef<Group>(null);
  const strandRef = useRef<Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ballRef.current) {
      // Tumble on multiple axes like a rolling ball
      ballRef.current.rotation.y += 0.03;
      ballRef.current.rotation.z += 0.015;
      // Bounce up and down
      ballRef.current.position.y = 1.0 + Math.abs(Math.sin(t * 2.0)) * 0.18;
      // Slight lateral wobble
      ballRef.current.position.x = Math.sin(t * 1.3) * 0.08;
      ballRef.current.position.z = Math.cos(t * 1.1) * 0.06;
    }
    if (strandRef.current) {
      // Yarn strand waves loosely
      strandRef.current.rotation.z = Math.sin(t * 2.5) * 0.3;
      strandRef.current.rotation.x = Math.cos(t * 1.8) * 0.2;
    }
  });

  return (
    <group position={position} scale={TOWER_SCALE}>
      {/* Base bowl */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.9, 1.0, 0.4, 12]} />
        <meshStandardMaterial color="#4a3a2e" roughness={0.85} />
      </mesh>
      {/* Inner rim */}
      <mesh position={[0, 0.35, 0]}>
        <torusGeometry args={[0.8, 0.08, 8, 16]} />
        <meshStandardMaterial color="#6a5a4e" roughness={0.8} />
      </mesh>
      {/* Yarn ball (tumbling + bouncing) */}
      <group ref={ballRef} position={[0, 1.0, 0]}>
        <mesh>
          <sphereGeometry args={[0.6, 16, 12]} />
          <meshStandardMaterial color="#e85d75" roughness={0.6} />
        </mesh>
        {/* Yarn wrap lines */}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[i * 0.8, i * 1.2, i * 0.5]}>
            <torusGeometry args={[0.55, 0.04, 6, 16]} />
            <meshStandardMaterial color="#ff8fa0" roughness={0.7} />
          </mesh>
        ))}
      </group>
      {/* Trailing yarn strand (waves) */}
      <mesh ref={strandRef} position={[0.4, 0.5, 0.3]} rotation={[0.3, 0.5, 0.2]}>
        <cylinderGeometry args={[0.02, 0.02, 1.0, 4]} />
        <meshStandardMaterial color="#e85d75" />
      </mesh>
    </group>
  );
}

// ── Laser Pointer ────────────────────────────────────────────────────
// The emitter head scans around like a surveillance turret, and the
// tech rings pulse their glow.
function LaserPointerTower({ position }: { position: [number, number, number] }) {
  const emitterRef = useRef<Group>(null);
  const ringsRef = useRef<(Mesh | null)[]>([]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (emitterRef.current) {
      // Turret scanning: smooth rotation with occasional pauses
      emitterRef.current.rotation.y += 0.04;
      // Nod up and down as if tracking a target
      emitterRef.current.rotation.x = Math.sin(t * 1.2) * 0.2;
      emitterRef.current.rotation.z = Math.sin(t * 0.8 + 1.0) * 0.1;
    }
    // Tech rings chase-light effect
    ringsRef.current.forEach((ring, i) => {
      if (ring) {
        const mat = ring.material;
        const phase = t * 3.0 + i * 2.1;
        if (mat instanceof MeshStandardMaterial) {
          mat.emissiveIntensity = 0.3 + Math.max(0, Math.sin(phase)) * 0.8;
        }
      }
    });
  });

  return (
    <group position={position} scale={TOWER_SCALE}>
      {/* Tech base */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.85, 0.95, 0.3, 8]} />
        <meshStandardMaterial color="#2a2a2a" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Base ring */}
      <mesh position={[0, 0.28, 0]}>
        <torusGeometry args={[0.8, 0.05, 6, 16]} />
        <meshStandardMaterial color="#444" roughness={0.3} metalness={0.7} />
      </mesh>
      {/* Pillar */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 1.3, 8]} />
        <meshStandardMaterial color="#333" roughness={0.3} metalness={0.5} />
      </mesh>
      {/* Tech rings on pillar (chase-light glow) */}
      {[0.5, 0.8, 1.1].map((y, i) => (
        <mesh
          key={y}
          ref={(el) => { ringsRef.current[i] = el; }}
          position={[0, y, 0]}
        >
          <torusGeometry args={[0.22, 0.03, 6, 12]} />
          <meshStandardMaterial
            color="#00aaff"
            emissive="#00aaff"
            emissiveIntensity={0.3}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      ))}
      {/* Emitter head (scanning turret) */}
      <group ref={emitterRef} position={[0, 1.7, 0]}>
        <mesh>
          <sphereGeometry args={[0.3, 12, 8]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.5}
          />
        </mesh>
        {/* Lens flare rings */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.35, 0.03, 6, 16]} />
          <meshStandardMaterial color="#cc0000" emissive="#ff0000" emissiveIntensity={0.4} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[0.35, 0.02, 6, 16]} />
          <meshStandardMaterial color="#cc0000" emissive="#ff0000" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}

// ── Catnip Bomb ──────────────────────────────────────────────────────
// The leaves sway in the wind, individual stems rock, and spore
// particles drift upward in a lazy spiral.
function CatnipBombTower({ position }: { position: [number, number, number] }) {
  const leavesRef = useRef<Group>(null);
  const stemsRef = useRef<(Mesh | null)[]>([]);
  const particlesRef = useRef<Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (leavesRef.current) {
      // Slow wind-blown rotation
      leavesRef.current.rotation.y += 0.008;
      // Sway like a plant in breeze
      leavesRef.current.rotation.z = Math.sin(t * 0.9) * 0.12;
      leavesRef.current.rotation.x = Math.sin(t * 0.7 + 0.8) * 0.08;
    }
    // Each stem sways independently
    stemsRef.current.forEach((stem, i) => {
      if (stem) {
        const phase = i * 1.3;
        stem.rotation.x = Math.sin(t * 1.1 + phase) * 0.1;
        stem.rotation.z = Math.cos(t * 0.9 + phase) * 0.08;
      }
    });
    if (particlesRef.current) {
      // Particles spiral upward and reset
      particlesRef.current.children.forEach((child, i) => {
        const speed = 0.3 + i * 0.1;
        const radius = 0.4 + i * 0.12;
        const cycle = (t * speed + i * 1.5) % 4.0; // 0-4 second cycle
        child.position.y = 1.0 + cycle * 0.4;
        child.position.x = Math.cos(t * 0.8 + i * 2.1) * radius;
        child.position.z = Math.sin(t * 0.8 + i * 2.1) * radius;
        // Fade out as they rise
        if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
          child.material.opacity = Math.max(0, 0.7 - cycle * 0.18);
        }
      });
    }
  });

  const stemAngles = [0, 1.2, 2.4, 3.6, 4.8];

  return (
    <group position={position} scale={TOWER_SCALE}>
      {/* Terracotta pot */}
      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[0.55, 0.75, 0.7, 12]} />
        <meshStandardMaterial color="#8b5a35" roughness={0.9} />
      </mesh>
      {/* Pot rim */}
      <mesh position={[0, 0.72, 0]}>
        <torusGeometry args={[0.58, 0.06, 6, 12]} />
        <meshStandardMaterial color="#9a6a45" roughness={0.85} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 12]} />
        <meshStandardMaterial color="#3a2a1a" roughness={1} />
      </mesh>
      {/* Stems (individually swaying) */}
      {stemAngles.map((angle, i) => (
        <mesh
          key={angle}
          ref={(el) => { stemsRef.current[i] = el; }}
          position={[Math.cos(angle) * 0.15, 1.1, Math.sin(angle) * 0.15]}
          rotation={[Math.cos(angle) * 0.15, 0, Math.sin(angle) * 0.15]}
        >
          <cylinderGeometry args={[0.03, 0.04, 0.9, 4]} />
          <meshStandardMaterial color="#2a6a20" roughness={0.9} />
        </mesh>
      ))}
      {/* Leaf clusters (wind sway) */}
      <group ref={leavesRef} position={[0, 1.4, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos(i * 1.05) * 0.35,
              Math.sin(i * 1.5) * 0.15,
              Math.sin(i * 1.05) * 0.35,
            ]}
            rotation={[i * 0.37, i * 1.05, 0]}
          >
            <sphereGeometry args={[0.22, 8, 6]} />
            <meshStandardMaterial
              color="#4ade80"
              emissive="#4ade80"
              emissiveIntensity={0.2}
              roughness={0.75}
            />
          </mesh>
        ))}
      </group>
      {/* Spore particles (spiral upward + fade) */}
      <group ref={particlesRef}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={`p${i}`} position={[0, 1.2, 0]}>
            <sphereGeometry args={[0.06, 6, 4]} />
            <meshStandardMaterial
              color="#4ade80"
              emissive="#4ade80"
              emissiveIntensity={1.0}
              transparent
              opacity={0.7}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const TOWER_COMPONENTS: Record<string, React.FC<{ position: [number, number, number] }>> = {
  scratchingPost: ScratchingPost,
  yarnLauncher: YarnLauncher,
  laserPointer: LaserPointerTower,
  catnipBomb: CatnipBombTower,
};

// ── Glowing base ring for visibility ─────────────────────────────────
function TowerBaseGlow({ x, z, y, color }: { x: number; z: number; y: number; color: string }) {
  const ref = useRef<Mesh>(null);

  useFrame((state) => {
    if (ref.current) {
      const mat = ref.current.material;
      if (mat instanceof MeshBasicMaterial) {
        mat.opacity = 0.25 + Math.sin(state.clock.elapsedTime * 2.5) * 0.1;
      }
    }
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[x, y + 0.04, z]}>
      <ringGeometry args={[0.35, 0.55, 24]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} />
    </mesh>
  );
}

function TowerMesh({ tower }: { tower: { id: string; defId: string; position: { x: number; z: number } } }) {
  const def = TOWER_DEFS[tower.defId];
  const Component = TOWER_COMPONENTS[tower.defId];
  const terrainY = getElevation(tower.position.x, tower.position.z);
  const pos: [number, number, number] = [tower.position.x, terrainY, tower.position.z];

  return (
    <group>
      {Component ? (
        <Component position={pos} />
      ) : (
        <mesh position={[pos[0], terrainY + 0.25, pos[2]]}>
          <cylinderGeometry args={[0.3, 0.4, 0.5, 8]} />
          <meshStandardMaterial color={def.color} />
        </mesh>
      )}
      {/* Glowing base ring for visibility */}
      <TowerBaseGlow x={tower.position.x} z={tower.position.z} y={terrainY} color={def.color} />
      {/* Range ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[tower.position.x, terrainY + 0.06, tower.position.z]}>
        <ringGeometry args={[def.range - 0.15, def.range, 48]} />
        <meshBasicMaterial color={def.color} transparent opacity={0.05} />
      </mesh>
    </group>
  );
}

export function Towers() {
  const towers = useGameStore((s) => s.towers);
  return (
    <>
      {towers.map((tower) => (
        <TowerMesh key={tower.id} tower={tower} />
      ))}
    </>
  );
}
