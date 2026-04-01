import type {
  CampaignConfig,
  LaneConfig,
  LevelConfig,
  SpawnGroupConfig,
  WaveConfig,
} from '../levels/types';

function group(template: string, overrides: Partial<SpawnGroupConfig> = {}): SpawnGroupConfig {
  return { template, ...overrides };
}

function wave(id: string, name: string, groups: SpawnGroupConfig[], completionBonus?: number): WaveConfig {
  return { id, name, groups, completionBonus };
}

function lanes(ids: string[]): LaneConfig[] {
  const defs: Record<string, LaneConfig> = {
    main: { id: 'main', pathId: 'main', label: 'Main', color: '#ffb047', role: 'rush', threat: 2 },
    north: { id: 'north', pathId: 'north', label: 'North', color: '#67d2ff', role: 'air', threat: 3 },
    south: { id: 'south', pathId: 'south', label: 'South', color: '#ff7f6b', role: 'bruiser', threat: 3 },
  };
  return ids.map((id) => defs[id]);
}

function level(base: Omit<LevelConfig, 'lanes'> & { activePathIds: string[] }): LevelConfig {
  return {
    ...base,
    lanes: lanes(base.activePathIds),
  };
}

const worldOneLevels: LevelConfig[] = [
  level({
    id: 'old-town-roads',
    worldId: 'streets-remember',
    activePathIds: ['main'],
    name: 'Old Town Roads',
    description: 'Single-lane onboarding on familiar streets.',
    briefing: 'Fjodor starts simple. Folke says the corners are already listening.',
    storyTitle: 'The First Murmur',
    storyBody: 'Natasha tells the boys to stay where the lamps still work. Britt-Inger warned that roads remember first.',
    memoryLines: ['Britt-Inger: Roads remember feet before feet remember roads.', 'Folke: The corners are talking again.'],
    familyFocus: ['Britt-Inger', 'Natasha'],
    dragonForeshadow: 'Only heat echoes, nothing shaped yet.',
    atmosphere: 'Warm windows, first pressure, readable lanes.',
    codexUnlocks: ['Britt-Inger\'s first warning', 'Fjodor\'s notebook: listening streets'],
    optionalObjectives: [
      { id: 'old-town-no-breach', text: 'Hold every lane without a breach', kind: 'no_breach', rewardFamilyKnowledge: 1, rewardLaneControlMastery: 1 },
    ],
    betweenWaveBeats: [
      { waveId: 'wave-2', text: 'Natasha keeps Folke close. Fjodor starts checking corners before he checks the sky.' },
      { waveId: 'wave-4', text: 'Britt-Inger was right: once the road remembers you, it starts asking for work back.' },
    ],
    restrictedZones: [{ shape: 'rect', xMin: -16, xMax: -10, zMin: 6, zMax: 13, label: 'courtyard wall' }],
    availableTowers: ['scratchingPost', 'yarnLauncher'],
    startingSelectedTower: 'scratchingPost',
    waves: [
      wave('wave-1', 'Street Sweep', [group('rats_intro', { count: 8 })]),
      wave('wave-2', 'Narrow Alley', [group('rats_intro', { count: 10, spawnInterval: 1.0 })]),
      wave('wave-3', 'Chewed Wires', [group('rats_rush', { count: 12, spawnInterval: 0.78 })]),
      wave('wave-4', 'Basement Rattle', [
        group('rats_rush', { count: 14, spawnInterval: 0.68 }),
        group('rats_intro', { count: 6, spawnInterval: 1.1, startDelay: 4 }),
      ], 55),
    ],
  }),
  level({
    id: 'roofline-flurry',
    worldId: 'streets-remember',
    activePathIds: ['main', 'north'],
    name: 'Roofline Flurry',
    description: 'Air lanes break the sense of a safe skyline.',
    briefing: 'Oskar always said two names can hold one place together. Fjodor starts naming rooftops twice.',
    storyTitle: 'Names Above The Chimneys',
    storyBody: 'Pigeons cut deliberate lines across the chimneys. Saying the streets in Swedish and Russian makes them feel less loose.',
    memoryLines: ['Oskar: If you know two names for a thing, you hold it tighter.'],
    familyFocus: ['Oskar'],
    dragonForeshadow: 'The skyline glows as if something huge breathed beyond it.',
    atmosphere: 'Cold wind, bright antenna lights, restless wings.',
    codexUnlocks: ['Double naming', 'The roofline glow'],
    restrictedZones: [{ shape: 'rect', xMin: -7, xMax: -1, zMin: 21, zMax: 27, label: 'roofline drop' }],
    startingMoney: 185,
    availableTowers: ['scratchingPost', 'yarnLauncher', 'laserPointer'],
    startingSelectedTower: 'laserPointer',
    newEnemyIds: ['pigeon'],
    newTowerIds: ['laserPointer'],
    waves: [
      wave('wave-1', 'First Shadow', [
        group('rats_rush', { count: 12, spawnInterval: 0.8 }),
        group('pigeon_scouts', { count: 3, startDelay: 2, pathId: 'north' }),
      ]),
      wave('wave-2', 'Antenna Pass', [
        group('pigeon_scouts', { count: 6, spawnInterval: 1.05, startDelay: 0.5, pathId: 'north' }),
        group('rats_intro', { count: 8, spawnInterval: 0.95, startDelay: 1.5 }),
      ]),
      wave('wave-3', 'Torn Tarps', [
        group('rats_rush', { count: 14, spawnInterval: 0.7 }),
        group('pigeon_flock', { count: 7, spawnInterval: 1.0, startDelay: 2, pathId: 'north' }),
      ]),
      wave('wave-4', 'Roofline Break', [
        group('pigeon_flock', { count: 9, spawnInterval: 0.9, startDelay: 0.25, pathId: 'north' }),
        group('rats_rush', { count: 12, spawnInterval: 0.62, startDelay: 1.5 }),
      ], 60),
    ],
  }),
  level({
    id: 'hound-mile',
    worldId: 'streets-remember',
    activePathIds: ['main', 'south'],
    name: 'Hound Mile',
    description: 'Bruisers force efficient stabilizing choices.',
    briefing: 'Amanda is the voice Fjodor hears when the dogs arrive like they were sent instead of born.',
    storyTitle: 'Hold The Line',
    storyBody: 'Folke gives the hounds story-names. Fjodor keeps the practical ones. Between them, fear becomes pattern.',
    memoryLines: ['Amanda: If you can name what scares you, you can place around it.'],
    familyFocus: ['Amanda'],
    dragonForeshadow: 'The dogs flinch from pockets of unseen heat in the road.',
    atmosphere: 'Low growls, wet stone, tightening pressure.',
    codexUnlocks: ['Amanda\'s rule for fear', 'Heat stains on the lane'],
    restrictedZones: [{ shape: 'rect', xMin: -13, xMax: -8, zMin: -4, zMax: 2, label: 'collapsed kiosk' }],
    startingMoney: 225,
    startingLives: 22,
    availableTowers: ['scratchingPost', 'yarnLauncher', 'laserPointer', 'catnipBomb'],
    startingSelectedTower: 'catnipBomb',
    newEnemyIds: ['dog'],
    newTowerIds: ['catnipBomb'],
    waves: [
      wave('wave-1', 'Leash Snap', [
        group('dog_patrol', { count: 3, startDelay: 1, pathId: 'south' }),
        group('rats_intro', { count: 8, spawnInterval: 0.9 }),
      ]),
      wave('wave-2', 'Barking Echo', [
        group('dog_patrol', { count: 4, spawnInterval: 2.2, startDelay: 1.5, pathId: 'south' }),
        group('pigeon_scouts', { count: 5, spawnInterval: 1.1, startDelay: 0.5, pathId: 'main' }),
      ]),
      wave('wave-3', 'Trash Yard', [
        group('rats_flood', { count: 18, spawnInterval: 0.58 }),
        group('dog_patrol', { count: 4, startDelay: 3, pathId: 'south' }),
      ]),
      wave('wave-4', 'Bite Radius', [
        group('dog_column', { count: 5, spawnInterval: 2.0, pathId: 'south', modifiers: { hpMultiplier: 1.15, rewardMultiplier: 1.1 } }),
        group('pigeon_scouts', { count: 6, spawnInterval: 1.0, startDelay: 1.5, pathId: 'main' }),
      ]),
      wave('wave-5', 'Pound Gate', [
        group('rats_rush', { count: 16, spawnInterval: 0.6 }),
        group('dog_column', { count: 5, spawnInterval: 1.8, startDelay: 2.5, pathId: 'south', modifiers: { hpMultiplier: 1.2, speedMultiplier: 0.95, rewardMultiplier: 1.15 } }),
      ], 70),
    ],
  }),
  level({
    id: 'market-shuffle',
    worldId: 'streets-remember',
    activePathIds: ['main', 'north', 'south'],
    name: 'Market Shuffle',
    description: 'Three-lane juggling and economy control.',
    briefing: 'Busy places hide old things best, Britt-Inger said. The market proves her right immediately.',
    storyTitle: 'What Crowds Hide',
    storyBody: 'Fjodor sees movement in stalls before the packs emerge. Folke says the stones feel warm underneath.',
    memoryLines: ['Britt-Inger: Busy places hide old things best.'],
    familyFocus: ['Britt-Inger'],
    dragonForeshadow: 'The ember under the market is no longer subtle.',
    atmosphere: 'Lantern gold, crowd ghost-noise, trapped heat.',
    codexUnlocks: ['Market ember marks', 'Britt-Inger on crowded places'],
    betweenWaveBeats: [
      { waveId: 'wave-2', text: 'Folke says the stalls are warm underneath. Fjodor stops treating the market like neutral ground.' },
      { waveId: 'wave-5', text: 'The crowd-noise is gone now. Only routes, heat, and decisions are left.' },
    ],
    restrictedZones: [
      { shape: 'rect', xMin: -24, xMax: -18, zMin: -8, zMax: -2, label: 'market barricade' },
      { shape: 'rect', xMin: -6, xMax: 1, zMin: 24, zMax: 29, label: 'crate stack' },
    ],
    startingMoney: 235,
    availableTowers: ['scratchingPost', 'yarnLauncher', 'laserPointer', 'catnipBomb', 'treatDispenser'],
    startingSelectedTower: 'treatDispenser',
    newTowerIds: ['treatDispenser'],
    waves: [
      wave('wave-1', 'Fruit Stall', [
        group('rats_flood', { count: 18, spawnInterval: 0.52, pathId: 'main' }),
        group('dog_patrol', { count: 3, startDelay: 4, pathId: 'south' }),
      ]),
      wave('wave-2', 'Dropped Crates', [
        group('rats_rush', { count: 14, spawnInterval: 0.62, pathId: 'main' }),
        group('pigeon_flock', { count: 8, spawnInterval: 0.95, startDelay: 1, pathId: 'north' }),
        group('rats_intro', { count: 8, spawnInterval: 1.0, startDelay: 5, pathId: 'south' }),
      ]),
      wave('wave-3', 'Open Bags', [
        group('rats_flood', { count: 22, spawnInterval: 0.46, pathId: 'main', modifiers: { rewardMultiplier: 0.95 } }),
        group('dog_patrol', { count: 4, startDelay: 3, pathId: 'south' }),
      ]),
      wave('wave-4', 'Market Panic', [
        group('pigeon_flock', { count: 10, spawnInterval: 0.88, startDelay: 0.5, pathId: 'north' }),
        group('rats_flood', { count: 18, spawnInterval: 0.5, startDelay: 1.2, pathId: 'main' }),
        group('dog_patrol', { count: 3, startDelay: 4.5, pathId: 'south' }),
      ]),
      wave('wave-5', 'Closing Bell', [
        group('rats_flood', { count: 24, spawnInterval: 0.44, pathId: 'main' }),
        group('rats_rush', { count: 16, spawnInterval: 0.58, startDelay: 4, pathId: 'north' }),
        group('dog_column', { count: 4, spawnInterval: 1.9, startDelay: 7, pathId: 'south' }),
      ], 75),
    ],
  }),
];

