import { test } from '@playwright/test'
import { assertPanelGeometry, waitForGallery } from './assertions.ts'

const placements = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const

for (const placement of placements) {
  test(`popover rectangle remains contained at ${placement}`, async ({ page }) => {
    const viewport = { width: 800, height: 600 }
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/?theme=dark&motion=reduced&open=pinned&geometry=${placement}`)
    const root = await waitForGallery(page)

    await assertPanelGeometry(root, viewport)
  })
}

test('popover rectangle remains contained in the compact viewport', async ({ page }) => {
  const viewport = { width: 390, height: 844 }
  await page.setViewportSize(viewport)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?theme=light&motion=reduced&open=pinned&geometry=bottom-right')
  const root = await waitForGallery(page)

  await assertPanelGeometry(root, viewport)
})
