import { ALL_PATHS } from '../pathData';
import { ENEMY_DEFS } from '../enemyDefs';
import type { EnemyTrait } from '../types';
import type { EnemyInstance } from '../types';
import type { ResolvedSpawnGroup } from '../levels/types';

export function createEnemyFromGroup(group: ResolvedSpawnGroup, id: string): EnemyInstance | null {
  const path = ALL_PATHS[group.pathIndex];
  if (!path || path.length === 0) return null;

  const enemyDef = ENEMY_DEFS[group.enemyId];
  if (!enemyDef) return null;

  const maxHp = Math.max(1, Math.round(enemyDef.maxHp * group.hpMultiplier));
  const traits = [...new Set<EnemyTrait>([
    ...(enemyDef.traits ?? []),
    ...(enemyDef.flying ? (['flying'] as EnemyTrait[]) : []),
    ...(group.tags.includes('armored') ? (['armored'] as EnemyTrait[]) : []),
  ])];
  const armor = Math.max(0, enemyDef.armor ?? (traits.includes('armored') ? 2 : 0));
  const baseShield = Math.max(0, enemyDef.shield ?? 0);

  return {
    id,
    defId: group.enemyId,
    hp: maxHp,
    maxHp,
    speed: enemyDef.speed * group.speedMultiplier,
    reward: Math.max(0, Math.round(enemyDef.reward * group.rewardMultiplier)),
    pathIndex: group.pathIndex,
    waypointIndex: 1,
    position: { x: path[0].x, z: path[0].z },
    slowTimer: 0,
    slowFactor: 1,
    sizeMultiplier: group.sizeMultiplier,
    tags: [...group.tags],
    traits,
    armor,
    shield: baseShield,
    auraRadius: enemyDef.auraRadius,
    auraSpeedMultiplier: enemyDef.auraSpeedMultiplier,
    speedBonus: 1,
    armorBonus: 0,
    hazardBoosted: false,
  };
}
