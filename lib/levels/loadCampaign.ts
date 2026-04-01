import { CAMPAIGN_CONFIG } from '../data/campaign';
import type {
  CampaignConfig,
  ResolvedCampaign,
  ResolvedCampaignChoice,
  ResolvedCampaignNode,
  ResolvedEndingRule,
  ResolvedLevel,
  ResolvedSpawnGroup,
  ResolvedWave,
  ResolvedWorld,
  ResolvedWorldModifier,
  SpawnGroupConfig,
} from './types';
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
    hiddenUntilSecondsLeft: group.hiddenUntilSecondsLeft,
  };
}

export function loadCampaign(config: CampaignConfig): ResolvedCampaign {
  validateCampaignConfig(config);

  const pathMap = new Map(config.paths.map((path) => [path.id, path.pathIndex]));
  const templateMap = config.spawnTemplates ?? {};
  const worlds: ResolvedWorld[] = (config.worlds ?? []).map((world) => ({
    id: world.id,
    name: world.name,
    subtitle: world.subtitle,
    description: world.description,
    accent: world.accent,
    mapTint: world.mapTint,
    storyIntro: world.storyIntro,
    storyOutro: world.storyOutro ?? '',
  }));
  const defaultWorldId = worlds[0]?.id ?? 'world-1';

  const levels: ResolvedLevel[] = config.levels.map((level) => {
    const availableTowers = [...(level.availableTowers ?? config.defaults.availableTowers)];
    const startingSelectedTower = level.startingSelectedTower ?? config.defaults.startingSelectedTower;
    const resolvedLevel: ResolvedLevel = {
      id: level.id,
      worldId: level.worldId ?? defaultWorldId,
      activePathIds: [...(level.activePathIds ?? [config.defaults.defaultPathId])],
      lanes: (level.lanes ?? []).map((lane) => ({
        ...lane,
        pathIndex: pathMap.get(lane.pathId) ?? 0,
      })),
      name: level.name,
      description: level.description ?? '',
      briefing: level.briefing ?? level.description ?? '',
      storyTitle: level.storyTitle ?? level.name,
      storyBody: level.storyBody ?? level.briefing ?? level.description ?? '',
      memoryLines: [...(level.memoryLines ?? [])],
      familyFocus: [...(level.familyFocus ?? [])],
      dragonForeshadow: level.dragonForeshadow ?? '',
      atmosphere: level.atmosphere ?? '',
      codexUnlocks: [...(level.codexUnlocks ?? [])],
      restrictedZones: [...(level.restrictedZones ?? [])],
      buildZones: [...(level.buildZones ?? [])],
      hazards: [...(level.hazards ?? [])],
      worldModifierIds: [...(level.worldModifierIds ?? [])],
      optionalObjectives: [...(level.optionalObjectives ?? [])],
      unlockRewards: {
        codexIds: [...(level.unlockRewards?.codexIds ?? [])],
        towerIds: [...(level.unlockRewards?.towerIds ?? [])],
      },
      betweenWaveBeats: [...(level.betweenWaveBeats ?? [])],
      startingMoney: level.startingMoney ?? config.defaults.startingMoney,
      startingLives: level.startingLives ?? config.defaults.startingLives,
      waveCompletionBonus: level.waveCompletionBonus ?? config.defaults.waveCompletionBonus,
      autoStartWaves: level.autoStartWaves ?? config.defaults.autoStartWaves,
      availableTowers,
      startingSelectedTower:
        startingSelectedTower && availableTowers.includes(startingSelectedTower)
          ? startingSelectedTower
          : availableTowers[0] ?? null,
      newEnemyIds: [...(level.newEnemyIds ?? [])],
      newTowerIds: [...(level.newTowerIds ?? [])],
      waves: [],
    };

    resolvedLevel.waves = level.waves.map((wave, waveIndex) => {
      const resolvedWave: ResolvedWave = {
        id: wave.id,
        name: wave.name ?? `Wave ${waveIndex + 1}`,
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

  const worldModifiers: ResolvedWorldModifier[] = (config.worldModifiers ?? []).map((modifier) => ({
    id: modifier.id,
    name: modifier.name,
    description: modifier.description,
    hazardIds: [...(modifier.hazardIds ?? [])],
  }));

  const choices: ResolvedCampaignChoice[] = (config.branchChoices ?? []).map((choice) => ({
    id: choice.id,
    prompt: choice.prompt,
    description: choice.description,
    options: choice.options.map((option) => ({
      id: option.id,
      label: option.label,
      description: option.description,
      nextNodeId: option.nextNodeId,
      consequenceDelta: { ...(option.consequenceDelta ?? {}) },
    })),
  }));

  const sourceNodes: Array<{
    id: string;
    levelId: string;
    order: number;
    nextNodeId?: string;
    choiceId?: string;
    modifierIds?: string[];
    storyTitleOverride?: string;
    storyBodyOverride?: string;
    codexUnlocks?: string[];
  }> =
    config.campaignNodes ??
    config.levels.map((level, index) => ({
      id: `node-${index + 1}`,
      levelId: level.id,
      order: index + 1,
      nextNodeId: index < config.levels.length - 1 ? `node-${index + 2}` : undefined,
    }));

  const nodes: ResolvedCampaignNode[] = sourceNodes.map((node) => ({
    id: node.id,
    levelId: node.levelId,
    order: node.order,
    nextNodeId: node.nextNodeId ?? null,
    choiceId: node.choiceId ?? null,
    modifierIds: [...(node.modifierIds ?? [])],
    storyTitleOverride: node.storyTitleOverride,
    storyBodyOverride: node.storyBodyOverride,
    codexUnlocks: [...(node.codexUnlocks ?? [])],
  }));

  const endings: ResolvedEndingRule[] = (config.endingRules ?? []).map((ending) => ({
    id: ending.id,
    name: ending.name,
    title: ending.title,
    body: ending.body,
    requiredChoices: { ...(ending.requiredChoices ?? {}) },
    minCivilianIntegrity: ending.minCivilianIntegrity ?? 0,
    maxDragonPressure: ending.maxDragonPressure ?? Number.POSITIVE_INFINITY,
    minFamilyKnowledge: ending.minFamilyKnowledge ?? 0,
    minLaneControlMastery: ending.minLaneControlMastery ?? 0,
  }));

  return {
    version: config.version,
    meta: config.meta,
    defaults: {
      ...config.defaults,
      availableTowers: [...config.defaults.availableTowers],
    },
    worlds,
    levels,
    worldModifiers,
    choices,
    nodes,
    endings,
  };
}

export const CAMPAIGN = loadCampaign(CAMPAIGN_CONFIG);
