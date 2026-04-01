import { useSyncExternalStore } from 'react';
import { ALL_PATHS } from './pathData';
import { createEnemyFromGroup } from './gameplay/spawning';
import { distance } from './mapUtils';
import { resolveTowerDef } from './doctrines';
import type {
  EnemyInstance,
  ProjectileInstance,
  SpawnState,
  TowerDef,
  TowerInstance,
  Vec2,
} from './types';
import type { GlobalAlertHazardConfig, ResolvedLevel, ResolvedWave, RouteShiftConfig } from './levels/types';

const PROJECTILE_HIT_RADIUS = 0.6;
const RUNTIME_PROFILE_SAMPLE = 180;
const MIN_DAMAGE = 1;

export type RuntimeEvent =
  | { type: 'enemy_spawned'; enemyId: string; position: Vec2 }
  | { type: 'enemy_killed'; enemyId: string; position: Vec2 }
  | { type: 'enemy_escaped'; enemyId: string; position: Vec2 }
  | { type: 'tower_fired'; towerDefId: string; projectileId: string; position: Vec2 };

export interface RuntimeSnapshot {
  enemies: EnemyInstance[];
  projectiles: ProjectileInstance[];
  towers: TowerInstance[];
  enemyCount: number;
  totalSpawned: number;
  totalWaveEnemies: number;
  gameTime: number;
  activeHazards: RuntimeHazardState[];
  laneStates: RuntimeLaneState[];
  priorityPathIndex: number | null;
  structureVersion: number;
}

export interface RuntimeHazardState {
  id: string;
  label: string;
  type: ResolvedLevel['hazards'][number]['type'];
  active: boolean;
  affectedPathIndexes: number[];
}

export interface RuntimeLaneState {
  id: string;
  label: string;
  role: ResolvedLevel['lanes'][number]['role'];
  color: string;
  pathIndex: number;
  threat: number;
  aliveCount: number;
  pendingCount: number;
  isPriority: boolean;
}

export interface TickResult {
  moneyDelta: number;
  livesDelta: number;
  waveComplete: boolean;
}

type SnapshotListener = () => void;
type EventListener = (event: RuntimeEvent) => void;

function serializeActiveHazards(activeHazards: RuntimeHazardState[]): string {
  return activeHazards
    .map((hazard) => `${hazard.id}:${hazard.active ? 1 : 0}:${hazard.affectedPathIndexes.join(',')}`)
    .join('|');
}

function createSpawnStates(wave: ResolvedWave): SpawnState[] {
  return wave.groups.map((_, index) => ({
    groupIndex: index,
    spawned: 0,
    timer: 0,
  }));
}

function resetTowersForWave(towers: TowerInstance[]): TowerInstance[] {
  return towers.map((tower) => ({ ...tower, lastFireTime: -100, targetEnemyId: null }));
}

function getTowerEffects(def: TowerDef) {
  return new Set(def.effects ?? []);
}

function hasTrait(enemy: EnemyInstance, trait: EnemyInstance['traits'][number]) {
  return enemy.traits.includes(trait);
}

function hazardPathIndexes(level: ResolvedLevel | null, pathIds: string[] | undefined): number[] {
  if (!level || !pathIds?.length) return [];
  return level.lanes
    .filter((lane) => pathIds.includes(lane.pathId))
    .map((lane) => lane.pathIndex);
}

function isTimedWindowActive(gameTime: number, interval?: number, duration?: number): boolean {
  if (!interval || duration === undefined) return true;
  return gameTime % interval <= duration;
}

function getActiveRouteShifts(level: ResolvedLevel | null, pathIndex: number, gameTime: number): RouteShiftConfig[] {
  if (!level) return [];
  const activeShifts: RouteShiftConfig[] = [];

  for (const hazard of level.hazards) {
    if (!('routeShift' in hazard) || !hazard.routeShift) continue;
    if (!isTimedWindowActive(gameTime, hazard.interval, hazard.duration)) continue;
    const affectedPathIndexes = hazardPathIndexes(level, hazard.routeShift.pathIds);
    if (!affectedPathIndexes.includes(pathIndex)) continue;
    activeShifts.push(hazard.routeShift);
  }

  return activeShifts;
}

