import { useState, type CSSProperties } from 'react'
import { useT } from '@blockhub/i18n/react'
import type { IndustryPageTemplate } from '../../data/industryPageTemplates'
import IndustryPageTemplateMock from './IndustryPageTemplateMock'

interface Props {
  templates: IndustryPageTemplate[]
  accent: string
  packName: string
}

export default function IndustryPageTemplateGallery({ templates, accent, packName }: Props) {
  const t = useT()
  const [active, setActive] = useState(0)
  const [fading, setFading] = useState(false)
  const current = templates[active] ?? templates[0]

  if (!current) return null

  const pick = (i: number) => {
    if (i === active) return
    setFading(true)
    window.setTimeout(() => {
      setActive(i)
      setFading(false)
    }, 140)
  }

  return (
    <section
      className="industry-tpl-gallery industry-site-section"
      style={{ '--tpl-accent': accent } as CSSProperties}
    >
      <div className="industry-tpl-gallery-head">
        <div className="b2b-section-title industry-site-section-head">
          <span className="b2b-eyebrow">{t('home.industry.tpl.eyebrow')}</span>
          <h2>{t('home.industry.tpl.title')}</h2>
          <p>{t('home.industry.tpl.desc', { name: packName })}</p>
        </div>
        <div className="industry-tpl-tech-badges">
          <span>{t('home.industry.tpl.badge.ai')}</span>
          <span>{t('home.industry.tpl.badge.lowcode')}</span>
          <span>{t('home.industry.tpl.badge.ends')}</span>
          <span>{t('home.industry.tpl.badge.stream')}</span>
        </div>
      </div>

      <div className="industry-tpl-showcase">
        <div
          className={`industry-tpl-preview-panel${fading ? ' is-fading' : ''}`}
          style={{ '--tpl-accent': accent } as CSSProperties}
        >
          <div className="industry-tpl-preview-glow" aria-hidden />
          <IndustryPageTemplateMock
            key={`${current.kind}-${current.sceneName}`}
            kind={current.kind}
            accent={accent}
            sceneName={current.sceneName}
          />
          <div className="industry-tpl-preview-meta">
            <span className="industry-tpl-preview-tag">{current.tag}</span>
            <h3>{current.title}</h3>
            <p>{current.subtitle}</p>
            <ul>
              {current.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="industry-tpl-picker" role="tablist" aria-label={t('home.industry.tpl.aria')}>
          {templates.map((tpl, i) => (
            <button
              key={`${tpl.kind}-${tpl.sceneName}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`industry-tpl-pick${i === active ? ' on' : ''}`}
              onClick={() => pick(i)}
            >
              <span className="industry-tpl-pick-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="industry-tpl-pick-label">{tpl.sceneName}</span>
              <span className="industry-tpl-pick-tag">{tpl.tag}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
