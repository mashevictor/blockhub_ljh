import { useState, type CSSProperties } from 'react'
import type { IndustryPageTemplate } from '../../data/industryPageTemplates'
import IndustryPageTemplateMock from './IndustryPageTemplateMock'

interface Props {
  templates: IndustryPageTemplate[]
  accent: string
  packName: string
}

export default function IndustryPageTemplateGallery({ templates, accent, packName }: Props) {
  const [active, setActive] = useState(0)
  const current = templates[active] ?? templates[0]

  if (!current) return null

  return (
    <section
      className="industry-tpl-gallery industry-site-section"
      style={{ '--tpl-accent': accent } as CSSProperties}
    >
      <div className="industry-tpl-gallery-head">
        <div className="b2b-section-title industry-site-section-head">
          <span className="b2b-eyebrow">页面模板</span>
          <h2>
            <em>10 套</em> 行业页面模板 · 开箱即用
          </h2>
          <p>
            {packName} 深度包预置审批、问答、看板、表单等 10 类页面组合，每套模板均贴合行业场景，支持 Web / App 双端发布。
          </p>
        </div>
        <div className="industry-tpl-tech-badges">
          <span>AI 大模型</span>
          <span>低代码编排</span>
          <span>五端交付</span>
          <span>实时数据流</span>
        </div>
      </div>

      <div className="industry-tpl-showcase">
        <div className="industry-tpl-preview-panel" style={{ '--tpl-accent': accent } as CSSProperties}>
          <div className="industry-tpl-preview-glow" aria-hidden />
          <IndustryPageTemplateMock
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

        <div className="industry-tpl-picker" role="tablist" aria-label="页面模板选择">
          {templates.map((tpl, i) => (
            <button
              key={`${tpl.kind}-${tpl.sceneName}`}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`industry-tpl-pick${i === active ? ' on' : ''}`}
              onClick={() => setActive(i)}
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
