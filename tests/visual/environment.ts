/** Platform used to generate and compare the committed visual baselines. */
export const CANONICAL_PLATFORM = 'win32'

/** Playwright version whose browser registry owns the committed baselines. */
export const CANONICAL_PLAYWRIGHT_VERSION = '1.60.0'

/** Chromium revision declared by Playwright 1.60.0 for both browser distributions. */
export const CANONICAL_CHROMIUM_REVISION = '1223'

/** Runtime values that determine whether screenshot comparison is reproducible. */
export interface VisualEnvironment {
  platform: string
  playwrightVersion: string
  chromiumRevision: string
  geometryOnly: boolean
}

/**
 * Reject screenshot comparison outside the declared platform and exact browser toolchain.
 * @param environment - Runtime platform, package version, browser revision, and test mode.
 */
export function assertVisualEnvironment(environment: VisualEnvironment): void {
  if (environment.playwrightVersion !== CANONICAL_PLAYWRIGHT_VERSION
    || environment.chromiumRevision !== CANONICAL_CHROMIUM_REVISION) {
    throw new Error(
      `Canonical visual environment mismatch: expected @playwright/test ${CANONICAL_PLAYWRIGHT_VERSION} `
      + `with Chromium revision ${CANONICAL_CHROMIUM_REVISION}, received `
      + `@playwright/test ${environment.playwrightVersion} with Chromium revision ${environment.chromiumRevision}.`,
    )
  }
  if (!environment.geometryOnly && environment.platform !== CANONICAL_PLATFORM) {
    throw new Error(
      `Visual screenshots require canonical platform ${CANONICAL_PLATFORM}; received ${environment.platform}. `
      + 'Run geometry-only browser evidence with DSH_COMPANION_VISUAL_GEOMETRY_ONLY=1.',
    )
  }
}
