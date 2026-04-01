import type { ProfileProgress, SaveSlotData } from './levels/types';

const SAVE_SLOTS_KEY = 'fjodor-defense-save-slots-v2';
const PROFILE_KEY = 'fjodor-defense-profile-v2';
const SAVE_SLOT_COUNT = 3;

function hasStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function normalizeSaveSlot(slot: SaveSlotData | null, index: number): SaveSlotData | null {
  if (!slot) return null;
  return {
    ...slot,
    slot: slot.slot ?? index,
    completedNodeIds: slot.completedNodeIds ?? [],
    completedObjectiveIds: slot.completedObjectiveIds ?? [],
    branchChoices: slot.branchChoices ?? {},
    unlockedCodexIds: slot.unlockedCodexIds ?? [],
    unlockedTowerIds: slot.unlockedTowerIds ?? [],
    doctrineChoices: slot.doctrineChoices ?? {},
  };
}

export function readSaveSlots(): Array<SaveSlotData | null> {
  if (!hasStorage()) return Array.from({ length: SAVE_SLOT_COUNT }, () => null);
  const raw = window.localStorage.getItem(SAVE_SLOTS_KEY);
  if (!raw) return Array.from({ length: SAVE_SLOT_COUNT }, () => null);
  try {
    const parsed = JSON.parse(raw) as Array<SaveSlotData | null>;
    return Array.from({ length: SAVE_SLOT_COUNT }, (_, index) => normalizeSaveSlot(parsed[index] ?? null, index));
  } catch {
    return Array.from({ length: SAVE_SLOT_COUNT }, () => null);
  }
}

export function writeSaveSlots(slots: Array<SaveSlotData | null>) {
  if (!hasStorage()) return;
  window.localStorage.setItem(SAVE_SLOTS_KEY, JSON.stringify(slots));
}

export function readProfile(): ProfileProgress | null {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ProfileProgress;
    return {
      doctrineFamiliesUnlocked: parsed.doctrineFamiliesUnlocked ?? [],
      completedEndingIds: parsed.completedEndingIds ?? [],
      challengeMutators: parsed.challengeMutators ?? [],
      activeChallengeMutators: parsed.activeChallengeMutators ?? [],
      codexCompletion: parsed.codexCompletion ?? [],
      arcadeMedals: parsed.arcadeMedals ?? {},
      lastSlot: parsed.lastSlot ?? 0,
    };
  } catch {
    return null;
  }
}

export function writeProfile(profile: ProfileProgress) {
  if (!hasStorage()) return;
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
