'use client';

import { useGameStore } from '@/lib/store';
import { playRetroSfx, unlockRetroSfx } from '@/lib/audio/sfx';
import { useCampaignStore } from '@/lib/campaignStore';
import { useProfileStore } from '@/lib/profileStore';
import { CHALLENGE_MUTATORS } from '@/lib/mutators';

const F = 'var(--font-game)';

export function StartScreen({ isMapVisible = false }: { isMapVisible?: boolean }) {
  const startGame = useGameStore((s) => s.startGame);
  const campaign = useGameStore((s) => s.campaign);
  const saveSlots = useCampaignStore((s) => s.saveSlots);
  const profile = useProfileStore((s) => s.profile);
  const toggleChallengeMutator = useProfileStore((s) => s.toggleChallengeMutator);
  const stopClickThrough = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const firstWorld = campaign.worlds[0];

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center transition-colors duration-700"
      onPointerDown={stopClickThrough}
      onClick={stopClickThrough}
      style={{ background: isMapVisible ? 'rgba(0,0,0,0.66)' : 'rgba(0,0,0,0.92)' }}
    >
      {/* Title */}
      <h1
        className="anim-fadeIn d1 text-center uppercase"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(104px, 16vw, 190px)',
          lineHeight: 0.88,
          color: '#fff',
        }}
      >
        FJODOR&apos;S<br />DEFENSE
      </h1>

      <p
        className="anim-fadeIn d2 uppercase"
        style={{
          fontFamily: F,
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '0.18em',
          color: firstWorld?.accent ?? '#ffd666',
          marginTop: 24,
        }}
      >
        {firstWorld?.name ?? 'Södermalm · Stockholm'}
      </p>

      <p
        className="anim-fadeIn d2"
        style={{
          marginTop: 14,
          maxWidth: 680,
          textAlign: 'center',
          fontFamily: F,
          fontSize: 22,
          lineHeight: 1.45,
          color: '#d1d7de',
        }}
      >
        Fjodor and Folke are only supposed to cross Södermalm before dark. Then the streets begin remembering, Britt-Inger&apos;s warnings return, and something dragon-hot starts moving under the island.
      </p>

      <div
        className="anim-fadeIn d3"
        style={{
          marginTop: 42,
          width: 'min(860px, calc(100vw - 48px))',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14,
        }}
      >
        {saveSlots.map((slot, index) => (
          <button
            key={index}
            onPointerDown={stopClickThrough}
            onClick={(e) => {
              e.stopPropagation();
              unlockRetroSfx();
              playRetroSfx('start');
              startGame(index);
            }}
            className="uppercase cursor-pointer"
            style={{
              padding: '18px 18px 16px',
              textAlign: 'left',
              background: slot ? 'rgba(255,214,102,0.08)' : 'rgba(255,255,255,0.05)',
              border: `2px solid ${slot ? 'rgba(255,214,102,0.28)' : 'rgba(255,255,255,0.12)'}`,
              color: '#fff',
            }}
          >
            <div style={{ fontFamily: F, fontSize: 16, fontWeight: 900, letterSpacing: '0.14em', color: firstWorld?.accent ?? '#ffd666' }}>
              SLOT {index + 1}
            </div>
            <div style={{ fontFamily: F, fontSize: 22, fontWeight: 900, marginTop: 8 }}>
              {slot ? 'Continue Watch' : 'New Watch'}
            </div>
            <div style={{ fontFamily: F, fontSize: 14, color: '#c7d2dc', marginTop: 8, lineHeight: 1.5 }}>
              {slot
                ? `Node ${slot.currentNodeId.replace('node-', '').toUpperCase()} · Integrity ${slot.consequenceState.civilianIntegrity} · Knowledge ${slot.consequenceState.familyKnowledge} · Objectives ${slot.completedObjectiveIds?.length ?? 0}`
                : 'Start a fresh campaign on this slot.'}
            </div>
          </button>
        ))}
      </div>

      <div
        className="anim-fadeIn d4"
        style={{
          marginTop: 26,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: 860,
        }}
      >
        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d7e4ee', fontFamily: F, fontSize: 15 }}>
          Endings {profile.completedEndingIds.length}/2
        </div>
        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d7e4ee', fontFamily: F, fontSize: 15 }}>
          Codex {profile.codexCompletion.length}
        </div>
        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d7e4ee', fontFamily: F, fontSize: 15 }}>
          Doctrine Families {profile.doctrineFamiliesUnlocked.length}
        </div>
        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d7e4ee', fontFamily: F, fontSize: 15 }}>
          Medals {Object.keys(profile.arcadeMedals).length}
        </div>
      </div>

      {profile.challengeMutators.length > 0 && (
        <div
          className="anim-fadeIn d4"
          style={{
            marginTop: 20,
            width: 'min(860px, calc(100vw - 48px))',
            padding: '16px 18px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontFamily: F, fontSize: 16, fontWeight: 900, letterSpacing: '0.12em', color: firstWorld?.accent ?? '#ffd666', textTransform: 'uppercase' }}>
            Challenge Mutators
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 12 }}>
            {CHALLENGE_MUTATORS.filter((mutator) => profile.challengeMutators.includes(mutator.id)).map((mutator) => {
              const active = profile.activeChallengeMutators.includes(mutator.id);
              return (
                <button
                  key={mutator.id}
                  onPointerDown={stopClickThrough}
                  onClick={(e) => {
                    e.stopPropagation();
                    playRetroSfx('select', 0.8);
                    toggleChallengeMutator(mutator.id);
                  }}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    background: active ? 'rgba(255,214,102,0.12)' : 'rgba(255,255,255,0.04)',
                    border: `2px solid ${active ? 'rgba(255,214,102,0.35)' : 'rgba(255,255,255,0.12)'}`,
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontFamily: F, fontSize: 15, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', color: active ? '#ffd666' : '#fff' }}>
                    {mutator.name}
                  </div>
                  <div style={{ fontFamily: F, fontSize: 13, lineHeight: 1.45, color: '#c7d2dc', marginTop: 6 }}>
                    {mutator.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Controls */}
      <p
        className="anim-fadeIn d4"
        style={{
          marginTop: 48,
          fontFamily: F,
          fontSize: 18,
          fontWeight: 500,
          color: '#777',
        }}
      >
        Click to place · Right-drag to rotate · Scroll to zoom · Tab for planner
      </p>
    </div>
  );
}
