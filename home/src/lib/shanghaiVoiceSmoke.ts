/**
 * 上海话应用冒烟 — 只验真业务链路（不再把 runtime mock 算成功）
 */
import { api, fetchVoiceConfig, type VoiceClientConfig } from '../api/client'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

export interface ShanghaiSmokeResult {
  voice: VoiceClientConfig | null
  statusOk: boolean
  authOk: boolean
  voiceError?: string
  summary: string
  ok: boolean
}

export async function runShanghaiVoiceSmoke(t?: TranslateFn): Promise<ShanghaiSmokeResult> {
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
  const fail = t ? t('home.plaza.smoke.fail') : '失败'
  const cfgVal = voiceOk
    ? (t
      ? t('home.plaza.smoke.cfg_ok', {
        agent: voice!.agent_id,
        llm: voice!.llm_provider ?? 'llm',
      })
      : `OK · ${voice!.agent_id} · ${voice!.llm_provider ?? 'llm'}`)
    : (voiceError || fail)
  const statusVal = statusOk
    ? (t ? t('home.plaza.smoke.status_ok') : 'OK · TELEAI 已配置')
    : fail
  const authVal = authOk
    ? (t ? t('home.plaza.smoke.auth_ok') : 'OK · ASR 握手成功')
    : fail

  const summary = t
    ? [
      t('home.plaza.smoke.title'),
      t('home.plaza.smoke.line.cfg', { v: cfgVal }),
      t('home.plaza.smoke.line.status', { v: statusVal }),
      t('home.plaza.smoke.line.auth', { v: authVal }),
      `· ${t('home.plaza.smoke.next')}`,
    ].join('\n')
    : (
      `【上海话真链路冒烟】\n` +
      `· voice/config：${cfgVal}\n` +
      `· voice/status：${statusVal}\n` +
      `· voice/auth-probe：${authVal}\n` +
      `· 下一步：网页输入文字或点例句 → 听 TTS；App 开麦走完整 ASR`
    )

  return { voice, voiceError, statusOk, authOk, summary, ok }
}
