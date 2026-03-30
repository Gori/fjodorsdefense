# Fjodor's Defense Code Review

Date: 2026-03-27

Scope: full repository review of the Next.js app, gameplay store, rendering layer, UI, static data flow, and helper scripts.

Build status:

- `pnpm lint`: passes
- `pnpm build`: fails during TypeScript validation

Overall assessment:

- The project has a strong playable prototype core. The game loop is compact, understandable, and easy to iterate on.
- The main weaknesses are production readiness, placement/game-rule integrity, render-thread performance, and partial systems that are visually impressive but not fully integrated into gameplay.
- The repo is in good prototype shape, not yet in robust game shape.

## Strengths

- Clear separation between gameplay state (`lib/store.ts`) and presentation (`components/`).
- Good use of small data definition files for towers, enemies, and waves.
- The visual identity is already distinct and specific instead of boilerplate tower-defense styling.
- The map-data scripts make the world feel grounded in a real place and create a strong direction for future feature work.
- The codebase is still small enough that a focused refactor can materially improve quality quickly.

## Highest-Priority Findings

### 1. Production build is broken

Severity: Critical

Evidence:

- `components/game/FlattenMaterial.tsx:97-102` types the `onBeforeCompile` callback argument as `THREE.WebGLProgramParameters`, then accesses `shader.uniforms`.
- `pnpm build` fails with: `Property 'uniforms' does not exist on type 'WebGLProgramParameters'`.

Impact:

- The app does not pass production build/typecheck.
- Any deployment pipeline using `next build` is blocked.

Recommendation:

- Type the callback against the actual shader object used by `onBeforeCompile` instead of `WebGLProgramParameters`.
- Add a CI gate that runs `pnpm lint` and `pnpm build` on every branch.

### 2. Tower placement rules are not actually enforcing map legality

Severity: Critical

Evidence:

- `lib/store.ts:187-212` only validates money, phase, and tower-to-tower spacing.
- `components/game/Map.tsx:330-349` snaps the clicked point and directly calls `placeTower`.
- `components/game/Map.tsx:381-451` builds `islandGeo` as a full `300 x 300` plane with elevation, not a clipped playable footprint.
- `components/game/Map.tsx:547-552` uses that same full terrain mesh as the picking target.

Impact:

- Towers can be placed on roads, enemy paths, water, steep geometry, building footprints, and likely far outside the intended play space.
- This undermines game balance and player trust immediately.

Recommendation:

- Centralize placement validation in a shared pure function used by both preview and store.
- Validate at least: land-only, inside play bounds, not on path, not inside building footprint, not inside restricted buffer zones, and respecting consistent tower spacing.

### 3. Preview placement rules disagree with actual placement rules

Severity: High

Evidence:

- `lib/store.ts:51` sets `MIN_TOWER_SPACING = 1.5`.
- `lib/store.ts:195-196` enforces `1.5`.
- `components/game/Map.tsx:364-367` preview rejection uses `2.5`.
- `lib/mapUtils.ts:31-39` contains another placement helper with default `2.5`, but it is not the store authority.

Impact:

- The preview can show red while the store would accept the placement.
- This creates input friction and makes the UI feel buggy.

Recommendation:

- Define one placement rules module and reuse it everywhere.
- Treat the store-side validator as the source of truth and call the same function for hover feedback.

### 4. Enemy removal always looks like a kill, even when the player leaks

Severity: High

Evidence:

- `components/game/Particles.tsx:44-57` creates an explosion whenever an enemy ID disappears.
- `lib/store.ts:274-281` removes enemies that reach the end after decrementing lives.

Impact:

- Enemies that escape still trigger a death-like explosion.
- This gives the player the opposite visual feedback from what actually happened.

Recommendation:

- Distinguish removal reasons: killed, escaped, despawned, wave reset.
- Drive effects from explicit events rather than diffing arrays in the render layer.

### 5. Wave UI shows the wrong number during active play

Severity: High

Evidence:

- `components/ui/HUD.tsx:42` sets `displayWave = phase === 'between-waves' ? wave + 1 : wave`.
- `components/ui/HUD.tsx:115-141` uses `displayWave` in the active-wave HUD.
- `lib/store.ts:184` starts the first wave with `wave = 0` and `phase = 'playing'`.

Impact:

- The first live wave displays as `Wave 0 / 5`.
- This is a visible player-facing bug.

Recommendation:

- Display wave numbers consistently as one-based in UI, while keeping zero-based indices internally if desired.

### 6. Roof geometry is generated, stored, and then discarded

Severity: High

Evidence:

- `components/game/Map.tsx:96-99` says `buildBuildings` returns `walls` and `roofs`.
- `components/game/Map.tsx:151-204` builds roof geometry.
- `components/game/Map.tsx:214-225` returns `const roofs: THREE.BufferGeometry | null = null`.
- `components/game/Map.tsx:483-488` only exposes wall geometry.

