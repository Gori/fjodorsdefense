'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import { Map } from './Map';
import { Towers } from './Tower';
import { Enemies } from './Enemy';
import { Projectiles } from './Projectile';
import { ParticleEffects } from './Particles';
import { useGameStore } from '@/lib/store';
import { getPathPointsForRuntime, useRuntimeSnapshot } from '@/lib/runtime';
import { getElevation } from '@/lib/elevation';
import * as THREE from 'three';

function GameLoop() {
  const tick = useGameStore((s) => s.tick);
  useFrame((_, delta) => {
    tick(Math.min(delta, 0.05));
  });
  return null;
}

const CENTER = new THREE.Vector3(-10, 0, 10);
const TACTICAL_CAMERA = new THREE.Vector3(40, 60, 60);
const PLANNER_CAMERA = new THREE.Vector3(-10, 118, 10.01);

interface MapControlsRef {
  enabled: boolean;
  enableRotate: boolean;
  minPolarAngle: number;
  maxPolarAngle: number;
  maxDistance: number;
  target: THREE.Vector3;
  update: () => void;
}

function CameraRig() {
  const cameraMode = useGameStore((s) => s.cameraMode);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const { enemies, gameTime } = useRuntimeSnapshot();
  const controlsRef = useRef<MapControlsRef | null>(null);
  const followPosition = useMemo(() => new THREE.Vector3(), []);
  const followTarget = useMemo(() => new THREE.Vector3(), []);
  const desiredPosition = useMemo(
    () => (cameraMode === 'planner' ? PLANNER_CAMERA : TACTICAL_CAMERA),
    [cameraMode],
  );

  useEffect(() => {
    if (!controlsRef.current) return;
    controlsRef.current.enabled = cameraMode !== 'firstPerson';
    controlsRef.current.enableRotate = cameraMode !== 'planner' && cameraMode !== 'firstPerson';
    if (cameraMode === 'planner') {
      controlsRef.current.minPolarAngle = 0.01;
      controlsRef.current.maxPolarAngle = 0.12;
    } else {
      controlsRef.current.minPolarAngle = Math.PI / 8;
      controlsRef.current.maxPolarAngle = Math.PI / 2.2;
    }
    controlsRef.current.target.copy(CENTER);
    controlsRef.current.update();
  }, [cameraMode]);

  useFrame(({ camera }) => {
    if (cameraMode === 'firstPerson' && enemies.length > 0) {
      const enemy = enemies[0];
      const pathPoints = getPathPointsForRuntime(enemy.pathIndex, currentLevel, gameTime);
      const nextWaypoint = pathPoints[Math.min(enemy.waypointIndex, pathPoints.length - 1)] ?? enemy.position;
      const direction = new THREE.Vector3(
        nextWaypoint.x - enemy.position.x,
        0,
        nextWaypoint.z - enemy.position.z,
      );

      if (direction.lengthSq() < 0.001) {
        direction.set(0, 0, 1);
      } else {
        direction.normalize();
      }

      const enemyY = getElevation(enemy.position.x, enemy.position.z) + 0.95;
      followPosition.set(
        enemy.position.x - direction.x * 3.4,
        enemyY + 2.2,
        enemy.position.z - direction.z * 3.4,
      );
      followTarget.set(
        enemy.position.x + direction.x * 6,
        enemyY + 1.1,
        enemy.position.z + direction.z * 6,
      );

      camera.position.lerp(followPosition, 0.14);
      camera.lookAt(followTarget);
      camera.updateProjectionMatrix();
      return;
    }

    camera.position.lerp(desiredPosition, 0.08);
    camera.lookAt(CENTER);
    camera.updateProjectionMatrix();
    controlsRef.current?.target.lerp(CENTER, 0.2);
    controlsRef.current?.update();
  });

  return (
    <MapControls
      ref={(value) => {
        controlsRef.current = value as unknown as MapControlsRef | null;
      }}
      enableRotate={cameraMode !== 'planner' && cameraMode !== 'firstPerson'}
      maxPolarAngle={Math.PI / 2.2}
      minPolarAngle={Math.PI / 8}
      enableDamping
      dampingFactor={0.12}
      minDistance={10}
      maxDistance={cameraMode === 'planner' ? 150 : 200}
      target={CENTER}
      screenSpacePanning
      mouseButtons={{
        LEFT: THREE.MOUSE.PAN,
        MIDDLE: THREE.MOUSE.DOLLY,
        RIGHT: THREE.MOUSE.ROTATE,
      }}
    />
  );
}

export function GameCanvas({ onRevealChange }: { onRevealChange?: (isRevealed: boolean) => void }) {
  const currentWorld = useGameStore((s) => s.currentWorld);

  return (
    <Canvas
      camera={{
        fov: 45,
        position: [TACTICAL_CAMERA.x, TACTICAL_CAMERA.y, TACTICAL_CAMERA.z],
        near: 0.5,
        far: 500,
      }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.5,
      }}
      style={{ background: currentWorld?.mapTint ?? '#0c1828' }}
      onCreated={({ camera }) => {
        camera.lookAt(CENTER);
        camera.updateProjectionMatrix();
      }}
    >
      <CameraRig />

      <ambientLight intensity={0.7} color="#ccddef" />
      <directionalLight position={[30, 70, 20]} intensity={2.0} color={currentWorld?.accent ?? '#ffe0b0'} />
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
