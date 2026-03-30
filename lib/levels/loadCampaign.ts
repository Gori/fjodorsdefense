import campaignJson from '../data/campaign.json';
import type { CampaignConfig, ResolvedCampaign, ResolvedLevel, ResolvedSpawnGroup, ResolvedWave, SpawnGroupConfig } from './types';
import { validateCampaignConfig } from './schema';

function mergeTags(templateTags: string[] | undefined, groupTags: string[] | undefined): string[] {
  return [...new Set([...(templateTags ?? []), ...(groupTags ?? [])])];
}

function resolveGroup(
  group: SpawnGroupConfig,
  wave: ResolvedWave,
  templateMap: NonNullable<CampaignConfig['spawnTemplates']>,
  pathMap: Map<string, number>,
  defaultPathId: string,
): ResolvedSpawnGroup {
  const template = group.template ? templateMap[group.template] : undefined;
  const enemyId = group.enemyId ?? template?.enemyId;
  const count = group.count ?? template?.count;
  const spawnInterval = group.spawnInterval ?? template?.spawnInterval;
  const startDelay = (wave.preWaveDelay ?? 0) + (group.startDelay ?? template?.startDelay ?? 0);
  const pathId = group.pathId ?? template?.pathId ?? defaultPathId;
  const templateModifiers = template?.modifiers;
  const groupModifiers = group.modifiers;

  return {
    enemyId: enemyId!,
    count: count!,
    pathIndex: pathMap.get(pathId)!,
    spawnInterval: spawnInterval!,
    startDelay,
    hpMultiplier: groupModifiers?.hpMultiplier ?? templateModifiers?.hpMultiplier ?? 1,
    speedMultiplier: groupModifiers?.speedMultiplier ?? templateModifiers?.speedMultiplier ?? 1,
    rewardMultiplier: groupModifiers?.rewardMultiplier ?? templateModifiers?.rewardMultiplier ?? 1,
    sizeMultiplier: groupModifiers?.sizeMultiplier ?? templateModifiers?.sizeMultiplier ?? 1,
    tags: mergeTags(templateModifiers?.tags, groupModifiers?.tags),
  };
}

export function loadCampaign(config: CampaignConfig): ResolvedCampaign {
  validateCampaignConfig(config);

  const pathMap = new Map(config.paths.map((path) => [path.id, path.pathIndex]));
  const templateMap = config.spawnTemplates ?? {};

  const levels: ResolvedLevel[] = config.levels.map((level) => {
    const availableTowers = [...(level.availableTowers ?? config.defaults.availableTowers)];
    const startingSelectedTower = level.startingSelectedTower ?? config.defaults.startingSelectedTower;
    const resolvedLevel: ResolvedLevel = {
      id: level.id,
      name: level.name,
      description: level.description ?? '',
      startingMoney: level.startingMoney ?? config.defaults.startingMoney,
      startingLives: level.startingLives ?? config.defaults.startingLives,
      waveCompletionBonus: level.waveCompletionBonus ?? config.defaults.waveCompletionBonus,
      autoStartWaves: level.autoStartWaves ?? config.defaults.autoStartWaves,
      availableTowers,
      startingSelectedTower: startingSelectedTower && availableTowers.includes(startingSelectedTower)
        ? startingSelectedTower
        : availableTowers[0] ?? null,
      waves: [],
    };

    resolvedLevel.waves = level.waves.map((wave) => {
      const resolvedWave: ResolvedWave = {
        id: wave.id,
        name: wave.name ?? `Wave ${resolvedLevel.waves.length + 1}`,
        preWaveDelay: wave.preWaveDelay ?? 0,
        completionBonus: wave.completionBonus ?? resolvedLevel.waveCompletionBonus,
        groups: [],
      };
      resolvedWave.groups = wave.groups.map((group) =>
        resolveGroup(group, resolvedWave, templateMap, pathMap, config.defaults.defaultPathId),
      );
      return resolvedWave;
    });

    return resolvedLevel;
  });

  return {
    version: config.version,
    meta: config.meta,
    defaults: {
      ...config.defaults,
      availableTowers: [...config.defaults.availableTowers],
    },
    levels,
  };
}

export const CAMPAIGN = loadCampaign(campaignJson as CampaignConfig);
