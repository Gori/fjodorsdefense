import { ALL_PATHS } from '../pathData';
import { ENEMY_DEFS } from '../enemyDefs';
import { TOWER_DEFS } from '../towerDefs';
import type { CampaignConfig, CampaignNodeConfig, LevelConfig, SpawnGroupConfig, WaveConfig, ZoneShapeConfig } from './types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Invalid campaign config: ${message}`);
  }
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function validateZone(levelId: string, zone: ZoneShapeConfig, label: string) {
  assert(zone.shape === 'rect' || zone.shape === 'polygon', `level "${levelId}" has invalid ${label} shape`);
  if (zone.shape === 'rect') {
    assert(isNonNegativeNumber(zone.xMax - zone.xMin), `level "${levelId}" has invalid ${label} rect x bounds`);
    assert(isNonNegativeNumber(zone.zMax - zone.zMin), `level "${levelId}" has invalid ${label} rect z bounds`);
  } else {
    assert(Array.isArray(zone.points) && zone.points.length >= 3, `level "${levelId}" has invalid ${label} polygon`);
  }
}

function validateGroup(group: SpawnGroupConfig, levelId: string, waveId: string, index: number) {
  const prefix = `level "${levelId}" wave "${waveId}" group ${index}`;
  if (group.template !== undefined) {
    assert(typeof group.template === 'string' && group.template.length > 0, `${prefix} has invalid template`);
  }
  if (group.enemyId !== undefined) {
    assert(typeof group.enemyId === 'string' && group.enemyId.length > 0, `${prefix} has invalid enemyId`);
  }
  if (group.count !== undefined) {
    assert(isPositiveNumber(group.count), `${prefix} has invalid count`);
  }
  if (group.spawnInterval !== undefined) {
    assert(isPositiveNumber(group.spawnInterval), `${prefix} has invalid spawnInterval`);
  }
  if (group.startDelay !== undefined) {
    assert(isNonNegativeNumber(group.startDelay), `${prefix} has invalid startDelay`);
  }
  if (group.hiddenUntilSecondsLeft !== undefined) {
    assert(isNonNegativeNumber(group.hiddenUntilSecondsLeft), `${prefix} has invalid hiddenUntilSecondsLeft`);
  }
}

function validateWave(levelId: string, wave: WaveConfig) {
  assert(typeof wave.id === 'string' && wave.id.length > 0, `level "${levelId}" has a wave with missing id`);
  assert(Array.isArray(wave.groups) && wave.groups.length > 0, `level "${levelId}" wave "${wave.id}" has no groups`);
  if (wave.preWaveDelay !== undefined) {
    assert(isNonNegativeNumber(wave.preWaveDelay), `level "${levelId}" wave "${wave.id}" has invalid preWaveDelay`);
  }
  if (wave.completionBonus !== undefined) {
    assert(isNonNegativeNumber(wave.completionBonus), `level "${levelId}" wave "${wave.id}" has invalid completionBonus`);
  }

  wave.groups.forEach((group, index) => validateGroup(group, levelId, wave.id, index));
}

