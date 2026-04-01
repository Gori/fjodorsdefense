'use client';

import { useGameStore } from '@/lib/store';
import { TOWER_DEFS } from '@/lib/towerDefs';
import { useEffect, useCallback, useState } from 'react';
import { playRetroSfx } from '@/lib/audio/sfx';
import { useCampaignStore } from '@/lib/campaignStore';
import { resolveTowerDef } from '@/lib/doctrines';

const F = 'var(--font-game)';
const S = '2px 2px 0 rgba(0,0,0,1), 4px 4px 0 rgba(0,0,0,0.7)';
const GOLD_S = '2px 2px 0 rgba(0,0,0,1), 4px 4px 0 rgba(255,214,102,0.35)';
const DANGER_S = '2px 2px 0 rgba(0,0,0,1), 4px 4px 0 rgba(255,71,87,0.35)';

function TowerIcon({ id, size = 52 }: { id: string; size?: number }) {
  const s = size;
  switch (id) {
    case 'scratchingPost':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect x="16" y="4" width="8" height="32" rx="2" fill="#c4873b" />
          <rect x="8" y="28" width="24" height="6" rx="2" fill="#a06a2c" />
          <rect x="14" y="8" width="12" height="4" rx="1" fill="#d9a05b" opacity="0.7" />
          <rect x="14" y="16" width="12" height="4" rx="1" fill="#d9a05b" opacity="0.7" />
          <rect x="14" y="24" width="12" height="4" rx="1" fill="#d9a05b" opacity="0.7" />
        </svg>
      );
    case 'yarnLauncher':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="14" fill="#e85d75" />
          <circle cx="20" cy="20" r="9" fill="none" stroke="#fff" strokeWidth="2" opacity="0.5" />
          <circle cx="20" cy="20" r="4" fill="none" stroke="#fff" strokeWidth="2" opacity="0.4" />
          <path d="M20 6 Q28 14 20 20 Q12 26 20 34" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.4" />
        </svg>
      );
    case 'laserPointer':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect x="8" y="16" width="24" height="8" rx="4" fill="#ff3333" />
          <circle cx="32" cy="20" r="3" fill="#ff6666" />
          <line x1="35" y1="20" x2="40" y2="20" stroke="#ff0000" strokeWidth="2" opacity="0.8" />
          <line x1="34" y1="14" x2="38" y2="10" stroke="#ff0000" strokeWidth="1.5" opacity="0.5" />
          <line x1="34" y1="26" x2="38" y2="30" stroke="#ff0000" strokeWidth="1.5" opacity="0.5" />
          <circle cx="32" cy="20" r="1.5" fill="#fff" opacity="0.9" />
        </svg>
      );
    case 'catnipBomb':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="22" r="12" fill="#4ade80" />
          <circle cx="20" cy="22" r="7" fill="#22c55e" opacity="0.7" />
          <rect x="18" y="6" width="4" height="8" rx="2" fill="#999" />
          <path d="M22 8 Q28 4 26 8" stroke="#FF8C00" strokeWidth="2" fill="none" opacity="0.9" />
          <circle cx="20" cy="22" r="3" fill="#fff" opacity="0.3" />
        </svg>
      );
    case 'treatDispenser':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <rect x="10" y="8" width="20" height="24" rx="5" fill="#d8973c" />
          <rect x="14" y="12" width="12" height="8" rx="2" fill="#f6d38f" />
          <circle cx="20" cy="26" r="4" fill="#8b5a2b" />
          <circle cx="20" cy="26" r="2" fill="#ffd666" />
        </svg>
      );
    case 'birdWhistle':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <path d="M11 20c0-5 4-9 9-9h5a4 4 0 0 1 0 18h-5c-5 0-9-4-9-9Z" fill="#2cb9b0" />
          <circle cx="24" cy="20" r="4" fill="#0f172a" opacity="0.35" />
          <path d="M31 14l5-3M32 20h6M31 26l5 3" stroke="#7de7df" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'tunaMortar':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="22" r="11" fill="#6e8aa5" />
          <rect x="17" y="8" width="6" height="12" rx="3" fill="#d7e2ee" />
          <path d="M14 29h12l-2 4h-8l-2-4Z" fill="#314559" />
          <circle cx="20" cy="22" r="3" fill="#cbd5e1" opacity="0.7" />
        </svg>
      );
    case 'magnetCollar':
      return (
        <svg width={s} height={s} viewBox="0 0 40 40" fill="none">
          <path d="M11 24a9 9 0 1 1 18 0" stroke="#40d9ff" strokeWidth="5" strokeLinecap="round" />
          <rect x="10" y="20" width="6" height="10" rx="2" fill="#0f172a" />
          <rect x="24" y="20" width="6" height="10" rx="2" fill="#0f172a" />
          <circle cx="20" cy="24" r="3" fill="#d9fbff" />
        </svg>
      );
    default:
      return null;
  }
}

