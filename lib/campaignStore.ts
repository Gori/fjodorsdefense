import { create } from 'zustand';
import { CAMPAIGN } from './levels/loadCampaign';
import {
  applyChoiceToSave,
  createFreshSave,
  getCompletedObjectiveIds,
  getLevelRuntimeState,
  getPendingChoice,
  resolveEnding,
} from './levels/runtime';
import type { SaveSlotData } from './levels/types';
import { readSaveSlots, writeSaveSlots } from './persistence';
import { useProfileStore } from './profileStore';

interface CampaignStore {
  hydrated: boolean;
  saveSlots: Array<SaveSlotData | null>;
  activeSlot: number;
  activeSave: SaveSlotData;
  hydrate: () => void;
  startOrResumeSlot: (slot: number) => SaveSlotData;
  overwriteActiveSave: (save: SaveSlotData) => void;
  saveLevelResult: (input: {
    currentNodeId: string;
    currentWaveIndex: number;
    livesRemaining: number;
    laneBreaches: number;
    completeNode?: boolean;
    codexUnlocks?: string[];
    towerUnlocks?: string[];
    worldModifierIds?: string[];
  }) => SaveSlotData;
  chooseBranch: (choiceId: string, optionId: string) => SaveSlotData;
  chooseDoctrine: (towerId: string, doctrineId: string) => SaveSlotData;
  finalizeEnding: () => string;
}

function persistSlots(slots: Array<SaveSlotData | null>) {
  writeSaveSlots(slots);
}

function applyUnlockedTowers(save: SaveSlotData, towerUnlocks: string[] = []) {
  return {
    ...save,
    unlockedTowerIds: [...new Set([...save.unlockedTowerIds, ...towerUnlocks])],
  };
}

function getArcadeMedal(input: {
  laneBreaches: number;
  livesRemaining: number;
  completedObjectiveCount: number;
}) {
  if (input.laneBreaches === 0 && input.completedObjectiveCount > 0) return 'gold';
  if (input.laneBreaches <= 1 && input.livesRemaining > 0) return 'silver';
  return 'bronze';
}

