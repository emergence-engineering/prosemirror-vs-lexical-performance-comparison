import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration.
 */

const TIMEOUT = process.env.TIMEOUT ? Number(process.env.TIMEOUT) : 30000;
const GLOBALTIMEOUT = process.env.GLOBALTIMEOUT
  ? Number(process.env.GLOBALTIMEOUT)
  : 60000;

export default defineConfig({
  timeout: TIMEOUT,
  globalTimeout: GLOBALTIMEOUT,

  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    headless: true,
    actionTimeout: 2 * 60 * 1000,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  /* Run your local dev server before starting the tests */
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});