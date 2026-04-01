export interface Vec2 {
  x: number;
  z: number;
}

export type CameraMode = 'tactical' | 'planner' | 'firstPerson';

export type EnemyTrait =
  | 'flying'
  | 'armored'
  | 'shielded'
  | 'packLeader'
  | 'corrupted';

export type TowerEffect =
  | 'slow'
  | 'splash'
  | 'antiAir'
  | 'armorPierce'
  | 'chain';

export type PlacementInvalidReason =
  | 'occupied_by_structure'
  | 'blocked_by_hazard'
  | 'in_lane_no_build_zone'
  | 'world_locked_zone'
  | 'too_close_to_tower'
  | 'insufficient_money'
  | 'cannot_build_on_water';

export interface TowerDef {
  id: string;
  name: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number; // shots per second
  projectileSpeed: number;
  color: string;
  role?: string;
  statLine?: string;
  special?: 'slow' | 'aoe';
  effects?: TowerEffect[];
  canTargetGround?: boolean;
  canTargetFlying?: boolean;
  slowFactor?: number;
  slowDuration?: number;
  splashRadius?: number;
  splashFalloff?: number;
  armorPierce?: number;
  bonusVsFlying?: number;
  bonusVsShielded?: number;
  chainCount?: number;
  chainRange?: number;
  chainFalloff?: number;
}

export interface TowerDoctrineModifier {
  rangeDelta?: number;
  damageDelta?: number;
  fireRateMultiplier?: number;
  projectileSpeedMultiplier?: number;
  slowFactorOverride?: number;
  slowDurationDelta?: number;
  splashRadiusDelta?: number;
  splashFalloffDelta?: number;
  armorPierceDelta?: number;
  bonusVsFlyingDelta?: number;
  bonusVsShieldedDelta?: number;
  chainCountDelta?: number;
  chainRangeDelta?: number;
  chainFalloffMultiplier?: number;
  canTargetGround?: boolean;
  canTargetFlying?: boolean;
  extraEffects?: TowerEffect[];
  role?: string;
  statLine?: string;
}

export interface EnemyDef {
  id: string;
  name: string;
  maxHp: number;
  speed: number; // world units per second
  reward: number;
  color: string;
  flying?: boolean;
  traits?: EnemyTrait[];
  armor?: number;
  shield?: number;
  auraRadius?: number;
  auraSpeedMultiplier?: number;
}

export interface TowerInstance {
  id: string;
  defId: string;
  position: Vec2;
  lastFireTime: number;
  targetEnemyId: string | null;
  doctrineId?: string | null;
  rangeBonus?: number;
  fireRateBonus?: number;
  tags?: string[];
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
  slowFactor?: number;
  sizeMultiplier?: number;
  tags?: string[];
  traits: EnemyTrait[];
  armor: number;
  shield: number;
  auraRadius?: number;
  auraSpeedMultiplier?: number;
  speedBonus?: number;
  armorBonus?: number;
  hazardBoosted?: boolean;
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
  doctrineId?: string | null;
  rangeBonus?: number;
  fireRateBonus?: number;
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
  hiddenUntilSecondsLeft?: number;
}

export interface SpawnState {
  groupIndex: number;
  spawned: number;
  timer: number;
}

export type GamePhase =
  | 'menu'
  | 'playing'
  | 'between-waves'
  | 'intermission'
  | 'gameover'
  | 'victory';