const worldTwoLevels: LevelConfig[] = [
  level({
    id: 'harbor-theft',
    worldId: 'hidden-routes',
    activePathIds: ['main', 'north'],
    name: 'Harbor Theft',
    description: 'Fast flyers pull attention before ground lines settle.',
    briefing: 'At the harbor, Fjodor hears the city in two languages and something older underneath both.',
    storyTitle: 'Salt, Iron, And Translation',
    storyBody: 'Natasha used to turn fear into smaller pieces. Fjodor tries doing that for Folke while gulls tear the sky into routes.',
    familyFocus: ['Natasha'],
    dragonForeshadow: 'The harbor wind carries soot that belongs to no chimney nearby.',
    atmosphere: 'Salt spray, metal echoes, pale wings.',
    codexUnlocks: ['Natasha\'s breathing rule', 'Harbor soot report'],
    newEnemyIds: ['seagull'],
    hazards: [
      { id: 'harbor-signal', type: 'laneSpeedPulse', label: 'Signal Pulse', description: 'One lane surges every 25 seconds.', pathIds: ['north'], interval: 25, duration: 8, speedMultiplier: 1.18 },
      { id: 'harbor-watch', type: 'watchZone', label: 'Watchpost Zones', description: 'Certain rooftops extend tower range.', zones: [{ id: 'watch-1', type: 'watch', shape: 'rect', xMin: -15, xMax: -10, zMin: 20, zMax: 25, rangeBonus: 1.2, label: 'watchpost' }] },
    ],
    buildZones: [{ id: 'watch-1', type: 'watch', shape: 'rect', xMin: -15, xMax: -10, zMin: 20, zMax: 25, rangeBonus: 1.2, label: 'watchpost' }],
    waves: [
      wave('wave-1', 'Harbor Sweep', [
        group('seagull_screen', { count: 6, spawnInterval: 1.0, pathId: 'north' }),
        group('rats_rush', { count: 10, spawnInterval: 0.72 }),
      ]),
      wave('wave-2', 'Hooks And Crates', [
        group('seagull_screen', { count: 7, spawnInterval: 0.9, pathId: 'north' }),
        group('dog_patrol', { count: 3, startDelay: 3, pathId: 'main' }),
      ]),
      wave('wave-3', 'Wrong Current', [
        group('rats_flood', { count: 20, spawnInterval: 0.5, pathId: 'main' }),
        group('seagull_screen', { count: 8, spawnInterval: 0.82, startDelay: 1.5, pathId: 'north' }),
      ]),
      wave('wave-4', 'Salt Alarm', [
        group('seagull_screen', { count: 10, spawnInterval: 0.78, pathId: 'north', modifiers: { rewardMultiplier: 1.1 } }),
        group('dog_column', { count: 3, startDelay: 4.5, pathId: 'main' }),
      ], 78),
    ],
  }),
  level({
    id: 'signal-heights',
    worldId: 'hidden-routes',
    activePathIds: ['north', 'south'],
    name: 'Signal Heights',
    description: 'Planner-first route reading under signal pressure.',
    briefing: 'Painted marks return on poles and walls. Fjodor reads one in Swedish, then Russian, and both mean awake.',
    storyTitle: 'Answering The Air',
    storyBody: 'Folke calls them listening posts. Fjodor realizes the heights are giving instructions, not scenery.',
    familyFocus: ['Folke', 'Fjodor'],
    dragonForeshadow: 'Whatever is waking the heights prefers repeats, signals, and heat shimmer.',
    atmosphere: 'Tall poles, cold air, too-orderly birds.',
    codexUnlocks: ['Signal mark: awake', 'Folke\'s listening posts'],
    newTowerIds: ['birdWhistle'],
    optionalObjectives: [
      { id: 'signal-keep-18', text: 'Finish with at least 18 lives', kind: 'lives_at_least', targetLives: 18, rewardFamilyKnowledge: 2 },
    ],
    betweenWaveBeats: [
      { waveId: 'wave-2', text: 'Fjodor reads one mark in Swedish, one in Russian, and neither version says safe.' },
      { waveId: 'wave-4', text: 'The heights are not scenery anymore. They are choosing where pressure lands next.' },
    ],
    hazards: [
      { id: 'signal-false-quiet', type: 'previewMask', label: 'False Quiet', description: 'Delayed support groups stay hidden until close.', revealLead: 5, minStartDelay: 5 },
      { id: 'signal-pulse', type: 'laneSpeedPulse', label: 'Signal Pulse', description: 'North lane spikes with coded urgency.', pathIds: ['north'], interval: 25, duration: 7, speedMultiplier: 1.22 },
    ],
    waves: [
      wave('wave-1', 'Awake Marks', [
        group('pigeon_flock', { count: 8, spawnInterval: 0.95, pathId: 'north' }),
        group('dog_patrol', { count: 3, startDelay: 5.5, hiddenUntilSecondsLeft: 5, pathId: 'south' }),
      ]),
      wave('wave-2', 'High Wind Lines', [
        group('seagull_screen', { count: 7, spawnInterval: 0.86, pathId: 'north' }),
        group('dog_column', { count: 3, startDelay: 6, hiddenUntilSecondsLeft: 5, pathId: 'south' }),
      ]),
      wave('wave-3', 'Second Message', [
        group('pigeon_flock', { count: 10, spawnInterval: 0.84, pathId: 'north' }),
        group('seagull_screen', { count: 6, spawnInterval: 0.94, startDelay: 3.5, pathId: 'south' }),
      ]),
      wave('wave-4', 'Static Break', [
        group('seagull_screen', { count: 8, spawnInterval: 0.82, pathId: 'north' }),
        group('dog_column', { count: 4, startDelay: 5.4, hiddenUntilSecondsLeft: 5, pathId: 'south' }),
      ], 80),
    ],
  }),
  level({
    id: 'stone-script',
    worldId: 'hidden-routes',
    activePathIds: ['main', 'south'],
    name: 'Stone Script',
    description: 'Route timing and clue-reading under pressure.',
    briefing: 'The pavement starts reading back. Britt-Inger never meant stories to stay decorative.',
    storyTitle: 'Under The Pavement',
    storyBody: 'Fjodor stops calling the cracks normal. Folke says something below is breathing slowly enough that adults forgot to hear it.',
    familyFocus: ['Britt-Inger', 'Folke'],
    dragonForeshadow: 'Dragon presence becomes an operational assumption here.',
    atmosphere: 'Cracked stone, warm seams, patient danger.',
    codexUnlocks: ['Stone remembers fire', 'The waiting thing below'],
    newEnemyIds: ['boar'],
    hazards: [
      { id: 'stone-watch', type: 'watchZone', label: 'Watchpost Zones', description: 'Raised stone corners extend tower range.', zones: [{ id: 'watch-2', type: 'watch', shape: 'polygon', points: [{ x: -18, z: 8 }, { x: -13, z: 8 }, { x: -13, z: 13 }, { x: -18, z: 13 }], rangeBonus: 1.4, label: 'stone rise' }] },
    ],
    buildZones: [{ id: 'watch-2', type: 'watch', shape: 'polygon', points: [{ x: -18, z: 8 }, { x: -13, z: 8 }, { x: -13, z: 13 }, { x: -18, z: 13 }], rangeBonus: 1.4, label: 'stone rise' }],
    waves: [
      wave('wave-1', 'Stone Breath', [
        group('boar_push', { count: 3, pathId: 'south' }),
        group('rats_rush', { count: 12, spawnInterval: 0.7, pathId: 'main' }),
      ]),
      wave('wave-2', 'Split Crack', [
        group('boar_push', { count: 4, pathId: 'south', modifiers: { hpMultiplier: 1.1 } }),
        group('pigeon_flock', { count: 7, startDelay: 2.5, pathId: 'main' }),
      ]),
      wave('wave-3', 'Buried Warmth', [
        group('boar_push', { count: 4, pathId: 'south', modifiers: { hpMultiplier: 1.15, speedMultiplier: 1.05 } }),
        group('rats_flood', { count: 18, spawnInterval: 0.46, pathId: 'main' }),
      ]),
      wave('wave-4', 'Noisy Stone', [
        group('boar_push', { count: 5, pathId: 'south', modifiers: { hpMultiplier: 1.2 } }),
        group('seagull_screen', { count: 7, startDelay: 3, pathId: 'main' }),
      ]),
      wave('wave-5', 'Written Heat', [
        group('boar_push', { count: 6, pathId: 'south', modifiers: { hpMultiplier: 1.25, rewardMultiplier: 1.15 } }),
        group('rats_flood', { count: 16, spawnInterval: 0.44, startDelay: 1.2, pathId: 'main' }),
      ], 84),
    ],
  }),
  level({
    id: 'the-fork-under-glass',
    worldId: 'hidden-routes',
    activePathIds: ['main', 'north', 'south'],
    name: 'The Fork Under Glass',
    description: 'A branch gate level where route interpretation becomes strategy.',
    briefing: 'By now the city is no longer only a place. It is a pattern engine, and Fjodor has to decide how to read it.',
    storyTitle: 'The Fork Under Glass',
    storyBody: 'Britt-Inger\'s warnings stop sounding like myths and start sounding like instructions with missing verbs.',
    familyFocus: ['Britt-Inger', 'Fjodor'],
    dragonForeshadow: 'The route split itself feels dragon-made, as if the map is testing how Fjodor thinks.',
    atmosphere: 'Clear cold, tense quiet, route tension.',
    codexUnlocks: ['Fork under glass', 'Pattern before flame'],
    betweenWaveBeats: [
      { waveId: 'wave-3', text: 'Britt-Inger never promised the map would help. Only that it could be read.' },
      { waveId: 'wave-5', text: 'Fjodor has to decide whether this city is best understood as signal or shore.' },
    ],
    hazards: [
      { id: 'fork-false-quiet', type: 'previewMask', label: 'False Quiet', description: 'Delayed support groups hide until the last moment.', revealLead: 5, minStartDelay: 5 },
      { id: 'fork-signal', type: 'laneSpeedPulse', label: 'Signal Pulse', description: 'The north route surges on a fixed rhythm.', pathIds: ['north'], interval: 25, duration: 8, speedMultiplier: 1.2 },
    ],
    waves: [
      wave('wave-1', 'Glass Nerve', [
        group('rats_flood', { count: 18, spawnInterval: 0.48, pathId: 'main' }),
        group('seagull_screen', { count: 6, pathId: 'north' }),
      ]),
      wave('wave-2', 'Third Marker', [
        group('boar_push', { count: 4, pathId: 'south' }),
        group('pigeon_flock', { count: 8, startDelay: 5.5, hiddenUntilSecondsLeft: 5, pathId: 'north' }),
      ]),
      wave('wave-3', 'Read Fast', [
        group('seagull_screen', { count: 8, pathId: 'north' }),
        group('dog_column', { count: 4, pathId: 'south' }),
        group('rats_rush', { count: 12, startDelay: 2, pathId: 'main' }),
      ]),
      wave('wave-4', 'Wrong Reflection', [
        group('boar_push', { count: 4, pathId: 'south', modifiers: { hpMultiplier: 1.2 } }),
        group('seagull_screen', { count: 8, startDelay: 6, hiddenUntilSecondsLeft: 5, pathId: 'north' }),
      ]),
      wave('wave-5', 'Choose The Reading', [
        group('rats_flood', { count: 22, spawnInterval: 0.44, pathId: 'main' }),
        group('dog_column', { count: 5, pathId: 'south' }),
        group('seagull_screen', { count: 10, startDelay: 3, pathId: 'north' }),
      ], 88),
    ],
  }),
];

