import type { SpawnGroup } from '../types';

export interface CampaignMeta {
  id: string;
  name: string;
}

export interface CampaignPathRef {
  id: string;
  pathIndex: number;
}

export interface CampaignDefaults {
  startingMoney: number;
  startingLives: number;
  waveCompletionBonus: number;
  autoStartWaves: boolean;
  availableTowers: string[];
  startingSelectedTower: string | null;
  defaultPathId: string;
}

export interface SpawnGroupModifiers {
  hpMultiplier?: number;
  speedMultiplier?: number;
  rewardMultiplier?: number;
  sizeMultiplier?: number;
  tags?: string[];
}

export interface SpawnTemplateConfig {
  enemyId: string;
  count: number;
  spawnInterval: number;
  startDelay?: number;
  pathId?: string;
  modifiers?: SpawnGroupModifiers;
}

export interface SpawnGroupConfig {
  template?: string;
  enemyId?: string;
  count?: number;
  spawnInterval?: number;
  startDelay?: number;
  pathId?: string;
  modifiers?: SpawnGroupModifiers;
}

export interface WaveConfig {
  id: string;
  name?: string;
  preWaveDelay?: number;
  completionBonus?: number;
  groups: SpawnGroupConfig[];
}

export interface LevelConfig {
  id: string;
  name: string;
  description?: string;
  startingMoney?: number;
  startingLives?: number;
  waveCompletionBonus?: number;
  autoStartWaves?: boolean;
  availableTowers?: string[];
  startingSelectedTower?: string | null;
  waves: WaveConfig[];
}

export interface CampaignConfig {
  version: number;
  meta: CampaignMeta;
  paths: CampaignPathRef[];
  defaults: CampaignDefaults;
  spawnTemplates?: Record<string, SpawnTemplateConfig>;
  levels: LevelConfig[];
}

export type ResolvedSpawnGroup = SpawnGroup;

export interface ResolvedWave {
  id: string;
  name: string;
  preWaveDelay: number;
  completionBonus: number;
  groups: ResolvedSpawnGroup[];
}

export interface ResolvedLevel {
  id: string;
  name: string;
  description: string;
  startingMoney: number;
  startingLives: number;
  waveCompletionBonus: number;
  autoStartWaves: boolean;
  availableTowers: string[];
  startingSelectedTower: string | null;
  waves: ResolvedWave[];
}

export interface ResolvedCampaign {
  version: number;
  meta: CampaignMeta;
  defaults: CampaignDefaults;
  levels: ResolvedLevel[];
}

export interface LevelRuntimeState {
  levelIndex: number;
  waveIndex: number;
  currentLevel: ResolvedLevel;
  currentWave: ResolvedWave;
  availableTowerIds: string[];
  startingMoney: number;
  startingLives: number;
  startingSelectedTower: string | null;
}

export interface ProgressAdvanceResult {
  phase: 'between-waves' | 'victory';
  levelIndex: number;
  waveIndex: number;
  currentLevel: ResolvedLevel | null;
  currentWave: ResolvedWave | null;
  availableTowerIds: string[];
}
