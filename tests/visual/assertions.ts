import { expect, type Locator, type Page } from '@playwright/test'

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

/** Wait until every requested gallery fixture reaches its target interaction state. */
export async function waitForGallery(page: Page): Promise<Locator> {
  const root = page.locator('#gallery')
  await expect(root).toHaveAttribute('data-gallery-ready', 'true')
  await page.evaluate(async () => document.fonts.ready)
  return root
}

/** Measure a rendered panel and assert viewport containment without orb overlap. */
export async function assertPanelGeometry(
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
