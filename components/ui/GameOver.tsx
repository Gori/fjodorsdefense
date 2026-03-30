'use client';

import { useGameStore } from '@/lib/store';
import { getTotalCampaignWaveCount, getWaveNumberInCampaign } from '@/lib/levels/runtime';

const F = 'var(--font-game)';

export function GameOverScreen() {
  const campaign = useGameStore((s) => s.campaign);
  const phase = useGameStore((s) => s.phase);
  const levelIndex = useGameStore((s) => s.levelIndex);
  const waveIndex = useGameStore((s) => s.waveIndex);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const towers = useGameStore((s) => s.towers);
  const startGame = useGameStore((s) => s.startGame);
  const isVictory = phase === 'victory';
  const totalWaves = getTotalCampaignWaveCount(campaign);
  const campaignWave = getWaveNumberInCampaign(campaign, levelIndex, waveIndex);
  const stopClickThrough = (e: { stopPropagation: () => void }) => e.stopPropagation();

  const accent = isVictory ? '#2ED573' : '#FF4757';

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center anim-fadeIn"
      onPointerDown={stopClickThrough}
      onClick={stopClickThrough}
      style={{ background: 'rgba(0,0,0,0.9)' }}
    >
      {/* Icon */}
      <div className="anim-scaleIn d1" style={{ marginBottom: 40 }}>
        {isVictory ? (
          <svg width="88" height="88" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke={accent} strokeWidth="3" fill={`${accent}12`} />
            <path d="M28 40l8 8 16-16" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="88" height="88" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke={accent} strokeWidth="3" fill={`${accent}12`} />
            <path d="M28 28l24 24M52 28l-24 24" stroke={accent} strokeWidth="4" strokeLinecap="round" />
          </svg>
        )}
      </div>

      {/* Title — display font */}
      <h1
        className="anim-slideUp d2 text-center uppercase"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(60px, 10vw, 110px)',
          lineHeight: 0.9,
          color: accent,
        }}
      >
        {isVictory ? <>SÖDERMALM<br />SAVED</> : <>DEFENCE<br />FELL</>}
      </h1>

      {/* Subtitle */}
      <p
        className="anim-fadeIn d3"
        style={{
          marginTop: 24,
          fontFamily: F,
          fontSize: 20,
          fontWeight: 500,
          color: '#ccc',
        }}
        >
        {isVictory
          ? 'Fjodor held the line. The island is safe.'
          : `Overrun on ${currentLevel?.name ?? 'the current level'}, wave ${waveIndex + 1}.`}
      </p>

      {/* Stats */}
      <div
        className="anim-fadeIn d4 flex items-center"
        style={{
          gap: 48,
          marginTop: 48,
          padding: '28px 48px',
          background: 'rgba(255,255,255,0.05)',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
        }}
      >
        <div className="flex flex-col items-center" style={{ gap: 6 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1,
              color: '#fff',
            }}
          >
            {isVictory ? totalWaves : Math.max(0, campaignWave - 1)}
          </span>
          <span
            style={{
              fontFamily: F,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#aaa',
              textTransform: 'uppercase',
            }}
          >
            Waves Cleared
          </span>
        </div>

        <div style={{ width: 2, height: 60, background: 'rgba(255,255,255,0.1)' }} />

        <div className="flex flex-col items-center" style={{ gap: 6 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1,
              color: '#fff',
            }}
          >
            {towers.length}
          </span>
          <span
            style={{
              fontFamily: F,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '0.1em',
              color: '#aaa',
              textTransform: 'uppercase',
            }}
          >
            Towers Built
          </span>
        </div>
      </div>

      {/* Replay */}
      <button
        onPointerDown={stopClickThrough}
        onClick={(e) => {
          e.stopPropagation();
          startGame();
        }}
        className="anim-scaleIn d5 uppercase cursor-pointer"
        style={{
          marginTop: 48,
          padding: '18px 64px',
          fontSize: 22,
          fontWeight: 700,
          fontFamily: F,
          letterSpacing: '0.12em',
          color: '#111',
          background: accent,
          border: 'none',
          borderRadius: 6,
          transition: 'transform 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = `0 0 48px ${accent}55`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        Play Again
      </button>
    </div>
  );
}