const runtimePathCache = new Map<string, Vec2[]>();

function getRuntimePathCacheKey(level: ResolvedLevel, pathIndex: number, shifts: RouteShiftConfig[]): string {
  const shiftSignature = shifts
    .map((shift) =>
      [
        shift.pathIds.join(','),
        shift.offsetX,
        shift.offsetZ,
        shift.startRatio ?? '',
        shift.endRatio ?? '',
      ].join(':'),
    )
    .join('|');
  return `${level.id}:${pathIndex}:${shiftSignature}`;
}

export function getPathPointsForRuntime(
  pathIndex: number,
  level: ResolvedLevel | null,
  gameTime: number,
): Vec2[] {
  const basePoints = ALL_PATHS[pathIndex] ?? [];
  if (!level || basePoints.length === 0) return basePoints;

  const activeShifts = getActiveRouteShifts(level, pathIndex, gameTime);
  if (activeShifts.length === 0) return basePoints;

  const cacheKey = getRuntimePathCacheKey(level, pathIndex, activeShifts);
  const cached = runtimePathCache.get(cacheKey);
  if (cached) return cached;

  const shiftedPoints = basePoints.map((point, index) => {
    const ratio = basePoints.length > 1 ? index / (basePoints.length - 1) : 0;
    let offsetX = 0;
    let offsetZ = 0;

    for (const shift of activeShifts) {
      const startRatio = shift.startRatio ?? 0.28;
      const endRatio = shift.endRatio ?? 0.82;
      if (ratio <= startRatio || ratio >= endRatio) continue;
      const local = (ratio - startRatio) / Math.max(0.001, endRatio - startRatio);
      const weight = Math.sin(local * Math.PI);
      offsetX += shift.offsetX * weight;
      offsetZ += shift.offsetZ * weight;
    }

    return {
      x: point.x + offsetX,
      z: point.z + offsetZ,
    };
  });

  runtimePathCache.set(cacheKey, shiftedPoints);
  return shiftedPoints;
}

export function getDragonWakePriorityPath(level: ResolvedLevel | null, gameTime: number): number | null {
  if (!level) return null;
  const dragonWake = level.hazards.find(
    (hazard): hazard is GlobalAlertHazardConfig => hazard.type === 'dragonWake',
  );
  if (!dragonWake) return null;
  const rotatingPathIndexes =
    hazardPathIndexes(level, dragonWake.pathIds).length > 0
      ? hazardPathIndexes(level, dragonWake.pathIds)
      : level.lanes.map((lane) => lane.pathIndex);
  if (rotatingPathIndexes.length === 0) return null;
  const interval = dragonWake.interval ?? 10;
  return rotatingPathIndexes[Math.floor(gameTime / interval) % rotatingPathIndexes.length] ?? null;
}

export function getActiveHazards(level: ResolvedLevel | null, gameTime: number): RuntimeHazardState[] {
  if (!level) return [];
  const priorityPathIndex = getDragonWakePriorityPath(level, gameTime);

  return level.hazards.map((hazard) => {
    let active = false;
    let affectedPathIndexes: number[] = [];

    if (hazard.type === 'laneSpeedPulse') {
      active = isTimedWindowActive(gameTime, hazard.interval, hazard.duration);
      affectedPathIndexes = hazardPathIndexes(level, hazard.pathIds);
    } else if (hazard.type === 'towerPulse') {
      active = isTimedWindowActive(gameTime, hazard.interval, hazard.duration);
      affectedPathIndexes = hazardPathIndexes(level, hazard.pathIds);
    } else if (hazard.type === 'placementLock') {
      active = isTimedWindowActive(gameTime, hazard.interval, hazard.duration);
    } else if (hazard.type === 'globalAlert') {
      active = isTimedWindowActive(gameTime, hazard.interval, hazard.duration);
      affectedPathIndexes = [
        ...hazardPathIndexes(level, hazard.pathIds),
        ...hazardPathIndexes(level, hazard.routeShift?.pathIds),
      ];
    } else if (hazard.type === 'dragonWake') {
      active = priorityPathIndex !== null;
      affectedPathIndexes = priorityPathIndex !== null ? [priorityPathIndex] : [];
    } else {
      active = true;
    }

    return {
      id: hazard.id,
      label: hazard.label,
      type: hazard.type,
      active,
      affectedPathIndexes,
    };
  });
}

