# Fjodor's Defence 🐈🛡️

Small tower defense game.  
Set on Södermalm, Stockholm.  
Cats, geometry, incoming problems.

## What It Is

`Fjodor's Defence` is a browser game built with Next.js, React Three Fiber, Rapier, and Zustand.

You place towers, stop waves, and try not to look surprised when the map starts fighting back.

## Run It

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Controls 🎯

- Click to place
- Right-drag to pan
- Scroll to zoom

## Stack

- Next.js 16
- React 19
- Three.js / React Three Fiber
- Rapier
- Zustand

## Data

Map and environment data live in `public/data/`.  
Utility scripts for fetching and rebuilding map-related assets live in `scripts/`.

## Notes

- This repo uses `pnpm`.
- The old boilerplate README was removed for obvious reasons.
- The cat is not optional.
