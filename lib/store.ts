import { create } from 'zustand';
import type {
  GamePhase,
  TowerInstance,
  EnemyInstance,
  ProjectileInstance,
  Vec2,
  SpawnState,
} from './types';
import { TOWER_DEFS } from './towerDefs';
import { ALL_PATHS } from './pathData';
import { CAMPAIGN } from './levels/loadCampaign';
import type { ResolvedCampaign, ResolvedLevel, ResolvedWave } from './levels/types';
import { advanceCampaignProgress, getLevelRuntimeState } from './levels/runtime';
import { createEnemyFromGroup } from './gameplay/spawning';
import { distance } from './mapUtils';

let _nextId = 0;
function uid(): string {
  return `e${++_nextId}`;
}

interface GameStore {
  phase: GamePhase;
  campaign: ResolvedCampaign;
  levelIndex: number;
  waveIndex: number;
  currentLevel: ResolvedLevel | null;
  currentWave: ResolvedWave | null;
  availableTowerIds: string[];
  money: number;
  lives: number;
  gameTime: number;
  towers: TowerInstance[];
  enemies: EnemyInstance[];
  projectiles: ProjectileInstance[];
  selectedTowerDef: string | null;
  spawnStates: SpawnState[];

  startGame: () => void;
  startWave: () => void;
  placeTower: (defId: string, position: Vec2) => boolean;
  selectTowerDef: (defId: string | null) => void;
  tick: (delta: number) => void;
}

type StoreSetter = (partial: Partial<GameStore>) => void;

const PROJECTILE_HIT_RADIUS = 0.6;
const AOE_RADIUS = 4;
const SLOW_DURATION = 2.0;
const SLOW_FACTOR = 0.5;
const MIN_TOWER_SPACING = 1.5;

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

function moveEnemy(enemy: EnemyInstance, delta: number): boolean {
  const pathPoints = ALL_PATHS[enemy.pathIndex];
  if (!pathPoints || pathPoints.length === 0) {
    throw new Error(`Missing path at index ${enemy.pathIndex}`);
  }

  if (enemy.waypointIndex >= pathPoints.length) return true;

  const speed = enemy.speed * (enemy.slowTimer > 0 ? SLOW_FACTOR : 1.0);
  const target = pathPoints[enemy.waypointIndex];
  const dx = target.x - enemy.position.x;
  const dz = target.z - enemy.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const step = speed * delta;

  if (step >= dist) {
    enemy.position = { x: target.x, z: target.z };
    enemy.waypointIndex++;
    if (enemy.waypointIndex >= pathPoints.length) return true;
  } else {
    enemy.position = {
      x: enemy.position.x + (dx / dist) * step,
      z: enemy.position.z + (dz / dist) * step,
    };
  }

  if (enemy.slowTimer > 0) {
    enemy.slowTimer = Math.max(0, enemy.slowTimer - delta);
  }

  return false;
}

