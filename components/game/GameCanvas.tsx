'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { Map } from './Map';
import { Towers } from './Tower';
import { Enemies } from './Enemy';
import { Projectiles } from './Projectile';
import { ParticleEffects } from './Particles';
import { useGameStore } from '@/lib/store';
import * as THREE from 'three';

function GameLoop() {
  const tick = useGameStore((s) => s.tick);
  useFrame((_, delta) => {
    tick(Math.min(delta, 0.05));
  });
  return null;
}

const CENTER = new THREE.Vector3(-10, 0, 10);

export function GameCanvas({ onRevealChange }: { onRevealChange?: (isRevealed: boolean) => void }) {
  return (
    <Canvas
      camera={{
        fov: 45,
        position: [40, 60, 60],
        near: 0.5,
        far: 500,
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.5,
      }}
      style={{ background: '#0c1828' }}
      onCreated={({ camera }) => {
        camera.lookAt(CENTER);
        camera.updateProjectionMatrix();
      }}
    >
      <MapControls
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 8}
        enableDamping
        dampingFactor={0.12}
        minDistance={10}
        maxDistance={200}
        target={CENTER}
        screenSpacePanning
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />

      <ambientLight intensity={0.7} color="#ccddef" />
      <directionalLight position={[30, 70, 20]} intensity={2.0} color="#ffe0b0" />
      <directionalLight position={[-25, 35, -25]} intensity={0.3} color="#88aadd" />
      <hemisphereLight args={['#99bbdd', '#554433', 0.35]} />

      <Map onRevealChange={onRevealChange} />
      <Towers />
      <Enemies />
      <ParticleEffects />
      <Projectiles />
      <GameLoop />
    </Canvas>
  );
}
