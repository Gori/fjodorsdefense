'use client';

import { useGameStore } from '@/lib/store';
import { getTotalCampaignWaveCount, getWaveNumberInCampaign } from '@/lib/levels/runtime';
import { playRetroSfx, unlockRetroSfx } from '@/lib/audio/sfx';
import { useCampaignStore } from '@/lib/campaignStore';

const F = 'var(--font-game)';

export function GameOverScreen() {
  const campaign = useGameStore((s) => s.campaign);
  const phase = useGameStore((s) => s.phase);
  const waveIndex = useGameStore((s) => s.waveIndex);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const towers = useGameStore((s) => s.towers);
  const startGame = useGameStore((s) => s.startGame);
  const activeSave = useCampaignStore((s) => s.activeSave);
  const isVictory = phase === 'victory';
  const ending = activeSave.activeEndingId
    ? campaign.endings.find((entry) => entry.id === activeSave.activeEndingId) ?? null
    : null;
  const totalWaves = getTotalCampaignWaveCount(campaign);
  const campaignWave = getWaveNumberInCampaign(campaign, activeSave.currentNodeId, waveIndex);
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
          <svg width="112" height="112" viewBox="0 0 80 80" fill="none">
            <circle cx="40" cy="40" r="36" stroke={accent} strokeWidth="3" fill={`${accent}12`} />
            <path d="M28 40l8 8 16-16" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="112" height="112" viewBox="0 0 80 80" fill="none">
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
          fontSize: 'clamp(82px, 12vw, 138px)',
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
          fontSize: 28,
          fontWeight: 500,
          color: '#ccc',
        }}
        >
        {isVictory
          ? ending?.title ?? 'The campaign reached an ending.'
          : `The defence broke in ${currentWorld?.name ?? 'the current world'}, on ${currentLevel?.name ?? 'the current level'}, wave ${waveIndex + 1}.`}
      </p>

      {isVictory && ending?.body && (
        <p
          className="anim-fadeIn d3"
          style={{
            marginTop: 12,
            maxWidth: 760,
            textAlign: 'center',
            fontFamily: F,
            fontSize: 18,
            lineHeight: 1.45,
            color: '#d7e4ee',
          }}
        >
          {ending.body}
        </p>
      )}

      {currentLevel?.dragonForeshadow && (
        <p
          className="anim-fadeIn d3"
          style={{
            marginTop: 12,
            maxWidth: 680,
            textAlign: 'center',
            fontFamily: F,
            fontSize: 18,
            color: isVictory ? '#bcecc9' : '#ffb0b0',
          }}
        >
          {isVictory
            ? 'Britt-Inger was right: ask what the dragon wants open, then hold that line.'
            : currentLevel.dragonForeshadow}
        </p>
      )}

      {isVictory && (
        <div
          className="anim-fadeIn d4"
          style={{
            marginTop: 18,
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            justifyContent: 'center',
            maxWidth: 820,
          }}
        >
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d7e4ee', fontFamily: F, fontSize: 15 }}>
            Integrity {activeSave.consequenceState.civilianIntegrity}
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d7e4ee', fontFamily: F, fontSize: 15 }}>
            Knowledge {activeSave.consequenceState.familyKnowledge}
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d7e4ee', fontFamily: F, fontSize: 15 }}>
            Control {activeSave.consequenceState.laneControlMastery}
          </div>
          <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d7e4ee', fontFamily: F, fontSize: 15 }}>
            Breaches {activeSave.consequenceState.laneBreaches}
          </div>
        </div>
      )}

      {/* Stats */}
      <div
        className="anim-fadeIn d4 flex items-center"
        style={{
          gap: 48,
          marginTop: 48,
          padding: '34px 56px',
          background: 'rgba(255,255,255,0.05)',
          border: '2px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
        }}
      >
        <div className="flex flex-col items-center" style={{ gap: 6 }}>
          <span
            style={{
              fontFamily: F,
              fontSize: 68,
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
              fontSize: 18,
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
              fontSize: 68,
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
              fontSize: 18,
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
          unlockRetroSfx();
          playRetroSfx('start');
          startGame();
        }}
        className="anim-scaleIn d5 uppercase cursor-pointer"
        style={{
          marginTop: 48,
          padding: '22px 84px',
          fontSize: 30,
          fontWeight: 900,
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
        Return To The First World
      </button>
    </div>
  );
}
