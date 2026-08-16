import { expect, test } from '@playwright/test'
import { assertPanelGeometry, waitForGallery } from './assertions.ts'

const cases = [
  ['desktop-light-closed', 1280, 900, 'light', 'normal', 'closed'],
  ['desktop-light-pinned', 1280, 900, 'light', 'normal', 'pinned'],
  ['desktop-dark-closed', 1280, 900, 'dark', 'normal', 'closed'],
  ['desktop-dark-pinned', 1280, 900, 'dark', 'normal', 'pinned'],
  ['compact-dark-pinned', 390, 844, 'dark', 'normal', 'pinned'],
  ['compact-light-reduced', 390, 844, 'light', 'reduced', 'closed'],
] as const

for (const [name, width, height, theme, motion, open] of cases) {
  test(`${name} visual state matrix`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-08-16T03:00:00.000Z'))
    await page.setViewportSize({ width, height })
    await page.emulateMedia({ reducedMotion: motion === 'reduced' ? 'reduce' : 'no-preference' })
    await page.goto(`/?theme=${theme}&motion=${motion}&open=${open}`)
    const root = await waitForGallery(page)

    await expect(root.locator('[data-scenario-id]')).toHaveCount(7)
    if (open === 'pinned') {
      for (const card of await root.locator('[data-scenario-id]').all()) await assertPanelGeometry(card)
    }
    await expect(root).toHaveScreenshot(`${name}.png`, {
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    })
  })
}