const worldThreeLevels: LevelConfig[] = [
  level({
    id: 'cinder-market',
    worldId: 'ember-under-soder',
    activePathIds: ['main', 'north', 'south'],
    name: 'Cinder Market',
    description: 'Heat bloom denies build space under wide route pressure.',
    briefing: 'The market that once hid embers now exhales them openly. Britt-Inger\'s warnings become pure utility.',
    storyTitle: 'Cinder Market',
    storyBody: 'Heat blooms roll under the stalls in pulses. The boys stop treating safe ground like a permanent category.',
    familyFocus: ['Britt-Inger', 'Folke'],
    dragonForeshadow: 'The ember under Söder is close enough to schedule its pressure.',
    atmosphere: 'Ash drift, popping lanterns, unstable ground.',
    codexUnlocks: ['Market ember bloom', 'No ground stays safe forever'],
    optionalObjectives: [
      { id: 'cinder-no-breach', text: 'Contain the bloom without a breach', kind: 'no_breach', rewardFamilyKnowledge: 1, rewardLaneControlMastery: 2 },
    ],
    betweenWaveBeats: [
      { waveId: 'wave-2', text: 'The first heat bloom closes like a mouth. Amanda would call that useful information.' },
      { waveId: 'wave-4', text: 'Britt-Inger stops sounding old-fashioned when the ground itself starts keeping rhythm.' },
    ],
    hazards: [
      {
        id: 'cinder-bloom',
        type: 'placementLock',
        label: 'Heat Bloom',
        description: 'Marked cells close, then reopen on a repeating rhythm.',
        zones: [{ shape: 'rect', xMin: -9, xMax: 0, zMin: 16, zMax: 24, label: 'heat bloom' }],
        interval: 30,
        duration: 12,
        forecastLead: 8,
        placementReason: 'blocked_by_hazard',
      },
      { id: 'cinder-veil', type: 'globalAlert', label: 'Ash Veil', description: 'Planner sees hazard timing earlier than the street can.', alertText: 'Ash Veil active' },
    ],
    waves: [
      wave('wave-1', 'Heat Test', [
        group('rats_flood', { count: 18, pathId: 'main' }),
        group('dog_patrol', { count: 3, startDelay: 3, pathId: 'south' }),
      ]),
      wave('wave-2', 'Closed Ground', [
        group('boar_push', { count: 4, pathId: 'south' }),
        group('seagull_screen', { count: 8, startDelay: 2, pathId: 'north' }),
      ]),
      wave('wave-3', 'Ash Tables', [
        group('rats_flood', { count: 22, spawnInterval: 0.45, pathId: 'main' }),
        group('boar_push', { count: 4, startDelay: 4, pathId: 'south' }),
      ]),
      wave('wave-4', 'Glow Under Canvas', [
        group('boar_push', { count: 5, pathId: 'south', modifiers: { hpMultiplier: 1.15 } }),
        group('seagull_screen', { count: 8, startDelay: 1.5, pathId: 'north' }),
      ], 86),
    ],
  }),
  level({
    id: 'ash-parade',
    worldId: 'ember-under-soder',
    activePathIds: ['north', 'south'],
    name: 'Ash Parade',
    description: 'Sustained lane attrition with delayed support pressure.',
    briefing: 'Folke says the night is marching properly now. Fjodor believes him because the routes start agreeing with each other.',
    storyTitle: 'Ash Parade',
    storyBody: 'The street pressure is no longer random. It arrives like rehearsal.',
    familyFocus: ['Folke', 'Amanda'],
    dragonForeshadow: 'The pressure feels conducted, not merely unleashed.',
    atmosphere: 'Ash drift, rhythmic surge, bad timing made visible.',
    codexUnlocks: ['Parade timing note', 'Amanda on bad nights'],
    hazards: [
      { id: 'ash-mask', type: 'previewMask', label: 'False Quiet', description: 'Support packs stay hidden until they are almost on top of you.', revealLead: 5, minStartDelay: 5 },
      { id: 'ash-pulse', type: 'laneSpeedPulse', label: 'Signal Pulse', description: 'South lane surges under ember pressure.', pathIds: ['south'], interval: 22, duration: 8, speedMultiplier: 1.24 },
    ],
    waves: [
      wave('wave-1', 'Lantern Push', [
        group('seagull_screen', { count: 7, pathId: 'north' }),
        group('dog_column', { count: 4, startDelay: 5.5, hiddenUntilSecondsLeft: 5, pathId: 'south' }),
      ]),
      wave('wave-2', 'Ash Doors', [
        group('fox_patrol', { count: 4, pathId: 'south' }),
        group('pigeon_flock', { count: 9, pathId: 'north' }),
      ]),
      wave('wave-3', 'Night Conductors', [
        group('fox_patrol', { count: 5, pathId: 'south', modifiers: { hpMultiplier: 1.15, speedMultiplier: 1.08 } }),
        group('seagull_screen', { count: 8, startDelay: 5.2, hiddenUntilSecondsLeft: 5, pathId: 'north' }),
      ]),
      wave('wave-4', 'Ash Parade', [
        group('fox_patrol', { count: 6, pathId: 'south', modifiers: { hpMultiplier: 1.2, rewardMultiplier: 1.15 } }),
        group('pigeon_flock', { count: 10, startDelay: 1.5, pathId: 'north' }),
      ], 88),
    ],
  }),
  level({
    id: 'boar-stair',
    worldId: 'ember-under-soder',
    activePathIds: ['main', 'south'],
    name: 'Boar Stair',
    description: 'Anti-armor specialization test with stacked ground pressure.',
    briefing: 'The boars do not wander. They climb as if they have somewhere exact to be.',
    storyTitle: 'Layers Below',
    storyBody: 'Oskar would have called this a city showing its layers. Folke calls it the city showing its teeth.',
    familyFocus: ['Oskar', 'Folke'],
    dragonForeshadow: 'Something below the streets has started moving the heavy pieces first.',
    atmosphere: 'Stone impact, tight climbs, repeated thuds.',
    codexUnlocks: ['Boar stair sketch', 'Layers below'],
    waves: [
      wave('wave-1', 'First Climb', [
        group('boar_push', { count: 4, pathId: 'south' }),
        group('rats_rush', { count: 10, startDelay: 2, pathId: 'main' }),
      ]),
      wave('wave-2', 'Split Hoof', [
        group('boar_push', { count: 5, pathId: 'south', modifiers: { hpMultiplier: 1.15 } }),
        group('dog_column', { count: 4, startDelay: 2.5, pathId: 'main' }),
      ]),
      wave('wave-3', 'Stone Ring', [
        group('boar_push', { count: 5, pathId: 'south', modifiers: { hpMultiplier: 1.2 } }),
        group('seagull_screen', { count: 8, startDelay: 3, pathId: 'main' }),
      ]),
      wave('wave-4', 'Weight Test', [
        group('boar_push', { count: 6, pathId: 'south', modifiers: { hpMultiplier: 1.24, speedMultiplier: 1.04 } }),
        group('rats_flood', { count: 18, startDelay: 1.2, pathId: 'main' }),
      ]),
      wave('wave-5', 'Stair Lock', [
        group('boar_push', { count: 7, pathId: 'south', modifiers: { hpMultiplier: 1.28, rewardMultiplier: 1.18 } }),
        group('dog_column', { count: 5, startDelay: 2.2, pathId: 'main' }),
      ], 92),
    ],
  }),
  level({
    id: 'instructions-not-stories',
    worldId: 'ember-under-soder',
    activePathIds: ['main', 'north', 'south'],
    name: 'Instructions, Not Stories',
    description: 'Branch gate where doctrine, pressure, and family knowledge converge.',
    briefing: 'Fjodor realizes Britt-Inger never wanted fear to feel smaller. She wanted it structured.',
    storyTitle: 'Instructions, Not Stories',
    storyBody: 'The map stops hinting and starts giving commands. Fjodor has to decide whether to contain the ember or follow it.',
    familyFocus: ['Britt-Inger', 'Fjodor', 'Amanda'],
    dragonForeshadow: 'The board is fighting in a dragon-shaped grammar now.',
    atmosphere: 'Clear danger, disciplined pressure, decision time.',
    codexUnlocks: ['Instructions, not stories', 'Dragon yard sketch'],
    betweenWaveBeats: [
      { waveId: 'wave-2', text: 'Folke names the shape under the routes. Fjodor starts treating the name like a warning, not a game.' },
      { waveId: 'wave-5', text: 'Contain it or track it. Either choice will teach the city how Fjodor fights.' },
    ],
    waves: [
      wave('wave-1', 'Structured Fear', [
        group('boar_push', { count: 4, pathId: 'south' }),
        group('seagull_screen', { count: 6, pathId: 'north' }),
        group('rats_flood', { count: 14, startDelay: 1.2, pathId: 'main' }),
      ]),
      wave('wave-2', 'Three Voices', [
        group('fox_patrol', { count: 4, pathId: 'south' }),
        group('seagull_screen', { count: 8, pathId: 'north' }),
        group('dog_column', { count: 4, startDelay: 2.8, pathId: 'main' }),
      ]),
      wave('wave-3', 'Map Teeth', [
        group('boar_push', { count: 5, pathId: 'south', modifiers: { hpMultiplier: 1.18 } }),
        group('pigeon_flock', { count: 8, pathId: 'north' }),
        group('rats_flood', { count: 16, startDelay: 2.2, pathId: 'main' }),
      ]),
      wave('wave-4', 'No Metaphor Left', [
        group('fox_patrol', { count: 5, pathId: 'south', modifiers: { hpMultiplier: 1.15, speedMultiplier: 1.08 } }),
        group('seagull_screen', { count: 9, pathId: 'north' }),
        group('dog_column', { count: 5, startDelay: 2, pathId: 'main' }),
      ]),
      wave('wave-5', 'Choose The Posture', [
        group('boar_push', { count: 6, pathId: 'south', modifiers: { hpMultiplier: 1.24 } }),
        group('fox_patrol', { count: 5, pathId: 'north' }),
        group('rats_flood', { count: 18, startDelay: 1.5, pathId: 'main' }),
      ], 96),
    ],
  }),
];

