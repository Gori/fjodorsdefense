import { create } from 'zustand';
import type {
  CameraMode,
  GamePhase,
  PlacementInvalidReason,
  TowerInstance,
  Vec2,
} from './types';
import { CAMPAIGN } from './levels/loadCampaign';
import type {
  ResolvedCampaign,
  ResolvedCampaignChoice,
  ResolvedLevel,
  ResolvedWave,
  ResolvedWorld,
} from './levels/types';
import {
  advanceCampaignProgress,
  createFreshSave,
  getLevelRuntimeState,
  getPendingChoice,
  resolveEnding,
} from './levels/runtime';
import { distance, pointInPolygon } from './mapUtils';
import { gameRuntime, getPathPointsForRuntime } from './runtime';
import { resolveTowerDef } from './doctrines';
import { useCampaignStore } from './campaignStore';
import { useProfileStore } from './profileStore';

interface GameStore {
  phase: GamePhase;
  campaign: ResolvedCampaign;
  worldIndex: number;
  currentWorld: ResolvedWorld | null;
  levelIndex: number;
  waveIndex: number;
  currentLevel: ResolvedLevel | null;
  currentWave: ResolvedWave | null;
  availableTowerIds: string[];
  money: number;
  lives: number;
  gameTime: number;
  towers: TowerInstance[];
  selectedTowerDef: string | null;
  cameraMode: CameraMode;
  cameraModeBeforeFirstPerson: Exclude<CameraMode, 'firstPerson'>;
  showPathOverlay: boolean;
  showCodex: boolean;
  placementHint: string | null;
  pendingChoice: ResolvedCampaignChoice | null;
  pendingDoctrineTowerId: string | null;
  activeHazardLabel: string | null;

  hydratePersistence: () => void;
  startGame: (slot?: number) => void;
  startWave: () => void;
  placeTower: (defId: string, position: Vec2) => boolean;
  selectTowerDef: (defId: string | null) => void;
  setCameraMode: (mode: CameraMode) => void;
  toggleCameraMode: () => void;
  toggleFirstPersonMode: () => void;
  togglePathOverlay: () => void;
  toggleCodex: () => void;
  setPlacementHint: (hint: string | null) => void;
  chooseBranch: (choiceId: string, optionId: string) => void;
  chooseDoctrine: (towerId: string, doctrineId: string) => void;
  tick: (delta: number) => void;
}

type StoreSetter = (partial: Partial<GameStore>) => void;

const MIN_TOWER_SPACING = 1.5;

function createTowerIdFactory() {
  let nextId = 0;
  return {
    reset() {
      nextId = 0;
    },
    next() {
      nextId += 1;
      return `t${nextId}`;
    },
  };
}

const towerIds = createTowerIdFactory();

function findPendingDoctrineTower(level: ResolvedLevel | null, doctrineChoices: Record<string, string>) {
  if (!level) return null;
  return level.newTowerIds.find((towerId) => !doctrineChoices[towerId]) ?? null;
}

function getHazardAlert(level: ResolvedLevel | null, gameTime: number): string | null {
  if (!level) return null;
  for (const hazard of level.hazards) {
    if (hazard.type === 'dragonWake') {
      return hazard.label;
    }
    if (hazard.type === 'globalAlert') {
      if (!hazard.interval || hazard.duration === undefined || gameTime % hazard.interval <= hazard.duration) {
        return hazard.label;
      }
      continue;
    }
    if (hazard.type === 'laneSpeedPulse' && gameTime % hazard.interval <= hazard.duration) {
      return hazard.label;
    }
    if (hazard.type === 'placementLock' && gameTime % hazard.interval <= hazard.duration) {
      return hazard.label;
    }
  }
  return level.hazards[0]?.label ?? null;
}

function zoneContainsPosition(
  zone: ResolvedLevel['restrictedZones'][number] | ResolvedLevel['buildZones'][number],
  position: Vec2,
) {
  if (zone.shape === 'rect') {
    return (
      position.x >= zone.xMin &&
      position.x <= zone.xMax &&
      position.z >= zone.zMin &&
      position.z <= zone.zMax
    );
  }
  return pointInPolygon(position.x, position.z, zone.points.map((point) => [point.x, point.z]));
}

function isLaneNoBuild(level: ResolvedLevel | null, position: Vec2, gameTime: number) {
  if (!level) return false;
  return level.lanes.some((lane) =>
    getPathPointsForRuntime(lane.pathIndex, level, gameTime).some((point) => distance(point, position) <= 1.4),
  );
}

