[PLANS]
- 2026-03-11T09:14:11+08:00 [USER] Follow-up adjustment: restore the particle visibility, make the atmosphere closer to the provided neon-glow reference, and verify the rendered result with Playwright.
- 2026-03-10T22:44:43+08:00 [USER] Follow-up adjustment: the atmosphere glow is inverted and should radiate softly outward from the planet instead.
- 2026-03-10T22:35:00+08:00 [USER] Follow-up adjustment: give the planet a clearer atmospheric glow and make the default terrainHeight value 0.05.
- 2026-03-10T21:43:12+08:00 [USER] Follow-up adjustment: add a Leva control for terrain-height exaggeration, restore white particles, and remove the explanatory cards from the left side of the page.
- 2026-03-10T21:12:56+08:00 [USER] Follow-up adjustment: make the terrain and land placement mimic the real Earth instead of the custom stylized mask.
- 2026-03-10T20:58:39+08:00 [USER] Follow-up adjustment: remove the cloud particles and keep the improved terrain detail on the earth.
- 2026-03-10T20:33:38+08:00 [USER] Follow-up adjustment: make the particle earth more detailed by adding cloud particles and elevating land particles based on terrain height.
- 2026-03-10T18:57:17+08:00 [USER] Follow-up adjustment: only drags that begin in empty space around the earth should rotate it; drags that begin on the earth itself should do nothing.
- 2026-03-10T16:31:55+08:00 [USER] Build a single-page React Three Fiber particle-earth site from an empty repo with land-only particles, a Fresnel shell, hover-based particle displacement, and drag-to-rotate background interaction.
- 2026-03-10T17:30:27+08:00 [USER] Follow-up adjustment: increase background drag responsiveness and make globe radius plus camera distance responsive to the browser window so the full earth stays in frame.
- 2026-03-10T17:58:57+08:00 [USER] Follow-up adjustment: inspect the live experience with Playwright because earth rotation still felt unusable and the Fresnel shell appeared as a solid fill.

[DECISIONS]
- 2026-03-11T09:14:11+08:00 [CODE] The atmosphere now combines a subtle filled globe body with a front-rim plus back-bloom shell, and Playwright verification uses a Windows-safe dedicated dev-server port plus an env-gated screenshot capture.
- 2026-03-10T22:44:43+08:00 [CODE] Supersedes the 2026-03-10T22:35:00+08:00 shell tuning: the atmosphere now uses back-side additive halo shells masked by a depth-only occluder so the glow reads outside the planet silhouette instead of inside it.
- 2026-03-10T22:35:00+08:00 [CODE] The atmospheric shell now layers a tight rim and a softer outer halo with additive front-side Fresnel shading, and the Leva terrain-height control now defaults to 0.05 via PARTICLE_GLOBE_CONFIG.
- 2026-03-10T21:43:12+08:00 [CODE] Terrain height is now a runtime UI control via Leva while the particle material returns to uniform white, and the scene shell keeps only the globe canvas plus the compact control panel.
- 2026-03-10T21:12:56+08:00 [CODE] Supersedes the earlier procedural-relief decision for terrain shape: the globe now samples a NOAA-derived elevation raster directly for both land placement and normalized terrain height, with ocean removed at asset-generation time.
- 2026-03-10T20:58:39+08:00 [CODE] Supersedes 2026-03-10T20:33:38+08:00 cloud-shell decision: the scene keeps procedural terrain elevation on land particles but removes the cloud particle layer and returns drag gating to the shell radius.
- 2026-03-10T20:33:38+08:00 [CODE] Terrain relief is derived procedurally from the existing land mask plus deterministic noise, and a separate cloud particle shell sits outside the globe while drag gating now uses the outer visual radius.
- 2026-03-10T18:57:17+08:00 [CODE] Background rotation now starts from the HTML scene frame using projected globe-circle hit testing; drags that start on the earth are ignored instead of promoting into rotation.
- 2026-03-10T18:16:25+08:00 [CODE] Desktop drag handling now uses window-level mouse events for mouse input and keeps non-mouse pointer events as a fallback, avoiding the dead rotation path seen with the prior pointer-only setup.
- 2026-03-10T16:31:55+08:00 [USER] Target stack is Vite + React + TypeScript.
- 2026-03-10T16:31:55+08:00 [USER] Device scope is desktop-first; touch only needs a non-broken fallback.
- 2026-03-10T16:31:55+08:00 [USER] Land-vs-sea particle placement should use a land-mask texture strategy.
- 2026-03-10T16:31:55+08:00 [ASSUMPTION] Repo is empty except for instructions, so the app, tests, docs, and container workflow will be scaffolded from scratch.
- 2026-03-10T17:16:30+08:00 [CODE] The globe uses a stylized local SVG land mask, CPU-updated point positions, an invisible interaction sphere for ray hits, and a non-interactive HTML overlay so background drags reach the canvas.
- 2026-03-10T17:30:27+08:00 [CODE] Drag rotation is normalized by canvas dimensions instead of raw pixels, and viewport metrics now drive globe radius, shell radius, point size, and camera distance.
- 2026-03-10T17:58:57+08:00 [CODE] The globe now sits farther back and shifted right on wide screens, dragging can promote from an on-globe movement after a small threshold, and the Fresnel shell uses an additive front-side rim instead of a back-face fill.

