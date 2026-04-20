import { defineConfig, devices } from "@playwright/test";

// Load .env.local for E2E credentials
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config({ path: ".env.local" });
} catch {
  // dotenv not available — env vars must be set externally
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup",
  fullyParallel: false, // tests share state via Convex — run sequentially per file
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: "list",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true, // reuse if already running (default for local dev)
    timeout: 120_000,
  },
});
