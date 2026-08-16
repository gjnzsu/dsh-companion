import { requestRecordedSmokeCleanup } from '../../scripts/prepare-dsh-smoke.mjs'

/** Ask the preparer to stop so it removes its Web process and isolated home. */
export default async function globalTeardown(): Promise<void> {
  await requestRecordedSmokeCleanup({ statePath: process.env.DSH_COMPANION_SMOKE_CONTROL })
}
