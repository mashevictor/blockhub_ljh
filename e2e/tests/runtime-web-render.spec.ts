import { test, expect } from '@playwright/test'
import { adminToken, apiPost, runtimeAppUrl } from './helpers'

test.describe('runtime-web /r/:appId render', () => {
  test('login shell renders capability widget', async ({ page }) => {
    const token = await adminToken()
    const appName = `E2E-Runtime-${Date.now()}`

    const publish = await apiPost<{
      success: boolean
      app: { id: string }
    }>(
      '/creation/publish',
      {
        name: appName,
        industry_key: 'office',
        scenario_names: ['制度政策问答'],
        capability_keys: ['chat_qa'],
        deliver: 'web',
        source: 'industry',
      },
      token,
    )

    const appId = publish.app.id
    expect(appId).toBeTruthy()

    await page.goto(runtimeAppUrl(appId))
    await expect(page.getByRole('heading', { name: '员工端登录' })).toBeVisible()

    await page.locator('input[type="password"]').fill('emp123')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page.locator('.runtime-shell')).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('.runtime-main .widget, .runtime-main .chat-widget')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { level: 1 })).toContainText(appName)
  })
})