Impact:

- Significant geometry work is performed for no rendered result.
- The map pays CPU cost without receiving the visual benefit.

Recommendation:

- Either render roofs properly or remove the generation entirely until needed.

## Architecture and Gameplay Findings

### 7. The main map is doing too much work on the client at runtime

Severity: High

Evidence:

- `components/game/Map.tsx` mixes data fetching, geometry generation, placement logic, map transitions, labels, path rendering, and material setup in one `636` line file.

Impact:

- Harder to reason about correctness.
- Harder to test.
- Any change risks side effects in unrelated systems.

Recommendation:

- Split into dedicated modules for:
  - map data loading
  - terrain/picking
  - building mesh generation
  - placement validation
  - labels/path overlays

### 8. Ground texture generation is expensive and blocks the client

Severity: High

Evidence:

- `components/game/GroundTexture.ts:13` uses `2048 x 2048`.
- `components/game/GroundTexture.ts:96-115` iterates every pixel and calls `getElevation`.
- `components/game/Map.tsx:455-458` builds the texture in `useMemo` on the client.

Impact:

- Startup hitch on first load.
- More noticeable on weaker GPUs/CPUs and mobile-class devices.

Recommendation:

- Precompute this texture offline and ship it as a static asset, or reduce resolution and cache aggressively.
- If runtime generation is required, move it off the main thread.

### 9. Building geometry generation also happens at runtime in the browser

Severity: High

Evidence:

- `components/game/Map.tsx:103-225` creates and merges large numbers of `ExtrudeGeometry` objects.
- The source data itself is non-trivial in size: `public/data` is about `1.7M`.

Impact:

- Large initial client cost.
- Runtime allocations increase GC pressure.

Recommendation:

- Pre-bake geometry or simplified mesh data during asset generation.
- Reserve runtime generation for debugging or authoring tools, not production load.

### 10. Several systems are partially implemented or dead-ended

Severity: Medium

Evidence:

- `components/game/Structures.tsx` exists but is not mounted in `components/game/GameCanvas.tsx:67-74`.
- `components/game/Landmarks.tsx` exists but is not mounted and contains a TODO for building exclusions.
- `lib/types.ts:70` includes `entryIndex`, but `lib/store.ts:178-181` always sets it to `0` and nothing uses it.
- `lib/enemyDefs.ts:19` marks pigeon as `flying`, but movement/targeting rules in `lib/store.ts` do not treat flying enemies differently; only render height changes in `components/game/Enemy.tsx:223-247`.

Impact:

- Extra maintenance cost.
- Harder to tell which systems are canonical versus abandoned experiments.

Recommendation:

- Either wire these systems into the game or remove them until they are ready.
- Track feature status explicitly in docs.

### 11. Debug logging is left in hot paths

Severity: Medium

Evidence:

- `components/game/Map.tsx:207`, `212`, `219`, `221`, `315` log warnings/errors/debug information directly from runtime map generation and loading.

Impact:

- Noisy console in production.
- Can hide real issues in routine geometry spam.

Recommendation:

- Gate logs behind a debug flag or development check.

### 12. The picking layer and map shape logic contain dead work

Severity: Medium

Evidence:

- `components/game/Map.tsx:416-422` computes `simplified` hull data that is never used to shape terrain or placement.
- The result is still a full plane.

Impact:

- Wasted complexity.
- Misleading code comments imply the terrain is island-shaped when it is not.

Recommendation:

- Either use the computed hull to build an actual shape/clip mask, or remove the unused hull code.

## UI and UX Findings

### 13. Keyboard handling is workable but not resilient

Severity: Medium

Evidence:

- `components/ui/HUD.tsx:19-32` and `components/ui/TowerSelector.tsx:70-89` attach window-level listeners.
- No check for focused inputs or future text fields.

Impact:

- This is fine today, but it will conflict once settings, naming, chat, or debug controls exist.

Recommendation:

- Move to a centralized input layer with mode awareness.

### 14. Tower info is too shallow for strategy play

Severity: Medium

Evidence:

- `components/ui/TowerSelector.tsx:9-14` stores very short descriptions.
- Tooltip only shows damage and range in `components/ui/TowerSelector.tsx:152-166`.

Impact:

- Harder for players to reason about fire rate, DPS, specials, and cost efficiency.

Recommendation:

- Display fire rate, special effect, and maybe DPS.
- Add clear placement invalidation reasons rather than only red/green feedback.

### 15. Start, victory, and HUD screens are stylish but not accessibility-ready

Severity: Medium

Evidence:

- The UI is heavily pointer-driven and animation-heavy.
- There is no visible accessibility strategy for keyboard-first play, reduced motion, or colorblind-safe status coding.

Impact:

- Usability ceiling is lower than it needs to be.

