'use client';

import { useGameStore } from '@/lib/store';
import { useEffect, useCallback } from 'react';

const F = 'var(--font-game)';
const S = '2px 2px 0 rgba(0,0,0,1), 4px 4px 0 rgba(0,0,0,0.7)';
const GOLD_S = '2px 2px 0 rgba(0,0,0,1), 4px 4px 0 rgba(255,214,102,0.35)';
const ALERT_S = '2px 2px 0 rgba(0,0,0,1), 4px 4px 0 rgba(255,71,87,0.55)';

export function HUD() {
  const money = useGameStore((s) => s.money);
  const lives = useGameStore((s) => s.lives);
  const campaign = useGameStore((s) => s.campaign);
  const levelIndex = useGameStore((s) => s.levelIndex);
  const waveIndex = useGameStore((s) => s.waveIndex);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const currentWave = useGameStore((s) => s.currentWave);
  const phase = useGameStore((s) => s.phase);
  const enemies = useGameStore((s) => s.enemies);
  const spawnStates = useGameStore((s) => s.spawnStates);
  const startWave = useGameStore((s) => s.startWave);

  const maxLives = 20;
  const isLow = lives / maxLives <= 0.3;

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'between-waves') {
        e.preventDefault();
        startWave();
      }
    },
    [phase, startWave],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const displayWave = waveIndex + 1;
  const displayLevel = levelIndex + 1;
  const totalWaveEnemies = currentWave
    ? currentWave.groups.reduce((sum, group) => sum + group.count, 0)
    : 0;

  // Enemies remaining for the whole wave
  const enemiesRemaining = (() => {
    if (!currentWave) return enemies.length;
    const totalInWave = currentWave.groups.reduce((sum, group) => sum + group.count, 0);
    const totalSpawned = spawnStates.reduce((sum, s) => sum + s.spawned, 0);
    return (totalInWave - totalSpawned) + enemies.length;
  })();
  const stopClickThrough = (e: { stopPropagation: () => void }) => e.stopPropagation();

  return (
    <>
      {/* ─── ARCADE TOP BAR — during play ─── */}
      {phase === 'playing' && (
        <div
          className="absolute z-10 pointer-events-none anim-fadeIn"
          style={{
            top: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            padding: '16px 24px',
          }}
        >
          {/* LEFT: Lives */}
          <div className="flex items-center" style={{ gap: 8, minWidth: 120 }}>
            <span
              style={{
                fontFamily: F,
                fontSize: 14,
                fontWeight: 600,
                color: '#B8B8B8',
                textShadow: S,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              HP
            </span>
            <span
              style={{
                fontFamily: F,
                fontSize: 38,
                fontWeight: 700,
                lineHeight: 1,
                color: isLow ? '#FF4757' : '#FF6B81',
                textShadow: isLow
                  ? ALERT_S
                  : S,
                ...(isLow ? { animation: 'pulse 1s ease-in-out infinite' } : {}),
              }}
            >
              {lives}
            </span>
          </div>

          {/* CENTER: Wave + Enemies */}
          <div className="flex flex-col items-center" style={{ gap: 4 }}>
            <div className="flex items-center" style={{ gap: 8 }}>
              <span
                style={{
                  fontFamily: F,
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#B8B8B8',
                  textShadow: S,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                LEVEL
              </span>
              <span
                style={{
                  fontFamily: F,
                  fontSize: 28,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: '#fff',
                  textShadow: S,
                }}
              >
                {displayLevel}
              </span>
              <span
                style={{
                  fontFamily: F,
                  fontSize: 16,
                  fontWeight: 600,
                  color: '#8A8A8A',
                  textShadow: S,
                }}
              >
                /{campaign.levels.length}
              </span>

              <span
                style={{
                  fontFamily: F,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#8A8A8A',
                  textShadow: S,
                  marginLeft: 10,
                }}
              >
                WAVE {displayWave}/{currentLevel?.waves.length ?? 0}
              </span>

              {/* Wave pips */}
              <div className="flex items-center" style={{ gap: 5, marginLeft: 8 }}>
                {Array.from({ length: currentLevel?.waves.length ?? 0 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background:
                        i < waveIndex ? '#2ED573' : i === waveIndex ? '#FFD666' : 'rgba(255,255,255,0.25)',
                      boxShadow:
                        i === waveIndex
                          ? '2px 2px 0 rgba(255,214,102,0.7)'
                          : i < waveIndex
                            ? '2px 2px 0 rgba(46,213,115,0.5)'
                            : 'none',
                      transition: 'all 0.3s',
                    }}
                  />
                ))}
              </div>
            </div>

            {currentLevel && (
              <span
                style={{
                  fontFamily: F,
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#C8C8C8',
                  textShadow: S,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                {currentLevel.name}
              </span>
            )}

            {/* Enemies remaining */}
            <span
              style={{
                fontFamily: F,
                fontSize: 18,
                fontWeight: 700,
                color: enemiesRemaining > 0 ? '#FFD666' : '#2ED573',
                textShadow: S,
                letterSpacing: '0.05em',
              }}
            >
              {enemiesRemaining > 0 ? `${enemiesRemaining} REMAINING` : 'CLEAR!'}
            </span>
          </div>

          {/* RIGHT: Money */}
          <div className="flex items-center" style={{ gap: 8, minWidth: 120, justifyContent: 'flex-end' }}>
            <span
              style={{
                fontFamily: F,
                fontSize: 14,
                fontWeight: 600,
                color: '#B8B8B8',
                textShadow: S,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              $
            </span>
            <span
              style={{
                fontFamily: F,
                fontSize: 38,
                fontWeight: 700,
                lineHeight: 1,
                color: '#FFD666',
                textShadow: GOLD_S,
              }}
            >
              {money}
            </span>
          </div>
        </div>
      )}

      {/* ─── BETWEEN WAVES ─── */}
      {phase === 'between-waves' && (
        <>
          {/* Lives + Money still visible */}
          <div
            className="absolute z-10 pointer-events-none anim-fadeIn"
            style={{
              top: 0,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'space-between',
              padding: '16px 24px',
            }}
          >
            <div className="flex items-center" style={{ gap: 8 }}>
              <span style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: '#B8B8B8', textShadow: S, letterSpacing: '0.08em' }}>HP</span>
              <span style={{ fontFamily: F, fontSize: 38, fontWeight: 700, lineHeight: 1, color: isLow ? '#FF4757' : '#FF6B81', textShadow: S }}>{lives}</span>
            </div>
            <div className="flex items-center" style={{ gap: 8 }}>
              <span style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: '#B8B8B8', textShadow: S, letterSpacing: '0.08em' }}>$</span>
              <span style={{ fontFamily: F, fontSize: 38, fontWeight: 700, lineHeight: 1, color: '#FFD666', textShadow: GOLD_S }}>{money}</span>
            </div>
          </div>

          {/* Wave status — top centered */}
          <div
            className="absolute z-10"
            style={{
              top: 18,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div className="flex flex-col items-center pointer-events-none" style={{ gap: 2 }}>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 52,
                  lineHeight: 1,
                  color: '#fff',
                  textShadow: S,
                }}
              >
                LEVEL {displayLevel} - WAVE {displayWave}
              </span>
              <span
                style={{
                  fontFamily: F,
                  fontSize: 20,
                  fontWeight: 700,
                  color: '#FFD666',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textShadow: GOLD_S,
                }}
              >
                {totalWaveEnemies} ENEMIES
              </span>
            </div>
          </div>

          {/* Deploy button — above tower controls */}
          <div
            className="absolute z-10 anim-fadeIn d2"
            onPointerDown={stopClickThrough}
            onClick={stopClickThrough}
            style={{
              left: 0,
              right: 0,
              bottom: 180,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div className="flex flex-col items-center pointer-events-auto" style={{ gap: 6 }}>
              <button
                onPointerDown={stopClickThrough}
                onClick={(e) => {
                  e.stopPropagation();
                  startWave();
                }}
                className="uppercase cursor-pointer"
                style={{
                  padding: '14px 48px',
                  fontSize: 20,
                  fontWeight: 700,
                  fontFamily: F,
                  letterSpacing: '0.12em',
                  color: '#111',
                  background: '#FFD666',
                  border: 'none',
                  boxShadow: '4px 4px 0 rgba(0,0,0,0.65), 6px 6px 0 rgba(255,214,102,0.35)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '5px 5px 0 rgba(0,0,0,0.7), 8px 8px 0 rgba(255,214,102,0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '4px 4px 0 rgba(0,0,0,0.65), 6px 6px 0 rgba(255,214,102,0.35)';
                }}
              >
                DEPLOY
              </button>
              <span
                style={{
                  fontFamily: F,
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#FFFFFF',
                  textTransform: 'uppercase',
                  textShadow: S,
                }}
              >
                SPACE
              </span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
