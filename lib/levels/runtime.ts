import type {
  CampaignConsequenceState,
  LevelRuntimeState,
  ProgressAdvanceResult,
  ResolvedCampaign,
  ResolvedCampaignChoice,
  ResolvedCampaignNode,
  ResolvedEndingRule,
  ResolvedLevel,
  ResolvedWorld,
  SaveSlotData,
} from './types';

export const DEFAULT_CONSEQUENCES: CampaignConsequenceState = {
  civilianIntegrity: 20,
  dragonPressure: 0,
  familyKnowledge: 0,
  laneControlMastery: 0,
  laneBreaches: 0,
};

function getSafeStartingTower(level: ResolvedLevel): string | null {
  if (level.startingSelectedTower && level.availableTowers.includes(level.startingSelectedTower)) {
    return level.startingSelectedTower;
  }
  return level.availableTowers[0] ?? null;
}

export function createFreshSave(campaign: ResolvedCampaign, slot: number): SaveSlotData {
  const firstNode = getFirstCampaignNode(campaign);
  return {
    slot,
    campaignId: campaign.meta.id,
    currentNodeId: firstNode.id,
    currentWaveIndex: 0,
    completedNodeIds: [],
    completedObjectiveIds: [],
    branchChoices: {},
    unlockedCodexIds: [],
    unlockedTowerIds: [...campaign.defaults.availableTowers.slice(0, 2)],
    doctrineChoices: {},
    consequenceState: { ...DEFAULT_CONSEQUENCES },
    levelBest: {},
    activeEndingId: null,
  };
}

export function getCompletedObjectiveIds(
  level: ResolvedLevel,
  input: { livesRemaining: number; laneBreaches: number },
): string[] {
  return level.optionalObjectives
    .filter((objective) => {
      if (objective.kind === 'lives_at_least') {
        return input.livesRemaining >= (objective.targetLives ?? 0);
      }
      if (objective.kind === 'no_breach' || objective.kind === undefined) {
        return input.laneBreaches === 0;
      }
      return false;
    })
    .map((objective) => objective.id);
}

export function getFirstCampaignNode(campaign: ResolvedCampaign): ResolvedCampaignNode {
  const firstNode = [...campaign.nodes].sort((a, b) => a.order - b.order)[0];
  if (!firstNode) {
    throw new Error('Campaign has no nodes');
  }
  return firstNode;
}

export function getCampaignNode(campaign: ResolvedCampaign, nodeId: string): ResolvedCampaignNode {
  const node = campaign.nodes.find((entry) => entry.id === nodeId);
  if (!node) {
    throw new Error(`Campaign node "${nodeId}" does not exist`);
  }
  return node;
}

export function getCampaignChoice(campaign: ResolvedCampaign, choiceId: string): ResolvedCampaignChoice {
  const choice = campaign.choices.find((entry) => entry.id === choiceId);
  if (!choice) {
    throw new Error(`Campaign choice "${choiceId}" does not exist`);
  }
  return choice;
}

function createFallbackWorld(id: string): ResolvedWorld {
  return {
    id,
    name: 'Unknown World',
    subtitle: '',
    description: '',
    accent: '#ffd666',
    mapTint: '#0c1828',
    storyIntro: '',
    storyOutro: '',
  };
}

function applyModifierTransforms(level: ResolvedLevel): ResolvedLevel {
  const modifierIds = new Set(level.worldModifierIds);
  let startingMoney = level.startingMoney;
  let startingLives = level.startingLives;

  const buildZones = level.buildZones.map((zone) => ({
    ...zone,
    ...(zone.shape === 'polygon'
      ? { points: zone.points.map((point) => ({ ...point })) }
      : {}),
  }));

  const hazards = level.hazards.map((hazard) => {
    if (hazard.type === 'previewMask' && modifierIds.has('signal-route')) {
      return { ...hazard, revealLead: hazard.revealLead + 3 };
    }
    if (hazard.type === 'placementLock' && modifierIds.has('signal-route')) {
      return { ...hazard, forecastLead: hazard.forecastLead + 3 };
    }
    if (hazard.type === 'placementLock' && modifierIds.has('containment-line')) {
      return { ...hazard, duration: Math.max(4, hazard.duration - 2) };
    }
    if (hazard.type === 'globalAlert' && modifierIds.has('containment-line') && hazard.duration !== undefined) {
      return { ...hazard, duration: Math.max(4, hazard.duration - 2) };
    }
    if (hazard.type === 'globalAlert' && modifierIds.has('pursuit-line') && hazard.duration !== undefined) {
      return { ...hazard, duration: hazard.duration + 2 };
    }
    if (hazard.type === 'laneSpeedPulse' && modifierIds.has('pursuit-line')) {
      return { ...hazard, speedMultiplier: hazard.speedMultiplier + 0.04 };
    }
    if (hazard.type === 'dragonWake' && modifierIds.has('pursuit-line') && hazard.interval !== undefined) {
      return { ...hazard, interval: Math.max(6, hazard.interval - 2) };
    }
    return { ...hazard };
  });

  if (modifierIds.has('harbor-route')) {
    startingMoney += 25;
    for (const zone of buildZones) {
      if (zone.type === 'watch') {
        zone.rangeBonus = (zone.rangeBonus ?? 0) + 0.35;
      }
    }
  }

  if (modifierIds.has('containment-line')) {
    startingLives += 2;
  }

  if (modifierIds.has('pursuit-line')) {
    startingMoney += 20;
  }

  return {
    ...level,
    buildZones,
    hazards,
    startingMoney,
    startingLives,
  };
}

