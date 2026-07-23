import { test, expect } from '@playwright/test'
import { HOME_URL } from './helpers'

/**
 * D13 最后一格：Home 浏览器发布 UI（行业创建 → 联系方式 → Runtime）
 * 需可访问 Home SPA：E2E_HOME_URL=https://blockhub.club 或本地 5173
 */
test.describe('Home browser publish', () => {
  test('industry flow publishes app to runtime /r/{id}', async ({ page }) => {
    test.skip(!process.env.E2E_HOME_URL && !process.env.CI, 'set E2E_HOME_URL to run browser home publish test')
    test.skip(process.env.SKIP_HOME_E2E === '1', 'SKIP_HOME_E2E=1')

    const appName = `E2E-UI-${Date.now()}`
    const email = `e2e-ui-${Date.now()}@example.com`

    await page.goto(`${HOME_URL}/#contact-create?mode=industry&pack=office`)
    await expect(page.locator('#root')).toBeVisible({ timeout: 30_000 })

    await page.getByRole('heading', { name: '选择您的行业' }).scrollIntoViewIfNeeded()
    await page.getByRole('button', { name: '下一步：选择场景' }).click()
    await expect(page.getByText(/合计已选/)).toBeVisible({ timeout: 60_000 })

    await page.getByRole('button', { name: '下一步：选择受众' }).click()

    // 仅点行业视图内的按钮；应用名称在联系方式弹窗填写（避免与 SelectionBox 侧栏重复）
    await page.locator('.industry-view').getByRole('button', { name: '生成应用' }).click()

    const contactDialog = page.getByRole('dialog', { name: /留个联系方式/ })
    await expect(contactDialog).toBeVisible({ timeout: 10_000 })
    await contactDialog.locator('#contact-gate-appname').fill(appName)
    await contactDialog.getByLabel('电子邮箱').fill(email)
    await contactDialog.getByRole('button', { name: '生成应用' }).click()

    await expect(page).toHaveURL(/\/r\/[^/?#]+/, { timeout: 120_000 })
  })
})
