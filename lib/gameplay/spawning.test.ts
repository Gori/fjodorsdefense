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

  it('inherits armor, shield, traits, and aura data from enemy definitions', () => {
    const seagull = createEnemyFromGroup(
      {
        enemyId: 'seagull',
        count: 1,
        pathIndex: 0,
        spawnInterval: 1,
        startDelay: 0,
        hpMultiplier: 1,
        speedMultiplier: 1,
        rewardMultiplier: 1,
        sizeMultiplier: 1,
        tags: [],
      },
      'enemy-2',
    );

    const fox = createEnemyFromGroup(
      {
        enemyId: 'fox',
        count: 1,
        pathIndex: 0,
        spawnInterval: 1,
        startDelay: 0,
        hpMultiplier: 1,
        speedMultiplier: 1,
        rewardMultiplier: 1,
        sizeMultiplier: 1,
        tags: [],
      },
      'enemy-3',
    );

    expect(seagull?.traits).toEqual(['flying', 'shielded']);
    expect(seagull?.shield).toBe(18);
    expect(seagull?.armor).toBe(0);

    expect(fox?.traits).toEqual(['packLeader']);
    expect(fox?.auraRadius).toBe(6);
    expect(fox?.auraSpeedMultiplier).toBe(1.2);
  });

  it('spawns on alternate paths when the group points to them', () => {
    const enemy = createEnemyFromGroup(
      {
        enemyId: 'rat',
        count: 1,
        pathIndex: 2,
        spawnInterval: 1,
        startDelay: 0,
        hpMultiplier: 1,
        speedMultiplier: 1,
        rewardMultiplier: 1,
        sizeMultiplier: 1,
        tags: [],
      },
      'enemy-4',
    );

    expect(enemy?.pathIndex).toBe(2);
    expect(enemy?.position).not.toEqual({ x: 10.478, z: 32.711 });
  });
});
