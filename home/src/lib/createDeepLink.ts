import type { ViewMode } from '../data/constants'

export interface CreateDeepLink {
  mode?: ViewMode
  pack?: string
  /** codecode 落地页模板 id，如 manufacturing */
  microsite?: string
}

/** 解析首页 #contact-create?mode=industry&pack=retail&microsite=manufacturing */
export function parseCreateDeepLink(): CreateDeepLink {
  const raw = window.location.hash.replace(/^#/, '')
  const qIdx = raw.indexOf('?')
  if (qIdx < 0) return {}
  const anchor = raw.slice(0, qIdx)
  if (anchor !== 'contact-create') return {}
  const params = new URLSearchParams(raw.slice(qIdx + 1))
  const mode = params.get('mode')
  const pack = params.get('pack') ?? undefined
  const microsite = params.get('microsite') ?? undefined
  if (mode === 'industry' || mode === 'module' || mode === 'prompt') {
    return { mode, pack, microsite }
  }
  return {}
}

/** 写入创建区深链，保留 mode / pack / microsite */
export function buildCreateDeepLinkHash(
  mode?: ViewMode,
  pack?: string,
  microsite?: string,
): string {
  const params = new URLSearchParams()
  if (mode && mode !== 'prompt') params.set('mode', mode)
  if (pack && mode === 'industry') params.set('pack', pack)
  if (microsite && mode === 'industry') params.set('microsite', microsite)
  const q = params.toString()
  return q ? `#contact-create?${q}` : '#contact-create'
}

/** 滚动到 contact-create 时保留已有 query */
export function preserveCreateHashOnScroll(anchorId: string): string {
  if (anchorId !== 'contact-create' && anchorId !== '#contact-create') {
    return anchorId.startsWith('#') ? anchorId : `#${anchorId}`
  }
  const { mode, pack, microsite } = parseCreateDeepLink()
  return buildCreateDeepLinkHash(mode, pack, microsite)
}
