import { test } from '@playwright/test';

test('capture atmosphere render', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto('/');
  await page.waitForFunction(() => Boolean(window.__particleEarthDebug?.particleCount));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'output/playwright/atmosphere-check.png' });
});
