import { test, expect } from '@playwright/test'
import { adminToken, apiPost, runtimeAppUrl } from './helpers'

/** D16：runtime-web 窄屏 H5 — 底部 Tab 导航与主内容可见（mobile-chrome 项目已设 Pixel 5 视口） */
test.describe('runtime-web mobile H5', () => {
  test('narrow viewport shows bottom nav and widget', async ({ page }) => {
    const token = await adminToken()
    const appName = `E2E-H5-${Date.now()}`

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
    await page.goto(runtimeAppUrl(appId))
    await page.locator('input[type="password"]').fill('emp123')
    await page.getByRole('button', { name: '登录' }).click()

    await expect(page.locator('.runtime-shell')).toBeVisible({ timeout: 30_000 })
    const nav = page.locator('.runtime-nav')
    await expect(nav).toBeVisible()
    await expect(nav).toHaveClass(/runtime-nav-mobile/)

    const box = await nav.boundingBox()
    expect(box).toBeTruthy()
    if (box) {
      expect(box.y + box.height).toBeGreaterThan(700)
    }

    await expect(page.locator('.runtime-main .widget, .runtime-main .chat-widget')).toBeVisible({
      timeout: 15_000,
    })
  })
})
