import { useEffect, useMemo, useState } from 'react'
import { useT, useI18n } from '@blockhub/i18n/react'
import {
  INDUSTRY_MICROSITE_TEMPLATES,
  getMicrositeTemplate,
  loadSavedMicrositeId,
  saveMicrositeId,
  type IndustryMicrositeTemplate,
} from '../../data/industryMicrositeTemplates'
import { buildIndustryMicrositeSrcDoc, type MicrositePreviewCopy } from '../../data/industryMicrositePreviewHtml'
import {
  MICROSITE_PREVIEW_CACHE_LIMIT,
  getCachedMicrositeIds,
  type MicrositeLoadState,
} from '../../data/industryMicrositePreviewCache'
import { msCacheHint, msChipBadge, msFrameBadge } from '../../i18n/micrositeStatus'
import { micrositeBrand, micrositeName, micrositeStyleLabel, micrositePreviewChrome } from '../../i18n/micrositeLabels'
import type { TranslateFn } from '../../i18n/industryLabels'

function localizedMicrositeTpl(t: TranslateFn, tpl: IndustryMicrositeTemplate): IndustryMicrositeTemplate {
  return {
    ...tpl,
    styleLabel: micrositeStyleLabel(t, tpl),
    brand: micrositeBrand(t, tpl),
    name: micrositeName(t, tpl),
  }
}

interface Props {
  packKey: string
  packName: string
  tagline: string
  overview: string
  highlights: string[]
  scenes: Array<{ name: string; detail?: string }>
  accent: string
  onCompose: (template: IndustryMicrositeTemplate) => void
}