[PROGRESS]
- 2026-03-11T09:14:11+08:00 [TOOL] Added a translucent globe body in src/components/EarthScene.tsx, refined src/components/FresnelShell.tsx, updated playwright.config.ts to use npm.cmd on port 4174, and captured output/playwright/atmosphere-check.png through the smoke test.
- 2026-03-10T22:44:43+08:00 [TOOL] Reworked src/components/FresnelShell.tsx from front-side rim layers to masked back-side halo layers and re-verified locally with lint, unit tests, build, and Playwright smoke coverage.
- 2026-03-10T22:35:00+08:00 [TOOL] Updated src/components/FresnelShell.tsx to render a dual-layer atmosphere glow, changed src/config.ts terrainHeightScale default to 0.05, and re-verified locally after Docker remained unavailable.
- 2026-03-10T21:43:12+08:00 [TOOL] Installed Leva, threaded terrainHeightScale from src/App.tsx into the scene and globe, removed the left-side copy and hint cards, simplified particle buffers by dropping per-vertex colors, and re-verified locally after Docker remained unavailable.
- 2026-03-10T21:12:56+08:00 [TOOL] Downloaded NOAA ETOPO1 bedrock relief, added scripts/generate_etopo_heightmap.py plus public/earth-elevation.png, rewired particle generation to use raster elevation data, updated docs/tests, and re-verified locally after Docker remained unavailable.
- 2026-03-10T20:58:39+08:00 [TOOL] Removed src/components/CloudLayer.tsx, stripped cloud-specific config/layout/math/tests, restored earth-only copy, and re-verified locally after Docker remained unavailable.
- 2026-03-10T20:33:38+08:00 [TOOL] Extended src/lib/earthMath.ts, added src/components/CloudLayer.tsx, threaded cloud metrics through scene layout, refreshed copy/tests, and verified locally after Docker remained unavailable.
- 2026-03-10T18:57:17+08:00 [TOOL] Moved background drag ownership into `src/App.tsx` capture handlers, projected the globe into screen space for drag gating, simplified `src/components/EarthScene.tsx` to hover-only interaction, and tightened the Playwright smoke test to cover both accepted and rejected drag starts.
- 2026-03-10T18:16:25+08:00 [TOOL] Reworked `src/components/EarthScene.tsx` so drag state is driven by mouse listeners on desktop and by non-mouse pointer listeners for fallback input, then re-verified lint, unit tests, build, and Playwright smoke coverage.
- 2026-03-10T16:31:55+08:00 [TOOL] Confirmed `node`, `npm`, and `docker` are available locally; `git` inspection is blocked by a safe-directory ownership mismatch, so verification will use direct filesystem and build/test commands instead of git metadata.
- 2026-03-10T17:16:30+08:00 [TOOL] Implemented the app scaffold, scene, tests, Docker workflow, README, and repo-specific AGENTS container notes; verification completed with local npm because the Docker daemon was not running.
- 2026-03-10T17:30:27+08:00 [TOOL] Added a responsive scene-layout helper, threaded runtime radius/point-size props into the globe renderer, and re-verified lint, unit tests, build, and browser smoke coverage.
- 2026-03-10T17:58:57+08:00 [TOOL] Used Playwright-driven browser checks and screenshots to inspect the rendered scene, then updated the interaction and shell rendering and re-ran lint, unit tests, build, and Playwright smoke coverage.

