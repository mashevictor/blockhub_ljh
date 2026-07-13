import { test, expect } from '@playwright/test'
import { adminToken, apiGet, apiPost } from './helpers'

type BuildManifest = {
  capability_keys?: string[]
  web_pkgs?: string[]
  flutter_pkgs?: string[]
  widgets?: string[]
}

type PageSchema = {
  capability_keys?: string[]
  menu?: Array<{ key: string; label?: string }>
  root?: { children?: Array<{ props?: { widget?: string; capability_key?: string } }> }
}

/**
 * GA #9：按 capability_keys 裁剪 manifest + page_schema
 * 只勾 shanghai_voice → Web/App 契约仅含语音模块
 */
test.describe('GA#9 manifest crop', () => {
  test('voice-only publish yields voice manifest and schema', async () => {
    const token = await adminToken()
    const appName = `GA9-voice-${Date.now()}`

    const publish = await apiPost<{
      success: boolean
      app: { id: string }
      build_manifest?: BuildManifest
      page_schema?: PageSchema
    }>(
      '/creation/publish',
      {
        name: appName,
        industry_key: 'office',
        capability_keys: ['shanghai_voice'],
        deliver: 'both',
        source: 'module',
      },
      token,
    )

    expect(publish.success).toBe(true)
    const appId = publish.app.id
    expect(appId).toBeTruthy()

    const manifest = publish.build_manifest!
    expect(manifest.capability_keys).toEqual(['shanghai_voice'])
    expect(manifest.widgets).toEqual(['ShanghaiVoiceWidget'])
    expect(manifest.web_pkgs).toEqual(['@blockhub/web-capability-voice'])
    expect(manifest.flutter_pkgs).toEqual(['capability_shanghai_voice'])
    expect(manifest.web_pkgs).not.toContain('@blockhub/web-capability-chat')

    const schema = publish.page_schema!
    expect(schema.capability_keys).toEqual(['shanghai_voice'])
    expect(schema.menu?.length).toBe(1)
    expect(schema.menu?.[0]?.key).toBe('shanghai_voice')

    const children = schema.root?.children ?? []
    expect(children.length).toBe(1)
    expect(children[0]?.props?.widget).toBe('ShanghaiVoiceWidget')
    expect(children[0]?.props?.capability_key).toBe('shanghai_voice')

    const runtimeManifest = await apiGet<{ build_manifest: BuildManifest }>(
      `/runtime/${appId}/manifest`,
    )
    expect(runtimeManifest.build_manifest.capability_keys).toEqual(['shanghai_voice'])
    expect(runtimeManifest.build_manifest.web_pkgs).toEqual(['@blockhub/web-capability-voice'])

    const runtimeSchema = await apiGet<{ page_schema: PageSchema }>(`/runtime/${appId}/schema`)
    expect(runtimeSchema.page_schema.capability_keys).toEqual(['shanghai_voice'])
  })

  test('chat + voice publish yields two modules', async () => {
    const token = await adminToken()
    const appName = `GA9-dual-${Date.now()}`

    const publish = await apiPost<{
      success: boolean
      build_manifest?: BuildManifest
      page_schema?: PageSchema
    }>(
      '/creation/publish',
      {
        name: appName,
        industry_key: 'office',
        capability_keys: ['chat_qa', 'shanghai_voice'],
        deliver: 'both',
        source: 'module',
      },
      token,
    )

    const manifest = publish.build_manifest!
    expect(manifest.capability_keys).toEqual(['chat_qa', 'shanghai_voice'])
    expect(manifest.widgets).toEqual(['ChatWidget', 'ShanghaiVoiceWidget'])
    expect(manifest.web_pkgs?.sort()).toEqual(
      ['@blockhub/web-capability-chat', '@blockhub/web-capability-voice'].sort(),
    )

    const schema = publish.page_schema!
    expect(schema.menu?.length).toBe(2)
    expect(schema.menu?.map((m) => m.key)).toEqual(['chat_qa', 'shanghai_voice'])
  })
})