export function getRuntimeLaneStates(
  level: ResolvedLevel | null,
  wave: ResolvedWave | null,
  spawnStates: SpawnState[],
  enemies: EnemyInstance[],
  gameTime: number,
): RuntimeLaneState[] {
  if (!level || !wave) return [];
  const priorityPathIndex = getDragonWakePriorityPath(level, gameTime);
  return level.lanes.map((lane) => {
    const aliveCount = enemies.filter((enemy) => enemy.pathIndex === lane.pathIndex && enemy.hp > 0).length;
    const pendingCount = wave.groups.reduce((sum, group, index) => {
      if (group.pathIndex !== lane.pathIndex) return sum;
      const spawned = spawnStates[index]?.spawned ?? 0;
      return sum + Math.max(0, group.count - spawned);
    }, 0);

    return {
      id: lane.id,
      label: lane.label,
      role: lane.role,
      color: lane.color,
      pathIndex: lane.pathIndex,
      threat: lane.threat + aliveCount * 2 + pendingCount + (priorityPathIndex === lane.pathIndex ? 4 : 0),
      aliveCount,
      pendingCount,
      isPriority: priorityPathIndex === lane.pathIndex,
    };
  });
}

function getTowerDefForRuntime(
  tower: TowerInstance,
  level: ResolvedLevel | null,
  gameTime: number,
): TowerDef {
  return resolveTowerDef(tower.defId, tower.doctrineId, {
    rangeBonus: tower.rangeBonus,
    fireRateBonus: getTowerFireRateHazardBonus(tower, level, gameTime),
  });
}

export function getAuraSpeedMultiplier(source: EnemyInstance, enemies: EnemyInstance[]): number {
  let bestMultiplier = 1;
  for (const enemy of enemies) {
    if (enemy.hp <= 0 || !hasTrait(enemy, 'packLeader')) continue;
    if (!enemy.auraRadius || !enemy.auraSpeedMultiplier) continue;
    if (distance(source.position, enemy.position) > enemy.auraRadius) continue;
    bestMultiplier = Math.max(bestMultiplier, enemy.auraSpeedMultiplier);
  }
  return bestMultiplier;
}

export function getEnemyHazardModifiers(
  enemy: EnemyInstance,
  level: ResolvedLevel | null,
  gameTime: number,
): { speedMultiplier: number; armorBonus: number; boosted: boolean } {
  if (!level) {
    return { speedMultiplier: 1, armorBonus: 0, boosted: false };
  }

  const isCorrupted = hasTrait(enemy, 'corrupted');
  let speedMultiplier = 1;
  let armorBonus = 0;
  let boosted = false;

  if (isCorrupted) {
    for (const hazard of level.hazards) {
      if (hazard.type !== 'laneSpeedPulse') continue;
      if (!isTimedWindowActive(gameTime, hazard.interval, hazard.duration)) continue;
      if (hazard.label !== 'Ember Surge') continue;
      const affectedPathIndexes = hazardPathIndexes(level, hazard.pathIds);
      if (!affectedPathIndexes.includes(enemy.pathIndex)) continue;
      speedMultiplier *= 1.14;
      armorBonus += 1;
      boosted = true;
    }

    if (level.worldModifierIds.includes('pursuit-line')) {
      speedMultiplier *= 1.06;
      armorBonus += 1;
      boosted = true;
    }

    if (level.worldModifierIds.includes('containment-line')) {
      speedMultiplier *= 0.96;
    }
  }

  const priorityPathIndex = getDragonWakePriorityPath(level, gameTime);
  if (priorityPathIndex !== null && enemy.pathIndex === priorityPathIndex && isCorrupted) {
    speedMultiplier *= 1.08;
    boosted = true;
  }

  return { speedMultiplier, armorBonus, boosted };
}

