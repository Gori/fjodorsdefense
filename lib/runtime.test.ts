import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from './levels/loadCampaign';
import {
  applyProjectileDamage,
  canTowerTargetEnemy,
  getActiveHazards,
  getAuraSpeedMultiplier,
  getChainTargets,
  getDragonWakePriorityPath,
  getEnemyHazardModifiers,
  getPathPointsForRuntime,
  getRuntimeLaneStates,
} from './runtime';
import { resolveLevelForNode } from './levels/runtime';
import type { EnemyInstance, ProjectileInstance } from './types';
import type { SpawnState } from './types';

function getLevel(levelId: string) {
  const level = CAMPAIGN.levels.find((entry) => entry.id === levelId);
  if (!level) throw new Error(`Missing test level ${levelId}`);
  return level;
}

function createEnemy(overrides: Partial<EnemyInstance> = {}): EnemyInstance {
  return {
    id: overrides.id ?? 'enemy-1',
    defId: overrides.defId ?? 'rat',
    hp: overrides.hp ?? 100,
    maxHp: overrides.maxHp ?? 100,
    speed: overrides.speed ?? 4,
    reward: overrides.reward ?? 10,
    pathIndex: overrides.pathIndex ?? 0,
    waypointIndex: overrides.waypointIndex ?? 1,
    position: overrides.position ?? { x: 0, z: 0 },
    slowTimer: overrides.slowTimer ?? 0,
    slowFactor: overrides.slowFactor ?? 1,
    sizeMultiplier: overrides.sizeMultiplier,
    tags: overrides.tags ?? [],
    traits: overrides.traits ?? [],
    armor: overrides.armor ?? 0,
    shield: overrides.shield ?? 0,
    auraRadius: overrides.auraRadius,
    auraSpeedMultiplier: overrides.auraSpeedMultiplier,
    speedBonus: overrides.speedBonus,
    armorBonus: overrides.armorBonus,
    hazardBoosted: overrides.hazardBoosted,
  };
}

function createProjectile(overrides: Partial<ProjectileInstance> = {}): ProjectileInstance {
  return {
    id: overrides.id ?? 'projectile-1',
    towerId: overrides.towerId ?? 'tower-1',
    towerDefId: overrides.towerDefId ?? 'scratchingPost',
    targetEnemyId: overrides.targetEnemyId ?? 'enemy-1',
    position: overrides.position ?? { x: 0, z: 0 },
    damage: overrides.damage ?? 10,
    speed: overrides.speed ?? 10,
    special: overrides.special,
  };
}