const worldFourLevels: LevelConfig[] = [
  level({
    id: 'tunnel-reply',
    worldId: 'dragon-beneath',
    activePathIds: ['main', 'north', 'south'],
    name: 'Tunnel Reply',
    description: 'Introduces full-board tunnel pressure.',
    briefing: 'The tunnel walls do not echo. They answer.',
    storyTitle: 'Tunnel Reply',
    storyBody: 'Folke says the island is speaking from below now. The lane structure proves him right.',
    familyFocus: ['Folke', 'Oskar'],
    dragonForeshadow: 'The dragon force starts distorting timing and sound.',
    atmosphere: 'Iron ring, tight tunnels, accelerating stress.',
    codexUnlocks: ['Tunnel reply log', 'Oskar on city layers'],
    newEnemyIds: ['tunnelDrone'],
    newTowerIds: ['tunaMortar'],
    betweenWaveBeats: [
      { waveId: 'wave-2', text: 'Oskar would call this structural. Folke says the tunnels are answering back.' },
      { waveId: 'wave-5', text: 'Every lane now feels like it was dug on purpose for something larger than traffic.' },
    ],
    hazards: [
      { id: 'tunnel-resonance', type: 'towerPulse', label: 'Resonance', description: 'Towers near the main lane accelerate in pulses.', pathIds: ['main'], interval: 20, duration: 7, fireRateBonus: 0.55 },
      {
        id: 'tunnel-alert',
        type: 'globalAlert',
        label: 'Tunnel Breach',
        description: 'A breach warning reshapes the board rhythm.',
        alertText: 'Tunnel breach building',
        interval: 20,
        duration: 7,
        routeShift: {
          pathIds: ['north'],
          offsetX: 4.2,
          offsetZ: 2.4,
          startRatio: 0.34,
          endRatio: 0.76,
        },
      },
    ],
    waves: [
      wave('wave-1', 'First Reply', [
        group('boar_push', { count: 4, pathId: 'main' }),
        group('rats_rush', { count: 10, pathId: 'north' }),
        group('seagull_screen', { count: 6, startDelay: 2.5, pathId: 'south' }),
      ]),
      wave('wave-2', 'Metal Breath', [
        group('boar_push', { count: 4, pathId: 'main', modifiers: { hpMultiplier: 1.2 } }),
        group('fox_patrol', { count: 4, pathId: 'south' }),
        group('pigeon_flock', { count: 8, startDelay: 1.5, pathId: 'north' }),
      ]),
      wave('wave-3', 'Breach Line', [
        group('boar_push', { count: 5, pathId: 'main', modifiers: { hpMultiplier: 1.22 } }),
        group('fox_patrol', { count: 4, pathId: 'south' }),
        group('seagull_screen', { count: 8, pathId: 'north' }),
      ]),
      wave('wave-4', 'Iron Reply', [
        group('boar_push', { count: 5, pathId: 'main', modifiers: { hpMultiplier: 1.24 } }),
        group('rats_flood', { count: 18, pathId: 'north' }),
        group('fox_patrol', { count: 5, startDelay: 2.2, pathId: 'south' }),
      ]),
      wave('wave-5', 'Under-Lane', [
        group('boar_push', { count: 6, pathId: 'main', modifiers: { hpMultiplier: 1.26 } }),
        group('seagull_screen', { count: 8, pathId: 'north' }),
        group('dog_column', { count: 5, pathId: 'south' }),
      ]),
      wave('wave-6', 'Reply All', [
        group('boar_push', { count: 6, pathId: 'main', modifiers: { hpMultiplier: 1.3, rewardMultiplier: 1.2 } }),
        group('fox_patrol', { count: 5, pathId: 'south' }),
        group('seagull_screen', { count: 10, startDelay: 1.5, pathId: 'north' }),
      ], 102),
    ],
  }),
  level({
    id: 'yard-of-teeth',
    worldId: 'dragon-beneath',
    activePathIds: ['north', 'south'],
    name: 'Yard of Teeth',
    description: 'Coverage overlap and multi-anchor defense.',
    briefing: 'The yard is no longer neutral space. It behaves like a jaw.',
    storyTitle: 'When The Night Chooses Sides',
    storyBody: 'Lanterns go ember-red along the lane. Even Folke stops laughing at the color shift.',
    familyFocus: ['Amanda', 'Folke'],
    dragonForeshadow: 'The night starts acting like part of the enemy kit.',
    atmosphere: 'Red lanterns, split pressure, bad angles.',
    codexUnlocks: ['Red lantern event', 'Yard of teeth chart'],
    newEnemyIds: ['cinderHound'],
    hazards: [
      { id: 'yard-ashfall', type: 'globalAlert', label: 'Ashfall', description: 'Street contrast falls while the planner stays clear.', alertText: 'Ashfall thickening' },
      { id: 'yard-resonance', type: 'towerPulse', label: 'Resonance', description: 'South-lane towers pulse faster under ember rhythm.', pathIds: ['south'], interval: 18, duration: 7, fireRateBonus: 0.6 },
    ],
    waves: [
      wave('wave-1', 'Red Fence', [
        group('fox_patrol', { count: 4, pathId: 'south' }),
        group('seagull_screen', { count: 8, pathId: 'north' }),
      ]),
      wave('wave-2', 'Jaw Test', [
        group('boar_push', { count: 4, pathId: 'south' }),
        group('pigeon_flock', { count: 9, startDelay: 1.2, pathId: 'north' }),
      ]),
      wave('wave-3', 'Bad Angles', [
        group('fox_patrol', { count: 5, pathId: 'south', modifiers: { hpMultiplier: 1.15 } }),
        group('seagull_screen', { count: 9, pathId: 'north' }),
      ]),
      wave('wave-4', 'Lantern Bite', [
        group('boar_push', { count: 5, pathId: 'south', modifiers: { hpMultiplier: 1.22 } }),
        group('seagull_screen', { count: 9, startDelay: 1.8, pathId: 'north' }),
      ]),
      wave('wave-5', 'Yard Conductor', [
        group('fox_patrol', { count: 6, pathId: 'south', modifiers: { hpMultiplier: 1.2, speedMultiplier: 1.1 } }),
        group('seagull_screen', { count: 10, pathId: 'north' }),
      ]),
      wave('wave-6', 'Teeth Close', [
        group('boar_push', { count: 6, pathId: 'south', modifiers: { hpMultiplier: 1.28 } }),
        group('seagull_screen', { count: 10, pathId: 'north' }),
      ], 104),
    ],
  }),
  level({
    id: 'below-the-lamps',
    worldId: 'dragon-beneath',
    activePathIds: ['main', 'north', 'south'],
    name: 'Below The Lamps',
    description: 'Dragon-linked elite rehearsal before the final act.',
    briefing: 'Everything seen from above now moves under the lamps too. There is no harmless reading left.',
    storyTitle: 'Below The Lamps',
    storyBody: 'Oskar explains the streets. Amanda simplifies the fear. Fjodor finally starts doing both himself.',
    familyFocus: ['Oskar', 'Amanda', 'Fjodor'],
    dragonForeshadow: 'The dragon force is no longer hiding below one lane.',
    atmosphere: 'Lamp glare, layered routes, sharpening intent.',
    codexUnlocks: ['Below the lamps', 'Dragon rehearsal note'],
    newEnemyIds: ['dragonMarked'],
    newTowerIds: ['magnetCollar'],
    optionalObjectives: [
      { id: 'lamps-keep-12', text: 'Reach the final wave with at least 12 lives', kind: 'lives_at_least', targetLives: 12, rewardFamilyKnowledge: 1, rewardLaneControlMastery: 2 },
    ],
    betweenWaveBeats: [
      { waveId: 'wave-2', text: 'Amanda simplifies it: if the wake moves, the defense has to move faster.' },
      { waveId: 'wave-6', text: 'Fjodor stops waiting for adults to name the pattern first. He can read it himself now.' },
    ],
    hazards: [
      { id: 'lamp-alert', type: 'dragonWake', label: 'Dragon Wake', description: 'Route priority keeps shifting under pressure.', alertText: 'Dragon wake moving', interval: 10, pathIds: ['main', 'north', 'south'] },
    ],
    waves: [
      wave('wave-1', 'Lamp Flicker', [
        group('boar_push', { count: 4, pathId: 'main' }),
        group('seagull_screen', { count: 7, pathId: 'north' }),
        group('fox_patrol', { count: 4, pathId: 'south' }),
      ]),
      wave('wave-2', 'Crosslight', [
        group('boar_push', { count: 5, pathId: 'main' }),
        group('pigeon_flock', { count: 9, pathId: 'north' }),
        group('dog_column', { count: 4, startDelay: 1.5, pathId: 'south' }),
      ]),
      wave('wave-3', 'Mark On Stone', [
        group('boar_push', { count: 5, pathId: 'main', modifiers: { hpMultiplier: 1.2 } }),
        group('seagull_screen', { count: 8, pathId: 'north' }),
        group('fox_patrol', { count: 5, pathId: 'south' }),
      ]),
      wave('wave-4', 'Lamp Teeth', [
        group('boar_push', { count: 6, pathId: 'main', modifiers: { hpMultiplier: 1.24 } }),
        group('seagull_screen', { count: 8, pathId: 'north' }),
        group('dog_column', { count: 5, pathId: 'south' }),
      ]),
      wave('wave-5', 'No Blind Spot', [
        group('boar_push', { count: 6, pathId: 'main', modifiers: { hpMultiplier: 1.28 } }),
        group('seagull_screen', { count: 9, pathId: 'north' }),
        group('fox_patrol', { count: 5, pathId: 'south', modifiers: { speedMultiplier: 1.12 } }),
      ]),
      wave('wave-6', 'Under Every Lamp', [
        group('boar_push', { count: 7, pathId: 'main', modifiers: { hpMultiplier: 1.3, rewardMultiplier: 1.2 } }),
        group('seagull_screen', { count: 10, pathId: 'north' }),
        group('fox_patrol', { count: 6, pathId: 'south' }),
      ], 108),
    ],
  }),
];

