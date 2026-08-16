import { expect, test } from '@playwright/test'

test('packed companion follows the selected official Web fixture session', async ({ page }) => {
  const companionErrors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error' && message.text().toLowerCase().includes('dsh-companion')) {
      companionErrors.push(message.text())
    }
  })

  await page.goto('/?fixture')
  await expect(page.getByRole('button', { name: /DSH Companion: idle/ })).toBeVisible()
  await expect(page.locator('.dsh-companion-root')).toHaveCount(1)

  // rc.5's read-only fixture cannot persist its otherwise blocking welcome
  // acknowledgement. Remove only that unrelated shell dialog so the smoke can
  // exercise ordinary pointer input on the assembled application underneath.
  const welcome = page.getByRole('dialog', { name: 'Internal Testing Notice' })
  if (await welcome.isVisible()) {
    await welcome.evaluate((dialog) => { dialog.parentElement?.remove() })
    await page.locator('#root').evaluate((root) => { root.inert = false })
  }

  const sessions = page.getByRole('tree', { name: 'Sessions' })
  const alpha = sessions.getByRole('treeitem', { name: /Waiting for answer Fixture 历史会话/ })
  await alpha.click()
  await expect(alpha).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: /DSH Companion: waiting/ })).toBeVisible()

  // The official fixture renders fx-beta immediately after its fx-alpha
  // parent; both beta and gamma intentionally share the fallback title.
  const beta = alpha.locator('xpath=following::*[@role="treeitem"][1]')
  await expect(beta).toContainText('fixture')
  await beta.click()
  await expect(page.getByRole('button', { name: /DSH Companion: idle/ })).toBeVisible()

  await alpha.click()
  await expect(alpha).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('button', { name: /DSH Companion: waiting/ })).toBeVisible()
  expect(companionErrors).toEqual([])
})
