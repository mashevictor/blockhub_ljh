/**
 * 上海话应用冒烟：真 voice/config + runtime 模块 mock IN
 */
import { fetchVoiceConfig, type VoiceClientConfig } from '../api/client'
import { testFlowApi, type ApiTestResult, type FlowApiEndpoint } from './flowModuleApis'
import { SHANGHAI_VOICE_APP_ID } from './shanghaiVoiceProject'

function runtimeSlug(appKey: string): string {
  return appKey.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48) || 'app'
}

export function shanghaiModuleInputApi(appKey: string = SHANGHAI_VOICE_APP_ID): FlowApiEndpoint {
  const slug = runtimeSlug(appKey)
  return {
    method: 'POST',
    path: `/api/v1/runtime/${slug}/modules/shanghai-voice/input`,
    description: '上海话模块 IN（编排 mock）',
    sample_body: { demo: true, dialect: 'shanghai' },
  }
}

export function shanghaiIngressApi(appKey: string = SHANGHAI_VOICE_APP_ID): FlowApiEndpoint {
  const slug = runtimeSlug(appKey)
  return {
    method: 'POST',
    path: `/api/v1/runtime/${slug}/ingress/webhook`,
    description: '业务入口（编排 mock）',
    sample_body: { event: 'voice.demo', payload: { query: '侬好' } },
  }
}

export interface ShanghaiSmokeResult {
  voice: VoiceClientConfig | null
  voiceError?: string
  moduleIn: ApiTestResult | null
  summary: string
  ok: boolean
}

export async function runShanghaiVoiceSmoke(appKey: string = SHANGHAI_VOICE_APP_ID): Promise<ShanghaiSmokeResult> {
  let voice: VoiceClientConfig | null = null
  let voiceError: string | undefined
  try {
    voice = await fetchVoiceConfig()
  } catch (e) {
    voiceError = e instanceof Error ? e.message : String(e)
  }

  let moduleIn: ApiTestResult | null = null
  try {
    moduleIn = await testFlowApi(shanghaiModuleInputApi(appKey))
  } catch (e) {
    moduleIn = {
      ok: false,
      status: 0,
      body: e instanceof Error ? e.message : String(e),
      ms: 0,
    }
  }

  const voiceOk = Boolean(voice?.configured)
  const mockOk = Boolean(moduleIn?.ok)
  const summary =
    `【上海话冒烟】\n` +
    `· voice/config：${voiceOk ? `OK · ${voice!.agent_id} · ${voice!.llm_provider ?? 'llm'}` : voiceError || '未配置/失败'}\n` +
    `· 模块 IN mock：${mockOk ? `OK · HTTP ${moduleIn!.status}` : `失败 · ${moduleIn?.status ?? '-'}`}\n` +
    `· 下一步：打开网页开麦，或 >>「试一句侬好」`

  return {
    voice,
    voiceError,
    moduleIn,
    summary,
    ok: voiceOk && mockOk,
  }
}
