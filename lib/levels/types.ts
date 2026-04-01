import type { SpawnGroup } from '../types';
import type { PlacementInvalidReason, TowerDoctrineModifier, Vec2 } from '../types';

export interface CampaignMeta {
  id: string;
  name: string;
}

export interface CampaignWorldConfig {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  mapTint: string;
  storyIntro: string;
  storyOutro?: string;
}

export type LaneRole = 'rush' | 'bruiser' | 'air' | 'support' | 'corruption';

export interface CampaignPathRef {
  id: string;
  pathIndex: number;
}

export interface LaneConfig {
  id: string;
  pathId: string;
  label: string;
  color: string;
  role: LaneRole;
  threat: number;
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
  hiddenUntilSecondsLeft?: number;
  modifiers?: SpawnGroupModifiers;
}

export interface WaveConfig {
  id: string;
  name?: string;
  preWaveDelay?: number;
  completionBonus?: number;
  groups: SpawnGroupConfig[];
}

export type ZoneShapeConfig =
  | {
      shape: 'rect';
      xMin: number;
      xMax: number;
      zMin: number;
      zMax: number;
      label?: string;
    }
  | {
      shape: 'polygon';
      points: Vec2[];
      label?: string;
    };

export type RestrictedZoneConfig = ZoneShapeConfig;

export type BuildZoneConfig = ZoneShapeConfig & {
  id: string;
  type: 'watch' | 'pad';
  pathIds?: string[];
  rangeBonus?: number;
  label?: string;
};

export type LevelHazardType =
  | 'laneSpeedPulse'
  | 'towerPulse'
  | 'placementLock'
  | 'previewMask'
  | 'watchZone'
  | 'globalAlert'
  | 'dragonWake';

export interface BaseHazardConfig {
  id: string;
  type: LevelHazardType;
  label: string;
  description: string;
  worldModifierId?: string;
}

export interface LaneSpeedPulseHazardConfig extends BaseHazardConfig {
  type: 'laneSpeedPulse';
  pathIds: string[];
  interval: number;
  duration: number;
  speedMultiplier: number;
}

export interface TowerPulseHazardConfig extends BaseHazardConfig {
  type: 'towerPulse';
  pathIds: string[];
  interval: number;
  duration: number;
  fireRateBonus: number;
}

export interface PlacementLockHazardConfig extends BaseHazardConfig {
  type: 'placementLock';
  zones: ZoneShapeConfig[];
  interval: number;
  duration: number;
  forecastLead: number;
  placementReason?: PlacementInvalidReason;
}

export interface PreviewMaskHazardConfig extends BaseHazardConfig {
  type: 'previewMask';
  revealLead: number;
  minStartDelay: number;
}

export interface WatchZoneHazardConfig extends BaseHazardConfig {
  type: 'watchZone';
  zones: BuildZoneConfig[];
}

export interface RouteShiftConfig {
  pathIds: string[];
  offsetX: number;
  offsetZ: number;
  startRatio?: number;
  endRatio?: number;
}

export interface GlobalAlertHazardConfig extends BaseHazardConfig {
  type: 'globalAlert' | 'dragonWake';
  alertText: string;
  interval?: number;
  duration?: number;
  pathIds?: string[];
  routeShift?: RouteShiftConfig;
}

export type LevelHazardConfig =
  | LaneSpeedPulseHazardConfig
  | TowerPulseHazardConfig
  | PlacementLockHazardConfig
  | PreviewMaskHazardConfig
  | WatchZoneHazardConfig
  | GlobalAlertHazardConfig;

export interface WorldModifierConfig {
  id: string;
  name: string;
  description: string;
  hazardIds?: string[];
}

export interface OptionalObjectiveConfig {
  id: string;
  text: string;
  kind?: 'no_breach' | 'lives_at_least';
  targetLives?: number;
  rewardFamilyKnowledge?: number;
  rewardLaneControlMastery?: number;
}

