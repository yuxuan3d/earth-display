# Particle Earth

Single-page React Three Fiber experience that renders an interactive earth made entirely from particles. Land areas are populated from a real-world NOAA elevation raster, particle height follows actual terrain elevation, a Leva slider controls terrain-height exaggeration, the globe edge is defined by a Fresnel shell, hovering repels nearby particles based on mouse speed, and dragging the background rotates the earth.

## Stack

- Vite
- React + TypeScript
- Three.js with `@react-three/fiber` and `@react-three/drei`
- Leva for the terrain-height control panel
- Vitest for unit tests
- Playwright for browser smoke coverage
- Docker Compose for container-first local development

## Run

### Docker Compose

```bash
docker compose up -d
docker compose exec app npm run build
docker compose exec app npm run test:unit
```

The app is served at `http://localhost:5173`.

### Local Node

```bash
npm install
npm run dev
```

## Scripts

- `npm run dev` starts the Vite dev server.
- `npm run build` runs TypeScript project checks and creates the production bundle.
- `npm run lint` runs ESLint.
- `npm run test:unit` runs unit tests.
- `npm run test:e2e` runs the Playwright smoke suite.
- `python scripts/generate_etopo_heightmap.py` rebuilds `public/earth-elevation.png` from the downloaded NOAA TIFF.

## Notes

- `public/earth-elevation.png` is derived from NOAA's ETOPO1 bedrock global relief raster and is used for both land placement and normalized terrain height.
- `scripts/generate_etopo_heightmap.py` converts the downloaded TIFF into an 8-bit land-only heightmap where ocean is `0` and positive land elevation is normalized to `1..255`.
- The Leva panel exposes the terrain-height exaggeration value at runtime without affecting the hover or drag interaction model.
- `window.__particleEarthDebug` is populated in the browser to support smoke checks for particle count, displacement, rotation, and camera state.
- Globe radius, point size, camera distance, and wide-screen horizontal offset are derived from the viewport so the whole earth remains visible and usable across browser sizes.
