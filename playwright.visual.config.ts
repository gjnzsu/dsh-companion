import { defineConfig } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { assertVisualEnvironment } from './tests/visual/environment.ts'

interface BrowserRegistry {
  browsers: Array<{ name: string; revision: string }>
}

const require = createRequire(import.meta.url)
const playwrightManifest = require('@playwright/test/package.json') as { version: string }
const playwrightCoreManifest = require.resolve('playwright-core/package.json')
const registry = JSON.parse(readFileSync(join(dirname(playwrightCoreManifest), 'browsers.json'), 'utf8')) as BrowserRegistry
const chromiumRevision = registry.browsers.find(browser => browser.name === 'chromium')?.revision
const headlessRevision = registry.browsers.find(browser => browser.name === 'chromium-headless-shell')?.revision
const geometryOnly = process.env.DSH_COMPANION_VISUAL_GEOMETRY_ONLY === '1'

assertVisualEnvironment({
  platform: process.platform,
  playwrightVersion: playwrightManifest.version,
  chromiumRevision: chromiumRevision === headlessRevision ? chromiumRevision ?? 'missing' : `${chromiumRevision}/${headlessRevision}`,
  geometryOnly,
})

export default defineConfig({
  testDir: './tests/visual',
  ...(geometryOnly ? { testMatch: '**/*.geometry.spec.ts' } : {}),
  outputDir: 'test-results/visual',
  retries: process.env.CI ? 1 : 0,
  reporter: 'line',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
  },
  webServer: {
    command: 'pnpm gallery',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
})
