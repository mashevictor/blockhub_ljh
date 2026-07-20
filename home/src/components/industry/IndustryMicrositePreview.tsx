import { useEffect, useMemo, useState } from 'react'
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
  micrositeCacheHint,
} from '../../data/industryMicrositePreviewCache'

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
  const [activeId, setActiveId] = useState(() => loadSavedMicrositeId(packKey))
  const [fading, setFading] = useState(false)
  const [ondemandBusy, setOndemandBusy] = useState(false)
  const [ondemandSrcDoc, setOndemandSrcDoc] = useState('')
  const [cssReady, setCssReady] = useState<Record<string, boolean>>({})

  const cachedIds = useMemo(() => getCachedMicrositeIds(packKey), [packKey])
  const cachedSet = useMemo(() => new Set(cachedIds), [cachedIds])

  useEffect(() => {
    setActiveId(loadSavedMicrositeId(packKey))
    setOndemandSrcDoc('')
    setOndemandBusy(false)
  }, [packKey])

  const copy = useMemo<MicrositePreviewCopy>(
    () => ({ packKey, packName, tagline, overview, highlights, scenes }),
    [packKey, packName, tagline, overview, highlights, scenes],
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
      if (tpl) map[id] = buildIndustryMicrositeSrcDoc(copy, tpl, origin)
    }
    return map
  }, [cachedIds, copy])

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

  const handleSelect = (id: string) => {
    if (id === activeId) return
    const instant = cachedSet.has(id)
    setFading(true)
    window.setTimeout(() => {
      setActiveId(id)
      saveMicrositeId(packKey, id)
      if (!instant) {
        setOndemandBusy(true)
        setOndemandSrcDoc('')
        const tpl = getMicrositeTemplate(id)
        if (tpl) {
          const origin = window.location.origin
          // 下一帧写入，让「未预载」提示先出现
          window.requestAnimationFrame(() => {
            setOndemandSrcDoc(buildIndustryMicrositeSrcDoc(copy, tpl, origin))
            setOndemandBusy(false)
          })
        } else {
          setOndemandBusy(false)
        }
      } else {
        setOndemandBusy(false)
      }
      setFading(false)
    }, instant ? 80 : 160)
  }

  // 首次进入若当前已是未缓存模板，补一次 on-demand
  useEffect(() => {
    if (!current || cachedSet.has(current.id)) return
    if (ondemandSrcDoc) return
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    setOndemandSrcDoc(buildIndustryMicrositeSrcDoc(copy, current, origin))
  }, [current, cachedSet, copy, ondemandSrcDoc])

  if (!current) return null

  const cacheLabel = micrositeCacheHint(activeCached)

  return (
    <section className="industry-microsite-preview industry-site-section industry-site-panel">
      <div className="b2b-section-title industry-site-section-head">
        <span className="b2b-eyebrow">网页模板 · 可切换预览</span>
        <h2>
          {packName} · <em>20 套</em> 视觉模板
        </h2>
        <p>
          正文固定为「{packName}」行业方案文案；切换模板只改版式与视觉气质。
          前 {MICROSITE_PREVIEW_CACHE_LIMIT} 套已预载，点击即可切换；其余模板点选后即时生成。
        </p>
      </div>

      <div className="industry-microsite-toolbar">
        <label className="industry-microsite-select-label" htmlFor={`ms-select-${packKey}`}>
          当前视觉模板
        </label>
        <select
          id={`ms-select-${packKey}`}
          className="industry-microsite-select"
          value={current.id}
          onChange={(e) => handleSelect(e.target.value)}
          style={{ borderColor: accent }}
        >
          {INDUSTRY_MICROSITE_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>
              {cachedSet.has(t.id) ? '● ' : '○ '}
              {t.styleLabel} · {packName}
              {cachedSet.has(t.id) ? '（已预载）' : '（未预载）'}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-primary"
          onClick={() => onCompose(current)}
        >
          用此模板去编排应用 →
        </button>
      </div>

      <p className="industry-microsite-cache-legend" role="status">
        <span className="industry-microsite-cache-pill is-cached">已预载 {cachedIds.length}/{MICROSITE_PREVIEW_CACHE_LIMIT}</span>
        <span className="industry-microsite-cache-pill is-live">{cacheLabel}</span>
        {!activeCached ? (
          <span className="industry-microsite-cache-warn">
            当前模板未纳入预载槽，首次打开需短暂生成预览（不占预载配额）
          </span>
        ) : null}
      </p>

      <div className="industry-microsite-picker" role="listbox" aria-label="视觉模板列表">
        {INDUSTRY_MICROSITE_TEMPLATES.map((t) => {
          const cached = cachedSet.has(t.id)
          return (
            <button
              key={t.id}
              type="button"
              role="option"
              aria-selected={t.id === current.id}
              className={`industry-microsite-chip${t.id === current.id ? ' on' : ''}${cached ? ' is-cached' : ' is-uncached'}`}
              onClick={() => handleSelect(t.id)}
              title={micrositeCacheHint(cached)}
              style={t.id === current.id ? { borderColor: accent, color: accent } : undefined}
            >
              <strong>{t.styleLabel}</strong>
              <span>{packName}</span>
              <em className="industry-microsite-chip-badge">
                {cached ? (cssReady[t.id] ? '已预载' : '预载中…') : '未预载'}
              </em>
            </button>
          )
        })}
      </div>

      <div className={`industry-microsite-frame-wrap${fading ? ' is-fading' : ''}`}>
        <div className="industry-microsite-frame-bar">
          <span>{packName}方案</span>
          <span>
            {current.styleLabel}
            {activeCached ? ' · 预载切换' : ondemandBusy ? ' · 生成中…' : ' · 即时预览'}
          </span>
        </div>

        <div className="industry-microsite-frame-stack">
          {cachedIds.map((id) => (
            <iframe
              key={`cache-${packKey}-${id}`}
              title={`${packName} · ${getMicrositeTemplate(id)?.styleLabel ?? id} 预载预览`}
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
              title={`${packName} · ${current.styleLabel} 即时预览`}
              className={`industry-microsite-frame is-visible${ondemandBusy ? ' is-loading' : ''}`}
              srcDoc={ondemandSrcDoc}
              sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
              loading="lazy"
            />
          ) : null}
          {ondemandBusy ? (
            <div className="industry-microsite-frame-loading" role="status">
              未预载模板 · 正在生成预览…
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
