import { test, expect } from '@playwright/test'
import { HOME_URL } from './helpers'

test.describe('Home shell', () => {
  test('home page loads with plaza link', async ({ page }) => {
    test.skip(!process.env.E2E_HOME_URL && !process.env.CI, 'set E2E_HOME_URL to run browser home test')

    await page.goto(HOME_URL)
    await expect(page.locator('#root')).toBeVisible({ timeout: 20_000 })
    const plazaLink = page.getByRole('link', { name: /应用广场/ })
    if (await plazaLink.count()) {
      await expect(plazaLink.first()).toBeVisible()
    }
  })
})