[DISCOVERIES]
- 2026-03-11T09:14:11+08:00 [TOOL] The initial Playwright screenshots were stale because the runner could reuse an older Vite server; forcing a fresh webServer on port 4174 made the captured render match the current source.
- 2026-03-10T22:44:43+08:00 [CODE] Front-side additive shells always read as an inward outline on this particle globe because there is no opaque planet surface; a depth-only occluder plus back-side halo geometry keeps the atmosphere outside the silhouette.
- 2026-03-10T21:43:12+08:00 [TOOL] The installed Leva version replaces the older hideTitleBar prop with titleBar={false}; the production build still passes but now emits a chunk-size warning at about 1302 kB after adding Leva.
- 2026-03-10T21:12:56+08:00 [TOOL] The 2048x1024 NOAA ETOPO1 export in this workflow spans -9786m to +6161m, so the repo asset now clamps ocean to 0 and normalizes positive land elevation into 1..255 to preserve coastlines while keeping runtime sampling simple.
- 2026-03-10T20:33:38+08:00 [CODE] The repo has no terrain height asset; scaling the land-mask neighborhood sample by texture size keeps the same procedural elevation logic stable on both the production SVG mask and the unit-test fixtures.
- 2026-03-10T18:57:17+08:00 [USER] The required interaction is stricter than the earlier implementation: only empty-space drags should rotate the earth, and dragging directly on the globe should be a no-op.
- 2026-03-10T18:57:17+08:00 [TOOL] The updated smoke test now proves the intended split by showing a drag from the globe center leaves `rotationY` unchanged while a drag from `(40, 40)` changes it.
- 2026-03-10T18:16:25+08:00 [TOOL] `npm run test:e2e` reproduced the bug with `rotationY` stuck at `1.2`; hover still worked, which narrowed the fault to the drag start/move event path rather than the render transform math.
- 2026-03-10T16:31:55+08:00 [TOOL] `.agent/CONTINUITY.md` did not exist at task start and had to be created before implementation.
- 2026-03-10T16:31:55+08:00 [TOOL] PowerShell `date -Is` is not supported; `Get-Date -Format o` returns the required ISO timestamp in this environment.
- 2026-03-10T17:16:30+08:00 [TOOL] `docker compose up -d` failed because the Docker Desktop Linux engine pipe was unavailable, so container verification could not run in this session.
- 2026-03-10T17:16:30+08:00 [CODE] The first smoke test failure showed hover hits were landing on the sphere but not always near land particles; widening the hover radius made ocean-adjacent cursor passes produce visible displacement while preserving land-only particle placement.
- 2026-03-10T17:30:27+08:00 [CODE] The responsive camera distance must be passed from the layout metrics into debug/test state directly; reading `camera.position.z` from props during the initial render left the smoke test with a stale `4.4` value even though the camera had already moved.
- 2026-03-10T17:58:57+08:00 [TOOL] Playwright screenshots showed that background drags were already changing `rotationY`, but the globe still felt wrong because the oversized layout left little visible background space and the back-face Fresnel shader rendered as a uniform cyan fill over the sphere.