export const useCampaignStore = create<CampaignStore>((set, get) => ({
  hydrated: false,
  saveSlots: [null, null, null],
  activeSlot: 0,
  activeSave: createFreshSave(CAMPAIGN, 0),

  hydrate: () => {
    const saveSlots = readSaveSlots();
    const lastSlot = useProfileStore.getState().profile.lastSlot ?? 0;
    const activeSave = saveSlots[lastSlot] ?? createFreshSave(CAMPAIGN, lastSlot);
    set({
      hydrated: true,
      saveSlots,
      activeSlot: lastSlot,
      activeSave,
    });
  },

  startOrResumeSlot: (slot) => {
    const state = get();
    const nextSave = state.saveSlots[slot] ?? createFreshSave(CAMPAIGN, slot);
    const saveSlots = [...state.saveSlots];
    saveSlots[slot] = nextSave;
    persistSlots(saveSlots);
    useProfileStore.getState().setLastSlot(slot);
    set({
      activeSlot: slot,
      activeSave: nextSave,
      saveSlots,
    });
    return nextSave;
  },

  overwriteActiveSave: (save) =>
    set((state) => {
      const saveSlots = [...state.saveSlots];
      saveSlots[state.activeSlot] = save;
      persistSlots(saveSlots);
      return { activeSave: save, saveSlots };
    }),

  saveLevelResult: (input) => {
    const state = get();
    const runtime = getLevelRuntimeState(
      CAMPAIGN,
      state.activeSave,
      input.currentNodeId,
      input.currentWaveIndex,
      useProfileStore.getState().profile.activeChallengeMutators,
    );
    let save = {
      ...state.activeSave,
      currentNodeId: input.currentNodeId,
      currentWaveIndex: input.currentWaveIndex,
      completedNodeIds:
        input.completeNode && !state.activeSave.completedNodeIds.includes(input.currentNodeId)
          ? [...state.activeSave.completedNodeIds, input.currentNodeId]
          : state.activeSave.completedNodeIds,
      unlockedCodexIds: [
        ...new Set([
          ...state.activeSave.unlockedCodexIds,
          ...(input.completeNode ? [...(input.codexUnlocks ?? []), ...runtime.currentLevel.codexUnlocks] : []),
        ]),
      ],
      consequenceState: {
        civilianIntegrity: Math.max(
          0,
          state.activeSave.consequenceState.civilianIntegrity - input.laneBreaches,
        ),
        dragonPressure:
          state.activeSave.consequenceState.dragonPressure +
          (runtime.currentLevel.worldModifierIds.includes('pursuit-line') ? 1 : 0),
        familyKnowledge:
          state.activeSave.consequenceState.familyKnowledge + runtime.currentLevel.codexUnlocks.length,
        laneControlMastery:
          state.activeSave.consequenceState.laneControlMastery + (input.laneBreaches === 0 ? 1 : 0),
        laneBreaches: state.activeSave.consequenceState.laneBreaches + input.laneBreaches,
      },
      levelBest: {
        ...state.activeSave.levelBest,
        [runtime.currentLevel.id]: {
          livesRemaining: Math.max(
            input.livesRemaining,
            state.activeSave.levelBest[runtime.currentLevel.id]?.livesRemaining ?? 0,
          ),
          clearedAtWave: runtime.currentLevel.waves.length,
        },
      },
    };
    const completedObjectiveIds = input.completeNode
      ? getCompletedObjectiveIds(runtime.currentLevel, {
          livesRemaining: input.livesRemaining,
          laneBreaches: input.laneBreaches,
        })
      : [];
    const completedObjectives = runtime.currentLevel.optionalObjectives.filter((objective) =>
      completedObjectiveIds.includes(objective.id),
    );
    save = {
      ...save,
      completedObjectiveIds: [...new Set([...(save.completedObjectiveIds ?? []), ...completedObjectiveIds])],
      consequenceState: {
        ...save.consequenceState,
        familyKnowledge:
          save.consequenceState.familyKnowledge +
          completedObjectives.reduce((sum, objective) => sum + (objective.rewardFamilyKnowledge ?? 0), 0),
        laneControlMastery:
          save.consequenceState.laneControlMastery +
          completedObjectives.reduce((sum, objective) => sum + (objective.rewardLaneControlMastery ?? 0), 0),
      },
    };
    if (input.completeNode) {
      save = applyUnlockedTowers(save, [...runtime.currentLevel.newTowerIds, ...(input.towerUnlocks ?? [])]);
      for (const towerId of runtime.currentLevel.newTowerIds) {
        useProfileStore.getState().unlockDoctrineFamily(towerId);
      }
      for (const codexId of [
        ...(input.codexUnlocks ?? []),
        ...runtime.currentLevel.codexUnlocks,
      ]) {
        useProfileStore.getState().unlockCodex(codexId);
      }
      useProfileStore.getState().awardArcadeMedal(
        runtime.currentLevel.id,
        getArcadeMedal({
          laneBreaches: input.laneBreaches,
          livesRemaining: input.livesRemaining,
          completedObjectiveCount: completedObjectiveIds.length,
        }),
      );
    }

    const saveSlots = [...state.saveSlots];
    saveSlots[state.activeSlot] = save;
    persistSlots(saveSlots);
    set({ activeSave: save, saveSlots });
    return save;
  },

  chooseBranch: (choiceId, optionId) => {
    const state = get();
    const save = applyChoiceToSave(CAMPAIGN, state.activeSave, choiceId, optionId);
    const saveSlots = [...state.saveSlots];
    saveSlots[state.activeSlot] = save;
    persistSlots(saveSlots);
    set({ activeSave: save, saveSlots });
    return save;
  },

  chooseDoctrine: (towerId, doctrineId) => {
    const state = get();
    const save = {
      ...state.activeSave,
      doctrineChoices: {
        ...state.activeSave.doctrineChoices,
        [towerId]: doctrineId,
      },
    };
    const saveSlots = [...state.saveSlots];
    saveSlots[state.activeSlot] = save;
    persistSlots(saveSlots);
    set({ activeSave: save, saveSlots });
    return save;
  },

  finalizeEnding: () => {
    const state = get();
    const ending = resolveEnding(CAMPAIGN, state.activeSave);
    const save = {
      ...state.activeSave,
      activeEndingId: ending.id,
    };
    const saveSlots = [...state.saveSlots];
    saveSlots[state.activeSlot] = save;
    persistSlots(saveSlots);
    useProfileStore.getState().completeEnding(ending.id);
    set({ activeSave: save, saveSlots });
    return ending.id;
  },
}));

export function getPendingCampaignChoice() {
  const save = useCampaignStore.getState().activeSave;
  return getPendingChoice(CAMPAIGN, save.currentNodeId);
}