export function TowerSelector() {
  const selectedTowerDef = useGameStore((s) => s.selectedTowerDef);
  const selectTowerDef = useGameStore((s) => s.selectTowerDef);
  const money = useGameStore((s) => s.money);
  const availableTowerIds = useGameStore((s) => s.availableTowerIds);
  const doctrineChoices = useCampaignStore((s) => s.activeSave.doctrineChoices);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const towerList = availableTowerIds
    .map((towerId) => resolveTowerDef(towerId, doctrineChoices[towerId]))
    .filter((def): def is (typeof TOWER_DEFS)[keyof typeof TOWER_DEFS] => Boolean(def));
  const stopClickThrough = (e: { stopPropagation: () => void }) => e.stopPropagation();
  const toggleTower = useCallback(
    (towerId: string | null) => {
      const nextId = selectedTowerDef === towerId ? null : towerId;
      selectTowerDef(nextId);
      playRetroSfx('select', nextId ? 1 : 0.75);
    },
    [selectTowerDef, selectedTowerDef],
  );

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        selectTowerDef(null);
        playRetroSfx('select', 0.75);
        return;
      }
      const idx = parseInt(e.key) - 1;
      if (idx >= 0 && idx < towerList.length) {
        const def = towerList[idx];
        if (money >= def.cost)
          toggleTower(def.id);
      }
    },
    [money, selectTowerDef, toggleTower, towerList],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  return (
    <div
      className="absolute z-10 pointer-events-none anim-fadeIn d4"
      onPointerDown={stopClickThrough}
      onClick={stopClickThrough}
      style={{
        bottom: 18,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div className="pointer-events-auto flex items-end" style={{ gap: 14 }}>
        {towerList.map((def, i) => {
          const canAfford = money >= def.cost;
          const isSelected = selectedTowerDef === def.id;
          const isHovered = hoveredId === def.id;

          return (
            <div key={def.id} style={{ position: 'relative' }}>
              {/* ─── Tooltip ─── */}
              {isHovered && canAfford && (
                <div
                  className="anim-fadeIn"
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: 12,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span style={{ fontFamily: F, fontSize: 18, fontWeight: 700, color: '#fff', textShadow: S }}>
                    {def.role ?? def.name}
                  </span>
                  <div className="flex items-center" style={{ gap: 10, fontFamily: F, fontSize: 15, fontWeight: 600, color: '#D0D0D0', textShadow: S }}>
                    <span>{def.statLine ?? `DMG ${def.damage}`}</span>
                    <span>·</span>
                    <span>RNG {def.range}</span>
                  </div>
                </div>
              )}

              {/* ─── Tower button ─── */}
              <button
                onPointerDown={stopClickThrough}
                onClick={(e) => {
                  e.stopPropagation();
                  if (canAfford) toggleTower(def.id);
                }}
                disabled={!canAfford}
                className={canAfford ? 'cursor-pointer' : 'cursor-not-allowed'}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 7,
                  padding: '12px 22px 12px',
                  minWidth: 108,
                  borderWidth: 3,
                  borderStyle: 'solid',
                  transition: 'all 0.15s',
                  position: 'relative',

                  // ── 3-STATE VISUAL ──
                  ...(isSelected ? {
                    // SELECTED: tower color glow, tinted bg, thick border
                    background: `${def.color}25`,
                    borderColor: def.color,
                    boxShadow: `4px 4px 0 ${def.color}55, inset -2px -2px 0 ${def.color}20`,
                    transform: 'scale(1.05)',
                  } : canAfford ? {
                    // AFFORDABLE: clean, inviting, subtle border
                    background: 'rgba(10,14,17,0.9)',
                    borderColor: isHovered ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.15)',
                    boxShadow: '4px 4px 0 rgba(0,0,0,0.5)',
                    transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                  } : {
                    // CAN'T AFFORD: dimmed, locked feel
                    background: 'rgba(8,10,14,0.85)',
                    borderColor: 'rgba(255,255,255,0.06)',
                    boxShadow: 'none',
                    transform: 'scale(1)',
                    opacity: 0.5,
                  }),
                }}
                onMouseEnter={() => setHoveredId(def.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Key badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 8,
                    fontFamily: F,
                    fontSize: 14,
                    fontWeight: 700,
                    color: isSelected ? def.color : canAfford ? '#9A9A9A' : '#5A5A5A',
                    lineHeight: 1,
                    textShadow: S,
                  }}
                >
                  {i + 1}
                </div>

                {/* Icon */}
                <div style={{
                  filter: canAfford
                    ? 'drop-shadow(2px 2px 0 rgba(0,0,0,0.95)) drop-shadow(4px 4px 0 rgba(0,0,0,0.7))'
                    : 'drop-shadow(2px 2px 0 rgba(0,0,0,0.95)) grayscale(0.8) brightness(0.5)',
                }}>
                  <TowerIcon id={def.id} size={40} />
                </div>

                {/* Name */}
                <span
                  style={{
                    fontFamily: F,
                    fontSize: 15,
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: isSelected ? '#FFFFFF' : canAfford ? '#E0E0E0' : '#7A7A7A',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    textShadow: S,
                  }}
                >
                  {def.name}
                </span>

                {doctrineChoices[def.id] && (
                  <span
                    style={{
                      fontFamily: F,
                      fontSize: 11,
                      fontWeight: 800,
                      lineHeight: 1,
                      color: '#9fd5ff',
                      textTransform: 'uppercase',
                      textShadow: S,
                    }}
                  >
                    {def.role}
                  </span>
                )}

                {/* Price — gold if affordable, RED if can't afford */}
                <span
                  style={{
                    fontFamily: F,
                    fontSize: 24,
                    fontWeight: 700,
                    lineHeight: 1,
                    color: canAfford ? '#FFD666' : '#FF4757',
                    textShadow: canAfford
                      ? GOLD_S
                      : DANGER_S,
                  }}
                >
                  ${def.cost}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