function applyEnemyHazardState(enemy: EnemyInstance, level: ResolvedLevel | null, gameTime: number) {
  const modifiers = getEnemyHazardModifiers(enemy, level, gameTime);
  enemy.speedBonus = modifiers.speedMultiplier;
  enemy.armorBonus = modifiers.armorBonus;
  enemy.hazardBoosted = modifiers.boosted;
}

function getSlowFactor(enemy: EnemyInstance): number {
  return enemy.slowTimer > 0 ? (enemy.slowFactor ?? 1) : 1;
}

function getLaneSpeedMultiplier(enemy: EnemyInstance, gameTime: number, level: ResolvedLevel | null): number {
  if (!level) return 1;
  let best = 1;
  const priorityPathIndex = getDragonWakePriorityPath(level, gameTime);
  for (const hazard of level.hazards) {
    if (hazard.type !== 'laneSpeedPulse') continue;
    const pathMatches = hazard.pathIds.some((pathId) => {
      const lane = level.lanes.find((entry) => entry.pathId === pathId);
      return lane?.pathIndex === enemy.pathIndex;
    });
    if (!pathMatches) continue;
    const progressInCycle = gameTime % hazard.interval;
    if (progressInCycle > hazard.duration) continue;
    best = Math.max(best, hazard.speedMultiplier);
  }
  if (priorityPathIndex !== null && enemy.pathIndex === priorityPathIndex) {
    best = Math.max(best, 1.16);
  }
  return best;
}

function getTowerFireRateHazardBonus(
  tower: TowerInstance,
  level: ResolvedLevel | null,
  gameTime: number,
): number {
  if (!level) return tower.fireRateBonus ?? 0;
  let bonus = tower.fireRateBonus ?? 0;
  for (const hazard of level.hazards) {
    if (hazard.type !== 'towerPulse') continue;
    if (!isTimedWindowActive(gameTime, hazard.interval, hazard.duration)) continue;
    const affectedPathIndexes = hazardPathIndexes(level, hazard.pathIds);
    const nearAffectedPath = affectedPathIndexes.some((pathIndex) =>
      getPathPointsForRuntime(pathIndex, level, gameTime).some((point) => distance(point, tower.position) <= 4),
    );
    if (!nearAffectedPath) continue;
    bonus += hazard.fireRateBonus;
  }
  return bonus;
}

function moveEnemy(
  enemy: EnemyInstance,
  enemies: EnemyInstance[],
  delta: number,
  gameTime: number,
  level: ResolvedLevel | null,
): boolean {
  const pathPoints = getPathPointsForRuntime(enemy.pathIndex, level, gameTime);
  if (!pathPoints || pathPoints.length === 0) {
    throw new Error(`Missing path at index ${enemy.pathIndex}`);
  }

  if (enemy.waypointIndex >= pathPoints.length) return true;

  const speed =
    enemy.speed *
    (enemy.speedBonus ?? 1) *
    getAuraSpeedMultiplier(enemy, enemies) *
    getSlowFactor(enemy) *
    getLaneSpeedMultiplier(enemy, gameTime, level);
  const target = pathPoints[enemy.waypointIndex];
  const dx = target.x - enemy.position.x;
  const dz = target.z - enemy.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const step = speed * delta;

  if (step >= dist) {
    enemy.position.x = target.x;
    enemy.position.z = target.z;
    enemy.waypointIndex++;
    if (enemy.waypointIndex >= pathPoints.length) return true;
  } else if (dist > 0) {
    enemy.position.x += (dx / dist) * step;
    enemy.position.z += (dz / dist) * step;
  }

  if (enemy.slowTimer > 0) {
    enemy.slowTimer = Math.max(0, enemy.slowTimer - delta);
    if (enemy.slowTimer === 0) {
      enemy.slowFactor = 1;
    }
  }

  return false;
}

