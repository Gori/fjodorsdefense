export interface Vec2 {
  x: number;
  z: number;
}

export interface TowerDef {
  id: string;
  name: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number; // shots per second
  projectileSpeed: number;
  color: string;
  special?: 'slow' | 'aoe';
}

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  speed: number; // world units per second
  reward: number;
  color: string;
  flying?: boolean;
}

export interface TowerInstance {
  id: string;
  defId: string;
  position: Vec2;
  lastFireTime: number;
  targetEnemyId: string | null;
}

export interface EnemyInstance {
  id: string;
  defId: string;
  hp: number;
  maxHp: number;
  speed: number;
  reward: number;
  pathIndex: number;
  waypointIndex: number;
  position: Vec2;
  slowTimer: number;
  sizeMultiplier?: number;
  tags?: string[];
}

export interface ProjectileInstance {
  id: string;
  towerId: string;
  towerDefId: string;
  targetEnemyId: string;
  position: Vec2;
  damage: number;
  speed: number;
  special?: 'slow' | 'aoe';
}

export interface SpawnGroup {
  enemyId: string;
  count: number;
  pathIndex: number;
  spawnInterval: number;
  startDelay: number;
  hpMultiplier: number;
  speedMultiplier: number;
  rewardMultiplier: number;
  sizeMultiplier: number;
  tags: string[];
}

export interface SpawnState {
  groupIndex: number;
  spawned: number;
  timer: number;
}

export type GamePhase = 'menu' | 'playing' | 'between-waves' | 'gameover' | 'victory';
