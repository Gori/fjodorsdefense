import { create } from 'zustand';
import type { ProfileProgress } from './levels/types';
import { readProfile, writeProfile } from './persistence';

const DEFAULT_PROFILE: ProfileProgress = {
  doctrineFamiliesUnlocked: [],
  completedEndingIds: [],
  challengeMutators: [],
  activeChallengeMutators: [],
  codexCompletion: [],
  arcadeMedals: {},
  lastSlot: 0,
};

interface ProfileStore {
  hydrated: boolean;
  profile: ProfileProgress;
  hydrate: () => void;
  setLastSlot: (slot: number) => void;
  unlockDoctrineFamily: (towerId: string) => void;
  completeEnding: (endingId: string) => void;
  unlockCodex: (entryId: string) => void;
  toggleChallengeMutator: (mutatorId: string) => void;
  awardArcadeMedal: (levelId: string, medal: string) => void;
}

function persist(profile: ProfileProgress) {
  writeProfile(profile);
}

export const useProfileStore = create<ProfileStore>((set) => ({
  hydrated: false,
  profile: DEFAULT_PROFILE,

  hydrate: () => {
    const profile = readProfile() ?? DEFAULT_PROFILE;
    set({ profile, hydrated: true });
  },

  setLastSlot: (slot) =>
    set((state) => {
      const profile = { ...state.profile, lastSlot: slot };
      persist(profile);
      return { profile };
    }),

  unlockDoctrineFamily: (towerId) =>
    set((state) => {
      if (state.profile.doctrineFamiliesUnlocked.includes(towerId)) return state;
      const profile = {
        ...state.profile,
        doctrineFamiliesUnlocked: [...state.profile.doctrineFamiliesUnlocked, towerId],
      };
      persist(profile);
      return { profile };
    }),

  completeEnding: (endingId) =>
    set((state) => {
      if (state.profile.completedEndingIds.includes(endingId)) return state;
      const nextMutators = [...state.profile.challengeMutators];
      if (endingId === 'the-city-held' && !nextMutators.includes('lean_pockets')) {
        nextMutators.push('lean_pockets');
      }
      if (endingId === 'the-dragon-marked-back' && !nextMutators.includes('iron_night')) {
        nextMutators.push('iron_night');
      }
      const profile = {
        ...state.profile,
        completedEndingIds: [...state.profile.completedEndingIds, endingId],
        challengeMutators: nextMutators,
      };
      persist(profile);
      return { profile };
    }),

  unlockCodex: (entryId) =>
    set((state) => {
      if (state.profile.codexCompletion.includes(entryId)) return state;
      const profile = {
        ...state.profile,
        codexCompletion: [...state.profile.codexCompletion, entryId],
      };
      persist(profile);
      return { profile };
    }),

  toggleChallengeMutator: (mutatorId) =>
    set((state) => {
      if (!state.profile.challengeMutators.includes(mutatorId)) return state;
      const isActive = state.profile.activeChallengeMutators.includes(mutatorId);
      const profile = {
        ...state.profile,
        activeChallengeMutators: isActive
          ? state.profile.activeChallengeMutators.filter((id) => id !== mutatorId)
          : [...state.profile.activeChallengeMutators, mutatorId],
      };
      persist(profile);
      return { profile };
    }),

  awardArcadeMedal: (levelId, medal) =>
    set((state) => {
      const current = state.profile.arcadeMedals[levelId];
      const rank = { bronze: 1, silver: 2, gold: 3 } as const;
      if (current && rank[current as keyof typeof rank] >= rank[medal as keyof typeof rank]) {
        return state;
      }
      const profile = {
        ...state.profile,
        arcadeMedals: {
          ...state.profile.arcadeMedals,
          [levelId]: medal,
        },
      };
      persist(profile);
      return { profile };
    }),
}));
