import type { ProgressAdvanceResult, ResolvedCampaign, ResolvedLevel, LevelRuntimeState } from './types';

function getSafeStartingTower(level: ResolvedLevel): string | null {
  if (level.startingSelectedTower && level.availableTowers.includes(level.startingSelectedTower)) {
    return level.startingSelectedTower;
  }
  return level.availableTowers[0] ?? null;
}

export function getLevelRuntimeState(campaign: ResolvedCampaign, levelIndex: number, waveIndex = 0): LevelRuntimeState {
  const currentLevel = campaign.levels[levelIndex];
  if (!currentLevel) {
    throw new Error(`Campaign level ${levelIndex} does not exist`);
  }

  const currentWave = currentLevel.waves[waveIndex];
  if (!currentWave) {
    throw new Error(`Campaign level ${levelIndex} wave ${waveIndex} does not exist`);
  }

  return {
    levelIndex,
    waveIndex,
    currentLevel,
    currentWave,
    availableTowerIds: [...currentLevel.availableTowers],
    startingMoney: currentLevel.startingMoney,
    startingLives: currentLevel.startingLives,
    startingSelectedTower: getSafeStartingTower(currentLevel),
  };
}

export function advanceCampaignProgress(
  campaign: ResolvedCampaign,
  levelIndex: number,
  waveIndex: number,
): ProgressAdvanceResult {
  const level = campaign.levels[levelIndex];
  if (!level) {
    throw new Error(`Campaign level ${levelIndex} does not exist`);
  }

  const nextWave = level.waves[waveIndex + 1];
  if (nextWave) {
    return {
      phase: 'between-waves',
      levelIndex,
      waveIndex: waveIndex + 1,
      currentLevel: level,
      currentWave: nextWave,
      availableTowerIds: [...level.availableTowers],
    };
  }

  const nextLevel = campaign.levels[levelIndex + 1];
  if (!nextLevel) {
    return {
      phase: 'victory',
      levelIndex,
      waveIndex,
      currentLevel: null,
      currentWave: null,
      availableTowerIds: [],
    };
  }

  return {
    phase: 'between-waves',
    levelIndex: levelIndex + 1,
    waveIndex: 0,
    currentLevel: nextLevel,
    currentWave: nextLevel.waves[0] ?? null,
    availableTowerIds: [...nextLevel.availableTowers],
  };
}

export function getWaveNumberInCampaign(campaign: ResolvedCampaign, levelIndex: number, waveIndex: number): number {
  let count = 0;
  for (let i = 0; i < levelIndex; i++) {
    count += campaign.levels[i]?.waves.length ?? 0;
  }
  return count + waveIndex + 1;
}

export function getTotalCampaignWaveCount(campaign: ResolvedCampaign): number {
  return campaign.levels.reduce((total, level) => total + level.waves.length, 0);
}