function findTarget(tower: TowerInstance, enemies: EnemyInstance[]): EnemyInstance | null {
  const def = TOWER_DEFS[tower.defId];
  let best: EnemyInstance | null = null;
  let bestProgress = -1;

  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
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

function moveProjectile(
  proj: ProjectileInstance,
  enemies: EnemyInstance[],
  delta: number,
): 'hit' | 'miss' | 'moving' {
  const target = enemies.find((enemy) => enemy.id === proj.targetEnemyId);
  if (!target || target.hp <= 0) return 'miss';

  const dx = target.position.x - proj.position.x;
  const dz = target.position.z - proj.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  if (dist < PROJECTILE_HIT_RADIUS) return 'hit';

  const step = proj.speed * delta;
  if (step >= dist) return 'hit';

  proj.position = {
    x: proj.position.x + (dx / dist) * step,
    z: proj.position.z + (dz / dist) * step,
  };

  return 'moving';
}

function startPreparedWave(set: StoreSetter, state: GameStore, wave: ResolvedWave) {
  set({
    phase: 'playing',
    currentWave: wave,
    spawnStates: createSpawnStates(wave),
    gameTime: 0,
    towers: resetTowersForWave(state.towers),
  });
}

function transitionToLevelStart(
  set: StoreSetter,
  campaign: ResolvedCampaign,
  levelIndex: number,
  waveIndex = 0,
) {
  const runtime = getLevelRuntimeState(campaign, levelIndex, waveIndex);
  set({
    phase: runtime.currentLevel.autoStartWaves ? 'playing' : 'between-waves',
    campaign,
    levelIndex: runtime.levelIndex,
    waveIndex: runtime.waveIndex,
    currentLevel: runtime.currentLevel,
    currentWave: runtime.currentWave,
    availableTowerIds: runtime.availableTowerIds,
    money: runtime.startingMoney,
    lives: runtime.startingLives,
    gameTime: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    selectedTowerDef: runtime.startingSelectedTower,
    spawnStates: runtime.currentLevel.autoStartWaves ? createSpawnStates(runtime.currentWave) : [],
  });
}

const initialRuntime = getLevelRuntimeState(CAMPAIGN, 0, 0);

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'menu',
  campaign: CAMPAIGN,
  levelIndex: 0,
  waveIndex: 0,
  currentLevel: initialRuntime.currentLevel,
  currentWave: initialRuntime.currentWave,
  availableTowerIds: initialRuntime.availableTowerIds,
  money: initialRuntime.startingMoney,
  lives: initialRuntime.startingLives,
  gameTime: 0,
  towers: [],
  enemies: [],
  projectiles: [],
  selectedTowerDef: initialRuntime.startingSelectedTower,
  spawnStates: [],

  startGame: () => {
    _nextId = 0;
    transitionToLevelStart(set, CAMPAIGN, 0, 0);
  },

  startWave: () => {
    const state = get();
    if (!state.currentWave || !state.currentLevel) return;
    startPreparedWave(set, state, state.currentWave);
  },

  placeTower: (defId: string, position: Vec2) => {
    const state = get();
    const def = TOWER_DEFS[defId];
    if (!def) return false;
    if (!state.availableTowerIds.includes(defId)) return false;
    if (state.money < def.cost) return false;
    if (state.phase !== 'playing' && state.phase !== 'between-waves') return false;

    for (const tower of state.towers) {
      if (distance(position, tower.position) < MIN_TOWER_SPACING) return false;
    }

    const newTower: TowerInstance = {
      id: uid(),
      defId,
      position: { x: position.x, z: position.z },
      lastFireTime: -100,
      targetEnemyId: null,
    };

    set({
      towers: [...state.towers, newTower],
      money: state.money - def.cost,
    });

    return true;
  },

  selectTowerDef: (defId: string | null) => {
    const state = get();
    if (defId !== null && !state.availableTowerIds.includes(defId)) return;
    set({ selectedTowerDef: defId });
  },

  tick: (delta: number) => {
    const state = get();
    if (state.phase !== 'playing' || !state.currentLevel || !state.currentWave) return;

    const gameTime = state.gameTime + delta;
    let lives = state.lives;
    let money = state.money;
    const enemies: EnemyInstance[] = state.enemies.map((enemy) => ({
      ...enemy,
      position: { ...enemy.position },
      tags: enemy.tags ? [...enemy.tags] : undefined,
    }));
    const projectiles = state.projectiles.map((proj) => ({ ...proj, position: { ...proj.position } }));
    const towers = state.towers.map((tower) => ({ ...tower }));
    const newSpawnStates = state.spawnStates.map((spawnState) => ({ ...spawnState }));

    for (let i = 0; i < state.currentWave.groups.length; i++) {
      const group = state.currentWave.groups[i];
      const spawnState = newSpawnStates[i];
      if (!spawnState || spawnState.spawned >= group.count) continue;

      spawnState.timer += delta;

      if (spawnState.timer >= group.startDelay) {
        const elapsed = spawnState.timer - group.startDelay;
        const shouldHaveSpawned = Math.min(group.count, Math.floor(elapsed / group.spawnInterval) + 1);

        while (spawnState.spawned < shouldHaveSpawned) {
          const enemy = createEnemyFromGroup(group, uid());
          if (enemy) {
            enemies.push(enemy);
          }
          spawnState.spawned++;
        }
      }
    }

    const reachedEnd = new Set<string>();
    for (const enemy of enemies) {
      if (enemy.hp <= 0) continue;
      if (moveEnemy(enemy, delta)) {
        reachedEnd.add(enemy.id);
        lives--;
      }
    }

    const aliveEnemies = enemies.filter((enemy) => enemy.hp > 0 && !reachedEnd.has(enemy.id));

    for (const tower of towers) {
      const def = TOWER_DEFS[tower.defId];
      const target = findTarget(tower, aliveEnemies);
      tower.targetEnemyId = target?.id ?? null;

      if (target && gameTime - tower.lastFireTime >= 1 / def.fireRate) {
        tower.lastFireTime = gameTime;
        projectiles.push({
          id: uid(),
          towerId: tower.id,
          towerDefId: tower.defId,
          targetEnemyId: target.id,
          position: { x: tower.position.x, z: tower.position.z },
          damage: def.damage,
          speed: def.projectileSpeed,
          special: def.special,
        });
      }
    }

    const projectilesToRemove = new Set<string>();
    for (const proj of projectiles) {
      const result = moveProjectile(proj, aliveEnemies, delta);

      if (result === 'miss') {
        projectilesToRemove.add(proj.id);
      } else if (result === 'hit') {
        projectilesToRemove.add(proj.id);

        const target = aliveEnemies.find((enemy) => enemy.id === proj.targetEnemyId);
        if (target) {
          target.hp -= proj.damage;

          if (proj.special === 'slow') {
            target.slowTimer = SLOW_DURATION;
          }

          if (proj.special === 'aoe') {
            for (const other of aliveEnemies) {
              if (other.id === target.id) continue;
              if (distance(target.position, other.position) < AOE_RADIUS) {
                other.hp -= proj.damage * 0.5;
              }
            }
          }
        }
      }
    }

    const survivingEnemies: EnemyInstance[] = [];
    for (const enemy of enemies) {
      if (reachedEnd.has(enemy.id)) continue;
      if (enemy.hp <= 0) {
        money += enemy.reward;
      } else {
        survivingEnemies.push(enemy);
      }
    }

    const survivingProjectiles = projectiles.filter((proj) => !projectilesToRemove.has(proj.id));

    const allSpawned = newSpawnStates.every((spawnState, index) => spawnState.spawned >= state.currentWave!.groups[index].count);
    const waveComplete = allSpawned && survivingEnemies.length === 0;

    if (lives <= 0) {
      set({
        gameTime,
        enemies: survivingEnemies,
        projectiles: survivingProjectiles,
        towers,
        money,
        lives: 0,
        spawnStates: newSpawnStates,
        phase: 'gameover',
      });
      return;
    }

    if (!waveComplete) {
      set({
        gameTime,
        enemies: survivingEnemies,
        projectiles: survivingProjectiles,
        towers,
        money,
        lives,
        spawnStates: newSpawnStates,
      });
      return;
    }

    const next = advanceCampaignProgress(state.campaign, state.levelIndex, state.waveIndex);
    const levelChanged = next.levelIndex !== state.levelIndex;

    if (next.phase === 'victory' || !next.currentLevel || !next.currentWave) {
      set({
        gameTime,
        enemies: [],
        projectiles: [],
        towers,
        money: money + state.currentWave.completionBonus,
        lives,
        spawnStates: [],
        phase: 'victory',
        levelIndex: state.levelIndex,
        waveIndex: state.waveIndex,
        currentLevel: state.currentLevel,
        currentWave: state.currentWave,
      });
      return;
    }

    if (levelChanged) {
      transitionToLevelStart(set, state.campaign, next.levelIndex, next.waveIndex);
      return;
    }

    const nextPhase = next.currentLevel.autoStartWaves ? 'playing' : 'between-waves';
    set({
      gameTime: next.currentLevel.autoStartWaves ? 0 : gameTime,
      enemies: [],
      projectiles: [],
      towers: next.currentLevel.autoStartWaves ? resetTowersForWave(towers) : towers,
      money: money + state.currentWave.completionBonus,
      lives,
      spawnStates: next.currentLevel.autoStartWaves ? createSpawnStates(next.currentWave) : [],
      phase: nextPhase,
      levelIndex: next.levelIndex,
      waveIndex: next.waveIndex,
      currentLevel: next.currentLevel,
      currentWave: next.currentWave,
      availableTowerIds: next.availableTowerIds,
      selectedTowerDef:
        state.selectedTowerDef && next.availableTowerIds.includes(state.selectedTowerDef)
          ? state.selectedTowerDef
          : next.currentLevel.startingSelectedTower,
    });
  },
}));
