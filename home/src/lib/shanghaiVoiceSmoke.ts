/**
 * 上海话应用冒烟 — 只验真业务链路（不再把 runtime mock 算成功）
 */
import { api, fetchVoiceConfig, type VoiceClientConfig } from '../api/client'

export interface ShanghaiSmokeResult {
  voice: VoiceClientConfig | null
  statusOk: boolean
  authOk: boolean
  voiceError?: string
  summary: string
  ok: boolean
}

export async function runShanghaiVoiceSmoke(): Promise<ShanghaiSmokeResult> {
  let voice: VoiceClientConfig | null = null
  let voiceError: string | undefined
  let statusOk = false
  let authOk = false

  try {
    voice = await fetchVoiceConfig()
  } catch (e) {
    voiceError = e instanceof Error ? e.message : String(e)
  }

  try {
    const st = await api.get<{ configured?: boolean }>('/voice/status')
    statusOk = Boolean(st.data?.configured)
  } catch {
    statusOk = false
  }

  try {
    const auth = await api.get<{ ok?: boolean }>('/voice/auth-probe')
    authOk = Boolean(auth.data?.ok)
  } catch {
    authOk = false
  }

  const voiceOk = Boolean(voice?.configured)
  const ok = voiceOk && statusOk && authOk
  const summary =
    `【上海话真链路冒烟】\n` +
    `· voice/config：${voiceOk ? `OK · ${voice!.agent_id} · ${voice!.llm_provider ?? 'llm'}` : voiceError || '失败'}\n` +
    `· voice/status：${statusOk ? 'OK · TELEAI 已配置' : '失败'}\n` +
    `· voice/auth-probe：${authOk ? 'OK · ASR 握手成功' : '失败'}\n` +
    `· 下一步：网页输入文字或点例句 → 听 TTS；App 开麦走完整 ASR`

  return { voice, voiceError, statusOk, authOk, summary, ok }
}
