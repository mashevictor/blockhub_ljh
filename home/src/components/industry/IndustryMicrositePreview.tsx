import { useEffect, useMemo, useState } from 'react'
import {
  INDUSTRY_MICROSITE_TEMPLATES,
  getMicrositeTemplate,
  loadSavedMicrositeId,
  saveMicrositeId,
  type IndustryMicrositeTemplate,
} from '../../data/industryMicrositeTemplates'

interface Props {
  packKey: string
  packName: string
  accent: string
  onCompose: (template: IndustryMicrositeTemplate) => void
}

export default function IndustryMicrositePreview({ packKey, packName, accent, onCompose }: Props) {
  const [activeId, setActiveId] = useState(() => loadSavedMicrositeId(packKey))

  useEffect(() => {
    setActiveId(loadSavedMicrositeId(packKey))
  }, [packKey])

  const current = useMemo(
    () => getMicrositeTemplate(activeId) ?? INDUSTRY_MICROSITE_TEMPLATES[0],
    [activeId],
  )

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
          {packName} · <em>20 套</em> 真实落地页模板
        </h2>
        <p>
          默认匹配本行业风格；可切换任意模板预览效果。确认后「用此模板去编排」，进入首页悬浮框按需增减正式能力并发布。
        </p>
      </div>

      <div className="industry-microsite-toolbar">
        <label className="industry-microsite-select-label" htmlFor={`ms-select-${packKey}`}>
          当前模板
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
              {t.styleLabel} · {t.name}（{t.brand}）
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
        <a
          className="btn-ghost industry-site-ghost"
          href={`/industry-sites/${packKey}/index.html`}
          target="_blank"
          rel="noreferrer"
        >
          打开解耦独立网页
        </a>
        <a
          className="btn-ghost industry-site-ghost"
          href={current.previewPath}
          target="_blank"
          rel="noreferrer"
        >
          预览视觉模板
        </a>
      </div>

      <div className="industry-microsite-picker" role="listbox" aria-label="网页模板列表">
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
            <strong>{t.name}</strong>
            <span>{t.styleLabel}</span>
          </button>
        ))}
      </div>

      <div className="industry-microsite-frame-wrap">
        <div className="industry-microsite-frame-bar">
          <span>{current.brand}</span>
          <span>{current.styleLabel}</span>
        </div>
        <iframe
          key={current.id}
          title={`${current.brand} 预览`}
          className="industry-microsite-frame"
          src={current.previewPath}
          loading="lazy"
        />
      </div>
    </section>
  )
}
