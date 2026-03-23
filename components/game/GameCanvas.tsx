'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { Map } from './Map';
import { PathRenderer } from './PathRenderer';
import { Towers } from './Tower';
import { Enemies } from './Enemy';
import { Projectiles } from './Projectile';
import { TreeMeshes } from './Trees';
// Structures removed — no 3D models available for churches/bridges/etc.
import { useGameStore } from '@/lib/store';
import * as THREE from 'three';

function GameLoop() {
  const tick = useGameStore((s) => s.tick);
  useFrame((_, delta) => {
    tick(Math.min(delta, 0.05));
  });
  return null;
}

// Center of Skanstull-Hornstull corridor
// Centered to show full Södermalm including Hornstull in the west
const CENTER = new THREE.Vector3(-10, 0, 10);
const CAM_OFFSET = 50;

export function GameCanvas() {
  return (
    <Canvas
      orthographic
      camera={{
        position: [CENTER.x + CAM_OFFSET, 80, CENTER.z + CAM_OFFSET],
        zoom: 5,
        near: 0.1,
        far: 500,
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.5,
      }}
      style={{ background: '#0c1828' }}
      onCreated={({ camera, scene }) => {
        camera.lookAt(CENTER);
        camera.updateProjectionMatrix();
        // No fog — let buildings be clearly visible
      }}
    >
      {/* Camera controls: scroll zoom, middle/right-drag pan, left-click free for towers */}
      <MapControls
        enableRotate={true}
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 6}
        enableDamping
        dampingFactor={0.1}
        minZoom={6}
        maxZoom={40}
        target={CENTER}
        screenSpacePanning
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
      />

      {/* Lighting */}
      <ambientLight intensity={0.7} color="#ccddef" />
      <directionalLight position={[30, 70, 20]} intensity={2.0} color="#ffe0b0" />
      <directionalLight position={[-25, 35, -25]} intensity={0.3} color="#88aadd" />
      <hemisphereLight args={['#99bbdd', '#554433', 0.35]} />

      <Map />
      <TreeMeshes />
      <PathRenderer />
      <Towers />
      <Enemies />
      <Projectiles />
      <GameLoop />
    </Canvas>
  );
}
