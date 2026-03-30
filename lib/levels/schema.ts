import { ALL_PATHS } from '../pathData';
import { ENEMY_DEFS } from '../enemyDefs';
import { TOWER_DEFS } from '../towerDefs';
import type {
  CampaignConfig,
  CampaignPathRef,
  LevelConfig,
  SpawnGroupConfig,
  SpawnTemplateConfig,
  WaveConfig,
} from './types';

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

function validateTemplate(name: string, template: SpawnTemplateConfig) {
  assert(typeof template.enemyId === 'string' && template.enemyId.length > 0, `template "${name}" is missing enemyId`);
  assert(isPositiveNumber(template.count), `template "${name}" has invalid count`);
  assert(isPositiveNumber(template.spawnInterval), `template "${name}" has invalid spawnInterval`);
  if (template.startDelay !== undefined) {
    assert(isNonNegativeNumber(template.startDelay), `template "${name}" has invalid startDelay`);
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
  if (group.modifiers) {
    const { hpMultiplier, speedMultiplier, rewardMultiplier, sizeMultiplier, tags } = group.modifiers;
    if (hpMultiplier !== undefined) assert(isPositiveNumber(hpMultiplier), `${prefix} has invalid hpMultiplier`);
    if (speedMultiplier !== undefined) assert(isPositiveNumber(speedMultiplier), `${prefix} has invalid speedMultiplier`);
    if (rewardMultiplier !== undefined) assert(isPositiveNumber(rewardMultiplier), `${prefix} has invalid rewardMultiplier`);
    if (sizeMultiplier !== undefined) assert(isPositiveNumber(sizeMultiplier), `${prefix} has invalid sizeMultiplier`);
    if (tags !== undefined) {
      assert(Array.isArray(tags) && tags.every((tag) => typeof tag === 'string'), `${prefix} has invalid tags`);
    }
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
  if (level.startingMoney !== undefined) assert(isNonNegativeNumber(level.startingMoney), `level "${level.id}" has invalid startingMoney`);
  if (level.startingLives !== undefined) assert(isPositiveNumber(level.startingLives), `level "${level.id}" has invalid startingLives`);
  if (level.waveCompletionBonus !== undefined) assert(isNonNegativeNumber(level.waveCompletionBonus), `level "${level.id}" has invalid waveCompletionBonus`);
  if (level.availableTowers !== undefined) {
    assert(Array.isArray(level.availableTowers) && level.availableTowers.length > 0, `level "${level.id}" has invalid availableTowers`);
  }
  level.waves.forEach((wave) => validateWave(level.id, wave));
}

function validatePath(path: CampaignPathRef) {
  assert(typeof path.id === 'string' && path.id.length > 0, 'path is missing id');
  assert(Number.isInteger(path.pathIndex) && path.pathIndex >= 0, `path "${path.id}" has invalid pathIndex`);
  assert(Boolean(ALL_PATHS[path.pathIndex]?.length), `path "${path.id}" points to missing pathIndex ${path.pathIndex}`);
}

export function validateCampaignConfig(campaign: CampaignConfig) {
  assert(typeof campaign.version === 'number', 'version is missing');
  assert(typeof campaign.meta?.id === 'string' && campaign.meta.id.length > 0, 'meta.id is missing');
  assert(typeof campaign.meta?.name === 'string' && campaign.meta.name.length > 0, 'meta.name is missing');
  assert(Array.isArray(campaign.paths) && campaign.paths.length > 0, 'paths are missing');
  assert(Array.isArray(campaign.levels) && campaign.levels.length > 0, 'levels are missing');

  const defaults = campaign.defaults;
  assert(isNonNegativeNumber(defaults?.startingMoney), 'defaults.startingMoney is invalid');
  assert(isPositiveNumber(defaults?.startingLives), 'defaults.startingLives is invalid');
  assert(isNonNegativeNumber(defaults?.waveCompletionBonus), 'defaults.waveCompletionBonus is invalid');
  assert(typeof defaults?.autoStartWaves === 'boolean', 'defaults.autoStartWaves is invalid');
  assert(Array.isArray(defaults?.availableTowers) && defaults.availableTowers.length > 0, 'defaults.availableTowers is invalid');
  assert(typeof defaults?.defaultPathId === 'string' && defaults.defaultPathId.length > 0, 'defaults.defaultPathId is invalid');
  assert(
    defaults.startingSelectedTower === null ||
      (typeof defaults.startingSelectedTower === 'string' && defaults.startingSelectedTower.length > 0),
    'defaults.startingSelectedTower is invalid',
  );

  const pathIds = new Set<string>();
  campaign.paths.forEach((path) => {
    validatePath(path);
    assert(!pathIds.has(path.id), `duplicate path id "${path.id}"`);
    pathIds.add(path.id);
  });
  assert(pathIds.has(defaults.defaultPathId), `defaults.defaultPathId "${defaults.defaultPathId}" is unknown`);

  for (const towerId of defaults.availableTowers) {
    assert(Boolean(TOWER_DEFS[towerId]), `defaults.availableTowers references unknown tower "${towerId}"`);
  }
  if (defaults.startingSelectedTower !== null) {
    assert(defaults.availableTowers.includes(defaults.startingSelectedTower), 'defaults.startingSelectedTower must be in defaults.availableTowers');
  }

  const templateMap = campaign.spawnTemplates ?? {};
  for (const [name, template] of Object.entries(templateMap)) {
    validateTemplate(name, template);
    assert(Boolean(ENEMY_DEFS[template.enemyId]), `template "${name}" references unknown enemy "${template.enemyId}"`);
    if (template.pathId !== undefined) {
      assert(pathIds.has(template.pathId), `template "${name}" references unknown path "${template.pathId}"`);
    }
  }

  const levelIds = new Set<string>();
  campaign.levels.forEach((level) => {
    validateLevel(level);
    assert(!levelIds.has(level.id), `duplicate level id "${level.id}"`);
    levelIds.add(level.id);
    const levelTowers = level.availableTowers ?? defaults.availableTowers;
    for (const towerId of levelTowers) {
      assert(Boolean(TOWER_DEFS[towerId]), `level "${level.id}" references unknown tower "${towerId}"`);
    }
    if (level.startingSelectedTower !== undefined && level.startingSelectedTower !== null) {
      assert(levelTowers.includes(level.startingSelectedTower), `level "${level.id}" startingSelectedTower must be in availableTowers`);
    }
    for (const wave of level.waves) {
      for (const [index, group] of wave.groups.entries()) {
        const template = group.template ? templateMap[group.template] : undefined;
        if (group.template) {
          assert(Boolean(template), `level "${level.id}" wave "${wave.id}" group ${index} references unknown template "${group.template}"`);
        }
        const enemyId = group.enemyId ?? template?.enemyId;
        assert(typeof enemyId === 'string' && enemyId.length > 0, `level "${level.id}" wave "${wave.id}" group ${index} is missing enemyId`);
        assert(Boolean(ENEMY_DEFS[enemyId]), `level "${level.id}" wave "${wave.id}" group ${index} references unknown enemy "${enemyId}"`);
        const pathId = group.pathId ?? template?.pathId ?? defaults.defaultPathId;
        assert(pathIds.has(pathId), `level "${level.id}" wave "${wave.id}" group ${index} references unknown path "${pathId}"`);
        const count = group.count ?? template?.count;
        const spawnInterval = group.spawnInterval ?? template?.spawnInterval;
        const startDelay = group.startDelay ?? template?.startDelay ?? 0;
        assert(isPositiveNumber(count), `level "${level.id}" wave "${wave.id}" group ${index} has invalid count`);
        assert(isPositiveNumber(spawnInterval), `level "${level.id}" wave "${wave.id}" group ${index} has invalid spawnInterval`);
        assert(isNonNegativeNumber(startDelay), `level "${level.id}" wave "${wave.id}" group ${index} has invalid startDelay`);
      }
    }
  });
}
