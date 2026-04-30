import { expect, test } from '@playwright/test';
import { PARTICLE_GLOBE_CONFIG } from '../src/config';
import { PROJECT_SIGNALS, RND_SIGNALS, WORKFLOW_ORBITS } from '../src/data/portfolioSignals';
import { getProjectedGlobeCircle, getResponsiveSceneMetrics } from '../src/lib/sceneLayout';

const TEST_THUMBNAILS = PROJECT_SIGNALS.map((signal, index) => ({
  slug: signal.slug,
  title: `Project ${index + 1}`,
}));

test('renders the particle earth, idly rotates, and allows drag rotation from the globe surface', async ({ page }) => {
  await page.goto('/?embed=1');
  await page.waitForFunction(() => {
    return Boolean(window.__particleEarthDebug?.particleCount);
  });

  const initial = await page.evaluate(() => window.__particleEarthDebug);
  expect(initial?.particleCount ?? 0).toBeGreaterThan(1000);
  expect(initial?.cityBeaconCount ?? 0).toBeGreaterThan(10);
  expect(initial?.projectSignalCount).toBe(PROJECT_SIGNALS.length);
  expect(initial?.rndSignalCount).toBe(RND_SIGNALS.length);
  expect(initial?.workflowOrbitCount).toBe(WORKFLOW_ORBITS.length);
  expect(initial?.homeBasePulseCount).toBe(1);
  expect(initial?.signalLayerInteracting).toBe(false);
  expect(initial?.projectThumbnailCount).toBe(0);
  expect(initial?.sceneActive).toBe(true);

  await page.evaluate(() => {
    window.postMessage(
      {
        type: 'particle-earth:visibility',
        active: false,
      },
      window.location.origin,
    );
  });
  await page.waitForFunction(() => window.__particleEarthDebug?.sceneActive === false);
  const paused = await page.evaluate(() => window.__particleEarthDebug);
  await page.waitForTimeout(250);
  const afterPaused = await page.evaluate(() => window.__particleEarthDebug);
  expect(afterPaused?.rotationY ?? 0).toBeCloseTo(paused?.rotationY ?? 0, 4);

  await page.evaluate(() => {
    window.postMessage(
      {
        type: 'particle-earth:visibility',
        active: true,
      },
      window.location.origin,
    );
  });
  await page.waitForFunction(() => window.__particleEarthDebug?.sceneActive === true);

  await page.evaluate((projects) => {
    const testWindow = window as Window & { __particleEarthLastOpen?: string | null };
    testWindow.__particleEarthLastOpen = null;
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'particle-earth:open-project') {
        testWindow.__particleEarthLastOpen = event.data.slug;
      }
    });
    window.postMessage(
      {
        type: 'particle-earth:project-thumbnails',
        projects,
      },
      window.location.origin,
    );
  }, TEST_THUMBNAILS);
  await page.waitForFunction(
    (expectedCount) => window.__particleEarthDebug?.projectThumbnailCount === expectedCount,
    TEST_THUMBNAILS.length,
  );
  const firstProjectButton = page.getByRole('button', { name: 'Open Project 1' });
  await expect(firstProjectButton).toBeVisible();
  await firstProjectButton.evaluate((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error('Expected the project thumbnail target to be a button.');
    }

    button.click();
  });
  await page.waitForFunction(() => {
    const testWindow = window as Window & { __particleEarthLastOpen?: string | null };
    return testWindow.__particleEarthLastOpen === 'cinder';
  });
  await page.waitForTimeout(350);

  const afterIdleRotation = await page.evaluate(() => window.__particleEarthDebug);
  expect(afterIdleRotation?.rotationY).not.toBeCloseTo(initial?.rotationY ?? 0, 4);

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
  expect(afterHover?.rotationY).not.toBeCloseTo(afterIdleRotation?.rotationY ?? 0, 4);

  await page.mouse.move(projectedGlobe.centerX, projectedGlobe.centerY);
  await page.mouse.down();
  await page.mouse.move(projectedGlobe.centerX + 140, projectedGlobe.centerY + 20, {
    steps: 8,
  });
  await page.waitForFunction(() => window.__particleEarthDebug?.signalLayerInteracting === true);
  const duringEarthDrag = await page.evaluate(() => window.__particleEarthDebug);
  expect(duringEarthDrag?.signalLayerInteracting).toBe(true);
  await page.mouse.up();
  await page.waitForFunction(() => window.__particleEarthDebug?.signalLayerInteracting === false);
  await page.waitForTimeout(150);

  const afterEarthDrag = await page.evaluate(() => window.__particleEarthDebug);
  expect(afterEarthDrag?.rotationY).not.toBeCloseTo(
    afterHover?.rotationY ?? afterIdleRotation?.rotationY ?? initial?.rotationY ?? 0,
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

test('keeps mobile portfolio signals uncapped and tuned for phone density', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?embed=1&mobile=1');
  await page.waitForFunction(() => {
    return Boolean(window.__particleEarthDebug?.particleCount);
  });

  const initial = await page.evaluate(() => window.__particleEarthDebug);
  expect(initial?.projectSignalCount).toBe(PROJECT_SIGNALS.length);
  expect(initial?.workflowOrbitCount).toBe(WORKFLOW_ORBITS.length);

  await page.evaluate((projects) => {
    window.postMessage(
      {
        type: 'particle-earth:project-thumbnails',
        projects,
      },
      window.location.origin,
    );
  }, TEST_THUMBNAILS);
  await page.waitForFunction(
    (expectedCount) => window.__particleEarthDebug?.projectThumbnailCount === expectedCount,
    TEST_THUMBNAILS.length,
  );

  await expect(page.getByRole('button', { name: /Open Project/ })).toHaveCount(
    TEST_THUMBNAILS.length,
  );

  const dotBackground = await page.locator('[data-testid="scene-frame"]').evaluate((element) => {
    return window.getComputedStyle(element, '::before').backgroundImage;
  });
  expect(dotBackground).toContain('0.075');

  const touchAction = await page.locator('[data-testid="scene-frame"]').evaluate((element) => {
    return window.getComputedStyle(element).touchAction;
  });
  expect(touchAction).toBe('pan-y');
});