export function applyChallengeMutatorsToLevel(level: ResolvedLevel, activeMutatorIds: string[]): ResolvedLevel {
  let startingMoney = level.startingMoney;
  let startingLives = level.startingLives;
  let hazards = level.hazards.map((hazard) => ({ ...hazard }));

  if (activeMutatorIds.includes('lean_pockets')) {
    startingMoney = Math.max(90, Math.round(startingMoney * 0.78));
  }

  if (activeMutatorIds.includes('iron_night')) {
    startingLives = Math.max(8, startingLives - 2);
    hazards = hazards.map((hazard) => {
      if (hazard.type === 'laneSpeedPulse') {
        return { ...hazard, speedMultiplier: hazard.speedMultiplier + 0.05 };
      }
      if (hazard.type === 'dragonWake' && hazard.interval !== undefined) {
        return { ...hazard, interval: Math.max(6, hazard.interval - 1) };
      }
      return hazard;
    });
  }

  return {
    ...level,
    startingMoney,
    startingLives,
    hazards,
  };
}

export function resolveLevelForNode(
  campaign: ResolvedCampaign,
  nodeId: string,
): { currentNode: ResolvedCampaignNode; currentLevel: ResolvedLevel } {
  const currentNode = getCampaignNode(campaign, nodeId);
  const baseLevel = campaign.levels.find((level) => level.id === currentNode.levelId);
  if (!baseLevel) {
    throw new Error(`Campaign level "${currentNode.levelId}" does not exist`);
  }

  const currentLevel = applyModifierTransforms({
      ...baseLevel,
      storyTitle: currentNode.storyTitleOverride ?? baseLevel.storyTitle,
      storyBody: currentNode.storyBodyOverride ?? baseLevel.storyBody,
      codexUnlocks: [...new Set([...baseLevel.codexUnlocks, ...currentNode.codexUnlocks])],
      worldModifierIds: [...new Set([...baseLevel.worldModifierIds, ...currentNode.modifierIds])],
    });

  return {
    currentNode,
    currentLevel,
  };
}

export function getLevelRuntimeState(
  campaign: ResolvedCampaign,
  save: SaveSlotData,
  nodeId = save.currentNodeId,
  waveIndex = save.currentWaveIndex,
  activeMutatorIds: string[] = [],
): LevelRuntimeState {
  const { currentNode, currentLevel: resolvedLevel } = resolveLevelForNode(campaign, nodeId);
  const currentLevel = applyChallengeMutatorsToLevel(resolvedLevel, activeMutatorIds);
  const worldIndex = campaign.worlds.findIndex((world) => world.id === currentLevel.worldId);
  const currentWorld = campaign.worlds[Math.max(0, worldIndex)] ?? createFallbackWorld(currentLevel.worldId);
  const currentWave = currentLevel.waves[waveIndex];
  if (!currentWave) {
    throw new Error(`Campaign level "${currentLevel.id}" wave ${waveIndex} does not exist`);
  }

  const unlockedTowerIds = currentLevel.availableTowers.filter(
    (towerId) =>
      save.unlockedTowerIds.includes(towerId) || campaign.defaults.availableTowers.includes(towerId),
  );

  return {
    levelIndex: currentNode.order - 1,
    waveIndex,
    worldIndex: Math.max(0, worldIndex),
    currentWorld,
    currentNode,
    currentLevel: {
      ...currentLevel,
      availableTowers: unlockedTowerIds,
    },
    currentWave,
    availableTowerIds: unlockedTowerIds,
    startingMoney: currentLevel.startingMoney,
    startingLives: currentLevel.startingLives,
    startingSelectedTower: getSafeStartingTower(currentLevel),
  };
}

export function getPendingChoice(campaign: ResolvedCampaign, nodeId: string): ResolvedCampaignChoice | null {
  const node = getCampaignNode(campaign, nodeId);
  if (!node.choiceId) return null;
  return getCampaignChoice(campaign, node.choiceId);
}

