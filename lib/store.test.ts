import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './store';

describe('game store level runtime state', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState(), true);
  });

  it('loads level-specific tower availability on game start', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();

    expect(state.phase).toBe('between-waves');
    expect(state.levelIndex).toBe(0);
    expect(state.waveIndex).toBe(0);
    expect(state.availableTowerIds).toEqual(['scratchingPost', 'yarnLauncher']);
    expect(state.selectedTowerDef).toBe('scratchingPost');
  });

  it('ignores selection of towers unavailable in the current level', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().selectTowerDef('catnipBomb');

    expect(useGameStore.getState().selectedTowerDef).toBe('scratchingPost');
  });
});