describe('runtime combat helpers', () => {
  it('targeting ignores flying enemies for ground-only towers', () => {
    expect(canTowerTargetEnemy({
      id: 'ground-only',
      name: 'Ground Only',
      cost: 1,
      range: 5,
      damage: 1,
      fireRate: 1,
      projectileSpeed: 1,
      color: '#fff',
      canTargetGround: true,
      canTargetFlying: false,
    }, createEnemy({ traits: ['flying'] }))).toBe(false);
  });

  it('anti-air tower can target only flying enemies when configured that way', () => {
    const tower = {
      id: 'anti-air',
      name: 'Anti Air',
      cost: 1,
      range: 5,
      damage: 1,
      fireRate: 1,
      projectileSpeed: 1,
      color: '#fff',
      canTargetGround: false,
      canTargetFlying: true,
    };

    expect(canTowerTargetEnemy(tower, createEnemy({ traits: ['flying'] }))).toBe(true);
    expect(canTowerTargetEnemy(tower, createEnemy({ traits: [] }))).toBe(false);
  });

  it('armor pierce reduces effective armor before flat mitigation and keeps minimum damage at one', () => {
    const boar = createEnemy({ armor: 4, hp: 40, maxHp: 40, defId: 'boar', traits: ['armored'] });
    applyProjectileDamage(createProjectile({ towerDefId: 'tunaMortar', damage: 22 }), boar);
    expect(boar.hp).toBe(18);

    const almostImmune = createEnemy({ armor: 50, hp: 10, maxHp: 10 });
    applyProjectileDamage(createProjectile({ damage: 2 }), almostImmune);
    expect(almostImmune.hp).toBe(9);
  });

  it('shield absorbs damage before hp and shield bonuses apply before mitigation', () => {
    const seagull = createEnemy({ defId: 'seagull', hp: 55, maxHp: 55, shield: 18, traits: ['flying', 'shielded'] });
    applyProjectileDamage(createProjectile({ towerDefId: 'birdWhistle', damage: 14 }), seagull);
    expect(seagull.shield).toBe(0);
    expect(seagull.hp).toBe(31);
  });

  it('chain damage chooses nearest untargeted enemies within range', () => {
    const target = createEnemy({ id: 'target', position: { x: 0, z: 0 } });
    const near = createEnemy({ id: 'near', position: { x: 2, z: 0 } });
    const mid = createEnemy({ id: 'mid', position: { x: 5.5, z: 0 } });
    const far = createEnemy({ id: 'far', position: { x: 12, z: 0 } });
    const flying = createEnemy({ id: 'flying', position: { x: 1, z: 1 }, traits: ['flying'] });

    const targets = getChainTargets(
      createProjectile({ towerDefId: 'magnetCollar', damage: 10 }),
      target,
      [target, far, near, flying, mid],
    );

    expect(targets.map((enemy) => enemy.id)).toEqual(['flying', 'near', 'mid']);
  });

  it('pack leader aura increases nearby ally movement speed and strongest aura wins', () => {
    const ally = createEnemy({ id: 'ally', position: { x: 0, z: 0 } });
    const foxA = createEnemy({
      id: 'fox-a',
      defId: 'fox',
      traits: ['packLeader'],
      position: { x: 2, z: 0 },
      auraRadius: 6,
      auraSpeedMultiplier: 1.2,
    });
    const foxB = createEnemy({
      id: 'fox-b',
      defId: 'fox',
      traits: ['packLeader'],
      position: { x: 3, z: 0 },
      auraRadius: 6,
      auraSpeedMultiplier: 1.35,
    });

    expect(getAuraSpeedMultiplier(ally, [ally, foxA])).toBe(1.2);
    expect(getAuraSpeedMultiplier(ally, [ally, foxA, foxB])).toBe(1.35);
  });

  it('dragon wake rotates the priority path across configured lanes', () => {
    const level = getLevel('below-the-lamps');

    expect(getDragonWakePriorityPath(level, 0)).toBe(0);
    expect(getDragonWakePriorityPath(level, 9.99)).toBe(0);
    expect(getDragonWakePriorityPath(level, 10)).toBe(1);
    expect(getDragonWakePriorityPath(level, 20)).toBe(2);
    expect(getDragonWakePriorityPath(level, 30)).toBe(0);
  });

  it('active hazards only light up when their timing window is open', () => {
    const level = getLevel('tunnel-reply');

    const inactive = getActiveHazards(level, 9);
    const active = getActiveHazards(level, 22);

    expect(inactive.find((hazard) => hazard.id === 'tunnel-resonance')).toMatchObject({
      active: false,
      affectedPathIndexes: [0],
    });
    expect(active.find((hazard) => hazard.id === 'tunnel-resonance')).toMatchObject({
      active: true,
      affectedPathIndexes: [0],
    });
    expect(active.find((hazard) => hazard.id === 'tunnel-alert')).toMatchObject({
      active: true,
      affectedPathIndexes: [1],
    });
  });

  it('lane states combine authored threat, alive enemies, pending pressure, and dragon wake priority', () => {
    const level = getLevel('below-the-lamps');
    const wave = level.waves[0];
    const spawnStates: SpawnState[] = wave.groups.map((_, index) => ({
      groupIndex: index,
      spawned: 0,
      timer: 0,
    }));
    const enemies = [
      createEnemy({ id: 'main-a', pathIndex: 0, hp: 40 }),
      createEnemy({ id: 'main-b', pathIndex: 0, hp: 40, position: { x: 1, z: 0 } }),
      createEnemy({ id: 'north-a', pathIndex: 1, hp: 40 }),
      createEnemy({ id: 'south-a', pathIndex: 2, hp: 40 }),
    ];

    const laneStates = getRuntimeLaneStates(level, wave, spawnStates, enemies, 10);

    expect(laneStates.find((lane) => lane.id === 'north')).toMatchObject({
      aliveCount: 1,
      pendingCount: 7,
      isPriority: true,
      threat: 16,
    });
    expect(laneStates.find((lane) => lane.id === 'main')).toMatchObject({
      aliveCount: 2,
      pendingCount: 4,
      isPriority: false,
      threat: 10,
    });
    expect(laneStates.find((lane) => lane.id === 'south')).toMatchObject({
      aliveCount: 1,
      pendingCount: 4,
      isPriority: false,
      threat: 9,
    });
  });

  it('tunnel breach rewrites the affected lane path only while the breach window is active', () => {
    const level = getLevel('tunnel-reply');
    const inactive = getPathPointsForRuntime(1, level, 9);
    const active = getPathPointsForRuntime(1, level, 22);
    const inactiveMid = inactive[Math.floor(inactive.length * 0.6)]!;
    const activeMid = active[Math.floor(active.length * 0.6)]!;
    const untouchedMainInactive = getPathPointsForRuntime(0, level, 9);
    const untouchedMainActive = getPathPointsForRuntime(0, level, 22);

    expect(activeMid.x).toBeGreaterThan(inactiveMid.x + 2);
    expect(activeMid.z).toBeGreaterThan(inactiveMid.z + 1);
    expect(untouchedMainActive[Math.floor(untouchedMainActive.length * 0.6)]).toEqual(
      untouchedMainInactive[Math.floor(untouchedMainInactive.length * 0.6)],
    );
  });

  it('ember surge and pursuit posture strengthen corrupted enemies during active pressure windows', () => {
    const level = getLevel('three-ways-to-burn');
    const pursuitLevel = resolveLevelForNode(CAMPAIGN, 'node-13-pursuit').currentLevel;
    const corrupted = createEnemy({ defId: 'dragonMarked', traits: ['armored', 'corrupted'], pathIndex: 0, armor: 5 });
    const neutral = createEnemy({ defId: 'boar', traits: ['armored'], pathIndex: 0, armor: 4 });

    expect(getEnemyHazardModifiers(corrupted, level, 16)).toMatchObject({
      boosted: true,
      armorBonus: 1,
    });
    expect(getEnemyHazardModifiers(corrupted, level, 16).speedMultiplier).toBeGreaterThan(1.13);
    expect(getEnemyHazardModifiers(neutral, level, 16)).toMatchObject({
      boosted: false,
      armorBonus: 0,
      speedMultiplier: 1,
    });
    expect(getEnemyHazardModifiers(corrupted, pursuitLevel, 10)).toMatchObject({
      boosted: true,
      armorBonus: 1,
    });
  });
});
