/**
 * 上海话应用冒烟 — 只验真业务链路（不再把 runtime mock 算成功）
 */
import { api, fetchVoiceConfig, type VoiceClientConfig } from '../api/client'
import { homeT } from '../i18n/homeT'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

export interface ShanghaiSmokeResult {
  voice: VoiceClientConfig | null
  statusOk: boolean
  authOk: boolean
  voiceError?: string
  summary: string
  ok: boolean
}

function tr(t: TranslateFn | undefined, key: string, vars?: Record<string, string | number>): string {
  return t ? t(key, vars) : homeT(key, vars)
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
  const fail = tr(t, 'home.plaza.smoke.fail')
  const cfgVal = voiceOk
    ? tr(t, 'home.plaza.smoke.cfg_ok', {
      agent: voice!.agent_id,
      llm: voice!.llm_provider ?? 'llm',
    })
    : (voiceError || fail)
  const statusVal = statusOk ? tr(t, 'home.plaza.smoke.status_ok') : fail
  const authVal = authOk ? tr(t, 'home.plaza.smoke.auth_ok') : fail

  const summary = [
    tr(t, 'home.plaza.smoke.title'),
    tr(t, 'home.plaza.smoke.line.cfg', { v: cfgVal }),
    tr(t, 'home.plaza.smoke.line.status', { v: statusVal }),
    tr(t, 'home.plaza.smoke.line.auth', { v: authVal }),
    `· ${tr(t, 'home.plaza.smoke.next')}`,
  ].join('\n')

  return { voice, voiceError, statusOk, authOk, summary, ok }
}