export function advanceCampaignProgress(
  campaign: ResolvedCampaign,
  save: SaveSlotData,
  waveIndex: number,
): ProgressAdvanceResult {
  const { currentNode, currentLevel } = resolveLevelForNode(campaign, save.currentNodeId);
  const nextWave = currentLevel.waves[waveIndex + 1];
  if (nextWave) {
    return {
      phase: 'between-waves',
      nodeId: currentNode.id,
      levelIndex: currentNode.order - 1,
      waveIndex: waveIndex + 1,
      currentNode,
      currentLevel,
      currentWave: nextWave,
      availableTowerIds: currentLevel.availableTowers,
      pendingChoice: null,
    };
  }

  if (currentNode.choiceId) {
    return {
      phase: 'intermission',
      nodeId: currentNode.id,
      levelIndex: currentNode.order - 1,
      waveIndex,
      currentNode,
      currentLevel,
      currentWave: null,
      availableTowerIds: currentLevel.availableTowers,
      pendingChoice: getCampaignChoice(campaign, currentNode.choiceId),
    };
  }

  if (!currentNode.nextNodeId) {
    return {
      phase: 'victory',
      nodeId: null,
      levelIndex: currentNode.order - 1,
      waveIndex,
      currentNode: null,
      currentLevel: null,
      currentWave: null,
      availableTowerIds: [],
      pendingChoice: null,
    };
  }

  const nextState = getLevelRuntimeState(campaign, { ...save, currentNodeId: currentNode.nextNodeId, currentWaveIndex: 0 });
  return {
    phase: 'between-waves',
    nodeId: nextState.currentNode.id,
    levelIndex: nextState.levelIndex,
    waveIndex: 0,
    currentNode: nextState.currentNode,
    currentLevel: nextState.currentLevel,
    currentWave: nextState.currentWave,
    availableTowerIds: nextState.availableTowerIds,
    pendingChoice: null,
  };
}

export function applyChoiceToSave(
  campaign: ResolvedCampaign,
  save: SaveSlotData,
  choiceId: string,
  optionId: string,
): SaveSlotData {
  const choice = getCampaignChoice(campaign, choiceId);
  const option = choice.options.find((entry) => entry.id === optionId);
  if (!option) {
    throw new Error(`Choice "${choiceId}" has no option "${optionId}"`);
  }

  return {
    ...save,
    currentNodeId: option.nextNodeId,
    currentWaveIndex: 0,
    branchChoices: {
      ...save.branchChoices,
      [choiceId]: optionId,
    },
    consequenceState: {
      civilianIntegrity:
        save.consequenceState.civilianIntegrity + (option.consequenceDelta.civilianIntegrity ?? 0),
      dragonPressure:
        save.consequenceState.dragonPressure + (option.consequenceDelta.dragonPressure ?? 0),
      familyKnowledge:
        save.consequenceState.familyKnowledge + (option.consequenceDelta.familyKnowledge ?? 0),
      laneControlMastery:
        save.consequenceState.laneControlMastery + (option.consequenceDelta.laneControlMastery ?? 0),
      laneBreaches: save.consequenceState.laneBreaches,
    },
  };
}

export function resolveEnding(campaign: ResolvedCampaign, save: SaveSlotData): ResolvedEndingRule {
  const exactMatch = campaign.endings.find((ending) => {
    const requiredChoicesOk = Object.entries(ending.requiredChoices).every(
      ([choiceId, optionId]) => save.branchChoices[choiceId] === optionId,
    );
    return (
      requiredChoicesOk &&
      save.consequenceState.civilianIntegrity >= ending.minCivilianIntegrity &&
      save.consequenceState.dragonPressure <= ending.maxDragonPressure &&
      save.consequenceState.familyKnowledge >= ending.minFamilyKnowledge &&
      save.consequenceState.laneControlMastery >= ending.minLaneControlMastery
    );
  });

  return exactMatch ?? campaign.endings[campaign.endings.length - 1];
}

export function getWaveNumberInCampaign(
  campaign: ResolvedCampaign,
  nodeId: string,
  waveIndex: number,
): number {
  const currentNode = getCampaignNode(campaign, nodeId);
  const priorWaveCount = campaign.nodes
    .filter((node) => node.order < currentNode.order)
    .reduce((sum, node) => {
      const level = campaign.levels.find((entry) => entry.id === node.levelId);
      return sum + (level?.waves.length ?? 0);
    }, 0);
  return priorWaveCount + waveIndex + 1;
}

export function getTotalCampaignWaveCount(campaign: ResolvedCampaign): number {
  return campaign.levels.reduce((total, level) => total + level.waves.length, 0);
}
