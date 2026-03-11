import { defineConfig, devices } from '@playwright/test';

const devServerCommand =
  process.platform === 'win32'
    ? 'npm.cmd run dev -- --host 127.0.0.1 --port 4174'
    : 'npm run dev -- --host 127.0.0.1 --port 4174';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:4174',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: devServerCommand,
    port: 4174,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