function validateLevel(level: LevelConfig) {
  assert(typeof level.id === 'string' && level.id.length > 0, 'level is missing id');
  assert(typeof level.name === 'string' && level.name.length > 0, `level "${level.id}" is missing name`);
  assert(Array.isArray(level.waves) && level.waves.length > 0, `level "${level.id}" has no waves`);
  assert(Array.isArray(level.activePathIds) && level.activePathIds.length > 0, `level "${level.id}" has invalid activePathIds`);
  if (level.lanes !== undefined) {
    assert(level.lanes.length === level.activePathIds.length, `level "${level.id}" lanes must align with activePathIds`);
  }
  for (const zone of level.restrictedZones ?? []) {
    validateZone(level.id, zone, 'restricted zone');
  }
  for (const zone of level.buildZones ?? []) {
    validateZone(level.id, zone, 'build zone');
  }
  for (const hazard of level.hazards ?? []) {
    assert(typeof hazard.id === 'string' && hazard.id.length > 0, `level "${level.id}" has hazard with invalid id`);
    if ('interval' in hazard && hazard.interval !== undefined) {
      assert(isPositiveNumber(hazard.interval), `level "${level.id}" hazard "${hazard.id}" has invalid interval`);
    }
    if ('duration' in hazard && hazard.duration !== undefined) {
      assert(isNonNegativeNumber(hazard.duration), `level "${level.id}" hazard "${hazard.id}" has invalid duration`);
    }
    if ('pathIds' in hazard && hazard.pathIds !== undefined) {
      assert(Array.isArray(hazard.pathIds) && hazard.pathIds.length > 0, `level "${level.id}" hazard "${hazard.id}" has invalid pathIds`);
    }
    if ('routeShift' in hazard && hazard.routeShift !== undefined) {
      assert(Array.isArray(hazard.routeShift.pathIds) && hazard.routeShift.pathIds.length > 0, `level "${level.id}" hazard "${hazard.id}" has invalid routeShift.pathIds`);
      assert(isNonNegativeNumber(Math.abs(hazard.routeShift.offsetX)), `level "${level.id}" hazard "${hazard.id}" has invalid routeShift.offsetX`);
      assert(isNonNegativeNumber(Math.abs(hazard.routeShift.offsetZ)), `level "${level.id}" hazard "${hazard.id}" has invalid routeShift.offsetZ`);
      if (hazard.routeShift.startRatio !== undefined) {
        assert(isNonNegativeNumber(hazard.routeShift.startRatio) && hazard.routeShift.startRatio <= 1, `level "${level.id}" hazard "${hazard.id}" has invalid routeShift.startRatio`);
      }
      if (hazard.routeShift.endRatio !== undefined) {
        assert(isNonNegativeNumber(hazard.routeShift.endRatio) && hazard.routeShift.endRatio <= 1, `level "${level.id}" hazard "${hazard.id}" has invalid routeShift.endRatio`);
      }
    }
  }
  level.waves.forEach((wave) => validateWave(level.id, wave));
}

function validateNode(node: CampaignNodeConfig, levelIds: Set<string>, choiceIds: Set<string>) {
  assert(typeof node.id === 'string' && node.id.length > 0, 'campaign node is missing id');
  assert(levelIds.has(node.levelId), `node "${node.id}" references unknown level "${node.levelId}"`);
  assert(Number.isInteger(node.order) && node.order > 0, `node "${node.id}" has invalid order`);
  if (node.choiceId !== undefined) {
    assert(choiceIds.has(node.choiceId), `node "${node.id}" references unknown choice "${node.choiceId}"`);
  }
}