export function canTowerTargetEnemy(def: TowerDef, enemy: EnemyInstance): boolean {
  const isFlying = hasTrait(enemy, 'flying');
  const canTargetGround = def.canTargetGround ?? true;
  const canTargetFlying = def.canTargetFlying ?? true;

  if (isFlying) return canTargetFlying;
  return canTargetGround;
}

function findTarget(
  tower: TowerInstance,
  enemies: EnemyInstance[],
  level: ResolvedLevel | null,
  gameTime: number,
): EnemyInstance | null {
  const def = getTowerDefForRuntime(tower, level, gameTime);
  let best: EnemyInstance | null = null;
  let bestProgress = -1;

  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    if (!canTowerTargetEnemy(def, enemy)) continue;
    const dist = distance(tower.position, enemy.position);
    if (dist > def.range) continue;

    const progress = enemy.waypointIndex * 10000 - dist;
    if (progress > bestProgress) {
      bestProgress = progress;
      best = enemy;
    }
  }

  return best;
}

function moveProjectile(proj: ProjectileInstance, target: EnemyInstance | undefined, delta: number): 'hit' | 'miss' | 'moving' {
  if (!target || target.hp <= 0) return 'miss';

  const dx = target.position.x - proj.position.x;
  const dz = target.position.z - proj.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < PROJECTILE_HIT_RADIUS) return 'hit';

  const step = proj.speed * delta;
  if (step >= dist) return 'hit';

  if (dist > 0) {
    proj.position.x += (dx / dist) * step;
    proj.position.z += (dz / dist) * step;
  }

  return 'moving';
}

function getProjectileTowerDef(projectile: ProjectileInstance): TowerDef {
  return resolveTowerDef(projectile.towerDefId, projectile.doctrineId, {
    rangeBonus: projectile.rangeBonus,
    fireRateBonus: projectile.fireRateBonus,
  });
}

function getEffectiveDamage(baseDamage: number, def: TowerDef, enemy: EnemyInstance, hadShield: boolean): number {
  let damage = baseDamage;

  if (hasTrait(enemy, 'flying') && def.bonusVsFlying) {
    damage *= def.bonusVsFlying;
  }

  if (hadShield && def.bonusVsShielded) {
    damage *= def.bonusVsShielded;
  }

  const effectiveArmor = Math.max(0, enemy.armor + (enemy.armorBonus ?? 0) - (def.armorPierce ?? 0));
  damage = Math.max(MIN_DAMAGE, damage - effectiveArmor);

  return damage;
}

export function applyProjectileDamage(projectile: ProjectileInstance, enemy: EnemyInstance, damageMultiplier = 1): number {
  const def = getProjectileTowerDef(projectile);
  const hadShield = enemy.shield > 0;
  const damage = getEffectiveDamage(projectile.damage * damageMultiplier, def, enemy, hadShield);
  const shieldDamage = Math.min(enemy.shield, damage);
  enemy.shield -= shieldDamage;
  const hpDamage = damage - shieldDamage;
  if (hpDamage > 0) {
    enemy.hp -= hpDamage;
  }
  return damage;
}

function applySlowEffect(projectile: ProjectileInstance, enemy: EnemyInstance) {
  const def = getProjectileTowerDef(projectile);
  const effects = getTowerEffects(def);
  if (!effects.has('slow')) return;

  enemy.slowTimer = Math.max(enemy.slowTimer, def.slowDuration ?? 0);
  enemy.slowFactor = Math.min(enemy.slowFactor ?? 1, def.slowFactor ?? 1);
}

function applySplashDamage(projectile: ProjectileInstance, target: EnemyInstance, enemies: EnemyInstance[]) {
  const def = getProjectileTowerDef(projectile);
  const effects = getTowerEffects(def);
  if (!effects.has('splash')) return;

  const radius = def.splashRadius ?? 0;
  const falloff = def.splashFalloff ?? 1;
  if (radius <= 0) return;

  for (const enemy of enemies) {
    if (enemy.id === target.id || enemy.hp <= 0) continue;
    if (!canTowerTargetEnemy(def, enemy)) continue;
    const enemyDistance = distance(target.position, enemy.position);
    if (enemyDistance > radius) continue;
    applyProjectileDamage(projectile, enemy, falloff);
  }
}

