'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useGameStore } from '@/lib/store';
import { useRuntimeSnapshot } from '@/lib/runtime';
import { playRetroSfx } from '@/lib/audio/sfx';
import { ENEMY_DEFS } from '@/lib/enemyDefs';
import { TOWER_DEFS } from '@/lib/towerDefs';
import { useCampaignStore } from '@/lib/campaignStore';
import { resolveTowerDef } from '@/lib/doctrines';

const F = 'var(--font-game)';
const S = '2px 2px 0 rgba(0,0,0,1), 4px 4px 0 rgba(0,0,0,0.7)';
const GOLD_S = '2px 2px 0 rgba(0,0,0,1), 4px 4px 0 rgba(255,214,102,0.35)';
const INTRO_MS = 4800;

interface DisplayLaneThreat {
  id: string;
  label: string;
  role: string;
  color: string;
  threat: number;
  isPriority: boolean;
}

const PIXELS = {
  planner: [
    '1111111',
    '1000001',
    '1011101',
    '1010101',
    '1011101',
    '1000001',
    '1111111',
  ],
  index: [
    '1111100',
    '1000100',
    '1011100',
    '1010100',
    '1011100',
    '1000100',
    '1111100',
  ],
  path: [
    '1000001',
    '1100001',
    '0110011',
    '0011110',
    '0011000',
    '0110000',
    '1100000',
  ],
  firstPerson: [
    '0011100',
    '0100010',
    '1011101',
    '1000001',
    '1011101',
    '0100010',
    '0011100',
  ],
} as const;