export function validateCampaignConfig(campaign: CampaignConfig) {
  assert(typeof campaign.version === 'number', 'version is missing');
  assert(typeof campaign.meta?.id === 'string' && campaign.meta.id.length > 0, 'meta.id is missing');
  assert(typeof campaign.meta?.name === 'string' && campaign.meta.name.length > 0, 'meta.name is missing');
  assert(Array.isArray(campaign.paths) && campaign.paths.length > 0, 'paths are missing');
  assert(Array.isArray(campaign.levels) && campaign.levels.length > 0, 'levels are missing');
  const pathIds = new Set<string>();
  for (const path of campaign.paths) {
    assert(typeof path.id === 'string' && path.id.length > 0, 'path is missing id');
    assert(Number.isInteger(path.pathIndex) && path.pathIndex >= 0, `path "${path.id}" has invalid pathIndex`);
    assert(Boolean(ALL_PATHS[path.pathIndex]?.length), `path "${path.id}" points to missing pathIndex ${path.pathIndex}`);
    pathIds.add(path.id);
  }

  const defaults = campaign.defaults;
  assert(isNonNegativeNumber(defaults.startingMoney), 'defaults.startingMoney is invalid');
  assert(isPositiveNumber(defaults.startingLives), 'defaults.startingLives is invalid');
  assert(isNonNegativeNumber(defaults.waveCompletionBonus), 'defaults.waveCompletionBonus is invalid');
  assert(Array.isArray(defaults.availableTowers) && defaults.availableTowers.length > 0, 'defaults.availableTowers is invalid');
  assert(pathIds.has(defaults.defaultPathId), 'defaults.defaultPathId is invalid');

  const levelIds = new Set<string>();
  for (const level of campaign.levels) {
    validateLevel(level);
    assert(!levelIds.has(level.id), `duplicate level id "${level.id}"`);
    levelIds.add(level.id);
    for (const pathId of level.activePathIds ?? []) {
      assert(pathIds.has(pathId), `level "${level.id}" references unknown path "${pathId}"`);
    }
    for (const hazard of level.hazards ?? []) {
      if ('pathIds' in hazard) {
        for (const pathId of hazard.pathIds ?? []) {
          assert(pathIds.has(pathId), `level "${level.id}" hazard "${hazard.id}" references unknown path "${pathId}"`);
        }
      }
      if ('routeShift' in hazard && hazard.routeShift) {
        for (const pathId of hazard.routeShift.pathIds) {
          assert(pathIds.has(pathId), `level "${level.id}" hazard "${hazard.id}" routeShift references unknown path "${pathId}"`);
        }
      }
    }
    for (const towerId of level.availableTowers ?? defaults.availableTowers) {
      assert(Boolean(TOWER_DEFS[towerId]), `level "${level.id}" references unknown tower "${towerId}"`);
    }
    for (const towerId of level.newTowerIds ?? []) {
      assert(Boolean(TOWER_DEFS[towerId]), `level "${level.id}" references unknown new tower "${towerId}"`);
    }
    for (const enemyId of level.newEnemyIds ?? []) {
      assert(Boolean(ENEMY_DEFS[enemyId]), `level "${level.id}" references unknown new enemy "${enemyId}"`);
    }
  }

  const templateMap = campaign.spawnTemplates ?? {};
  for (const [name, template] of Object.entries(templateMap)) {
    assert(Boolean(ENEMY_DEFS[template.enemyId]), `template "${name}" references unknown enemy "${template.enemyId}"`);
    if (template.pathId !== undefined) {
      assert(pathIds.has(template.pathId), `template "${name}" references unknown path "${template.pathId}"`);
    }
  }

  for (const level of campaign.levels) {
    for (const wave of level.waves) {
      for (const [index, group] of wave.groups.entries()) {
        const template = group.template ? templateMap[group.template] : undefined;
        if (group.template) {
          assert(Boolean(template), `level "${level.id}" wave "${wave.id}" group ${index} references unknown template "${group.template}"`);
        }
        const enemyId = group.enemyId ?? template?.enemyId;
        const pathId = group.pathId ?? template?.pathId ?? campaign.defaults.defaultPathId;
        assert(Boolean(enemyId) && Boolean(ENEMY_DEFS[enemyId!]), `level "${level.id}" wave "${wave.id}" group ${index} references unknown enemy`);
        assert(pathIds.has(pathId), `level "${level.id}" wave "${wave.id}" group ${index} references unknown path "${pathId}"`);
      }
    }
  }

  const choiceIds = new Set<string>();
  for (const choice of campaign.branchChoices ?? []) {
    assert(typeof choice.id === 'string' && choice.id.length > 0, 'branch choice has invalid id');
    choiceIds.add(choice.id);
    for (const option of choice.options) {
      assert(typeof option.id === 'string' && option.id.length > 0, `choice "${choice.id}" has invalid option id`);
    }
  }

  const resolvedNodes =
    campaign.campaignNodes ??
    campaign.levels.map((level, index) => ({
      id: `node-${index + 1}`,
      levelId: level.id,
      order: index + 1,
      nextNodeId: index < campaign.levels.length - 1 ? `node-${index + 2}` : undefined,
    }));

  const nodeIds = new Set<string>();
  for (const node of resolvedNodes) {
    validateNode(node, levelIds, choiceIds);
    assert(!nodeIds.has(node.id), `duplicate campaign node "${node.id}"`);
    nodeIds.add(node.id);
  }

  for (const choice of campaign.branchChoices ?? []) {
    for (const option of choice.options) {
      assert(nodeIds.has(option.nextNodeId), `choice "${choice.id}" points to unknown node "${option.nextNodeId}"`);
    }
  }
  for (const node of resolvedNodes) {
    if (node.nextNodeId !== undefined) {
      assert(nodeIds.has(node.nextNodeId), `node "${node.id}" points to unknown node "${node.nextNodeId}"`);
    }
  }
}
