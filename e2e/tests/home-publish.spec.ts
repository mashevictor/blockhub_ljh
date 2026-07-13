import { test, expect } from '@playwright/test'
import { HOME_URL } from './helpers'

/**
 * D13 最后一格：Home 浏览器发布 UI（行业创建 → 联系方式 → 我的应用）
 * 需可访问 Home SPA：E2E_HOME_URL=http://101.32.209.251 或本地 5173
 */
test.describe('Home browser publish', () => {
  test('industry flow publishes app to plaza/my', async ({ page }) => {
    test.skip(!process.env.E2E_HOME_URL && !process.env.CI, 'set E2E_HOME_URL to run browser home publish test')

    const appName = `E2E-UI-${Date.now()}`
    const email = `e2e-ui-${Date.now()}@example.com`

    await page.goto(`${HOME_URL}/#contact-create?mode=industry&pack=office`)
    await expect(page.locator('#root')).toBeVisible({ timeout: 30_000 })

    await page.getByRole('heading', { name: '选择您的行业' }).scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: '下一步：选择场景' }).click()
    await expect(page.getByText(/合计已选/)).toBeVisible({ timeout: 60_000 })

    await page.getByRole('button', { name: '下一步：选择受众' }).click()

    await page.getByLabel('应用名称').fill(appName)
    await page.getByRole('button', { name: '生成应用' }).first().click()

    const contactDialog = page.getByRole('dialog', { name: /留个联系方式/ })
    await expect(contactDialog).toBeVisible({ timeout: 10_000 })
    await page.getByLabel('电子邮箱').fill(email)
    await contactDialog.getByRole('button', { name: '生成应用' }).click()

    await expect(page).toHaveURL(/\/plaza\/my/, { timeout: 120_000 })
    await expect(page.getByRole('heading', { name: /我的应用/ })).toBeVisible()
    await expect(page.getByText('发布成功，已保存到「我的应用」')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(appName)).toBeVisible()
    await expect(page.getByText('刚发布')).toBeVisible()
  })
})