export function getChainTargets(projectile: ProjectileInstance, target: EnemyInstance, enemies: EnemyInstance[]): EnemyInstance[] {
  const def = getProjectileTowerDef(projectile);
  const maxTargets = def.chainCount ?? 1;
  const chainRange = def.chainRange ?? 0;
  if (maxTargets <= 1 || chainRange <= 0) return [];

  const chainTargets: EnemyInstance[] = [];
  const hitIds = new Set([target.id]);
  let current = target;

  for (let hitCount = 1; hitCount < maxTargets; hitCount++) {
    let nextEnemy: EnemyInstance | null = null;
    let nextDistance = Number.POSITIVE_INFINITY;

    for (const candidate of enemies) {
      if (candidate.hp <= 0 || hitIds.has(candidate.id)) continue;
      if (!canTowerTargetEnemy(def, candidate)) continue;
      const candidateDistance = distance(current.position, candidate.position);
      if (candidateDistance > chainRange || candidateDistance >= nextDistance) continue;
      nextEnemy = candidate;
      nextDistance = candidateDistance;
    }

    if (!nextEnemy) break;
    chainTargets.push(nextEnemy);
    hitIds.add(nextEnemy.id);
    current = nextEnemy;
  }

  return chainTargets;
}

function applyChainDamage(projectile: ProjectileInstance, target: EnemyInstance, enemies: EnemyInstance[]) {
  const def = getProjectileTowerDef(projectile);
  const effects = getTowerEffects(def);
  if (!effects.has('chain')) return;

  const chainTargets = getChainTargets(projectile, target, enemies);
  let damageMultiplier = def.chainFalloff ?? 1;

  for (const enemy of chainTargets) {
    applyProjectileDamage(projectile, enemy, damageMultiplier);
    applySlowEffect(projectile, enemy);
    damageMultiplier *= def.chainFalloff ?? 1;
  }
}

class GameRuntime {
  private enemies: EnemyInstance[] = [];
  private projectiles: ProjectileInstance[] = [];
  private towers: TowerInstance[] = [];
  private spawnStates: SpawnState[] = [];
  private currentWave: ResolvedWave | null = null;
  private currentLevel: ResolvedLevel | null = null;
  private gameTime = 0;
  private snapshotListeners = new Set<SnapshotListener>();
  private eventListeners = new Set<EventListener>();
  private snapshot: RuntimeSnapshot = {
    enemies: this.enemies,
    projectiles: this.projectiles,
    towers: this.towers,
    enemyCount: 0,
    totalSpawned: 0,
    totalWaveEnemies: 0,
    gameTime: 0,
    activeHazards: [],
    laneStates: [],
    priorityPathIndex: null,
    structureVersion: 0,
  };
  private nextId = 0;
  private profile = {
    ticks: 0,
    totalMs: 0,
    maxMs: 0,
  };

  private uid(): string {
    this.nextId += 1;
    return `e${this.nextId}`;
  }

  reset() {
    this.nextId = 0;
    this.gameTime = 0;
    this.enemies = [];
    this.projectiles = [];
    this.towers = [];
    this.spawnStates = [];
    this.currentWave = null;
    this.currentLevel = null;
    this.publishSnapshot(true);
  }

  getSnapshot = (): RuntimeSnapshot => this.snapshot;

  subscribe(listener: SnapshotListener) {
    this.snapshotListeners.add(listener);
    return () => {
      this.snapshotListeners.delete(listener);
    };
  }