function getPlacementReasonLabel(reason: PlacementInvalidReason | null) {
  switch (reason) {
    case 'occupied_by_structure':
      return 'Blocked by structure';
    case 'blocked_by_hazard':
      return 'Blocked by hazard';
    case 'in_lane_no_build_zone':
      return 'Cannot build in lane';
    case 'world_locked_zone':
      return 'Zone locked';
    case 'too_close_to_tower':
      return 'Too close to another tower';
    case 'insufficient_money':
      return 'Need more money';
    case 'cannot_build_on_water':
      return 'Cannot build on water';
    default:
      return null;
  }
}

function getWatchZoneBonus(level: ResolvedLevel | null, position: Vec2) {
  if (!level) return 0;
  for (const zone of level.buildZones) {
    if (zone.type !== 'watch') continue;
    if (!zoneContainsPosition(zone, position)) continue;
    return zone.rangeBonus ?? 0;
  }
  return 0;
}

function getPlacementHazardReason(level: ResolvedLevel | null, gameTime: number, position: Vec2): PlacementInvalidReason | null {
  if (!level) return null;
  for (const hazard of level.hazards) {
    if (hazard.type !== 'placementLock') continue;
    if (gameTime % hazard.interval > hazard.duration) continue;
    if (hazard.zones.some((zone) => zoneContainsPosition(zone, position))) {
      return hazard.placementReason ?? 'blocked_by_hazard';
    }
  }
  return null;
}

function applyLevelState(
  set: StoreSetter,
  campaign: ResolvedCampaign,
  slot = useCampaignStore.getState().activeSlot,
  moneyOverride?: number,
  preserveTowers = false,
) {
  const save = useCampaignStore.getState().startOrResumeSlot(slot);
  const runtime = getLevelRuntimeState(campaign, save, save.currentNodeId, save.currentWaveIndex, useProfileStore.getState().profile.activeChallengeMutators);
  const pendingChoice = getPendingChoice(campaign, save.currentNodeId);
  const pendingDoctrineTowerId = findPendingDoctrineTower(runtime.currentLevel, save.doctrineChoices);
  const phase: GamePhase =
    pendingChoice || pendingDoctrineTowerId
      ? 'intermission'
      : runtime.currentLevel.autoStartWaves
        ? 'playing'
        : 'between-waves';

  set({
    phase,
    campaign,
    worldIndex: runtime.worldIndex,
    currentWorld: runtime.currentWorld,
    levelIndex: runtime.levelIndex,
    waveIndex: runtime.waveIndex,
    currentLevel: runtime.currentLevel,
    currentWave: runtime.currentWave,
    availableTowerIds: runtime.availableTowerIds,
    money: moneyOverride ?? runtime.startingMoney,
    lives: runtime.startingLives,
    gameTime: 0,
    towers: preserveTowers ? useGameStore.getState().towers : [],
    selectedTowerDef: runtime.startingSelectedTower,
    pendingChoice,
    pendingDoctrineTowerId,
    activeHazardLabel: getHazardAlert(runtime.currentLevel, 0),
  });

  gameRuntime.setLevelState(runtime.currentLevel, runtime.currentWave, [], false);
}