export interface UnlockRewardsConfig {
  codexIds?: string[];
  towerIds?: string[];
}

export interface BetweenWaveBeatConfig {
  waveId: string;
  text: string;
}

export interface LevelConfig {
  id: string;
  worldId?: string;
  name: string;
  description?: string;
  briefing?: string;
  storyTitle?: string;
  storyBody?: string;
  memoryLines?: string[];
  familyFocus?: string[];
  dragonForeshadow?: string;
  atmosphere?: string;
  codexUnlocks?: string[];
  activePathIds?: string[];
  lanes?: LaneConfig[];
  restrictedZones?: RestrictedZoneConfig[];
  buildZones?: BuildZoneConfig[];
  hazards?: LevelHazardConfig[];
  worldModifierIds?: string[];
  optionalObjectives?: OptionalObjectiveConfig[];
  unlockRewards?: UnlockRewardsConfig;
  betweenWaveBeats?: BetweenWaveBeatConfig[];
  startingMoney?: number;
  startingLives?: number;
  waveCompletionBonus?: number;
  autoStartWaves?: boolean;
  availableTowers?: string[];
  startingSelectedTower?: string | null;
  newEnemyIds?: string[];
  newTowerIds?: string[];
  waves: WaveConfig[];
}

export interface CampaignChoiceOptionConfig {
  id: string;
  label: string;
  description: string;
  nextNodeId: string;
  consequenceDelta?: Partial<CampaignConsequenceState>;
}

export interface CampaignChoiceConfig {
  id: string;
  prompt: string;
  description: string;
  options: CampaignChoiceOptionConfig[];
}

export interface CampaignNodeConfig {
  id: string;
  levelId: string;
  order: number;
  nextNodeId?: string;
  choiceId?: string;
  modifierIds?: string[];
  storyTitleOverride?: string;
  storyBodyOverride?: string;
  codexUnlocks?: string[];
}

export interface EndingRuleConfig {
  id: string;
  name: string;
  title: string;
  body: string;
  requiredChoices?: Record<string, string>;
  minCivilianIntegrity?: number;
  maxDragonPressure?: number;
  minFamilyKnowledge?: number;
  minLaneControlMastery?: number;
}

export interface CampaignConfig {
  version: number;
  meta: CampaignMeta;
  worlds?: CampaignWorldConfig[];
  paths: CampaignPathRef[];
  defaults: CampaignDefaults;
  spawnTemplates?: Record<string, SpawnTemplateConfig>;
  worldModifiers?: WorldModifierConfig[];
  branchChoices?: CampaignChoiceConfig[];
  endingRules?: EndingRuleConfig[];
  campaignNodes?: CampaignNodeConfig[];
  levels: LevelConfig[];
}

export type ResolvedSpawnGroup = SpawnGroup;

export interface ResolvedLane {
  id: string;
  pathId: string;
  pathIndex: number;
  label: string;
  color: string;
  role: LaneRole;
  threat: number;
}

export type ResolvedZone = ZoneShapeConfig;

export type ResolvedLevelHazard = LevelHazardConfig;

export interface ResolvedWave {
  id: string;
  name: string;
  preWaveDelay: number;
  completionBonus: number;
  groups: ResolvedSpawnGroup[];
}

export interface ResolvedLevel {
  id: string;
  worldId: string;
  activePathIds: string[];
  lanes: ResolvedLane[];
  name: string;
  description: string;
  briefing: string;
  storyTitle: string;
  storyBody: string;
  memoryLines: string[];
  familyFocus: string[];
  dragonForeshadow: string;
  atmosphere: string;
  codexUnlocks: string[];
  restrictedZones: ResolvedZone[];
  buildZones: BuildZoneConfig[];
  hazards: ResolvedLevelHazard[];
  worldModifierIds: string[];
  optionalObjectives: OptionalObjectiveConfig[];
  unlockRewards: UnlockRewardsConfig;
  betweenWaveBeats: BetweenWaveBeatConfig[];
  startingMoney: number;
  startingLives: number;
  waveCompletionBonus: number;
  autoStartWaves: boolean;
  availableTowers: string[];
  startingSelectedTower: string | null;
  newEnemyIds: string[];
  newTowerIds: string[];
  waves: ResolvedWave[];
}