const worldFiveLevels: LevelConfig[] = [
  level({
    id: 'three-ways-to-burn',
    worldId: 'hornstull-reckoning',
    activePathIds: ['main', 'north', 'south'],
    name: 'Three Ways To Burn',
    description: 'Full-board synchronized pressure.',
    briefing: 'The island shows its teeth on three routes at once. Fjodor has to read all of them without freezing.',
    storyTitle: 'Three Ways To Burn',
    storyBody: 'The same warmth surfaces on routes that should never agree with each other. That is how Fjodor knows the dragon is writing with the whole board.',
    familyFocus: ['Fjodor', 'Folke'],
    dragonForeshadow: 'The dragon is shaping the full board now.',
    atmosphere: 'Full-board heat, tense clarity, no spare lane.',
    codexUnlocks: ['Three corners rule', 'Arcade ember map'],
    newEnemyIds: ['emberWisp'],
    betweenWaveBeats: [
      { waveId: 'wave-2', text: 'Three lanes burning at once means no lane is decorative anymore.' },
      { waveId: 'wave-6', text: 'Folke points at all three routes and says the same thing is pushing through each of them.' },
    ],
    hazards: [
      { id: 'burn-surge', type: 'laneSpeedPulse', label: 'Ember Surge', description: 'The whole board pulses with ember pressure.', pathIds: ['main', 'north', 'south'], interval: 16, duration: 6, speedMultiplier: 1.32 },
    ],
    waves: [
      wave('wave-1', 'First Triple Burn', [
        group('boar_push', { count: 4, pathId: 'main' }),
        group('seagull_screen', { count: 8, pathId: 'north' }),
        group('fox_patrol', { count: 4, pathId: 'south' }),
      ]),
      wave('wave-2', 'Heat Agreement', [
        group('boar_push', { count: 5, pathId: 'main' }),
        group('seagull_screen', { count: 9, pathId: 'north' }),
        group('dog_column', { count: 5, pathId: 'south' }),
      ]),
      wave('wave-3', 'Arc Corner', [
        group('boar_push', { count: 5, pathId: 'main', modifiers: { hpMultiplier: 1.22 } }),
        group('seagull_screen', { count: 9, pathId: 'north' }),
        group('fox_patrol', { count: 5, pathId: 'south' }),
      ]),
      wave('wave-4', 'Pressure Choir', [
        group('boar_push', { count: 6, pathId: 'main', modifiers: { hpMultiplier: 1.24 } }),
        group('seagull_screen', { count: 10, pathId: 'north' }),
        group('dog_column', { count: 5, pathId: 'south' }),
      ]),
      wave('wave-5', 'All Three Agree', [
        group('boar_push', { count: 6, pathId: 'main', modifiers: { hpMultiplier: 1.28 } }),
        group('seagull_screen', { count: 10, pathId: 'north' }),
        group('fox_patrol', { count: 6, pathId: 'south' }),
      ]),
      wave('wave-6', 'Boardfire', [
        group('boar_push', { count: 7, pathId: 'main', modifiers: { hpMultiplier: 1.3 } }),
        group('seagull_screen', { count: 11, pathId: 'north' }),
        group('dog_column', { count: 6, pathId: 'south' }),
      ], 110),
    ],
  }),
  level({
    id: 'hornstull-holds-breath',
    worldId: 'hornstull-reckoning',
    activePathIds: ['main', 'north', 'south'],
    name: 'Hornstull Holds Breath',
    description: 'Consequence check under heavy threat.',
    briefing: 'This is where every earlier choice starts answering back.',
    storyTitle: 'Hornstull Holds Breath',
    storyBody: 'Oskar, Natasha, Amanda, Britt-Inger, and Folke all live in Fjodor\'s decisions now. The board reflects that immediately.',
    familyFocus: ['Oskar', 'Natasha', 'Amanda', 'Britt-Inger', 'Folke'],
    dragonForeshadow: 'No more foreshadowing. The dragon-thread is fully present.',
    atmosphere: 'Held breath, hard light, no filler.',
    codexUnlocks: ['Hornstull breath note', 'Family convergence'],
    optionalObjectives: [
      { id: 'hornstull-no-breach', text: 'Hold Hornstull without a breach', kind: 'no_breach', rewardFamilyKnowledge: 2, rewardLaneControlMastery: 2 },
    ],
    betweenWaveBeats: [
      { waveId: 'wave-2', text: 'Natasha would call it breathing through the fear. The board calls it surviving the mark.' },
      { waveId: 'wave-6', text: 'Every earlier leak, clue, and doctrine choice is now visible in how this fight bends.' },
    ],
    hazards: [
      {
        id: 'hornstull-mark',
        type: 'placementLock',
        label: 'Final Mark',
        description: 'One marked sector closes and reopens in long pulses.',
        zones: [{ shape: 'rect', xMin: -4, xMax: 6, zMin: 8, zMax: 18, label: 'final mark' }],
        interval: 28,
        duration: 12,
        forecastLead: 8,
        placementReason: 'world_locked_zone',
      },
    ],
    waves: [
      wave('wave-1', 'Held Breath', [
        group('boar_push', { count: 5, pathId: 'main' }),
        group('seagull_screen', { count: 8, pathId: 'north' }),
        group('fox_patrol', { count: 5, pathId: 'south' }),
      ]),
      wave('wave-2', 'The Mark Moves', [
        group('boar_push', { count: 5, pathId: 'main', modifiers: { hpMultiplier: 1.24 } }),
        group('seagull_screen', { count: 9, pathId: 'north' }),
        group('dog_column', { count: 5, pathId: 'south' }),
      ]),
      wave('wave-3', 'No Spare Ground', [
        group('boar_push', { count: 6, pathId: 'main', modifiers: { hpMultiplier: 1.26 } }),
        group('seagull_screen', { count: 10, pathId: 'north' }),
        group('fox_patrol', { count: 5, pathId: 'south' }),
      ]),
      wave('wave-4', 'Held Line Test', [
        group('boar_push', { count: 6, pathId: 'main', modifiers: { hpMultiplier: 1.28 } }),
        group('seagull_screen', { count: 10, pathId: 'north' }),
        group('dog_column', { count: 6, pathId: 'south' }),
      ]),
      wave('wave-5', 'Breath Break', [
        group('boar_push', { count: 7, pathId: 'main', modifiers: { hpMultiplier: 1.3 } }),
        group('seagull_screen', { count: 11, pathId: 'north' }),
        group('fox_patrol', { count: 6, pathId: 'south' }),
      ]),
      wave('wave-6', 'Consequences Arrive', [
        group('boar_push', { count: 7, pathId: 'main', modifiers: { hpMultiplier: 1.32, rewardMultiplier: 1.2 } }),
        group('seagull_screen', { count: 12, pathId: 'north' }),
        group('dog_column', { count: 6, pathId: 'south' }),
      ], 112),
    ],
  }),
  level({
    id: 'the-ember-shows-its-face',
    worldId: 'hornstull-reckoning',
    activePathIds: ['main', 'north', 'south'],
    name: 'The Ember Shows Its Face',
    description: 'Final act where the dragon thread pays off in full.',
    briefing: 'Everything Britt-Inger warned about, everything Natasha soothed, everything Oskar explained, and everything Amanda steadied converges here.',
    storyTitle: 'The Ember Shows Its Face',
    storyBody: 'Fjodor stops pretending this is only defense. Folke names the shape under the city before anyone else can.',
    familyFocus: ['Fjodor', 'Folke', 'Britt-Inger', 'Natasha', 'Oskar', 'Amanda'],
    dragonForeshadow: 'This is the payoff.',
    atmosphere: 'Climactic pressure, myth made practical, arcade clarity.',
    codexUnlocks: ['Britt-Inger\'s final warning', 'Hornstull dragon sighting'],
    betweenWaveBeats: [
      { waveId: 'wave-2', text: 'The heat has an outline now. Fjodor no longer has the luxury of calling it a rumor.' },
      { waveId: 'wave-6', text: 'Hold the city together or cut at the heart early. Either way, the dragon is finally in the rules.' },
    ],
    hazards: [
      { id: 'final-wake', type: 'dragonWake', label: 'Dragon Wake', description: 'Route priority twists mid-climax.', alertText: 'Dragon wake active', interval: 8, pathIds: ['main', 'north', 'south'] },
      { id: 'final-surge', type: 'laneSpeedPulse', label: 'Ember Surge', description: 'Every lane surges under dragon pressure.', pathIds: ['main', 'north', 'south'], interval: 14, duration: 6, speedMultiplier: 1.35 },
    ],
    waves: [
      wave('wave-1', 'Sightline', [
        group('boar_push', { count: 5, pathId: 'main' }),
        group('seagull_screen', { count: 9, pathId: 'north' }),
        group('fox_patrol', { count: 5, pathId: 'south' }),
      ]),
      wave('wave-2', 'Heat Outline', [
        group('boar_push', { count: 6, pathId: 'main', modifiers: { hpMultiplier: 1.24 } }),
        group('seagull_screen', { count: 10, pathId: 'north' }),
        group('dog_column', { count: 5, pathId: 'south' }),
      ]),
      wave('wave-3', 'Shape Below', [
        group('boar_push', { count: 6, pathId: 'main', modifiers: { hpMultiplier: 1.28 } }),
        group('seagull_screen', { count: 10, pathId: 'north' }),
        group('fox_patrol', { count: 6, pathId: 'south' }),
      ]),
      wave('wave-4', 'No Metaphor Left', [
        group('boar_push', { count: 7, pathId: 'main', modifiers: { hpMultiplier: 1.3 } }),
        group('seagull_screen', { count: 11, pathId: 'north' }),
        group('dog_column', { count: 6, pathId: 'south' }),
      ]),
      wave('wave-5', 'Dragon Thread', [
        group('boar_push', { count: 7, pathId: 'main', modifiers: { hpMultiplier: 1.32 } }),
        group('seagull_screen', { count: 12, pathId: 'north' }),
        group('fox_patrol', { count: 6, pathId: 'south' }),
      ]),
      wave('wave-6', 'Hold Or Cut', [
        group('boar_push', { count: 8, pathId: 'main', modifiers: { hpMultiplier: 1.35, rewardMultiplier: 1.22 } }),
        group('seagull_screen', { count: 12, pathId: 'north' }),
        group('dog_column', { count: 7, pathId: 'south' }),
      ], 120),
    ],
  }),
];