[OUTCOMES]
- 2026-03-11T09:14:11+08:00 [CODE] Restored visible particles and moved the atmosphere toward the provided reference by pairing an outward halo with a translucent planet body under the point cloud.
- 2026-03-11T09:14:11+08:00 [TOOL] Verification passed with npm run lint, npm run test:unit, npm run build, and a Playwright smoke run that saved output/playwright/atmosphere-check.png.
- 2026-03-10T22:44:43+08:00 [CODE] Corrected the atmosphere rendering so the glow radiates outward as a soft halo rather than appearing inverted on the inside edge of the planet.
- 2026-03-10T22:44:43+08:00 [TOOL] Verification passed with npm run lint, npm run test:unit, npm run build, and npm run test:e2e.
- 2026-03-10T22:35:00+08:00 [CODE] Delivered a brighter atmospheric halo around the planet and reduced the default terrain-height exaggeration to 0.05 without changing the existing interaction model.
- 2026-03-10T22:35:00+08:00 [TOOL] Docker compose still could not connect to the Docker Desktop Linux engine pipe, so fallback verification passed with npm run lint, npm run test:unit, npm run build, and npm run test:e2e.
- 2026-03-10T21:43:12+08:00 [CODE] Delivered a control-panel-driven terrain-height exaggeration slider, restored white particles, and removed the left-side explanatory UI while preserving the existing interaction model.
- 2026-03-10T21:43:12+08:00 [TOOL] Docker compose remained unavailable because the Docker Desktop Linux engine pipe was missing; fallback verification passed with npm run lint, npm run test:unit, npm run build, and npm run test:e2e.
- 2026-03-10T21:12:56+08:00 [CODE] Replaced the custom SVG land mask and procedural elevation with a real-Earth terrain asset derived from NOAA relief data, keeping hover displacement and background-only drag behavior intact.
- 2026-03-10T21:12:56+08:00 [TOOL] Docker compose remained unavailable because the Docker Desktop Linux engine pipe was missing, so fallback verification passed with npm run lint, npm run test:unit, npm run build, and npm run test:e2e.
- 2026-03-10T20:58:39+08:00 [CODE] Removed the cloud particle layer while preserving the elevated land particle relief and the existing hover plus background-drag behavior.
- 2026-03-10T20:58:39+08:00 [TOOL] Docker compose remained unavailable because the Docker Desktop Linux engine pipe was missing, so fallback verification passed with npm run lint, npm run test:unit, npm run build, and npm run test:e2e.
- 2026-03-10T20:33:38+08:00 [CODE] Delivered a denser earth with elevated land particles and a drifting cloud particle layer while preserving hover displacement and background-only drag rotation.
- 2026-03-10T20:33:38+08:00 [TOOL] Docker compose remained unavailable because the Docker Desktop Linux engine pipe was missing, so fallback verification passed with npm run lint, npm run test:unit, npm run build, and npm run test:e2e.
- 2026-03-10T18:57:17+08:00 [CODE] Delivered background-only drag rotation that begins on empty space around the globe and ignores drags that start on the globe itself.
- 2026-03-10T18:57:17+08:00 [TOOL] Verification passed with `npm run lint`, `npm run test:unit`, `npm run build`, and `npm run test:e2e` after the background-drag refactor.
- 2026-03-10T18:16:25+08:00 [CODE] Restored working earth drag rotation by splitting desktop mouse handling from non-mouse pointer handling in the scene interaction effect.
- 2026-03-10T18:16:25+08:00 [TOOL] Verification passed with `npm run lint`, `npm run test:unit`, `npm run build`, and `npm run test:e2e` after the drag fix.
- 2026-03-10T17:16:30+08:00 [CODE] Delivered a working particle-earth website with React Three Fiber, Fresnel shell styling, land-mask-driven particle placement, hover displacement, and drag-to-rotate background interaction.
- 2026-03-10T17:16:30+08:00 [TOOL] Verification passed with `npm run lint`, `npm run test:unit`, `npm run build`, and `npm run test:e2e`.
- 2026-03-10T17:30:27+08:00 [CODE] Refined the scene so drag rotation is much faster and the entire earth stays visible by scaling scene metrics from the current viewport.
- 2026-03-10T17:30:27+08:00 [TOOL] Verification passed again with `npm run lint`, `npm run test:unit`, `npm run build`, and `npm run test:e2e` after the responsive sizing change.
- 2026-03-10T17:58:57+08:00 [CODE] Refined the experience using Playwright evidence so the rim light reads as a true edge glow, the globe no longer dominates the viewport, and rotation is easy to trigger from both background drags and deliberate on-globe drags.
- 2026-03-10T17:58:57+08:00 [TOOL] Verification passed again with `npm run lint`, `npm run test:unit`, `npm run build`, and `npm run test:e2e` after the Playwright-guided fixes.









