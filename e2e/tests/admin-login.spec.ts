import { test, expect } from '@playwright/test'
import { ADMIN_URL, adminToken, apiGet } from './helpers'

test.describe('Admin login + /me', () => {
  test('password login UI and /auth/me', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`)
    await page.getByRole('button', { name: '密码登录' }).click()
    await page.locator('input[type="email"], input[autocomplete="username"]').first().fill('admin@trackchat.local')
    await page.locator('input[type="password"]').fill('admin123')
    await page.getByRole('button', { name: '登录', exact: true }).click()
    await expect(page).toHaveURL(/\/(overview|agents|create|$)/, { timeout: 30_000 })

    const token = await adminToken()
    const me = await apiGet<{ email: string; role: string }>('/auth/me', token)
    expect(me.email).toBe('admin@trackchat.local')
    expect(me.role).toBe('admin')
  })
})