  subscribeEvents(listener: EventListener) {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  setLevelState(level: ResolvedLevel | null, wave: ResolvedWave | null, towers: TowerInstance[], autoStart: boolean) {
    this.currentLevel = level;
    this.currentWave = wave;
    this.gameTime = 0;
    this.towers = autoStart ? resetTowersForWave(towers) : towers.map((tower) => ({ ...tower }));
    this.enemies = [];
    this.projectiles = [];
    this.spawnStates = autoStart && wave ? createSpawnStates(wave) : [];
    this.publishSnapshot(true);
  }

  startWave(level: ResolvedLevel, wave: ResolvedWave, towers: TowerInstance[]) {
    this.currentLevel = level;
    this.currentWave = wave;
    this.gameTime = 0;
    this.towers = resetTowersForWave(towers);
    this.enemies = [];
    this.projectiles = [];
    this.spawnStates = createSpawnStates(wave);
    this.publishSnapshot(true);
  }

  setTowers(towers: TowerInstance[]) {
    this.towers = towers.map((tower) => ({ ...tower }));
    this.publishSnapshot(true);
  }

  getTowers() {
    return this.towers;
  }

  tick(delta: number): TickResult {
    if (!this.currentWave) {
      return { moneyDelta: 0, livesDelta: 0, waveComplete: false };
    }

    const start = typeof performance !== 'undefined' ? performance.now() : 0;
    const previousPriorityPathIndex = this.snapshot.priorityPathIndex;
    const previousHazardSignature = serializeActiveHazards(this.snapshot.activeHazards);
    this.gameTime += delta;

    let moneyDelta = 0;
    let livesDelta = 0;
    let structureChanged = false;
    let waveProgressChanged = false;

    for (let i = 0; i < this.currentWave.groups.length; i++) {
      const group = this.currentWave.groups[i];
      const spawnState = this.spawnStates[i];
      if (!spawnState || spawnState.spawned >= group.count) continue;

      spawnState.timer += delta;
      if (spawnState.timer < group.startDelay) continue;

      const elapsed = spawnState.timer - group.startDelay;
      const shouldHaveSpawned = Math.min(group.count, Math.floor(elapsed / group.spawnInterval) + 1);

      while (spawnState.spawned < shouldHaveSpawned) {
        const enemy = createEnemyFromGroup(group, this.uid());
        spawnState.spawned++;
        waveProgressChanged = true;
        if (!enemy) continue;
        this.enemies.push(enemy);
        structureChanged = true;
        this.emit({ type: 'enemy_spawned', enemyId: enemy.id, position: enemy.position });
      }
    }

    const reachedEnd = new Set<string>();
    for (const enemy of this.enemies) {
      if (enemy.hp <= 0) continue;
      applyEnemyHazardState(enemy, this.currentLevel, this.gameTime);
      if (moveEnemy(enemy, this.enemies, delta, this.gameTime, this.currentLevel)) {
        reachedEnd.add(enemy.id);
        livesDelta -= 1;
      }
    }

    const aliveEnemies = this.enemies.filter((enemy) => enemy.hp > 0 && !reachedEnd.has(enemy.id));
    const aliveEnemyMap = new Map(aliveEnemies.map((enemy) => [enemy.id, enemy]));

    for (const tower of this.towers) {
      const def = getTowerDefForRuntime(tower, this.currentLevel, this.gameTime);
      const target = findTarget(tower, aliveEnemies, this.currentLevel, this.gameTime);
      tower.targetEnemyId = target?.id ?? null;

      if (target && this.gameTime - tower.lastFireTime >= 1 / def.fireRate) {
        tower.lastFireTime = this.gameTime;
        const projectile: ProjectileInstance = {
          id: this.uid(),
          towerId: tower.id,
          towerDefId: tower.defId,
          targetEnemyId: target.id,
          position: { x: tower.position.x, z: tower.position.z },
          damage: def.damage,
          speed: def.projectileSpeed,
          special: def.special,
          doctrineId: tower.doctrineId ?? null,
          rangeBonus: tower.rangeBonus,
          fireRateBonus: tower.fireRateBonus,
        };
        this.projectiles.push(projectile);
        structureChanged = true;
        this.emit({
          type: 'tower_fired',
          towerDefId: tower.defId,
          projectileId: projectile.id,
          position: projectile.position,
        });
      }
    }

    const survivingProjectiles: ProjectileInstance[] = [];
    for (const projectile of this.projectiles) {
      const target = aliveEnemyMap.get(projectile.targetEnemyId);
      const result = moveProjectile(projectile, target, delta);
      if (result === 'moving') {
        survivingProjectiles.push(projectile);
        continue;
      }

      structureChanged = true;
      if (result === 'miss' || !target) {
        continue;
      }

      applyProjectileDamage(projectile, target);
      applySlowEffect(projectile, target);
      applySplashDamage(projectile, target, aliveEnemies);
      applyChainDamage(projectile, target, aliveEnemies);
    }
    this.projectiles = survivingProjectiles;

    const survivingEnemies: EnemyInstance[] = [];
    for (const enemy of this.enemies) {
      if (reachedEnd.has(enemy.id)) {
        structureChanged = true;
        this.emit({ type: 'enemy_escaped', enemyId: enemy.id, position: enemy.position });
        continue;
      }
      if (enemy.hp <= 0) {
        moneyDelta += enemy.reward;
        structureChanged = true;
        this.emit({ type: 'enemy_killed', enemyId: enemy.id, position: enemy.position });
        continue;
      }
      survivingEnemies.push(enemy);
    }
    this.enemies = survivingEnemies;

    const allSpawned = this.currentWave.groups.every((group, index) => this.spawnStates[index]?.spawned >= group.count);
    const waveComplete = allSpawned && this.enemies.length === 0;
    const nextHazardSignature = serializeActiveHazards(getActiveHazards(this.currentLevel, this.gameTime));
    const nextPriorityPathIndex = getDragonWakePriorityPath(this.currentLevel, this.gameTime);
    const hazardStateChanged =
      previousPriorityPathIndex !== nextPriorityPathIndex || previousHazardSignature !== nextHazardSignature;

    if (structureChanged || waveProgressChanged || hazardStateChanged) {
      this.publishSnapshot(structureChanged || hazardStateChanged);
    }

    if (process.env.NODE_ENV !== 'production' && start > 0) {
      const elapsedMs = performance.now() - start;
      this.profile.ticks += 1;
      this.profile.totalMs += elapsedMs;
      this.profile.maxMs = Math.max(this.profile.maxMs, elapsedMs);
      if (this.profile.ticks === RUNTIME_PROFILE_SAMPLE) {
        const avgMs = this.profile.totalMs / this.profile.ticks;
        console.debug(
          `[runtime] avgTick=${avgMs.toFixed(2)}ms maxTick=${this.profile.maxMs.toFixed(2)}ms enemies=${this.enemies.length} projectiles=${this.projectiles.length}`,
        );
        this.profile.ticks = 0;
        this.profile.totalMs = 0;
        this.profile.maxMs = 0;
      }
    }

    return { moneyDelta, livesDelta, waveComplete };
  }

  private emit(event: RuntimeEvent) {
    for (const listener of this.eventListeners) {
      listener(event);
    }
  }

  private publishSnapshot(structureChanged: boolean) {
    const totalSpawned = this.spawnStates.reduce((sum, spawnState) => sum + spawnState.spawned, 0);
    const totalWaveEnemies = this.currentWave
      ? this.currentWave.groups.reduce((sum, group) => sum + group.count, 0)
      : 0;
    const activeHazards = getActiveHazards(this.currentLevel, this.gameTime);
    const laneStates = getRuntimeLaneStates(
      this.currentLevel,
      this.currentWave,
      this.spawnStates,
      this.enemies,
      this.gameTime,
    );
    const priorityPathIndex = getDragonWakePriorityPath(this.currentLevel, this.gameTime);

    this.snapshot = {
      enemies: this.enemies,
      projectiles: this.projectiles,
      towers: this.towers,
      enemyCount: this.enemies.length,
      totalSpawned,
      totalWaveEnemies,
      gameTime: this.gameTime,
      activeHazards,
      laneStates,
      priorityPathIndex,
      structureVersion: structureChanged ? this.snapshot.structureVersion + 1 : this.snapshot.structureVersion,
    };

    for (const listener of this.snapshotListeners) {
      listener();
    }
  }
}

export const gameRuntime = new GameRuntime();

export function useRuntimeSnapshot() {
  return useSyncExternalStore(
    (listener) => gameRuntime.subscribe(listener),
    gameRuntime.getSnapshot,
    gameRuntime.getSnapshot,
  );
}
