import { test, expect } from '@playwright/test'
import { adminToken, apiPost, apiGet } from './helpers'

test.describe('custom capability review', () => {
  test('propose and approve flow', async () => {
    const token = await adminToken()
    const key = `e2e_cap_${Date.now()}`

    const proposed = await apiPost<{ success: boolean; item: { id: string; status: string } }>(
      '/creation/custom-capabilities',
      {
        key,
        name: 'E2E 测试能力',
        category: '自定义',
        description: 'Playwright 冒烟',
        keywords: ['e2e', 'test'],
      },
      token,
    )
    expect(proposed.success).toBe(true)
    expect(proposed.item.status).toBe('pending')

    const pending = await apiGet<{ items: Array<{ id: string; key: string }> }>(
      '/creation/custom-capabilities?status=pending',
      token,
    )
    expect(pending.items.some((i) => i.key === key)).toBe(true)

    const reviewed = await apiPost<{ success: boolean; item: { status: string } }>(
      `/creation/custom-capabilities/${proposed.item.id}/review`,
      { action: 'approve' },
      token,
    )
    expect(reviewed.success).toBe(true)
    expect(reviewed.item.status).toBe('approved')
  })
})
