import { TOWER_DEFS } from './towerDefs';
import type { TowerDef, TowerEffect } from './types';
import type { TowerDoctrineDef } from './levels/types';

const DOCTRINES: TowerDoctrineDef[] = [
  {
    id: 'scratchingPost_sentinel',
    towerId: 'scratchingPost',
    name: 'Sentinel',
    summary: 'More range, steadier lane anchoring.',
    modifier: { rangeDelta: 1.5, fireRateMultiplier: 0.92, role: 'Sentinel anchor', statLine: 'Longer reach, calmer cadence' },
  },
  {
    id: 'scratchingPost_ripper',
    towerId: 'scratchingPost',
    name: 'Ripper',
    summary: 'Higher DPS in a tighter footprint.',
    modifier: { rangeDelta: -0.5, damageDelta: 3, fireRateMultiplier: 1.15, role: 'Ripper post', statLine: 'Short range, fast shred' },
  },
  {
    id: 'yarnLauncher_webline',
    towerId: 'yarnLauncher',
    name: 'Webline',
    summary: 'Stronger slow for route control.',
    modifier: { slowFactorOverride: 0.42, slowDurationDelta: 0.8, role: 'Webline support', statLine: 'Heavy slow, lane hold' },
  },
  {
    id: 'yarnLauncher_tangleBurst',
    towerId: 'yarnLauncher',
    name: 'Tangle Burst',
    summary: 'Weaker slow with a splash snare.',
    modifier: {
      slowFactorOverride: 0.62,
      slowDurationDelta: -0.2,
      splashRadiusDelta: 2.2,
      splashFalloffDelta: 0.1,
      extraEffects: ['splash'],
      role: 'Tangle burst',
      statLine: 'Soft slow, small splash',
    },
  },
  {
    id: 'laserPointer_pierceSight',
    towerId: 'laserPointer',
    name: 'Pierce Sight',
    summary: 'Sharper shield pressure.',
    modifier: { bonusVsShieldedDelta: 0.75, damageDelta: 2, role: 'Pierce sight', statLine: 'Shield shred focus' },
  },
  {
    id: 'laserPointer_skyStitch',
    towerId: 'laserPointer',
    name: 'Sky Stitch',
    summary: 'Air superiority tuning.',
    modifier: { bonusVsFlyingDelta: 1.1, canTargetGround: true, canTargetFlying: true, role: 'Sky stitch', statLine: 'Fast anti-air beam' },
  },
  {
    id: 'catnipBomb_widePanic',
    towerId: 'catnipBomb',
    name: 'Wide Panic',
    summary: 'Larger splash for crowd control.',
    modifier: { splashRadiusDelta: 1.6, fireRateMultiplier: 0.9, role: 'Wide panic', statLine: 'Bigger blast radius' },
  },
  {
    id: 'catnipBomb_hotCore',
    towerId: 'catnipBomb',
    name: 'Hot Core',
    summary: 'Smaller splash with armor pressure.',
    modifier: { splashRadiusDelta: -0.8, armorPierceDelta: 4, damageDelta: 4, role: 'Hot core', statLine: 'Armor-busting burst' },
  },
  {
    id: 'treatDispenser_rationChain',
    towerId: 'treatDispenser',
    name: 'Ration Chain',
    summary: 'Reliable lane sustain with more reach.',
    modifier: { rangeDelta: 1.2, fireRateMultiplier: 0.95, role: 'Ration chain', statLine: 'Reliable lane feed' },
  },
  {
    id: 'treatDispenser_pepBurst',
    towerId: 'treatDispenser',
    name: 'Pep Burst',
    summary: 'Short-range swarm shred.',
    modifier: { rangeDelta: -1.4, damageDelta: 2, fireRateMultiplier: 1.25, role: 'Pep burst', statLine: 'Close swarm shred' },
  },
  {
    id: 'birdWhistle_falconCall',
    towerId: 'birdWhistle',
    name: 'Falcon Call',
    summary: 'Pure anti-air control.',
    modifier: { bonusVsFlyingDelta: 1.2, damageDelta: 2, role: 'Falcon call', statLine: 'Dedicated sky killer' },
  },
  {
    id: 'birdWhistle_panicTurn',
    towerId: 'birdWhistle',
    name: 'Panic Turn',
    summary: 'Softer damage with a slowing pulse.',
    modifier: {
      slowFactorOverride: 0.78,
      slowDurationDelta: 0.5,
      extraEffects: ['slow'],
      role: 'Panic turn',
      statLine: 'Air slow and pressure',
    },
  },
  {
    id: 'tunaMortar_siegeLob',
    towerId: 'tunaMortar',
    name: 'Siege Lob',
    summary: 'Pure armor punishment.',
    modifier: { armorPierceDelta: 5, damageDelta: 5, role: 'Siege lob', statLine: 'Tank breaker' },
  },
  {
    id: 'tunaMortar_ashBreaker',
    towerId: 'tunaMortar',
    name: 'Ash Breaker',
    summary: 'Faster cadence against corrupted waves.',
    modifier: { fireRateMultiplier: 1.15, splashRadiusDelta: 0.8, role: 'Ash breaker', statLine: 'Fast corruption siege' },
  },
  {
    id: 'magnetCollar_chainGrid',
    towerId: 'magnetCollar',
    name: 'Chain Grid',
    summary: 'More arc targets.',
    modifier: { chainCountDelta: 2, chainRangeDelta: 0.8, role: 'Chain grid', statLine: 'Longer electric spread' },
  },
  {
    id: 'magnetCollar_lockfield',
    towerId: 'magnetCollar',
    name: 'Lockfield',
    summary: 'Stronger slow and tighter arcs.',
    modifier: { slowFactorOverride: 0.58, chainCountDelta: -1, damageDelta: 2, role: 'Lockfield', statLine: 'Hard slow, focused arc' },
  },
];