const levels = [
  ...worldOneLevels,
  ...worldTwoLevels,
  ...worldThreeLevels,
  ...worldFourLevels,
  ...worldFiveLevels,
];

export const CAMPAIGN_CONFIG: CampaignConfig = {
  version: 2,
  meta: {
    id: 'fjodor-defense-full-campaign',
    name: 'Fjodor\'s Defense',
  },
  worlds: [
    {
      id: 'streets-remember',
      name: 'The Streets Remember',
      subtitle: 'Britt-Inger\'s warnings start sounding less like folklore.',
      description: 'Familiar blocks begin behaving like a map with memory.',
      accent: '#ffd666',
      mapTint: '#10233b',
      storyIntro: 'Söder still looks like home. It just no longer behaves like it.',
      storyOutro: 'By the end of the first world, Fjodor knows the island is answering to an older story.',
    },
    {
      id: 'hidden-routes',
      name: 'The Hidden Routes',
      subtitle: 'The brothers start reading the city the way Britt-Inger did.',
      description: 'Signals, routes, and doubled names turn navigation into interpretation.',
      accent: '#6fe8ff',
      mapTint: '#0a2631',
      storyIntro: 'What looked like noise becomes direction. What sounded like rumor becomes instruction.',
      storyOutro: 'By the end of the second world, route reading becomes belief.',
    },
    {
      id: 'ember-under-soder',
      name: 'Ember Under Söder',
      subtitle: 'Dragons stop hiding in stories and start shaping the night.',
      description: 'Ash, heat, and route denial turn warnings into tactics.',
      accent: '#ff8a5b',
      mapTint: '#2b1717',
      storyIntro: 'Britt-Inger was never warning Fjodor about make-believe. She was warning him about timing.',
      storyOutro: 'The ember becomes a board-level fact.',
    },
    {
      id: 'dragon-beneath',
      name: 'The Dragon Beneath',
      subtitle: 'Pressure comes from below as much as ahead.',
      description: 'Tunnel replies, lamp pressure, and structural dread reshape the lanes.',
      accent: '#f96c5c',
      mapTint: '#241015',
      storyIntro: 'The city stops hiding what lives under it.',
      storyOutro: 'By the end of the fourth world, the dragon no longer needs metaphor.',
    },
    {
      id: 'hornstull-reckoning',
      name: 'Hornstull Reckoning',
      subtitle: 'The family story and the battle finally become one thing.',
      description: 'Every route, warning, and choice converges in a final board-wide reckoning.',
      accent: '#ffe89c',
      mapTint: '#341f16',
      storyIntro: 'This is where Fjodor stops borrowing everyone else\'s language for what is happening.',
      storyOutro: 'The city remembers the boys differently after this.',
    },
  ],
  paths: [
    { id: 'main', pathIndex: 0 },
    { id: 'north', pathIndex: 1 },
    { id: 'south', pathIndex: 2 },
  ],
  defaults: {
    startingMoney: 150,
    startingLives: 20,
    waveCompletionBonus: 45,
    autoStartWaves: false,
    availableTowers: ['scratchingPost', 'yarnLauncher', 'laserPointer', 'catnipBomb', 'treatDispenser', 'birdWhistle', 'tunaMortar', 'magnetCollar'],
    startingSelectedTower: 'scratchingPost',
    defaultPathId: 'main',
  },
  spawnTemplates: {
    rats_intro: { enemyId: 'rat', count: 8, spawnInterval: 1.15 },
    rats_rush: { enemyId: 'rat', count: 14, spawnInterval: 0.72 },
    rats_flood: { enemyId: 'rat', count: 20, spawnInterval: 0.48 },
    pigeon_scouts: { enemyId: 'pigeon', count: 5, spawnInterval: 1.25, startDelay: 1.5 },
    pigeon_flock: { enemyId: 'pigeon', count: 9, spawnInterval: 0.95, startDelay: 0.75 },
    dog_patrol: { enemyId: 'dog', count: 4, spawnInterval: 2.4, startDelay: 3 },
    dog_column: { enemyId: 'dog', count: 6, spawnInterval: 1.9, startDelay: 2.5 },
    seagull_screen: { enemyId: 'seagull', count: 6, spawnInterval: 0.95, startDelay: 0.5 },
    boar_push: { enemyId: 'boar', count: 4, spawnInterval: 2.8, startDelay: 2 },
    fox_patrol: { enemyId: 'fox', count: 3, spawnInterval: 2.1, startDelay: 1.5 },
  },
  worldModifiers: [
    { id: 'signal-route', name: 'Signal Route', description: 'Fjodor trusts pattern first.', hazardIds: ['harbor-signal', 'signal-pulse'] },
    { id: 'harbor-route', name: 'Harbor Route', description: 'Fjodor trusts traffic and flow first.', hazardIds: ['harbor-watch'] },
    { id: 'containment-line', name: 'Containment', description: 'Hold the city together and minimize breaches.' },
    { id: 'pursuit-line', name: 'Pursuit', description: 'Track the dragon thread aggressively and accept more board damage.' },
  ],
  branchChoices: [
    {
      id: 'route-interpretation',
      prompt: 'How does Fjodor read the city now?',
      description: 'Choose whether Fjodor trusts the signal logic or the harbor flow first.',
      options: [
        {
          id: 'signal_route',
          label: 'Signal Route',
          description: 'Read the city as a coded system of warnings and wakefulness.',
          nextNodeId: 'node-09-signal',
          consequenceDelta: { familyKnowledge: 2, laneControlMastery: 1 },
        },
        {
          id: 'harbor_route',
          label: 'Harbor Route',
          description: 'Read the city through movement, traffic, and pressure channels.',
          nextNodeId: 'node-09-harbor',
          consequenceDelta: { civilianIntegrity: 1, familyKnowledge: 1 },
        },
      ],
    },
    {
      id: 'ember-posture',
      prompt: 'What posture does Fjodor take toward the ember now?',
      description: 'Choose whether to contain the spread or pursue the source.',
      options: [
        {
          id: 'containment',
          label: 'Contain The Ember',
          description: 'Preserve the city first and stabilize the board.',
          nextNodeId: 'node-13-contain',
          consequenceDelta: { civilianIntegrity: 2, laneControlMastery: 2 },
        },
        {
          id: 'pursuit',
          label: 'Track The Dragon',
          description: 'Pressure the source harder, even if the board gets rougher.',
          nextNodeId: 'node-13-pursuit',
          consequenceDelta: { dragonPressure: 2, familyKnowledge: 1 },
        },
      ],
    },
  ],
  endingRules: [
    {
      id: 'the-city-held',
      name: 'The City Held',
      title: 'The City Held',
      body: 'Fjodor holds Söder together long enough for the dragon pressure to break against structure instead of panic.',
      requiredChoices: { 'ember-posture': 'containment' },
      minCivilianIntegrity: 14,
      maxDragonPressure: 10,
      minFamilyKnowledge: 10,
      minLaneControlMastery: 9,
    },
    {
      id: 'the-dragon-marked-back',
      name: 'The Dragon Marked Back',
      title: 'The Dragon Marked Back',
      body: 'Fjodor cuts into the dragon thread early and hard. Söder holds, but it will never look entirely unmarked again.',
      requiredChoices: { 'ember-posture': 'pursuit' },
      minCivilianIntegrity: 0,
      maxDragonPressure: 99,
      minFamilyKnowledge: 8,
      minLaneControlMastery: 6,
    },
  ],
  campaignNodes: [
    { id: 'node-01', levelId: 'old-town-roads', order: 1, nextNodeId: 'node-02' },
    { id: 'node-02', levelId: 'roofline-flurry', order: 2, nextNodeId: 'node-03' },
    { id: 'node-03', levelId: 'hound-mile', order: 3, nextNodeId: 'node-04' },
    { id: 'node-04', levelId: 'market-shuffle', order: 4, nextNodeId: 'node-05' },
    { id: 'node-05', levelId: 'harbor-theft', order: 5, nextNodeId: 'node-06' },
    { id: 'node-06', levelId: 'signal-heights', order: 6, nextNodeId: 'node-07' },
    { id: 'node-07', levelId: 'stone-script', order: 7, nextNodeId: 'node-08' },
    { id: 'node-08', levelId: 'the-fork-under-glass', order: 8, choiceId: 'route-interpretation' },
    { id: 'node-09-signal', levelId: 'cinder-market', order: 9, nextNodeId: 'node-10-signal', modifierIds: ['signal-route'], codexUnlocks: ['Signal route chosen'] },
    { id: 'node-10-signal', levelId: 'ash-parade', order: 10, nextNodeId: 'node-11', modifierIds: ['signal-route'] },
    { id: 'node-09-harbor', levelId: 'ash-parade', order: 9, nextNodeId: 'node-10-harbor', modifierIds: ['harbor-route'], codexUnlocks: ['Harbor route chosen'] },
    { id: 'node-10-harbor', levelId: 'cinder-market', order: 10, nextNodeId: 'node-11', modifierIds: ['harbor-route'] },
    { id: 'node-11', levelId: 'boar-stair', order: 11, nextNodeId: 'node-12' },
    { id: 'node-12', levelId: 'instructions-not-stories', order: 12, choiceId: 'ember-posture' },
    { id: 'node-13-contain', levelId: 'tunnel-reply', order: 13, nextNodeId: 'node-14-contain', modifierIds: ['containment-line'] },
    { id: 'node-14-contain', levelId: 'yard-of-teeth', order: 14, nextNodeId: 'node-15-contain', modifierIds: ['containment-line'] },
    { id: 'node-15-contain', levelId: 'below-the-lamps', order: 15, nextNodeId: 'node-16', modifierIds: ['containment-line'] },
    { id: 'node-13-pursuit', levelId: 'tunnel-reply', order: 13, nextNodeId: 'node-14-pursuit', modifierIds: ['pursuit-line'] },
    { id: 'node-14-pursuit', levelId: 'below-the-lamps', order: 14, nextNodeId: 'node-15-pursuit', modifierIds: ['pursuit-line'] },
    { id: 'node-15-pursuit', levelId: 'yard-of-teeth', order: 15, nextNodeId: 'node-16', modifierIds: ['pursuit-line'] },
    { id: 'node-16', levelId: 'three-ways-to-burn', order: 16, nextNodeId: 'node-17' },
    { id: 'node-17', levelId: 'hornstull-holds-breath', order: 17, nextNodeId: 'node-18' },
    { id: 'node-18', levelId: 'the-ember-shows-its-face', order: 18 },
  ],
  levels,
};
