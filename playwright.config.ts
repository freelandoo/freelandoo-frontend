import { defineConfig, devices } from "@playwright/test"

/**
 * Config do Playwright para o teste de regressão de links públicos.
 *
 * Por padrão sobe o servidor de desenvolvimento (`npm run dev`) e testa contra
 * http://localhost:3000. Defina PLAYWRIGHT_BASE_URL para apontar para um deploy
 * (ex.: preview do Vercel) e o webServer é ignorado.
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000"
const useExternal = !!process.env.PLAYWRIGHT_BASE_URL

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: useExternal
    ? undefined
    : {
        command: "npm run dev",
        url: BASE_URL,
        timeout: 120_000,
        reuseExistingServer: true,
      },
})