export const DOCTRINES_BY_TOWER = DOCTRINES.reduce<Record<string, TowerDoctrineDef[]>>((acc, doctrine) => {
  acc[doctrine.towerId] ??= [];
  acc[doctrine.towerId].push(doctrine);
  return acc;
}, {});

export const DOCTRINES_BY_ID = DOCTRINES.reduce<Record<string, TowerDoctrineDef>>((acc, doctrine) => {
  acc[doctrine.id] = doctrine;
  return acc;
}, {});

function mergeEffects(baseEffects: TowerEffect[] | undefined, extraEffects: TowerEffect[] | undefined) {
  return [...new Set([...(baseEffects ?? []), ...(extraEffects ?? [])])];
}

export function getDoctrineChoicesForTower(towerId: string): TowerDoctrineDef[] {
  return DOCTRINES_BY_TOWER[towerId] ?? [];
}

export function resolveTowerDef(
  towerId: string,
  doctrineId?: string | null,
  runtimeBonuses?: { rangeBonus?: number; fireRateBonus?: number },
): TowerDef {
  const base = TOWER_DEFS[towerId];
  const doctrine = doctrineId ? DOCTRINES_BY_ID[doctrineId] : null;

  if (!base) {
    throw new Error(`Unknown tower "${towerId}"`);
  }

  if (!doctrine) {
    return {
      ...base,
      range: base.range + (runtimeBonuses?.rangeBonus ?? 0),
      fireRate: base.fireRate + (runtimeBonuses?.fireRateBonus ?? 0),
    };
  }

  const mod = doctrine.modifier;

  return {
    ...base,
    name: `${base.name} · ${doctrine.name}`,
    range: base.range + (mod.rangeDelta ?? 0) + (runtimeBonuses?.rangeBonus ?? 0),
    damage: base.damage + (mod.damageDelta ?? 0),
    fireRate:
      base.fireRate * (mod.fireRateMultiplier ?? 1) + (runtimeBonuses?.fireRateBonus ?? 0),
    projectileSpeed: base.projectileSpeed * (mod.projectileSpeedMultiplier ?? 1),
    effects: mergeEffects(base.effects, mod.extraEffects),
    canTargetGround: mod.canTargetGround ?? base.canTargetGround,
    canTargetFlying: mod.canTargetFlying ?? base.canTargetFlying,
    slowFactor: mod.slowFactorOverride ?? base.slowFactor,
    slowDuration: (base.slowDuration ?? 0) + (mod.slowDurationDelta ?? 0) || undefined,
    splashRadius: (base.splashRadius ?? 0) + (mod.splashRadiusDelta ?? 0) || undefined,
    splashFalloff: (base.splashFalloff ?? 0) + (mod.splashFalloffDelta ?? 0) || undefined,
    armorPierce: (base.armorPierce ?? 0) + (mod.armorPierceDelta ?? 0) || undefined,
    bonusVsFlying: (base.bonusVsFlying ?? 0) + (mod.bonusVsFlyingDelta ?? 0) || undefined,
    bonusVsShielded: (base.bonusVsShielded ?? 0) + (mod.bonusVsShieldedDelta ?? 0) || undefined,
    chainCount: (base.chainCount ?? 0) + (mod.chainCountDelta ?? 0) || undefined,
    chainRange: (base.chainRange ?? 0) + (mod.chainRangeDelta ?? 0) || undefined,
    chainFalloff:
      base.chainFalloff !== undefined
        ? base.chainFalloff * (mod.chainFalloffMultiplier ?? 1)
        : undefined,
    role: mod.role ?? base.role,
    statLine: mod.statLine ?? base.statLine,
  };
}

export function getDefaultDoctrineId(towerId: string): string | null {
  return getDoctrineChoicesForTower(towerId)[0]?.id ?? null;
}