const initialSave = createFreshSave(CAMPAIGN, 0);
const initialRuntime = getLevelRuntimeState(CAMPAIGN, initialSave);

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'menu',
  campaign: CAMPAIGN,
  worldIndex: initialRuntime.worldIndex,
  currentWorld: initialRuntime.currentWorld,
  levelIndex: initialRuntime.levelIndex,
  waveIndex: initialRuntime.waveIndex,
  currentLevel: initialRuntime.currentLevel,
  currentWave: initialRuntime.currentWave,
  availableTowerIds: initialRuntime.availableTowerIds,
  money: initialRuntime.startingMoney,
  lives: initialRuntime.startingLives,
  gameTime: 0,
  towers: [],
  selectedTowerDef: initialRuntime.startingSelectedTower,
  cameraMode: 'tactical',
  cameraModeBeforeFirstPerson: 'tactical',
  showPathOverlay: true,
  showCodex: false,
  placementHint: null,
  pendingChoice: null,
  pendingDoctrineTowerId: null,
  activeHazardLabel: null,

  hydratePersistence: () => {
    useProfileStore.getState().hydrate();
    useCampaignStore.getState().hydrate();
  },

  startGame: (slot = useProfileStore.getState().profile.lastSlot ?? 0) => {
    towerIds.reset();
    gameRuntime.reset();
    applyLevelState(set, CAMPAIGN, slot);
  },

  startWave: () => {
    const state = get();
    if (!state.currentWave || !state.currentLevel) return;
    if (state.pendingChoice || state.pendingDoctrineTowerId) return;
    set({
      phase: 'playing',
      gameTime: 0,
    });
    gameRuntime.startWave(state.currentLevel, state.currentWave, state.towers);
  },

  placeTower: (defId, position) => {
    const state = get();
    const campaignSave = useCampaignStore.getState().activeSave;
    const def = resolveTowerDef(defId, campaignSave.doctrineChoices[defId]);
    if (!state.availableTowerIds.includes(defId)) return false;
    if (state.money < def.cost) {
      set({ placementHint: getPlacementReasonLabel('insufficient_money') });
      return false;
    }
    if (state.phase !== 'playing' && state.phase !== 'between-waves') return false;

    const hazardReason = getPlacementHazardReason(state.currentLevel, state.gameTime, position);
    if (hazardReason) {
      set({ placementHint: getPlacementReasonLabel(hazardReason) });
      return false;
    }

    for (const zone of state.currentLevel?.restrictedZones ?? []) {
      if (zoneContainsPosition(zone, position)) {
        set({ placementHint: getPlacementReasonLabel('occupied_by_structure') });
        return false;
      }
    }

    if (isLaneNoBuild(state.currentLevel, position, state.gameTime)) {
      set({ placementHint: getPlacementReasonLabel('in_lane_no_build_zone') });
      return false;
    }

    for (const tower of state.towers) {
      if (distance(position, tower.position) < MIN_TOWER_SPACING) {
        set({ placementHint: getPlacementReasonLabel('too_close_to_tower') });
        return false;
      }
    }

    const newTower: TowerInstance = {
      id: towerIds.next(),
      defId,
      position: { x: position.x, z: position.z },
      lastFireTime: -100,
      targetEnemyId: null,
      doctrineId: campaignSave.doctrineChoices[defId] ?? null,
      rangeBonus: getWatchZoneBonus(state.currentLevel, position),
      fireRateBonus: 0,
    };

    const towers = [...state.towers, newTower];
    set({
      towers,
      money: state.money - def.cost,
      placementHint: 'Tower placed',
    });
    gameRuntime.setTowers(towers);
    return true;
  },

  selectTowerDef: (defId) => {
    const state = get();
    if (defId !== null && !state.availableTowerIds.includes(defId)) return;
    set({ selectedTowerDef: defId });
  },

  setCameraMode: (mode) =>
    set((state) => ({
      cameraMode: mode,
      cameraModeBeforeFirstPerson:
        mode === 'firstPerson' ? state.cameraModeBeforeFirstPerson : mode,
    })),

  toggleCameraMode: () =>
    set((state) => ({
      cameraMode: state.cameraMode === 'planner' ? 'tactical' : 'planner',
      cameraModeBeforeFirstPerson: state.cameraMode === 'planner' ? 'tactical' : 'planner',
    })),

  toggleFirstPersonMode: () =>
    set((state) => ({
      cameraMode:
        state.cameraMode === 'firstPerson'
          ? state.cameraModeBeforeFirstPerson
          : 'firstPerson',
    })),

  togglePathOverlay: () =>
    set((state) => ({
      showPathOverlay: !state.showPathOverlay,
    })),

  toggleCodex: () =>
    set((state) => ({
      showCodex: !state.showCodex,
    })),

  setPlacementHint: (hint) => set({ placementHint: hint }),

  chooseBranch: (choiceId, optionId) => {
    const save = useCampaignStore.getState().chooseBranch(choiceId, optionId);
    const runtime = getLevelRuntimeState(CAMPAIGN, save, save.currentNodeId, save.currentWaveIndex, useProfileStore.getState().profile.activeChallengeMutators);
    const pendingDoctrineTowerId = findPendingDoctrineTower(runtime.currentLevel, save.doctrineChoices);
    set({
      phase: pendingDoctrineTowerId ? 'intermission' : 'between-waves',
      worldIndex: runtime.worldIndex,
      currentWorld: runtime.currentWorld,
      levelIndex: runtime.levelIndex,
      waveIndex: runtime.waveIndex,
      currentLevel: runtime.currentLevel,
      currentWave: runtime.currentWave,
      availableTowerIds: runtime.availableTowerIds,
      money: runtime.startingMoney,
      lives: runtime.startingLives,
      gameTime: 0,
      towers: [],
      pendingChoice: null,
      pendingDoctrineTowerId,
      selectedTowerDef: runtime.startingSelectedTower,
      activeHazardLabel: getHazardAlert(runtime.currentLevel, 0),
    });
    gameRuntime.setLevelState(runtime.currentLevel, runtime.currentWave, [], false);
  },

  chooseDoctrine: (towerId, doctrineId) => {
    const save = useCampaignStore.getState().chooseDoctrine(towerId, doctrineId);
    const pendingDoctrineTowerId = findPendingDoctrineTower(get().currentLevel, save.doctrineChoices);
    const selectedTowerDef = get().selectedTowerDef;
    set({
      pendingDoctrineTowerId,
      phase: get().pendingChoice || pendingDoctrineTowerId ? 'intermission' : 'between-waves',
      selectedTowerDef:
        selectedTowerDef !== null && get().availableTowerIds.includes(selectedTowerDef)
          ? selectedTowerDef
          : towerId,
    });
  },

  tick: (delta) => {
    const state = get();
    if (state.phase !== 'playing' || !state.currentLevel || !state.currentWave) return;

    const result = gameRuntime.tick(Math.min(delta, 0.05));
    const nextGameTime = state.gameTime + Math.min(delta, 0.05);
    const laneBreaches = Math.max(0, -result.livesDelta);
    set({
      gameTime: nextGameTime,
      activeHazardLabel: getHazardAlert(state.currentLevel, nextGameTime),
    });

    if (!result.moneyDelta && !result.livesDelta && !result.waveComplete) return;

    const money = state.money + result.moneyDelta;
    const lives = state.lives + result.livesDelta;

    if (lives <= 0) {
      useCampaignStore.getState().saveLevelResult({
        currentNodeId: useCampaignStore.getState().activeSave.currentNodeId,
        currentWaveIndex: state.waveIndex,
        livesRemaining: 0,
        laneBreaches,
      });
      set({
        money,
        lives: 0,
        phase: 'gameover',
      });
      return;
    }

    if (!result.waveComplete) {
      set({
        money,
        lives,
      });
      return;
    }

    const completesNode = !state.currentLevel.waves[state.waveIndex + 1];
    const saved = useCampaignStore.getState().saveLevelResult({
      currentNodeId: useCampaignStore.getState().activeSave.currentNodeId,
      currentWaveIndex: state.waveIndex,
      livesRemaining: lives,
      laneBreaches,
      completeNode: completesNode,
      codexUnlocks: state.currentLevel.codexUnlocks,
      towerUnlocks: state.currentLevel.newTowerIds,
    });
    const next = advanceCampaignProgress(state.campaign, saved, state.waveIndex);
    const moneyWithBonus = money + state.currentWave.completionBonus;

    if (next.phase === 'victory' || !next.currentLevel) {
      const ending = resolveEnding(state.campaign, saved);
      useCampaignStore.getState().finalizeEnding();
      set({
        phase: 'victory',
        money: moneyWithBonus,
        lives,
        activeHazardLabel: ending.title,
      });
      gameRuntime.setLevelState(null, null, gameRuntime.getTowers(), false);
      return;
    }

    if (next.phase === 'intermission' && next.pendingChoice) {
      set({
        phase: 'intermission',
        money: moneyWithBonus,
        lives,
        pendingChoice: next.pendingChoice,
        currentWave: null,
      });
      gameRuntime.setLevelState(state.currentLevel, null, gameRuntime.getTowers(), false);
      return;
    }

    const nextSave = {
      ...saved,
      currentNodeId: next.nodeId ?? saved.currentNodeId,
      currentWaveIndex: next.waveIndex,
    };
    useCampaignStore.getState().overwriteActiveSave(nextSave);

    const sameNode = next.nodeId === saved.currentNodeId;
    if (sameNode && next.currentWave && next.currentLevel) {
      set({
        phase: 'between-waves',
        waveIndex: next.waveIndex,
        currentWave: next.currentWave,
        availableTowerIds: next.availableTowerIds,
        money: moneyWithBonus,
        lives,
        gameTime: 0,
        pendingChoice: null,
        pendingDoctrineTowerId: null,
        activeHazardLabel: getHazardAlert(next.currentLevel, 0),
      });
      gameRuntime.setLevelState(next.currentLevel, next.currentWave, state.towers, false);
      return;
    }

    const runtime = getLevelRuntimeState(state.campaign, nextSave, nextSave.currentNodeId, nextSave.currentWaveIndex, useProfileStore.getState().profile.activeChallengeMutators);
    const pendingDoctrineTowerId = findPendingDoctrineTower(runtime.currentLevel, nextSave.doctrineChoices);
    set({
      phase: pendingDoctrineTowerId ? 'intermission' : 'between-waves',
      worldIndex: runtime.worldIndex,
      currentWorld: runtime.currentWorld,
      levelIndex: runtime.levelIndex,
      waveIndex: runtime.waveIndex,
      currentLevel: runtime.currentLevel,
      currentWave: runtime.currentWave,
      availableTowerIds: runtime.availableTowerIds,
      selectedTowerDef:
        state.selectedTowerDef && runtime.availableTowerIds.includes(state.selectedTowerDef)
          ? state.selectedTowerDef
          : runtime.startingSelectedTower,
      money: Math.max(moneyWithBonus, runtime.startingMoney),
      lives,
      gameTime: 0,
      towers: [],
      pendingChoice: null,
      pendingDoctrineTowerId,
      activeHazardLabel: getHazardAlert(runtime.currentLevel, 0),
    });
    gameRuntime.setLevelState(runtime.currentLevel, runtime.currentWave, [], false);
  },
}));