export default function IndustryMicrositePreview({
  packKey,
  packName,
  tagline,
  overview,
  highlights,
  scenes,
  accent,
  onCompose,
}: Props) {
  const t = useT()
  const { locale } = useI18n()
  const [activeId, setActiveId] = useState(() => loadSavedMicrositeId(packKey))
  const [fading, setFading] = useState(false)
  const [ondemandBusy, setOndemandBusy] = useState(false)
  const [ondemandSrcDoc, setOndemandSrcDoc] = useState('')
  const [cssReady, setCssReady] = useState<Record<string, boolean>>({})
  /** 本会话内已点开并渲染完成的非预载模板 */
  const [sessionLoaded, setSessionLoaded] = useState<Set<string>>(() => new Set())
  const [sessionSrcDocs, setSessionSrcDocs] = useState<Record<string, string>>({})

  const cachedIds = useMemo(() => getCachedMicrositeIds(packKey), [packKey])
  const cachedSet = useMemo(() => new Set(cachedIds), [cachedIds])

  useEffect(() => {
    setActiveId(loadSavedMicrositeId(packKey))
    setOndemandSrcDoc('')
    setOndemandBusy(false)
    setSessionLoaded(new Set())
    setSessionSrcDocs({})
  }, [packKey])

  const copy = useMemo<MicrositePreviewCopy>(
    () => ({
      packKey,
      packName,
      tagline,
      overview,
      highlights,
      scenes,
      chrome: micrositePreviewChrome(t),
      lang: locale.startsWith('zh') ? 'zh-CN' : 'en',
    }),
    [packKey, packName, tagline, overview, highlights, scenes, t, locale],
  )

  const current = useMemo(
    () => getMicrositeTemplate(activeId) ?? INDUSTRY_MICROSITE_TEMPLATES[0],
    [activeId],
  )

  const cachedSrcDocs = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const map: Record<string, string> = {}
    for (const id of cachedIds) {
      const tpl = getMicrositeTemplate(id)
      if (tpl) map[id] = buildIndustryMicrositeSrcDoc(copy, localizedMicrositeTpl(t, tpl), origin)
    }
    return map
  }, [cachedIds, copy, t])

  /** 预取前 N 套 CSS，标记就绪 */
  useEffect(() => {
    if (typeof window === 'undefined') return
    const origin = window.location.origin
    let cancelled = false
    const controllers: AbortController[] = []

    cachedIds.forEach((id) => {
      const href = `${origin}/industry-microsites/${id}/style.css`
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'style'
      link.href = href
      link.dataset.bhMicrositePreload = id
      document.head.appendChild(link)

      const ac = new AbortController()
      controllers.push(ac)
      fetch(href, { signal: ac.signal, cache: 'force-cache' })
        .then(() => {
          if (!cancelled) setCssReady((prev) => ({ ...prev, [id]: true }))
        })
        .catch(() => {
          if (!cancelled) setCssReady((prev) => ({ ...prev, [id]: true }))
        })
    })

    return () => {
      cancelled = true
      controllers.forEach((c) => c.abort())
      document.querySelectorAll('link[data-bh-microsite-preload]').forEach((el) => el.remove())
    }
  }, [cachedIds])

  const activeCached = Boolean(current && cachedSet.has(current.id))

  const loadStateFor = (id: string): MicrositeLoadState => {
    if (cachedSet.has(id)) return 'cached'
    if (sessionLoaded.has(id)) return 'ready'
    if (id === activeId && ondemandBusy) return 'loading'
    return 'idle'
  }

  const markSessionLoaded = (id: string, srcDoc?: string) => {
    setSessionLoaded((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
    if (srcDoc) {
      setSessionSrcDocs((prev) => (prev[id] === srcDoc ? prev : { ...prev, [id]: srcDoc }))
    }
  }

  const handleSelect = (id: string) => {
    if (id === activeId) return
    const instant = cachedSet.has(id)
    const sessionHit = sessionSrcDocs[id]
    setFading(true)
    window.setTimeout(() => {
      setActiveId(id)
      saveMicrositeId(packKey, id)
      if (instant) {
        setOndemandBusy(false)
      } else if (sessionHit) {
        setOndemandSrcDoc(sessionHit)
        setOndemandBusy(false)
        markSessionLoaded(id)
      } else {
        setOndemandBusy(true)
        setOndemandSrcDoc('')
        const tpl = getMicrositeTemplate(id)
        if (tpl) {
          const origin = window.location.origin
          window.requestAnimationFrame(() => {
            const doc = buildIndustryMicrositeSrcDoc(copy, localizedMicrositeTpl(t, tpl), origin)
            setOndemandSrcDoc(doc)
            setSessionSrcDocs((prev) => ({ ...prev, [id]: doc }))
            // 保持 busy 直到 iframe onLoad，徽章同步为「加载中…」
          })
        } else {
          setOndemandBusy(false)
        }
      }
      setFading(false)
    }, instant || sessionHit ? 80 : 160)
  }

  // 首次进入若当前已是未缓存模板，补一次 on-demand
  useEffect(() => {
    if (!current || cachedSet.has(current.id)) return
    if (ondemandSrcDoc) return
    const hit = sessionSrcDocs[current.id]
    if (hit) {
      setOndemandSrcDoc(hit)
      return
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    setOndemandBusy(true)
    const doc = buildIndustryMicrositeSrcDoc(copy, localizedMicrositeTpl(t, current), origin)
    setOndemandSrcDoc(doc)
    setSessionSrcDocs((prev) => ({ ...prev, [current.id]: doc }))
    // 仅随 activeId / pack 变化补载；sessionSrcDocs 由本 effect 写入，勿放入 deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, packKey, current, cachedSet, copy, ondemandSrcDoc])

  if (!current) return null

  const activeState = loadStateFor(current.id)
  const cacheLabel = msCacheHint(t, activeState)

  return (
    <section className="industry-microsite-preview industry-site-section industry-site-panel">
      <div className="b2b-section-title industry-site-section-head">
        <span className="b2b-eyebrow">{t('home.industry.ms.eyebrow')}</span>
        <h2>{t('home.industry.ms.title', { name: packName })}</h2>
        <p>{t('home.industry.ms.lead', { name: packName, n: MICROSITE_PREVIEW_CACHE_LIMIT })}</p>
      </div>

      <div className="industry-microsite-toolbar">
        <label className="industry-microsite-select-label" htmlFor={`ms-select-${packKey}`}>
          {t('home.industry.ms.current')}
        </label>
        <select
          id={`ms-select-${packKey}`}
          className="industry-microsite-select"
          value={current.id}
          onChange={(e) => handleSelect(e.target.value)}
          style={{ borderColor: accent }}
        >
          {INDUSTRY_MICROSITE_TEMPLATES.map((tpl) => {
            const state = loadStateFor(tpl.id)
            const badge = msChipBadge(t, state, cssReady[tpl.id] !== false)
            return (
              <option key={tpl.id} value={tpl.id}>
                {state === 'idle' ? '○ ' : '● '}
                {micrositeStyleLabel(t, tpl)} · {packName}（{badge}）
              </option>
            )
          })}
        </select>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onCompose(current)}
        >
          {t('home.industry.ms.compose')}
        </button>
      </div>

      <p className="industry-microsite-cache-legend" role="status">
        <span className="industry-microsite-cache-pill is-cached">
          {t('home.industry.ms.cached', { a: cachedIds.length, b: MICROSITE_PREVIEW_CACHE_LIMIT })}
        </span>
        <span className="industry-microsite-cache-pill is-live">{cacheLabel}</span>
        {sessionLoaded.size > 0 ? (
          <span className="industry-microsite-cache-pill is-session">
            {t('home.industry.ms.session', { n: sessionLoaded.size })}
          </span>
        ) : null}
        {activeState === 'idle' ? (
          <span className="industry-microsite-cache-warn">{t('home.industry.ms.uncached_hint')}</span>
        ) : null}
        {activeState === 'loading' ? (
          <span className="industry-microsite-cache-warn">{t('home.industry.ms.loading')}</span>
        ) : null}
      </p>

      <div className="industry-microsite-picker" role="listbox" aria-label={t('home.industry.ms.aria')}>
        {INDUSTRY_MICROSITE_TEMPLATES.map((tpl) => {
          const state = loadStateFor(tpl.id)
          const cached = state === 'cached'
          const ready = state === 'ready' || state === 'loading'
          return (
            <button
              key={tpl.id}
              type="button"
              role="option"
              aria-selected={tpl.id === current.id}
              className={`industry-microsite-chip${tpl.id === current.id ? ' on' : ''}${cached ? ' is-cached' : ready ? ' is-session' : ' is-uncached'}`}
              onClick={() => handleSelect(tpl.id)}
              title={msCacheHint(t, state)}
              style={tpl.id === current.id ? { borderColor: accent, color: accent } : undefined}
            >
              <strong>{micrositeStyleLabel(t, tpl)}</strong>
              <span>{packName}</span>
              <em className="industry-microsite-chip-badge">
                {msChipBadge(t, state, cssReady[tpl.id] !== false)}
              </em>
            </button>
          )
        })}
      </div>

      <div className={`industry-microsite-frame-wrap${fading ? ' is-fading' : ''}`}>
        <div className="industry-microsite-frame-bar">
          <span>{t('home.industry.ms.pack_suffix', { name: packName })}</span>
          <span>
            {micrositeStyleLabel(t, current)}
            {msFrameBadge(t, {
              cached: activeCached,
              busy: ondemandBusy,
              sessionLoaded: sessionLoaded.has(current.id),
            })}
          </span>
        </div>

        <div className="industry-microsite-frame-stack">
          {cachedIds.map((id) => (
            <iframe
              key={`cache-${packKey}-${id}`}
              title={`${packName} · ${micrositeStyleLabel(t, getMicrositeTemplate(id) ?? current)}`}
              className={`industry-microsite-frame${activeId === id ? ' is-visible' : ' is-hidden'}`}
              srcDoc={cachedSrcDocs[id] || ''}
              sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
              loading={id === cachedIds[0] ? 'eager' : 'lazy'}
              aria-hidden={activeId !== id}
            />
          ))}
          {!activeCached ? (
            <iframe
              key={`ondemand-${packKey}-${current.id}`}
              title={`${packName} · ${micrositeStyleLabel(t, current)}`}
              className={`industry-microsite-frame is-visible${ondemandBusy ? ' is-loading' : ''}`}
              srcDoc={ondemandSrcDoc || sessionSrcDocs[current.id] || ''}
              sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
              loading="lazy"
              onLoad={() => {
                if (!ondemandSrcDoc && !sessionSrcDocs[current.id]) return
                setOndemandBusy(false)
                markSessionLoaded(current.id, ondemandSrcDoc || sessionSrcDocs[current.id])
              }}
            />
          ) : null}
          {ondemandBusy ? (
            <div className="industry-microsite-frame-loading" role="status">
              {t('home.industry.ms.generating')}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
