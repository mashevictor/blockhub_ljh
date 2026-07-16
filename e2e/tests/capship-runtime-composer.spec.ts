import { test, expect } from '@playwright/test'
import { adminToken, apiGet, apiPost, runtimeAppUrl } from './helpers'

async function apiPatch<T>(path: string, body: unknown, token: string): Promise<T> {
  const API = process.env.E2E_API_URL || 'http://127.0.0.1:8001/api/v1'
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`PATCH ${path} ${res.status}: ${await res.text()}`)
  }
  return res.json() as Promise<T>
}

test.describe('CapShip composer + industry runtime', () => {
  test('mfg full assembly exposes 12 scene menu entries', async () => {
    const assembly = await apiGet<{
      success: boolean
      assembly: { scene_count: number; menu_plan: Array<{ label: string }>; scenario_names: string[] }
    }>('/creation/industry/mfg/assembly')
    expect(assembly.success).toBeTruthy()
    expect(assembly.assembly.scene_count).toBe(12)
    expect(assembly.assembly.menu_plan.length).toBe(12)
    expect(assembly.assembly.scenario_names).toContain('设备报修')
  })

  test('industry publish → /r >> live_edit can patch schema menu', async ({ page }) => {
    const token = await adminToken()
    const appName = `E2E-Mfg-${Date.now()}`
    const publish = await apiPost<{
      success: boolean
      app: { id: string; page_schema?: { menu?: Array<{ label: string; key: string; route: string }> } }
    }>(
      '/creation/publish',
      {
        name: appName,
        industry_key: 'mfg',
        scenario_names: [],
        capability_keys: [],
        deliver: 'web',
        source: 'industry',
        assemble_full_scenes: true,
        web_template_id: 'tabs_portal',
      },
      token,
    )
    const appId = publish.app.id
    expect(appId).toBeTruthy()

    const schemaRes = await apiGet<{ page_schema: { menu: Array<{ label: string; key: string; route: string }> } }>(
      `/runtime/${appId}/schema`,
    )
    expect(schemaRes.page_schema.menu.length).toBeGreaterThanOrEqual(10)

    const menu = [...schemaRes.page_schema.menu]
    menu.push({
      key: 'scene_e2e_extra',
      label: 'E2E附加模块',
      route: '/s/e2e-extra',
    })
    const patched = await apiPatch<{ success: boolean; page_schema: { menu: Array<{ label: string }> } }>(
      `/runtime/${appId}/schema`,
      {
        page_schema: {
          ...schemaRes.page_schema,
          menu,
          root: {
            id: 'root',
            type: 'page',
            props: { layout: 'tabs' },
            children: menu.map((m) => ({
              id: m.key,
              type: 'section',
              props: { route: m.route, capability_key: 'chat_qa' },
            })),
          },
          capability_keys: ['chat_qa'],
          version: '1',
          appId,
          title: appName,
        },
      },
      token,
    )
    expect(patched.success).toBeTruthy()
    expect(patched.page_schema.menu.some((m) => m.label === 'E2E附加模块')).toBeTruthy()

    await page.goto(runtimeAppUrl(appId))
    await page.locator('input[type="password"]').fill('emp123')
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page.locator('.runtime-shell')).toBeVisible({ timeout: 30_000 })
    const dock = page.locator('.capship-capsule-dock')
    await expect(dock).toBeVisible({ timeout: 15_000 })
    if (await page.getByRole('button', { name: '打开 CapShip 编排' }).isVisible()) {
      await page.getByRole('button', { name: '打开 CapShip 编排' }).click()
    }
    await expect(page.getByRole('tab', { name: '对话改页' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '数据流' })).toBeVisible()
    await expect(page.getByRole('button', { name: '全屏' })).toBeVisible()
    await expect(page.getByRole('button', { name: '折叠悬浮框' })).toBeVisible()
    await expect(page.getByLabel('改页指令')).toBeVisible()
  })

  test('danmaku-style publish mounts composer dock', async ({ page }) => {
    const token = await adminToken()
    const appName = `E2E-Danmaku-${Date.now()}`
    const publish = await apiPost<{ success: boolean; app: { id: string } }>(
      '/creation/publish',
      {
        name: appName,
        industry_key: 'office',
        scenario_names: ['智能问答'],
        capability_keys: ['chat_qa', 'approval_flow'],
        deliver: 'web',
        source: 'prompt',
        assemble_full_scenes: false,
        web_template_id: 'tabs_portal',
      },
      token,
    )
    await page.goto(runtimeAppUrl(publish.app.id))
    await page.locator('input[type="password"]').fill('emp123')
    await page.getByRole('button', { name: '登录' }).click()
    await expect(page.locator('.capship-capsule-dock')).toBeVisible({
      timeout: 30_000,
    })
  })
})
