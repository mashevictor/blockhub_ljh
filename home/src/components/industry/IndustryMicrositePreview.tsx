import { useEffect, useMemo, useState } from 'react'
import {
  INDUSTRY_MICROSITE_TEMPLATES,
  getMicrositeTemplate,
  loadSavedMicrositeId,
  saveMicrositeId,
  type IndustryMicrositeTemplate,
} from '../../data/industryMicrositeTemplates'
import { buildIndustryMicrositeSrcDoc } from '../../data/industryMicrositePreviewHtml'

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

  useEffect(() => {
    setActiveId(loadSavedMicrositeId(packKey))
  }, [packKey])

  const current = useMemo(
    () => getMicrositeTemplate(activeId) ?? INDUSTRY_MICROSITE_TEMPLATES[0],
    [activeId],
  )

  const srcDoc = useMemo(() => {
    if (!current) return ''
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return buildIndustryMicrositeSrcDoc(
      { packKey, packName, tagline, overview, highlights, scenes },
      current,
      origin,
    )
  }, [current, packKey, packName, tagline, overview, highlights, scenes])

  const handleSelect = (id: string) => {
    setActiveId(id)
    saveMicrositeId(packKey, id)
  }

  if (!current) return null

  return (
    <section className="industry-microsite-preview industry-site-section industry-site-panel">
      <div className="b2b-section-title industry-site-section-head">
        <span className="b2b-eyebrow">网页模板 · 可切换预览</span>
        <h2>
          {packName} · <em>20 套</em> 视觉模板
        </h2>
        <p>
          正文固定为「{packName}」行业方案文案；切换模板只改版式与视觉气质，避免文案割裂。
          确认后「用此模板去编排」。
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
              {t.styleLabel} · {packName}
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

      <div className="industry-microsite-picker" role="listbox" aria-label="视觉模板列表">
        {INDUSTRY_MICROSITE_TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="option"
            aria-selected={t.id === current.id}
            className={`industry-microsite-chip${t.id === current.id ? ' on' : ''}`}
            onClick={() => handleSelect(t.id)}
            style={t.id === current.id ? { borderColor: accent, color: accent } : undefined}
          >
            <strong>{t.styleLabel}</strong>
            <span>{packName}</span>
          </button>
        ))}
      </div>

      <div className="industry-microsite-frame-wrap">
        <div className="industry-microsite-frame-bar">
          <span>{packName}方案</span>
          <span>{current.styleLabel}</span>
        </div>
        <iframe
          key={`${packKey}-${current.id}`}
          title={`${packName} · ${current.styleLabel} 预览`}
          className="industry-microsite-frame"
          srcDoc={srcDoc}
          sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
          loading="lazy"
        />
      </div>
    </section>
  )
}