function PixelGlyph({ rows, active }: { rows: readonly string[]; active: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${rows[0]?.length ?? 0}, 1fr)`,
        gap: 1.5,
      }}
    >
      {rows.flatMap((row, rowIndex) =>
        row.split('').map((cell, cellIndex) => (
          <span
            key={`${rowIndex}-${cellIndex}`}
            style={{
              width: 5,
              height: 5,
              display: 'block',
              background:
                cell === '1'
                  ? active
                    ? '#fff1b8'
                    : '#d8e6f0'
                  : 'transparent',
              boxShadow: cell === '1' ? '1px 1px 0 rgba(0,0,0,0.55)' : 'none',
            }}
          />
        )),
      )}
    </div>
  );
}

function ToolButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: readonly string[];
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 102,
        minHeight: 68,
        padding: '10px 8px 8px',
        border: `2px solid ${active ? 'rgba(255,214,102,0.82)' : 'rgba(255,255,255,0.22)'}`,
        background: active ? 'linear-gradient(180deg, rgba(255,214,102,0.24), rgba(39,22,5,0.9))' : 'linear-gradient(180deg, rgba(24,42,57,0.94), rgba(6,12,18,0.88))',
        color: active ? '#fff7d6' : '#d9e2ea',
        fontFamily: F,
        fontSize: 10,
        fontWeight: 800,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: active
          ? '3px 3px 0 rgba(0,0,0,0.65), 6px 6px 0 rgba(255,214,102,0.16)'
          : '3px 3px 0 rgba(0,0,0,0.55)',
      }}
    >
      <PixelGlyph rows={icon} active={active} />
      <span style={{ textShadow: S }}>{label}</span>
    </button>
  );
}

export function HUD() {
  const money = useGameStore((s) => s.money);
  const lives = useGameStore((s) => s.lives);
  const campaign = useGameStore((s) => s.campaign);
  const levelIndex = useGameStore((s) => s.levelIndex);
  const waveIndex = useGameStore((s) => s.waveIndex);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const currentWave = useGameStore((s) => s.currentWave);
  const currentWorld = useGameStore((s) => s.currentWorld);
  const phase = useGameStore((s) => s.phase);
  const startWave = useGameStore((s) => s.startWave);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const showPathOverlay = useGameStore((s) => s.showPathOverlay);
  const showCodex = useGameStore((s) => s.showCodex);
  const toggleCameraMode = useGameStore((s) => s.toggleCameraMode);
  const toggleFirstPersonMode = useGameStore((s) => s.toggleFirstPersonMode);
  const togglePathOverlay = useGameStore((s) => s.togglePathOverlay);
  const toggleCodex = useGameStore((s) => s.toggleCodex);
  const placementHint = useGameStore((s) => s.placementHint);
  const activeHazardLabel = useGameStore((s) => s.activeHazardLabel);
  const pendingChoice = useGameStore((s) => s.pendingChoice);
  const pendingDoctrineTowerId = useGameStore((s) => s.pendingDoctrineTowerId);
  const activeSave = useCampaignStore((s) => s.activeSave);
  const { enemyCount, totalSpawned, totalWaveEnemies, laneStates, activeHazards } = useRuntimeSnapshot();
  const [dismissedIntroKey, setDismissedIntroKey] = useState<string | null>(null);
  const [expiredIntroKey, setExpiredIntroKey] = useState<string | null>(null);
  const [dismissedWorldIntroKey, setDismissedWorldIntroKey] = useState<string | null>(null);
  const [expiredWorldIntroKey, setExpiredWorldIntroKey] = useState<string | null>(null);

  const displayWave = waveIndex + 1;
  const displayLevel = levelIndex + 1;
  const newEnemies = currentLevel?.newEnemyIds.map((id) => ENEMY_DEFS[id]?.name ?? id) ?? [];
  const newTowers = currentLevel?.newTowerIds.map((id) => TOWER_DEFS[id]?.name ?? id) ?? [];
  const laneCount = currentLevel?.lanes.length ?? currentLevel?.activePathIds.length ?? 1;
  const enemiesRemaining = (totalWaveEnemies - totalSpawned) + enemyCount;
  const introKey = `${levelIndex}:${currentLevel?.id ?? 'none'}`;
  const worldIntroKey = currentWorld?.id ?? 'none';
  const orderedLaneThreats = useMemo<DisplayLaneThreat[]>(
    () =>
      laneStates.length > 0
        ? [...laneStates]
            .sort((a, b) => b.threat - a.threat)
            .map((lane) => ({
              id: lane.id,
              label: lane.label,
              role: lane.role,
              color: lane.color,
              threat: lane.threat,
              isPriority: lane.isPriority,
            }))
        : [...(currentLevel?.lanes ?? [])]
            .sort((a, b) => b.threat - a.threat)
            .map((lane) => ({
              id: lane.id,
              label: lane.label,
              role: lane.role,
              color: lane.color,
              threat: lane.threat,
              isPriority: false,
            })),
    [currentLevel?.lanes, laneStates],
  );
  const modifierNames = (currentLevel?.worldModifierIds ?? []).map((modifierId) =>
    campaign.worldModifiers.find((entry) => entry.id === modifierId)?.name ?? modifierId,
  );
  const activeHazardSummary = useMemo(() => {
    const activeHazard = activeHazards.find((hazard) => hazard.active);
    if (!activeHazard) return null;
    if (activeHazard.label === 'Ember Surge') {
      return 'Corrupted enemies speed up and harden';
    }
    if (activeHazard.label === 'Dragon Wake') {
      return 'Priority lane shifts under dragon pressure';
    }
    if (activeHazard.label === 'Tunnel Breach') {
      return 'One route bends mid-wave';
    }
    return null;
  }, [activeHazards]);
  const worldFirstLevelId = currentWorld
    ? campaign.levels.find((level) => level.worldId === currentWorld.id)?.id ?? null
    : null;
  const isWorldOpening = phase === 'between-waves' && waveIndex === 0 && currentLevel?.id === worldFirstLevelId;
  const waveLaneLabels = Array.from(
    new Set(
      (currentLevel?.waves[waveIndex]?.groups ?? []).map((group) => {
        const mapping = ['MAIN', 'NORTH', 'SOUTH'];
        const previewMask = currentLevel?.hazards.some((hazard) => hazard.type === 'previewMask');
        const signalRoute = currentLevel?.worldModifierIds.includes('signal-route');
        if (previewMask && group.hiddenUntilSecondsLeft && phase === 'between-waves') {
          return signalRoute
            ? `SIGNAL MARK ${mapping[group.pathIndex] ?? `LANE ${group.pathIndex + 1}`}`
            : 'HIDDEN SUPPORT';
        }
        return mapping[group.pathIndex] ?? `LANE ${group.pathIndex + 1}`;
      }),
    ),
  );

  const canShowIntro = phase === 'between-waves' && waveIndex === 0 && Boolean(currentLevel);
  const betweenWaveBeat = useMemo(
    () => currentLevel?.betweenWaveBeats.find((beat) => beat.waveId === currentWave?.id) ?? null,
    [currentLevel?.betweenWaveBeats, currentWave?.id],
  );
  const objectiveStates = useMemo(
    () =>
      (currentLevel?.optionalObjectives ?? []).map((objective) => ({
        ...objective,
        completed: activeSave.completedObjectiveIds.includes(objective.id),
      })),
    [activeSave.completedObjectiveIds, currentLevel?.optionalObjectives],
  );

  useEffect(() => {
    if (!canShowIntro) return;
    const timeout = window.setTimeout(() => setExpiredIntroKey(introKey), INTRO_MS);
    return () => window.clearTimeout(timeout);
  }, [canShowIntro, introKey]);

  useEffect(() => {
    if (!isWorldOpening) return;
    const timeout = window.setTimeout(() => setExpiredWorldIntroKey(worldIntroKey), INTRO_MS + 900);
    return () => window.clearTimeout(timeout);
  }, [isWorldOpening, worldIntroKey]);

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'Space' && phase === 'between-waves') {
        e.preventDefault();
        startWave();
      }
      if (e.code === 'Tab') {
        e.preventDefault();
        toggleCameraMode();
      }
      if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFirstPersonMode();
      }
      if (e.code === 'KeyC') {
        e.preventDefault();
        toggleCodex();
      }
    },
    [phase, startWave, toggleCameraMode, toggleCodex, toggleFirstPersonMode],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const topLabel = useMemo(() => {
    if (phase === 'between-waves') {
      return `WAVE ${displayWave}/${currentLevel?.waves.length ?? 0} READY`;
    }
    if (phase === 'intermission') {
      return pendingChoice ? 'CHOICE REQUIRED' : 'DOCTRINE REQUIRED';
    }
    return enemiesRemaining > 0 ? `${enemiesRemaining} REMAINING` : 'CLEAR';
  }, [phase, displayWave, currentLevel, enemiesRemaining, pendingChoice]);

  const showWorldIntro =
    isWorldOpening &&
    dismissedWorldIntroKey !== worldIntroKey &&
    expiredWorldIntroKey !== worldIntroKey;
  const showIntro =
    canShowIntro &&
    dismissedIntroKey !== introKey &&
    expiredIntroKey !== introKey &&
    !showWorldIntro;

  return (
    <>
      <div
        className="absolute z-10 pointer-events-none anim-fadeIn"
        style={{
          top: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '20px 24px',
        }}
      >
        <div style={{ minWidth: 190 }}>
          <div style={{ fontFamily: F, fontSize: 18, fontWeight: 800, letterSpacing: '0.12em', color: '#aab4be', textShadow: S }}>
            HP
          </div>
          <div style={{ fontFamily: F, fontSize: 72, fontWeight: 900, lineHeight: 0.9, color: '#ff6b81', textShadow: S }}>
            {lives}
          </div>
        </div>

        <div style={{ textAlign: 'center', maxWidth: 720 }}>
          <div style={{ fontFamily: F, fontSize: 18, fontWeight: 800, letterSpacing: '0.14em', color: currentWorld?.accent ?? '#ffd666', textShadow: GOLD_S }}>
            {currentWorld?.name ?? 'CAMPAIGN'} · LEVEL {displayLevel}/{campaign.levels.length}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 54, lineHeight: 0.92, color: '#fff', textShadow: S, marginTop: 4 }}>
            {currentLevel?.name ?? 'BATTLEFIELD'}
          </div>
          <div style={{ fontFamily: F, fontSize: 24, fontWeight: 900, letterSpacing: '0.12em', color: '#ffd666', textShadow: GOLD_S, marginTop: 6 }}>
            {topLabel}
          </div>
          {(activeHazardLabel || activeHazards.find((hazard) => hazard.active)?.label) && (
            <div style={{ fontFamily: F, fontSize: 16, fontWeight: 800, letterSpacing: '0.1em', color: '#ff9e80', textShadow: S, marginTop: 8 }}>
              HAZARD: {(activeHazards.find((hazard) => hazard.active)?.label ?? activeHazardLabel ?? '').toUpperCase()}
            </div>
          )}
          {activeHazardSummary && (
            <div style={{ fontFamily: F, fontSize: 14, fontWeight: 800, letterSpacing: '0.05em', color: '#ffd7a1', textShadow: S, marginTop: 6 }}>
              {activeHazardSummary}
            </div>
          )}
          {waveLaneLabels.length > 0 && (
            <div style={{ fontFamily: F, fontSize: 16, fontWeight: 800, letterSpacing: '0.1em', color: '#9fd5ff', textShadow: S, marginTop: 8 }}>
              INCOMING: {waveLaneLabels.join(' · ')}
            </div>
          )}
          {phase === 'between-waves' && betweenWaveBeat && (
            <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, letterSpacing: '0.06em', color: '#ffd7a1', textShadow: S, marginTop: 10 }}>
              BEAT: {betweenWaveBeat.text}
            </div>
          )}
        </div>

        <div style={{ minWidth: 190, textAlign: 'right' }}>
          <div style={{ fontFamily: F, fontSize: 18, fontWeight: 800, letterSpacing: '0.12em', color: '#aab4be', textShadow: S }}>
            MONEY
          </div>
          <div style={{ fontFamily: F, fontSize: 72, fontWeight: 900, lineHeight: 0.9, color: '#ffd666', textShadow: GOLD_S }}>
            {money}
          </div>
        </div>
      </div>

      <div
        className="absolute z-10 pointer-events-auto anim-fadeIn"
        style={{
          top: 130,
          right: 24,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          maxWidth: 440,
        }}
      >
        <ToolButton
          label={cameraMode === 'planner' ? 'PLANNER ON' : 'PLANNER OFF'}
          icon={PIXELS.planner}
          active={cameraMode === 'planner'}
          onClick={() => {
            playRetroSfx('select', 0.9);
            toggleCameraMode();
          }}
        />
        <ToolButton
          label={showCodex ? 'INDEX ON' : 'INDEX'}
          icon={PIXELS.index}
          active={showCodex}
          onClick={() => {
            playRetroSfx('select', 0.85);
            toggleCodex();
          }}
        />
        <ToolButton
          label="PATH GLOW"
          icon={PIXELS.path}
          active={showPathOverlay}
          onClick={() => {
            playRetroSfx('select', 0.85);
            togglePathOverlay();
          }}
        />
        <ToolButton
          label={cameraMode === 'firstPerson' ? 'FIRST ON' : 'FIRST OFF'}
          icon={PIXELS.firstPerson}
          active={cameraMode === 'firstPerson'}
          onClick={() => {
            playRetroSfx('select', 0.85);
            toggleFirstPersonMode();
          }}
        />
      </div>

      <div
        className="absolute z-10 pointer-events-none anim-fadeIn"
        style={{
          top: 206,
          right: 24,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          justifyContent: 'flex-end',
          maxWidth: 420,
        }}
      >
        {(currentLevel?.lanes ?? []).map((lane) => (
          <div
            key={lane.id}
            style={{
              padding: '8px 12px',
              border: `2px solid ${lane.color}55`,
              background: 'rgba(7,11,18,0.76)',
              color: lane.color,
              fontFamily: F,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              textShadow: S,
            }}
          >
            {lane.label} {lane.role}
          </div>
        ))}
      </div>

      <div
        className="absolute z-10 pointer-events-none anim-fadeIn"
        style={{
          left: 24,
          top: 130,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 340,
        }}
      >
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(7,11,18,0.78)',
            border: '2px solid rgba(255,255,255,0.1)',
          }}
        >
          <div style={{ fontFamily: F, fontSize: 13, fontWeight: 900, letterSpacing: '0.1em', color: '#ffd666', textTransform: 'uppercase', textShadow: GOLD_S }}>
            Lane Pressure
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {orderedLaneThreats.map((lane, index) => (
              <div key={lane.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: lane.color, textTransform: 'uppercase', textShadow: S }}>
                  {index + 1}. {lane.label} {lane.role}{lane.isPriority ? ' PRIORITY' : ''}
                </span>
                <span style={{ fontFamily: F, fontSize: 14, color: '#d7e4ee', textShadow: S }}>
                  THREAT {lane.threat}
                </span>
              </div>
            ))}
          </div>
        </div>

        {(cameraMode === 'planner' || showPathOverlay) && (
          <div
            style={{
              padding: '10px 12px',
              background: 'rgba(7,11,18,0.78)',
              border: '2px solid rgba(255,255,255,0.1)',
            }}
          >
            <div style={{ fontFamily: F, fontSize: 13, fontWeight: 900, letterSpacing: '0.1em', color: '#9fd5ff', textTransform: 'uppercase', textShadow: S }}>
              Planner Legend
            </div>
            <div style={{ fontFamily: F, fontSize: 13, lineHeight: 1.55, color: '#d7e4ee', marginTop: 8 }}>
              Orange: route flow
            </div>
            <div style={{ fontFamily: F, fontSize: 13, lineHeight: 1.55, color: '#d7e4ee' }}>
              Cyan: watchpost range bonus
            </div>
            <div style={{ fontFamily: F, fontSize: 13, lineHeight: 1.55, color: '#d7e4ee' }}>
              Red: hazard lockout / danger forecast
            </div>
            <div style={{ fontFamily: F, fontSize: 13, lineHeight: 1.55, color: '#d7e4ee' }}>
              Green grid: buildable ground in planner view
            </div>
          </div>
        )}
      </div>

      {placementHint && (
        <div
          className="absolute z-10 pointer-events-none anim-fadeIn"
          style={{
            left: '50%',
            bottom: 154,
            transform: 'translateX(-50%)',
            padding: '10px 16px',
            background: 'rgba(7,11,18,0.84)',
            border: '2px solid rgba(255,255,255,0.12)',
            color: '#f1f5f9',
            fontFamily: F,
            fontSize: 16,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            textShadow: S,
          }}
        >
          {placementHint}
        </div>
      )}

      <div
        className="absolute z-10 pointer-events-none anim-fadeIn"
        style={{
          left: 24,
          bottom: 140,
          padding: '12px 14px',
          background: 'rgba(7,11,18,0.84)',
          border: '2px solid rgba(255,255,255,0.1)',
          maxWidth: 420,
        }}
      >
        <div style={{ fontFamily: F, fontSize: 14, fontWeight: 900, letterSpacing: '0.1em', color: '#ffd666', textTransform: 'uppercase', textShadow: GOLD_S }}>
          Campaign State
        </div>
        <div style={{ fontFamily: F, fontSize: 14, color: '#d7e4ee', marginTop: 8, lineHeight: 1.45 }}>
          Integrity {activeSave.consequenceState.civilianIntegrity} · Knowledge {activeSave.consequenceState.familyKnowledge} · Control {activeSave.consequenceState.laneControlMastery}
        </div>
        {objectiveStates.length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {objectiveStates.map((objective) => (
              <div key={objective.id} style={{ fontFamily: F, fontSize: 13, color: objective.completed ? '#9ee3b1' : '#d7e4ee', lineHeight: 1.4 }}>
                {objective.completed ? 'COMPLETED' : 'OPTIONAL'}: {objective.text}
              </div>
            ))}
          </div>
        )}
        {pendingDoctrineTowerId && (
          <div style={{ fontFamily: F, fontSize: 14, color: '#9fd5ff', marginTop: 8 }}>
            Pending doctrine: {resolveTowerDef(pendingDoctrineTowerId).name}
          </div>
        )}
      </div>

      {showWorldIntro && currentLevel && currentWorld && (
        <div
          className="absolute z-10 anim-fadeIn"
          onClick={() => setDismissedWorldIntroKey(worldIntroKey)}
          style={{
            top: 188,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(980px, calc(100vw - 64px))',
            padding: '22px 24px',
            background: 'rgba(7,11,18,0.94)',
            border: `2px solid ${currentWorld.accent}88`,
            boxShadow: '6px 6px 0 rgba(0,0,0,0.35)',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontFamily: F, fontSize: 16, fontWeight: 900, letterSpacing: '0.14em', color: currentWorld.accent, textTransform: 'uppercase' }}>
            World Intro
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 54, lineHeight: 0.92, color: '#fff', textShadow: S, marginTop: 8 }}>
            {currentWorld.name}
          </div>
          <div style={{ fontFamily: F, fontSize: 20, lineHeight: 1.4, color: '#d7e4ee', marginTop: 12 }}>
            {currentWorld.storyIntro}
          </div>
          <div style={{ fontFamily: F, fontSize: 15, lineHeight: 1.55, color: '#b8c7d4', marginTop: 14 }}>
            {currentWorld.description}
          </div>
          <div style={{ fontFamily: F, fontSize: 14, fontWeight: 800, letterSpacing: '0.08em', color: '#9fd5ff', textTransform: 'uppercase', marginTop: 14 }}>
            {orderedLaneThreats.map((lane) => `${lane.label} ${lane.role}`).join(' · ')}
          </div>
          <div style={{ fontFamily: F, fontSize: 13, color: '#9fb3c1', marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Click to dismiss
          </div>
        </div>
      )}

      {showIntro && currentLevel && (
        <div
          className="absolute z-10 anim-fadeIn"
          onClick={() => setDismissedIntroKey(introKey)}
          style={{
            top: 190,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 'min(900px, calc(100vw - 64px))',
            padding: '20px 24px',
            background: 'rgba(7,11,18,0.9)',
            border: `2px solid ${currentWorld?.accent ?? '#ffd666'}55`,
            boxShadow: '6px 6px 0 rgba(0,0,0,0.35)',
            textAlign: 'center',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontFamily: F, fontSize: 18, fontWeight: 800, letterSpacing: '0.14em', color: currentWorld?.accent ?? '#ffd666', textTransform: 'uppercase' }}>
            {currentWorld?.subtitle ?? currentWorld?.name}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, lineHeight: 0.95, color: '#fff', textShadow: S, marginTop: 8 }}>
            {currentLevel.storyTitle}
          </div>
          <div style={{ fontFamily: F, fontSize: 20, lineHeight: 1.35, color: '#d6d6d6', marginTop: 12 }}>
            {currentLevel.storyBody}
          </div>
          <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, letterSpacing: '0.1em', color: '#8ecae6', textTransform: 'uppercase', marginTop: 12 }}>
            {laneCount} active lane{laneCount > 1 ? 's' : ''} · {currentLevel.restrictedZones.length} blocked build zone{currentLevel.restrictedZones.length === 1 ? '' : 's'}
          </div>
          {modifierNames.length > 0 && (
            <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, letterSpacing: '0.08em', color: '#ffcf8b', textTransform: 'uppercase', marginTop: 10 }}>
              Active world state: {modifierNames.join(' · ')}
            </div>
          )}
          <div style={{ fontFamily: F, fontSize: 15, color: '#c8d6e3', marginTop: 10 }}>
            Route pressure: {orderedLaneThreats.map((lane) => `${lane.label} ${lane.role} ${lane.threat}`).join(' · ')}
          </div>
          {newEnemies.length > 0 && (
            <div style={{ fontFamily: F, fontSize: 16, color: '#ffb0b0', marginTop: 10 }}>
              New threat: {newEnemies.join(', ')}
            </div>
          )}
          {newTowers.length > 0 && (
            <div style={{ fontFamily: F, fontSize: 16, color: '#ffe39d', marginTop: 6 }}>
              New tower: {newTowers.join(', ')}
            </div>
          )}
          <div style={{ fontFamily: F, fontSize: 13, color: '#9fb3c1', marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Click to dismiss · C for codex
          </div>
        </div>
      )}

      {phase === 'between-waves' && !pendingChoice && !pendingDoctrineTowerId && (
        <div
          className="absolute z-10 anim-fadeIn d2"
          style={{
            left: 0,
            right: 0,
            bottom: 180,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => {
                playRetroSfx('deploy');
                startWave();
              }}
              className="uppercase cursor-pointer"
              style={{
                padding: '18px 72px',
                fontSize: 28,
                fontWeight: 900,
                fontFamily: F,
                letterSpacing: '0.14em',
                color: '#111',
                background: '#FFD666',
                border: 'none',
                boxShadow: '4px 4px 0 rgba(0,0,0,0.65), 6px 6px 0 rgba(255,214,102,0.35)',
              }}
            >
              Deploy
            </button>
            <div style={{ fontFamily: F, fontSize: 16, color: '#fff', textTransform: 'uppercase', textShadow: S }}>
              Space to launch · Tab for planner · F for first person
            </div>
          </div>
        </div>
      )}
    </>
  );
}
