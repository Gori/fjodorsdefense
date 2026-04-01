import { describe, expect, it } from 'vitest';
import { CAMPAIGN, loadCampaign } from './loadCampaign';
import {
  advanceCampaignProgress,
  applyChallengeMutatorsToLevel,
  applyChoiceToSave,
  createFreshSave,
  getCompletedObjectiveIds,
  getLevelRuntimeState,
  getTotalCampaignWaveCount,
  getWaveNumberInCampaign,
  resolveLevelForNode,
  resolveEnding,
} from './runtime';
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
    campaignNodes: [
      { id: 'node-1', levelId: 'level-1', order: 1, nextNodeId: 'node-2' },
      { id: 'node-2', levelId: 'level-2', order: 2 },
    ],
    branchChoices: [],
    endingRules: [
      {
        id: 'held',
        name: 'Held',
        title: 'Held',
        body: 'Held the line.',
      },
    ],
    levels: [
      {
        id: 'level-1',
        worldId: 'w1',
        activePathIds: ['main'],
        name: 'Level One',
        lanes: [{ id: 'main', pathId: 'main', label: 'Main', color: '#fff', role: 'rush', threat: 2 }],
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
        worldId: 'w1',
        activePathIds: ['main'],
        name: 'Level Two',
        lanes: [{ id: 'main', pathId: 'main', label: 'Main', color: '#fff', role: 'rush', threat: 3 }],
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
  it('loads the full authored campaign graph and expanded content', () => {
    expect(CAMPAIGN.worlds).toHaveLength(5);
    expect(CAMPAIGN.levels).toHaveLength(18);
    expect(CAMPAIGN.nodes.length).toBeGreaterThan(18);
    expect(getTotalCampaignWaveCount(CAMPAIGN)).toBe(90);
    expect(CAMPAIGN.levels[0].worldId).toBe('streets-remember');
    expect(CAMPAIGN.levels[0].lanes[0]?.pathIndex).toBe(0);
    expect(CAMPAIGN.levels[8].hazards.length).toBeGreaterThan(0);
    expect(CAMPAIGN.choices).toHaveLength(2);
    expect(CAMPAIGN.endings).toHaveLength(2);
  });

  it('applies defaults and resolves a save-backed runtime state', () => {
    const campaign = loadCampaign(createBaseCampaign());
    const save = createFreshSave(campaign, 0);
    const runtime = getLevelRuntimeState(campaign, save);

    expect(runtime.levelIndex).toBe(0);
    expect(runtime.currentNode.id).toBe('node-1');
    expect(runtime.currentLevel.id).toBe('level-1');
    expect(runtime.availableTowerIds).toEqual(['scratchingPost', 'yarnLauncher']);
    expect(runtime.startingSelectedTower).toBe('scratchingPost');
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
  it('advances to the next wave in the same node', () => {
    const campaign = loadCampaign(createBaseCampaign());
    const save = createFreshSave(campaign, 0);
    const next = advanceCampaignProgress(campaign, save, 0);

    expect(next.phase).toBe('between-waves');
    expect(next.nodeId).toBe('node-1');
    expect(next.waveIndex).toBe(1);
    expect(next.currentWave?.id).toBe('wave-2');
  });

  it('advances to the next node and then to victory at the end', () => {
    const campaign = loadCampaign(createBaseCampaign());
    const save = createFreshSave(campaign, 0);
    const nextNode = advanceCampaignProgress(campaign, save, 1);
    const saveAtSecond = { ...save, currentNodeId: 'node-2', currentWaveIndex: 0 };
    const victory = advanceCampaignProgress(campaign, saveAtSecond, 0);

    expect(nextNode.nodeId).toBe('node-2');
    expect(nextNode.currentLevel?.id).toBe('level-2');
    expect(victory.phase).toBe('victory');
  });

  it('applies branch choices and resolves endings from consequence state', () => {
    const save = createFreshSave(CAMPAIGN, 0);
    const afterRoute = applyChoiceToSave(CAMPAIGN, save, 'route-interpretation', 'signal_route');
    const afterPosture = applyChoiceToSave(
      CAMPAIGN,
      {
        ...afterRoute,
        consequenceState: {
          civilianIntegrity: 16,
          dragonPressure: 6,
          familyKnowledge: 12,
          laneControlMastery: 10,
          laneBreaches: 2,
        },
      },
      'ember-posture',
      'containment',
    );

    const ending = resolveEnding(CAMPAIGN, afterPosture);
    expect(afterPosture.currentNodeId).toBe('node-13-contain');
    expect(ending.id).toBe('the-city-held');
  });

  it('applies branch-specific level transforms to later combat states', () => {
    const signalAshParade = resolveLevelForNode(CAMPAIGN, 'node-10-signal').currentLevel;
    const harborAshParade = resolveLevelForNode(CAMPAIGN, 'node-09-harbor').currentLevel;
    const containmentTunnel = resolveLevelForNode(CAMPAIGN, 'node-13-contain').currentLevel;
    const pursuitTunnel = resolveLevelForNode(CAMPAIGN, 'node-13-pursuit').currentLevel;

    expect(
      signalAshParade.hazards.find((hazard) => hazard.type === 'previewMask' && hazard.id === 'ash-mask'),
    ).toMatchObject({ revealLead: 8 });
    expect(harborAshParade.startingMoney).toBe(signalAshParade.startingMoney + 25);
    expect(containmentTunnel.startingLives).toBe(pursuitTunnel.startingLives + 2);
    expect(
      containmentTunnel.hazards.find((hazard) => hazard.type === 'globalAlert' && hazard.id === 'tunnel-alert'),
    ).toMatchObject({ duration: 5 });
    expect(
      pursuitTunnel.hazards.find((hazard) => hazard.type === 'globalAlert' && hazard.id === 'tunnel-alert'),
    ).toMatchObject({ duration: 9 });
  });

  it('computes campaign wave numbering consistently as one-based', () => {
    const save = createFreshSave(CAMPAIGN, 0);
    expect(getWaveNumberInCampaign(CAMPAIGN, save.currentNodeId, 0)).toBe(1);
    expect(getWaveNumberInCampaign(CAMPAIGN, 'node-04', 0)).toBeGreaterThan(10);
  });

  it('evaluates authored optional objectives from level results', () => {
    const level = CAMPAIGN.levels.find((entry) => entry.id === 'hornstull-holds-breath');
    if (!level) throw new Error('Missing optional objective test level');

    expect(getCompletedObjectiveIds(level, { livesRemaining: 14, laneBreaches: 0 })).toContain(
      'hornstull-no-breach',
    );
    expect(getCompletedObjectiveIds(level, { livesRemaining: 14, laneBreaches: 2 })).toEqual([]);
  });

  it('applies challenge mutators to runtime level state', () => {
    const level = CAMPAIGN.levels.find((entry) => entry.id === 'three-ways-to-burn');
    if (!level) throw new Error('Missing mutator test level');

    const mutated = applyChallengeMutatorsToLevel(level, ['lean_pockets', 'iron_night']);

    expect(mutated.startingMoney).toBeLessThan(level.startingMoney);
    expect(mutated.startingLives).toBe(level.startingLives - 2);
    expect(
      mutated.hazards.find((hazard) => hazard.type === 'laneSpeedPulse' && hazard.id === 'burn-surge'),
    ).toMatchObject({ speedMultiplier: 1.37 });
  });
});
