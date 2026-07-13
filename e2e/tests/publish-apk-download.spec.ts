import { test, expect } from '@playwright/test'
import { adminToken, apiGet, apiPost, BASE, pollApkReady, probeDownload } from './helpers'

/**
 * 批次 2 · M12：publish → 后台构建 → GET /download 200
 *
 * 环境变量:
 *   SKIP_APK_DOWNLOAD_E2E=1  — CI / 无 Flutter 时跳过
 *   E2E_APK_POLL_MS          — 最长等待（默认 30 分钟）
 *   E2E_APK_POLL_INTERVAL_MS — 轮询间隔（默认 10 秒）
 */
test.describe('publish → APK download 200', () => {
  test('deliver=app eventually serves APK download', async () => {
    test.skip(process.env.SKIP_APK_DOWNLOAD_E2E === '1', 'SKIP_APK_DOWNLOAD_E2E=1')

    const pollMs = Number(process.env.E2E_APK_POLL_MS || 30 * 60 * 1000)
    test.setTimeout(pollMs + 120_000)

    const token = await adminToken()
    const appName = `APK-DL-${Date.now()}`

    const publish = await apiPost<{
      success: boolean
      app: { id: string }
      runtime?: {
        deliver?: string
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

    const downloadPath = `/runtime/${appId}/download`
    const before = await probeDownload(downloadPath)
    expect([503, 404]).toContain(before.status)

    const finalInfo = await pollApkReady(appId, {
      timeoutMs: pollMs,
      intervalMs: Number(process.env.E2E_APK_POLL_INTERVAL_MS || 10_000),
    })

    expect(finalInfo.apk_ready).toBe(true)
    expect(finalInfo.apk_build_status).toBe('ready')

    const after = await probeDownload(downloadPath)
    expect(after.status).toBe(200)
    expect(after.contentType).toMatch(/application\/vnd\.android\.package-archive|application\/octet-stream/)
    expect(after.bytes).toBeGreaterThan(100_000)

    const config = await apiGet<{ apk_ready?: boolean; apk_build_status?: string }>(
      `/runtime/${appId}/config`,
    )
    expect(config.apk_ready).toBe(true)
    expect(config.apk_build_status).toBe('ready')

    // 日志提示（便于服务器排障）
    console.log(`APK ready: ${BASE}/api/v1${downloadPath} (${after.bytes} bytes)`)
  })
})
