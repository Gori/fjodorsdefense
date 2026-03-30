import { ALL_PATHS } from '../pathData';
import { ENEMY_DEFS } from '../enemyDefs';
import type { EnemyInstance } from '../types';
import type { ResolvedSpawnGroup } from '../levels/types';

export function createEnemyFromGroup(group: ResolvedSpawnGroup, id: string): EnemyInstance | null {
  const path = ALL_PATHS[group.pathIndex];
  if (!path || path.length === 0) return null;

  const enemyDef = ENEMY_DEFS[group.enemyId];
  if (!enemyDef) return null;

  const maxHp = Math.max(1, Math.round(enemyDef.maxHp * group.hpMultiplier));

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
    sizeMultiplier: group.sizeMultiplier,
    tags: [...group.tags],
  };
}