export interface ResolvedWorld {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  accent: string;
  mapTint: string;
  storyIntro: string;
  storyOutro: string;
}

export interface ResolvedWorldModifier {
  id: string;
  name: string;
  description: string;
  hazardIds: string[];
}

export interface ResolvedCampaignChoiceOption {
  id: string;
  label: string;
  description: string;
  nextNodeId: string;
  consequenceDelta: Partial<CampaignConsequenceState>;
}

export interface ResolvedCampaignChoice {
  id: string;
  prompt: string;
  description: string;
  options: ResolvedCampaignChoiceOption[];
}

export interface ResolvedCampaignNode {
  id: string;
  levelId: string;
  order: number;
  nextNodeId: string | null;
  choiceId: string | null;
  modifierIds: string[];
  storyTitleOverride?: string;
  storyBodyOverride?: string;
  codexUnlocks: string[];
}

export interface ResolvedEndingRule {
  id: string;
  name: string;
  title: string;
  body: string;
  requiredChoices: Record<string, string>;
  minCivilianIntegrity: number;
  maxDragonPressure: number;
  minFamilyKnowledge: number;
  minLaneControlMastery: number;
}

export interface ResolvedCampaign {
  version: number;
  meta: CampaignMeta;
  defaults: CampaignDefaults;
  worlds: ResolvedWorld[];
  levels: ResolvedLevel[];
  worldModifiers: ResolvedWorldModifier[];
  choices: ResolvedCampaignChoice[];
  nodes: ResolvedCampaignNode[];
  endings: ResolvedEndingRule[];
}

export interface LevelRuntimeState {
  levelIndex: number;
  waveIndex: number;
  worldIndex: number;
  currentWorld: ResolvedWorld;
  currentNode: ResolvedCampaignNode;
  currentLevel: ResolvedLevel;
  currentWave: ResolvedWave;
  availableTowerIds: string[];
  startingMoney: number;
  startingLives: number;
  startingSelectedTower: string | null;
}

export interface ProgressAdvanceResult {
  phase: 'between-waves' | 'intermission' | 'victory';
  nodeId: string | null;
  levelIndex: number;
  waveIndex: number;
  currentNode: ResolvedCampaignNode | null;
  currentLevel: ResolvedLevel | null;
  currentWave: ResolvedWave | null;
  availableTowerIds: string[];
  pendingChoice: ResolvedCampaignChoice | null;
}

export interface CampaignConsequenceState {
  civilianIntegrity: number;
  dragonPressure: number;
  familyKnowledge: number;
  laneControlMastery: number;
  laneBreaches: number;
}

export interface SaveSlotLevelBest {
  livesRemaining: number;
  clearedAtWave: number;
}

export interface SaveSlotData {
  slot: number;
  campaignId: string;
  currentNodeId: string;
  currentWaveIndex: number;
  completedNodeIds: string[];
  completedObjectiveIds: string[];
  branchChoices: Record<string, string>;
  unlockedCodexIds: string[];
  unlockedTowerIds: string[];
  doctrineChoices: Record<string, string>;
  consequenceState: CampaignConsequenceState;
  levelBest: Record<string, SaveSlotLevelBest>;
  activeEndingId: string | null;
}

export interface ProfileProgress {
  doctrineFamiliesUnlocked: string[];
  completedEndingIds: string[];
  challengeMutators: string[];
  activeChallengeMutators: string[];
  codexCompletion: string[];
  arcadeMedals: Record<string, string>;
  lastSlot: number;
}

export interface TowerDoctrineDef {
  id: string;
  towerId: string;
  name: string;
  summary: string;
  modifier: TowerDoctrineModifier;
}
