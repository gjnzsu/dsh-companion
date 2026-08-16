import { createRequire } from 'node:module'

/** Minimal package-resolution operation used to follow declared dependencies. */
export interface PackageResolver {
  resolve(specifier: string): string
}

/** Resolved manifests along the declared `@playwright/test` dependency chain. */
export interface PlaywrightPackageChain {
  testManifest: string
  playwrightManifest: string
  coreManifest: string
}

/**
 * Resolve Playwright packages from the package that directly declares each dependency.
 * @param rootRequire - Resolver that can access the project's direct `@playwright/test` dependency.
 * @param requireAt - Creates a resolver anchored at a resolved package manifest.
 * @returns Manifest paths for the test runner, browser runner, and browser registry owner.
 */
export function resolvePlaywrightPackageChain(
  rootRequire: PackageResolver = createRequire(import.meta.url),
  requireAt: (anchor: string) => PackageResolver = createRequire,
): PlaywrightPackageChain {
  const testManifest = rootRequire.resolve('@playwright/test/package.json')
  const playwrightManifest = requireAt(testManifest).resolve('playwright/package.json')
  const coreManifest = requireAt(playwrightManifest).resolve('playwright-core/package.json')
  return { testManifest, playwrightManifest, coreManifest }
}
