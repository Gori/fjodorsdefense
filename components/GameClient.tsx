'use client';

import { useEffect, useState } from 'react';
import { GameCanvas } from './game/GameCanvas';
import { HUD } from './ui/HUD';
import { TowerSelector } from './ui/TowerSelector';
import { StartScreen } from './ui/StartScreen';
import { GameOverScreen } from './ui/GameOver';
import { CodexPanel } from './ui/CodexPanel';
import { CampaignOverlay } from './ui/CampaignOverlay';
import { useGameStore } from '@/lib/store';
import { SoundEffects } from './game/SoundEffects';

export function GameClient() {
  const phase = useGameStore((s) => s.phase);
  const selectedTowerDef = useGameStore((s) => s.selectedTowerDef);
  const hydratePersistence = useGameStore((s) => s.hydratePersistence);
  const isPlaying = phase === 'playing' || phase === 'between-waves' || phase === 'intermission';
  const [isMenuBackgroundReady, setIsMenuBackgroundReady] = useState(false);

  useEffect(() => {
    hydratePersistence();
  }, [hydratePersistence]);

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden ${isPlaying && selectedTowerDef ? 'placing' : ''}`}
      style={{ background: '#111' }}
    >
      <SoundEffects />
      <GameCanvas onRevealChange={setIsMenuBackgroundReady} />
      {phase === 'menu' && <StartScreen isMapVisible={isMenuBackgroundReady} />}
      {isPlaying && (
        <>
          <HUD />
          <CodexPanel />
          <TowerSelector />
          <CampaignOverlay />
        </>
      )}
      {(phase === 'gameover' || phase === 'victory') && <GameOverScreen />}
    </div>
  );
}
