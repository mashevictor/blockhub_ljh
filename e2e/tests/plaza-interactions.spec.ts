import { test, expect } from '@playwright/test'
import { adminToken, apiGet, apiPost } from './helpers'

test.describe('plaza like + comment (PG)', () => {
  test('toggle like and post comment via API', async () => {
    const token = await adminToken()
    const appName = `E2E-Plaza-${Date.now()}`

    const publish = await apiPost<{ app: { id: string } }>(
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
    const appId = publish.app.id

    await apiPost('/creation/plaza/publish', { app_id: appId, visibility: 'public' }, token)

    const like1 = await apiPost<{ liked: boolean; likes: number }>(
      `/creation/plaza/feed/${appId}/like`,
      { user_key: 'e2e-user-1' },
    )
    expect(like1.liked).toBe(true)
    expect(like1.likes).toBeGreaterThanOrEqual(1)

    const comment = await apiPost<{ id: string; comments: number }>(
      `/creation/plaza/feed/${appId}/comment`,
      { author: 'E2E', text: '自动化评论' },
    )
    expect(comment.id).toBeTruthy()
    expect(comment.comments).toBeGreaterThanOrEqual(1)

    const rows = await apiGet<{ items: Array<{ text: string }> }>(
      `/creation/plaza/feed/${appId}/comments`,
    )
    expect(rows.items.some((c) => c.text.includes('自动化'))).toBe(true)

    const feed = await apiGet<{ items: Array<{ appName?: string; likes?: number }> }>(
      '/creation/plaza/feed',
    )
    const row = feed.items.find((i) => i.appName === appName)
    expect(row).toBeTruthy()
    expect((row?.likes ?? 0) >= 1).toBe(true)
  })
})
