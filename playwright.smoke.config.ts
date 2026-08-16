import { randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { defineConfig } from '@playwright/test'

process.env.DSH_COMPANION_SMOKE_CONTROL = join(
  tmpdir(),
  `dsh-companion-smoke-control-${randomUUID()}.json`,
)

export default defineConfig({
  testDir: './tests/smoke',
  globalTeardown: './tests/smoke/global-teardown.ts',
  outputDir: 'test-results/smoke',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4174',
    browserName: 'chromium',
  },
  webServer: {
    command: 'node scripts/prepare-dsh-smoke.mjs',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
