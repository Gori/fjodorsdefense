'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/lib/store';
import { getDoctrineChoicesForTower, resolveTowerDef } from '@/lib/doctrines';
import { useCampaignStore } from '@/lib/campaignStore';

const F = 'var(--font-game)';
const S = '2px 2px 0 rgba(0,0,0,1), 4px 4px 0 rgba(0,0,0,0.7)';

export function CampaignOverlay() {
  const phase = useGameStore((s) => s.phase);
  const pendingChoice = useGameStore((s) => s.pendingChoice);
  const pendingDoctrineTowerId = useGameStore((s) => s.pendingDoctrineTowerId);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const chooseBranch = useGameStore((s) => s.chooseBranch);
  const chooseDoctrine = useGameStore((s) => s.chooseDoctrine);
  const activeSave = useCampaignStore((s) => s.activeSave);

  const doctrineChoices = useMemo(
    () => (pendingDoctrineTowerId ? getDoctrineChoicesForTower(pendingDoctrineTowerId) : []),
    [pendingDoctrineTowerId],
  );

  if (phase !== 'intermission') return null;

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center"
      style={{ background: 'rgba(4, 8, 14, 0.78)', pointerEvents: 'auto' }}
    >
      <div
        style={{
          width: 'min(960px, calc(100vw - 40px))',
          padding: '28px 28px 24px',
          border: `2px solid ${currentWorld?.accent ?? '#ffd666'}88`,
          background: 'rgba(6, 10, 16, 0.96)',
          boxShadow: '8px 8px 0 rgba(0,0,0,0.38)',
        }}
      >
        {pendingChoice && (
          <>
            <div style={{ fontFamily: F, fontSize: 18, fontWeight: 800, letterSpacing: '0.14em', color: currentWorld?.accent ?? '#ffd666', textTransform: 'uppercase', textShadow: S }}>
              Campaign Choice
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 0.95, color: '#fff', marginTop: 8, textShadow: S }}>
              {pendingChoice.prompt}
            </div>
            <div style={{ fontFamily: F, fontSize: 20, lineHeight: 1.4, color: '#d3deea', marginTop: 12 }}>
              {pendingChoice.description}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 24 }}>
              {pendingChoice.options.map((option) => (
                <button
                  key={option.id}
                  onClick={() => chooseBranch(pendingChoice.id, option.id)}
                  style={{
                    textAlign: 'left',
                    padding: '18px 18px 16px',
                    border: '2px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.04)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontFamily: F, fontSize: 18, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: S }}>
                    {option.label}
                  </div>
                  <div style={{ fontFamily: F, fontSize: 16, lineHeight: 1.4, color: '#c9d7e4', marginTop: 8 }}>
                    {option.description}
                  </div>
                  <div style={{ fontFamily: F, fontSize: 13, lineHeight: 1.5, color: '#9fd5ff', marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {Object.entries(option.consequenceDelta)
                      .map(([key, value]) => `${key.replace(/[A-Z]/g, (m) => ` ${m}`).toUpperCase()} ${value && value > 0 ? `+${value}` : value}`)
                      .join(' · ')}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {!pendingChoice && pendingDoctrineTowerId && (
          <>
            <div style={{ fontFamily: F, fontSize: 18, fontWeight: 800, letterSpacing: '0.14em', color: currentWorld?.accent ?? '#ffd666', textTransform: 'uppercase', textShadow: S }}>
              Tower Doctrine
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 0.95, color: '#fff', marginTop: 8, textShadow: S }}>
              Choose {resolveTowerDef(pendingDoctrineTowerId).name}
            </div>
            <div style={{ fontFamily: F, fontSize: 20, lineHeight: 1.4, color: '#d3deea', marginTop: 12 }}>
              Doctrine choice is campaign-wide for this tower family. It changes both combat behavior and UI readouts.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginTop: 24 }}>
              {doctrineChoices.map((doctrine) => {
                const resolved = resolveTowerDef(pendingDoctrineTowerId, doctrine.id);
                return (
                  <button
                    key={doctrine.id}
                    onClick={() => chooseDoctrine(pendingDoctrineTowerId, doctrine.id)}
                    style={{
                      textAlign: 'left',
                      padding: '18px 18px 16px',
                      border: '2px solid rgba(255,255,255,0.14)',
                      background: 'rgba(255,255,255,0.04)',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontFamily: F, fontSize: 18, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em', textShadow: S }}>
                      {doctrine.name}
                    </div>
                    <div style={{ fontFamily: F, fontSize: 15, lineHeight: 1.45, color: '#c9d7e4', marginTop: 8 }}>
                      {doctrine.summary}
                    </div>
                    <div style={{ fontFamily: F, fontSize: 14, lineHeight: 1.45, color: '#ffd666', marginTop: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {resolved.statLine}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            fontFamily: F,
            fontSize: 14,
            color: '#c9d7e4',
            lineHeight: 1.55,
          }}
        >
          Integrity {activeSave.consequenceState.civilianIntegrity} · Dragon Pressure {activeSave.consequenceState.dragonPressure} · Knowledge {activeSave.consequenceState.familyKnowledge} · Control {activeSave.consequenceState.laneControlMastery}
        </div>
      </div>
    </div>
  );
}
