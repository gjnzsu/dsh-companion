import { expect, test, type Locator, type Page } from '@playwright/test'

const cases = [
  ['desktop-light-closed', 1280, 900, 'light', 'normal', 'closed'],
  ['desktop-light-pinned', 1280, 900, 'light', 'normal', 'pinned'],
  ['desktop-dark-closed', 1280, 900, 'dark', 'normal', 'closed'],
  ['desktop-dark-pinned', 1280, 900, 'dark', 'normal', 'pinned'],
  ['compact-dark-pinned', 390, 844, 'dark', 'normal', 'pinned'],
  ['compact-light-reduced', 390, 844, 'light', 'reduced', 'closed'],
] as const

const placements = ['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const

interface Rectangle {
  left: number
  right: number
  top: number
  bottom: number
}

function rectanglesOverlap(first: Rectangle, second: Rectangle): boolean {
  return first.left < second.right
    && first.right > second.left
    && first.top < second.bottom
    && first.bottom > second.top
}

async function waitForGallery(page: Page): Promise<Locator> {
  const root = page.locator('#gallery')
  await expect(root).toHaveAttribute('data-gallery-ready', 'true')
  await page.evaluate(async () => document.fonts.ready)
  return root
}

async function assertPanelGeometry(
  scope: Locator,
  viewport?: { width: number; height: number },
): Promise<void> {
  const bounds = await scope.evaluate((element, useStage) => {
    const orb = element.querySelector<HTMLElement>('.dsh-companion-orb')
    const panel = element.querySelector<HTMLElement>('.dsh-companion-popover')
    if (orb === null || panel === null) throw new Error('Expected an open orb and popover')
    const viewportElement = useStage
      ? element.querySelector<HTMLElement>('.gallery-stage')
      : null
    const viewportRect = viewportElement?.getBoundingClientRect()
    const toRectangle = (rect: DOMRect): Rectangle => ({
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
    })
    return {
      orb: toRectangle(orb.getBoundingClientRect()),
      panel: toRectangle(panel.getBoundingClientRect()),
      viewport: viewportRect === undefined
        ? null
        : toRectangle(viewportRect),
    }
  }, viewport === undefined)

  const viewportBounds = viewport !== undefined
    ? { left: 0, top: 0, right: viewport.width, bottom: viewport.height }
    : bounds.viewport!
  expect(bounds.panel.left).toBeGreaterThanOrEqual(viewportBounds.left + 16)
  expect(bounds.panel.right).toBeLessThanOrEqual(viewportBounds.right - 16)
  expect(bounds.panel.top).toBeGreaterThanOrEqual(viewportBounds.top + 16)
  expect(bounds.panel.bottom).toBeLessThanOrEqual(viewportBounds.bottom - 16)
  expect(rectanglesOverlap(bounds.orb, bounds.panel)).toBe(false)
}

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
