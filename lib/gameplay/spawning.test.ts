import { describe, expect, it } from 'vitest';
import { createEnemyFromGroup } from './spawning';

describe('createEnemyFromGroup', () => {
  it('applies hp, speed, reward, size, and tags modifiers to spawned enemies', () => {
    const enemy = createEnemyFromGroup(
      {
        enemyId: 'dog',
        count: 2,
        pathIndex: 0,
        spawnInterval: 2,
        startDelay: 0,
        hpMultiplier: 1.5,
        speedMultiplier: 0.8,
        rewardMultiplier: 1.25,
        sizeMultiplier: 1.2,
        tags: ['boss-pack'],
      },
      'enemy-1',
    );

    expect(enemy).not.toBeNull();
    expect(enemy?.defId).toBe('dog');
    expect(enemy?.maxHp).toBe(225);
    expect(enemy?.hp).toBe(225);
    expect(enemy?.speed).toBe(2);
    expect(enemy?.reward).toBe(50);
    expect(enemy?.sizeMultiplier).toBe(1.2);
    expect(enemy?.tags).toEqual(['boss-pack']);
  });
});
