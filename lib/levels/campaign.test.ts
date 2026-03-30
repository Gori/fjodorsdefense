import { describe, expect, it } from 'vitest';
import { CAMPAIGN, loadCampaign } from './loadCampaign';
import { advanceCampaignProgress, getLevelRuntimeState, getTotalCampaignWaveCount, getWaveNumberInCampaign } from './runtime';
import type { CampaignConfig } from './types';

function createBaseCampaign(): CampaignConfig {
  return {
    version: 1,
    meta: {
      id: 'test-campaign',
      name: 'Test Campaign',
    },
    paths: [
      { id: 'main', pathIndex: 0 },
    ],
    defaults: {
      startingMoney: 100,
      startingLives: 10,
      waveCompletionBonus: 25,
      autoStartWaves: false,
      availableTowers: ['scratchingPost', 'yarnLauncher'],
      startingSelectedTower: 'scratchingPost',
      defaultPathId: 'main',
    },
    spawnTemplates: {
      rats: {
        enemyId: 'rat',
        count: 5,
        spawnInterval: 1,
      },
    },
    levels: [
      {
        id: 'level-1',
        name: 'Level One',
        waves: [
          {
            id: 'wave-1',
            groups: [{ template: 'rats' }],
          },
          {
            id: 'wave-2',
            groups: [{ template: 'rats', count: 8, modifiers: { hpMultiplier: 1.25 } }],
          },
        ],
      },
      {
        id: 'level-2',
        name: 'Level Two',
        startingMoney: 180,
        startingLives: 14,
        availableTowers: ['laserPointer'],
        waves: [
          {
            id: 'wave-1',
            groups: [{ enemyId: 'dog', count: 2, spawnInterval: 2, startDelay: 1 }],
          },
        ],
      },
    ],
  };
}

describe('campaign loader', () => {
  it('migrates the original wave stack into level 1 and resolves templates/modifiers', () => {
    expect(CAMPAIGN.levels).toHaveLength(5);
    expect(CAMPAIGN.levels[0].waves).toHaveLength(5);
    expect(CAMPAIGN.levels[0].waves[0].groups[0].enemyId).toBe('rat');
    expect(CAMPAIGN.levels[4].waves[2].groups[2].hpMultiplier).toBe(1.8);
    expect(CAMPAIGN.levels[4].availableTowers).toEqual(['yarnLauncher', 'laserPointer', 'catnipBomb']);
  });

  it('applies defaults, level overrides, and selected tower fallback', () => {
    const config = createBaseCampaign();
    config.levels[1].startingSelectedTower = null;

    const campaign = loadCampaign(config);
    const level1 = getLevelRuntimeState(campaign, 0);
    const level2 = getLevelRuntimeState(campaign, 1);

    expect(level1.startingMoney).toBe(100);
    expect(level1.startingLives).toBe(10);
    expect(level1.availableTowerIds).toEqual(['scratchingPost', 'yarnLauncher']);
    expect(level1.startingSelectedTower).toBe('scratchingPost');

    expect(level2.startingMoney).toBe(180);
    expect(level2.startingLives).toBe(14);
    expect(level2.availableTowerIds).toEqual(['laserPointer']);
    expect(level2.startingSelectedTower).toBe('laserPointer');
  });

  it('fails loudly on unknown enemy, tower, and path ids', () => {
    const badEnemy = createBaseCampaign();
    badEnemy.levels[0].waves[0].groups[0] = { enemyId: 'dragon', count: 1, spawnInterval: 1 };
    expect(() => loadCampaign(badEnemy)).toThrow(/unknown enemy/i);

    const badTower = createBaseCampaign();
    badTower.levels[0].availableTowers = ['scratchingPost', 'unknownTower'];
    expect(() => loadCampaign(badTower)).toThrow(/unknown tower/i);

    const badPath = createBaseCampaign();
    badPath.levels[0].waves[0].groups[0] = { enemyId: 'rat', count: 1, spawnInterval: 1, pathId: 'side' };
    expect(() => loadCampaign(badPath)).toThrow(/unknown path/i);
  });
});

describe('campaign progression helpers', () => {
  it('advances to the next wave in the same level', () => {
    const campaign = loadCampaign(createBaseCampaign());
    const next = advanceCampaignProgress(campaign, 0, 0);

    expect(next.phase).toBe('between-waves');
    expect(next.levelIndex).toBe(0);
    expect(next.waveIndex).toBe(1);
    expect(next.currentLevel?.id).toBe('level-1');
    expect(next.currentWave?.id).toBe('wave-2');
  });

  it('advances to the next level and then to victory at the end', () => {
    const campaign = loadCampaign(createBaseCampaign());
    const nextLevel = advanceCampaignProgress(campaign, 0, 1);
    const victory = advanceCampaignProgress(campaign, 1, 0);

    expect(nextLevel.levelIndex).toBe(1);
    expect(nextLevel.waveIndex).toBe(0);
    expect(nextLevel.currentLevel?.id).toBe('level-2');
    expect(victory.phase).toBe('victory');
    expect(victory.currentLevel).toBeNull();
  });

  it('computes campaign wave numbering consistently as one-based', () => {
    const campaign = loadCampaign(createBaseCampaign());
    expect(getTotalCampaignWaveCount(campaign)).toBe(3);
    expect(getWaveNumberInCampaign(campaign, 0, 0)).toBe(1);
    expect(getWaveNumberInCampaign(campaign, 0, 1)).toBe(2);
    expect(getWaveNumberInCampaign(campaign, 1, 0)).toBe(3);
  });
});
