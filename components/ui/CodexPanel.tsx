'use client';

import { useMemo } from 'react';
import { useGameStore } from '@/lib/store';
import { useCampaignStore } from '@/lib/campaignStore';

const F = 'var(--font-game)';
const S = '2px 2px 0 rgba(0,0,0,1), 4px 4px 0 rgba(0,0,0,0.7)';

export function CodexPanel() {
  const campaign = useGameStore((s) => s.campaign);
  const showCodex = useGameStore((s) => s.showCodex);
  const toggleCodex = useGameStore((s) => s.toggleCodex);
  const unlockedCodexIds = useCampaignStore((s) => s.activeSave.unlockedCodexIds);

  const entries = useMemo(() => {
    const codex = campaign.levels.flatMap((level) =>
      level.codexUnlocks
        .filter((entry) => unlockedCodexIds.includes(entry))
        .map((entry) => ({
        id: `${level.id}-${entry}`,
        title: entry,
        world: campaign.worlds.find((world) => world.id === level.worldId)?.name ?? level.worldId,
        story: level.storyBody,
      })),
    );
    return codex.reverse();
  }, [campaign.levels, campaign.worlds, unlockedCodexIds]);

  if (!showCodex) return null;

  return (
    <div
      className="absolute z-20"
      style={{
        top: 92,
        right: 24,
        width: 'min(420px, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 140px)',
        overflowY: 'auto',
        padding: '18px 18px 16px',
        background: 'rgba(6,10,16,0.94)',
        border: '2px solid rgba(255,255,255,0.14)',
        boxShadow: '6px 6px 0 rgba(0,0,0,0.42)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, lineHeight: 1, color: '#fff', textShadow: S }}>
          Codex
        </div>
        <button
          onClick={toggleCodex}
          style={{
            border: '2px solid rgba(255,255,255,0.14)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            fontFamily: F,
            fontSize: 14,
            fontWeight: 800,
            padding: '8px 10px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              padding: '12px 12px 10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <div style={{ fontFamily: F, fontSize: 13, fontWeight: 800, color: '#ffd666', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {entry.world}
            </div>
            <div style={{ fontFamily: F, fontSize: 18, fontWeight: 800, color: '#fff', marginTop: 4 }}>
              {entry.title}
            </div>
            <div style={{ fontFamily: F, fontSize: 14, lineHeight: 1.4, color: '#d2dbe5', marginTop: 6 }}>
              {entry.story}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
