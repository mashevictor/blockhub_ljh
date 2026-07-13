import { test, expect } from '@playwright/test'
import { adminToken, apiGet, apiPost } from './helpers'

/**
 * P2：发布 App 交付时返回 apk_build_status，runtime config 可查询构建状态
 */
test.describe('publish → APK build status', () => {
  test('deliver=app enqueues build status in publish response', async () => {
    const token = await adminToken()
    const appName = `APK-${Date.now()}`

    const publish = await apiPost<{
      success: boolean
      app: { id: string }
      runtime?: {
        deliver?: string
        apk_ready?: boolean
        apk_build_status?: string
        download_url?: string
      }
    }>(
      '/creation/publish',
      {
        name: appName,
        industry_key: 'office',
        capability_keys: ['chat_qa'],
        deliver: 'app',
        source: 'module',
      },
      token,
    )

    expect(publish.success).toBe(true)
    const appId = publish.app.id
    expect(appId).toBeTruthy()
    expect(publish.runtime?.deliver).toBe('app')
    expect(publish.runtime?.download_url).toContain(`/r/${appId}/download`)

    const status = publish.runtime?.apk_build_status
    expect(['pending', 'building', 'ready', 'failed']).toContain(status)

    const config = await apiGet<{
      apk_ready?: boolean
      apk_build_status?: string
      download_url?: string
    }>(`/runtime/${appId}/config`)

    expect(config.apk_build_status).toBeTruthy()
    expect(config.download_url).toContain(`/download`)
  })
})
