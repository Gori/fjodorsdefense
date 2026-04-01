'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/store';
import { gameRuntime } from '@/lib/runtime';
import { playRetroSfx, unlockRetroSfx } from '@/lib/audio/sfx';

export function SoundEffects() {
  useEffect(() => {
    const unlock = () => unlockRetroSfx();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);

    const runtimeUnsubscribe = gameRuntime.subscribeEvents((event) => {
      if (event.type === 'enemy_killed') {
        playRetroSfx('enemyDown', 0.93);
      } else if (event.type === 'enemy_escaped') {
        playRetroSfx('lifeLost', 1);
      } else if (event.type === 'tower_fired') {
        switch (event.towerDefId) {
          case 'scratchingPost':
            playRetroSfx('fireRapid', 0.78);
            break;
          case 'yarnLauncher':
            playRetroSfx('fireSlow', 0.9);
            break;
          case 'laserPointer':
            playRetroSfx('fireLaser', 0.86);
            break;
          case 'catnipBomb':
            playRetroSfx('fireBomb', 1);
            break;
        }
      }
    });

    const storeUnsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.phase !== prev.phase) {
        if (state.phase === 'between-waves' && prev.phase === 'playing') {
          playRetroSfx('waveClear');
        } else if (state.phase === 'victory') {
          playRetroSfx('victory');
        } else if (state.phase === 'gameover') {
          playRetroSfx('gameOver');
        }
      }
    });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      runtimeUnsubscribe();
      storeUnsubscribe();
    };
  }, []);

  return null;
}
