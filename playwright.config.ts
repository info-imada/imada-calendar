import { defineConfig, devices } from "@playwright/test";

import { E2E_BASE_URL } from "./e2e/support/e2e-environment";

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  globalSetup: "./e2e/global-setup.ts",
  outputDir: "artifacts/e2e-rbac/test-results",
  reporter: [
    ["list"],
    ["html", { outputFolder: "artifacts/e2e-rbac/playwright-report", open: "never" }],
    ["json", { outputFile: "artifacts/e2e-rbac/results.json" }],
    ["junit", { outputFile: "artifacts/e2e-rbac/results.xml" }],
  ],
  use: {
    baseURL: E2E_BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm exec tsx scripts/run-e2e-server.ts",
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
