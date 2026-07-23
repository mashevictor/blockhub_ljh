import { test, expect } from '@playwright/test'
import { adminToken, apiGet, apiPost } from './helpers'

/**
 * 全链路：发布应用 → runtime 契约 → 广场上架
 * 不依赖前端 SPA，直接验证 API 契约（CI / 冒烟友好）
 */
test.describe('publish → runtime → plaza', () => {
  test('API chain succeeds', async () => {
    const token = await adminToken()
    const appName = `E2E-${Date.now()}`

    const publish = await apiPost<{
      success: boolean
      app: { id: string; name: string }
      page_schema?: unknown
      build_manifest?: unknown
    }>(
      '/creation/publish',
      {
        name: appName,
        industry_key: 'office',
        scenario_names: ['制度政策问答'],
        deliver: 'both',
        source: 'industry',
      },
      token,
    )

    expect(publish.success).toBe(true)
    expect(publish.app?.id).toBeTruthy()
    expect(publish.page_schema).toBeTruthy()
    expect(publish.build_manifest).toBeTruthy()

    const appId = publish.app.id

    const runtime = await apiGet<{ public_id: string; deliver?: string }>(`/runtime/${appId}`)
    expect(runtime.public_id).toBeTruthy()

    const schema = await apiGet<{ page_schema: unknown }>(`/runtime/${appId}/schema`)
    expect(schema.page_schema).toBeTruthy()

    const manifest = await apiGet<{ build_manifest: { capability_keys?: string[] } }>(
      `/runtime/${appId}/manifest`,
    )
    expect(manifest.build_manifest).toBeTruthy()

    const plaza = await apiPost<{ success: boolean }>(
      '/creation/plaza/publish',
      { app_id: appId, visibility: 'public' },
      token,
    )
    expect(plaza.success).toBe(true)

    const feed = await apiGet<{ items: Array<{ appName?: string }> }>('/creation/plaza/feed')
    const names = (feed.items || []).map((i) => i.appName)
    expect(names).toContain(appName)
  })
})
