import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useGameStore } from './store';
import { gameRuntime } from './runtime';
import { useProfileStore } from './profileStore';

describe('game store level runtime state', () => {
  beforeEach(() => {
    useGameStore.setState(useGameStore.getInitialState(), true);
    useProfileStore.setState({
      ...useProfileStore.getState(),
      profile: {
        ...useProfileStore.getState().profile,
        activeChallengeMutators: [],
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads level-specific tower availability on game start', () => {
    useGameStore.getState().startGame();
    const state = useGameStore.getState();

    expect(state.phase).toBe('between-waves');
    expect(state.currentWorld?.id).toBe('streets-remember');
    expect(state.levelIndex).toBe(0);
    expect(state.waveIndex).toBe(0);
    expect(state.availableTowerIds).toEqual(['scratchingPost', 'yarnLauncher']);
    expect(state.selectedTowerDef).toBe('scratchingPost');
  });

  it('toggles planner and overlay state independently from combat runtime', () => {
    const store = useGameStore.getState();

    expect(store.cameraMode).toBe('tactical');
    expect(store.showPathOverlay).toBe(true);

    store.toggleCameraMode();
    store.togglePathOverlay();
    store.toggleFirstPersonMode();
    store.toggleFirstPersonMode();

    const next = useGameStore.getState();
    expect(next.cameraMode).toBe('planner');
    expect(next.showPathOverlay).toBe(false);
  });

  it('ignores selection of towers unavailable in the current level', () => {
    useGameStore.getState().startGame();
    useGameStore.getState().selectTowerDef('catnipBomb');

    expect(useGameStore.getState().selectedTowerDef).toBe('scratchingPost');
  });

  it('carries money forward when advancing to the next level', () => {
    useGameStore.getState().startGame();
    const campaign = useGameStore.getState().campaign;
    const currentLevel = campaign.levels[0];
    const currentWave = currentLevel.waves[currentLevel.waves.length - 1];

    vi.spyOn(gameRuntime, 'tick').mockReturnValue({
      moneyDelta: 0,
      livesDelta: 0,
      waveComplete: true,
    });

    useGameStore.setState({
      phase: 'playing',
      levelIndex: 0,
      waveIndex: currentLevel.waves.length - 1,
      currentLevel,
      currentWave,
      money: 260,
      lives: 20,
    });

    useGameStore.getState().tick(0.016);

    const state = useGameStore.getState();
    expect(state.levelIndex).toBe(1);
    expect(state.waveIndex).toBe(0);
    expect(state.money).toBe(315);
  });

  it('applies active challenge mutators when starting a run', () => {
    useProfileStore.setState({
      ...useProfileStore.getState(),
      profile: {
        ...useProfileStore.getState().profile,
        activeChallengeMutators: ['lean_pockets'],
      },
    });

    useGameStore.getState().startGame();
    const state = useGameStore.getState();

    expect(state.money).toBeLessThan(150);
  });
});
