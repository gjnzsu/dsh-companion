import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  assertVisualEnvironment,
  CANONICAL_CHROMIUM_REVISION,
  CANONICAL_PLATFORM,
  CANONICAL_PLAYWRIGHT_VERSION,
} from './visual/environment.ts'

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  devDependencies?: Record<string, string>
}

describe('visual baseline environment', () => {
  it('pins the canonical Playwright version in package metadata', () => {
    expect(manifest.devDependencies?.['@playwright/test']).toBe(CANONICAL_PLAYWRIGHT_VERSION)
  })

  it('accepts the declared Windows Playwright and Chromium toolchain', () => {
    expect(() => assertVisualEnvironment({
      platform: CANONICAL_PLATFORM,
      playwrightVersion: CANONICAL_PLAYWRIGHT_VERSION,
      chromiumRevision: CANONICAL_CHROMIUM_REVISION,
      geometryOnly: false,
    })).not.toThrow()
  })

  it('rejects screenshot comparison outside the canonical platform before baseline lookup', () => {
    expect(() => assertVisualEnvironment({
      platform: 'linux',
      playwrightVersion: CANONICAL_PLAYWRIGHT_VERSION,
      chromiumRevision: CANONICAL_CHROMIUM_REVISION,
      geometryOnly: false,
    })).toThrow(/Visual screenshots require canonical platform win32/)
  })

  it('allows geometry-only browser evidence on another platform', () => {
    expect(() => assertVisualEnvironment({
      platform: 'linux',
      playwrightVersion: CANONICAL_PLAYWRIGHT_VERSION,
      chromiumRevision: CANONICAL_CHROMIUM_REVISION,
      geometryOnly: true,
    })).not.toThrow()
  })

  it.each([
    ['Playwright', '1.61.0', CANONICAL_CHROMIUM_REVISION],
    ['Chromium', CANONICAL_PLAYWRIGHT_VERSION, '1228'],
  ])('rejects a mismatched %s toolchain', (_name, playwrightVersion, chromiumRevision) => {
    expect(() => assertVisualEnvironment({
      platform: CANONICAL_PLATFORM,
      playwrightVersion,
      chromiumRevision,
      geometryOnly: false,
    })).toThrow(/Canonical visual environment mismatch/)
  })
})
