import { expect, test } from '@playwright/test';
import { PARTICLE_GLOBE_CONFIG } from '../src/config';
import { getProjectedGlobeCircle, getResponsiveSceneMetrics } from '../src/lib/sceneLayout';

test('renders the particle earth and allows drag rotation from the globe surface', async ({ page }) => {
  await page.goto('/');
  await page.waitForFunction(() => {
    return Boolean(window.__particleEarthDebug?.particleCount);
  });

  const initial = await page.evaluate(() => window.__particleEarthDebug);
  expect(initial?.particleCount ?? 0).toBeGreaterThan(1000);

  if (process.env.PLAYWRIGHT_CAPTURE === '1') {
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'output/playwright/atmosphere-check.png' });
  }

  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error('Viewport size is unavailable.');
  }

  const sceneMetrics = getResponsiveSceneMetrics(
    viewport.width,
    viewport.height,
    PARTICLE_GLOBE_CONFIG,
  );
  const projectedGlobe = getProjectedGlobeCircle(
    viewport.width,
    viewport.height,
    sceneMetrics,
  );

  await page.mouse.move(projectedGlobe.centerX, projectedGlobe.centerY);
  await page.mouse.move(projectedGlobe.centerX + 110, projectedGlobe.centerY - 40, {
    steps: 6,
  });
  await page.waitForTimeout(150);

  const afterHover = await page.evaluate(() => window.__particleEarthDebug);
  expect(afterHover?.averageDisplacement ?? 0).toBe(0);
  expect(afterHover?.rotationY).toBeCloseTo(initial?.rotationY ?? 0, 5);

  await page.mouse.move(projectedGlobe.centerX, projectedGlobe.centerY);
  await page.mouse.down();
  await page.mouse.move(projectedGlobe.centerX + 140, projectedGlobe.centerY + 20, {
    steps: 8,
  });
  await page.mouse.up();
  await page.waitForTimeout(150);

  const afterEarthDrag = await page.evaluate(() => window.__particleEarthDebug);
  expect(afterEarthDrag?.rotationY).not.toBeCloseTo(
    afterHover?.rotationY ?? initial?.rotationY ?? 0,
    4,
  );

  await page.mouse.move(40, 40);
  await page.mouse.down();
  await page.mouse.move(220, 80, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(150);

  const afterBackgroundDrag = await page.evaluate(() => window.__particleEarthDebug);
  expect(afterBackgroundDrag?.rotationY).not.toBe(afterEarthDrag?.rotationY);
  expect(afterBackgroundDrag?.cameraZ).toBe(initial?.cameraZ);

  await page.waitForTimeout(350);
  const afterInertia = await page.evaluate(() => window.__particleEarthDebug);
  expect(afterInertia?.rotationY).not.toBeCloseTo(afterBackgroundDrag?.rotationY ?? 0, 4);

  const naturalRotationX = initial?.rotationX ?? -0.18;
  await page.mouse.move(40, 40);
  await page.mouse.down();
  await page.mouse.move(80, 260, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(120);

  const afterTiltDrag = await page.evaluate(() => window.__particleEarthDebug);
  expect(Math.abs((afterTiltDrag?.rotationX ?? naturalRotationX) - naturalRotationX)).toBeGreaterThan(0.02);

  await page.waitForTimeout(900);
  const afterAxisReturn = await page.evaluate(() => window.__particleEarthDebug);
  expect(
    Math.abs((afterAxisReturn?.rotationX ?? naturalRotationX) - naturalRotationX),
  ).toBeLessThan(
    Math.abs((afterTiltDrag?.rotationX ?? naturalRotationX) - naturalRotationX),
  );
});
