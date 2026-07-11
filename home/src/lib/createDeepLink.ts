import type { ViewMode } from '../data/constants'

export interface CreateDeepLink {
  mode?: ViewMode
  pack?: string
}

/** 解析首页 #contact-create?mode=industry&pack=retail 深链参数 */
export function parseCreateDeepLink(): CreateDeepLink {
  const raw = window.location.hash.replace(/^#/, '')
  const qIdx = raw.indexOf('?')
  if (qIdx < 0) return {}
  const anchor = raw.slice(0, qIdx)
  if (anchor !== 'contact-create') return {}
  const params = new URLSearchParams(raw.slice(qIdx + 1))
  const mode = params.get('mode')
  const pack = params.get('pack') ?? undefined
  if (mode === 'industry' || mode === 'module' || mode === 'prompt') {
    return { mode, pack }
  }
  return {}
}
