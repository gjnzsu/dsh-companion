import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assertVisualEnvironment,
  CANONICAL_CHROMIUM_REVISION,
  CANONICAL_PLATFORM,
  CANONICAL_PLAYWRIGHT_VERSION,
} from './visual/environment.ts'
import { resolvePlaywrightPackageChain, type PackageResolver } from './visual/playwright-packages.ts'

const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
  devDependencies?: Record<string, string>
}

describe('visual baseline environment', () => {
  afterEach(() => vi.unstubAllEnvs())

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

  it('resolves transitive Playwright packages from their declaring package locations', () => {
    const rootRequests: string[] = []
    const anchoredRequests: Array<[string, string]> = []
    const root: PackageResolver = {
      resolve(specifier) {
        rootRequests.push(specifier)
        if (specifier === '@playwright/test/package.json') return '/store/test/package.json'
        throw new Error(`root cannot resolve transitive package ${specifier}`)
      },
    }
    const packageRequires = new Map<string, PackageResolver>([
      ['/store/test/package.json', {
        resolve(specifier) {
          anchoredRequests.push(['/store/test/package.json', specifier])
          if (specifier === 'playwright/package.json') return '/store/playwright/package.json'
          throw new Error(`test package cannot resolve ${specifier}`)
        },
      }],
      ['/store/playwright/package.json', {
        resolve(specifier) {
          anchoredRequests.push(['/store/playwright/package.json', specifier])
          if (specifier === 'playwright-core/package.json') return '/store/playwright-core/package.json'
          throw new Error(`playwright package cannot resolve ${specifier}`)
        },
      }],
    ])

    expect(resolvePlaywrightPackageChain(root, anchor => packageRequires.get(anchor)!)).toEqual({
      testManifest: '/store/test/package.json',
      playwrightManifest: '/store/playwright/package.json',
      coreManifest: '/store/playwright-core/package.json',
    })
    expect(rootRequests).toEqual(['@playwright/test/package.json'])
    expect(anchoredRequests).toEqual([
      ['/store/test/package.json', 'playwright/package.json'],
      ['/store/playwright/package.json', 'playwright-core/package.json'],
    ])
  })

  it('loads the actual visual config through the installed dependency chain', async () => {
    vi.stubEnv('DSH_COMPANION_VISUAL_GEOMETRY_ONLY', '1')

    const config = (await import('../playwright.visual.config.ts')).default

    expect(config.testMatch).toBe('**/*.geometry.spec.ts')
  }, 20_000)
})
