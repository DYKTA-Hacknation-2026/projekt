import { defineConfig, devices } from "@playwright/test"

const webURL = "http://127.0.0.1:3100"
const apiURL = "http://127.0.0.1:3101"
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? webURL

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"]! },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        {
          command: "pnpm --filter api dev --port 3101",
          port: 3101,
          timeout: 120_000,
        },
        {
          command: "pnpm dev --hostname 127.0.0.1 --port 3100",
          url: webURL,
          env: { API_URL: apiURL },
          timeout: 120_000,
        },
      ],
})