Recommendation:

- Add reduced-motion handling, stronger text alternatives, and more redundant visual cues.

## Data and Asset Pipeline Findings

### 16. Static data and generated code are tightly coupled without validation

Severity: Medium

Evidence:

- `lib/mapUtils.ts` notes its bounds must match `scripts/fetch-map-data.mjs`.
- `lib/pathData.ts`, `lib/elevation.ts`, `lib/trees.ts`, and `public/data/*.json` are all generated/static but there is no validation command tying them together.

Impact:

- Easy to introduce silent map-coordinate drift.
- Hard to know when generated assets are stale.

Recommendation:

- Add a `pnpm validate:data` script that asserts coordinate bounds, path indices, and expected schemas.

### 17. Large generated blobs inside source reduce maintainability

Severity: Medium

Evidence:

- `lib/elevation.ts` is about `236K`.
- `lib/trees.ts` inlines generated tree data.

Impact:

- Source diffs become noisy.
- TypeScript/parser/editor overhead increases.

Recommendation:

- Move generated asset data out of `lib/` and into versioned data files unless direct code import is measurably better.

## Lower-Priority Findings

### 18. Some render paths may scale poorly with larger waves

Severity: Low

Evidence:

- Each enemy and projectile is currently rendered as an individual React component instance.
- The store clones arrays and nested objects every tick in `lib/store.ts:227-233`.

Impact:

- Fine for a small prototype.
- Will become limiting once enemy counts rise substantially.

Recommendation:

- Consider pooling, instancing, or event-driven rendering if wave sizes increase.

### 19. Scripts are useful but ad hoc

Severity: Low

Evidence:

- `scripts/` contains multiple one-off geometry/data scripts with no single documented pipeline.

Impact:

- Onboarding and regeneration are harder than they should be.

Recommendation:

- Document the asset pipeline and expose the common workflows as package scripts.

### 20. Game balance is still mostly placeholder tuning

Severity: Low

Evidence:

- Towers, enemies, and waves are simple and largely linear in progression.

Impact:

- The prototype proves the loop, but not long-term strategy depth.

Recommendation:

- Introduce economic tradeoffs, enemy armor/resistance patterns, and clearer counterplay relationships.

## Suggested Refactor Order

1. Fix the production build error in `FlattenMaterial`.
2. Centralize placement validation and enforce it in both preview and store.
3. Correct the wave UI numbering and removal effect semantics.
4. Split `Map.tsx` into smaller modules and remove dead geometry work.
5. Precompute ground/building assets to reduce first-load cost.
6. Add minimal automated coverage for store logic and build validation.

## Recommended Test Coverage

There are currently no tests in the repo. The first test targets should be:

- placement validity rules
- wave progression and win/loss transitions
- projectile hit, slow, and AOE behavior
- reward/life accounting
- path index validity against `ALL_PATHS`
- UI wave number formatting

Practical first step:

- Add unit tests around pure gameplay logic by extracting more of `lib/store.ts` into standalone reducers/helpers.

## Feature Opportunities

These are the most promising next features given the current codebase and theme.

### Short-term features

- Tower upgrades instead of only fresh placement
- Enemy types with resistances, armor, or stealth
- Multiple paths using the existing `ALL_PATHS` concept properly
- Sell/refund system
- Distinct leak effect when enemies escape
- Pause and speed controls
- Wave preview panel with actual threat composition and rewards

### Medium-term features

- Terrain-aware placement restrictions and bonuses
- Landmark-based strategic nodes on the Södermalm map
- Status effect stacking and tower synergies
- Boss waves
- Objective modifiers tied to districts or roads
- Proper flying-unit rules so pigeons are mechanically different

### Longer-term features

- Campaign map progression across real Stockholm districts
- Meta-progression or unlock system
- Save/load
- Challenge modes with map mutators
- Leaderboards or score attack

## Concrete Backlog Proposal

### Phase 1: Stabilize

- Make `next build` pass
- Fix placement legality
- Fix wave number display
- Fix explosion-on-leak behavior
- Remove or gate debug logging

### Phase 2: Make the simulation trustworthy

- Add tests for store logic
- Add explicit gameplay events for spawn, kill, leak, and wave end
- Unify all constants used by preview/store/UI

### Phase 3: Reduce runtime cost

- Pre-bake terrain texture
- Pre-bake building geometry
- Move large generated blobs out of runtime code paths

### Phase 4: Add strategy depth

- Upgrades
- Sell/refund
- More enemy mechanics
- Multi-lane/path pressure

## Final Assessment

This codebase is a good prototype with a clear identity and enough structure to improve quickly. The most important thing now is not adding more content immediately. It is making the existing game rules coherent, making the build reliable, and reducing the amount of expensive work happening in the browser at startup. Once those are fixed, the project is in a strong position to expand into a much better game rather than a more fragile one.
