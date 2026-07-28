import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import {
  AGENT_TEMPLATES,
  ATOMIC_AI_CAPABILITIES,
  COMMON_INSERT_MODULES,
  LLM_POWERED_AGENTS,
  INDUSTRY_SOLUTIONS,
  PLATFORM_ORCHESTRATION_STEPS,
} from '../../data/productShowcase'
import { ROUTES } from '../../routes/paths'
import { homeSectionHref } from '../../data/homeNav'
import { industryCardImage } from '../../data/industryAssets'
import { PLATFORM_STATS } from '@shared/platformStats'
import { CAPABILITY_ICONS, INDUSTRY_ICONS, IconSparkles } from '../icons'
import { AgentButtonContent } from '../AgentChevron'
import LazyCover from '../LazyCover'
import TemplatePreviewMock from './TemplatePreviewMock'

interface Props {
  onTry: () => void
}

function SectionBlock({
  eyebrow,
  title,
  desc,
  children,
}: {
  eyebrow: string
  title: ReactNode
  desc: string
  children: ReactNode
}) {
  return (
    <div className="b2b-product-block">
      <div className="b2b-block-head">
        <span className="b2b-eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
      {children}
    </div>
  )
}

export default function B2BProductSection({ onTry }: Props) {
  const t = useT()
  const navigate = useNavigate()

  const openIndustryDetail = (key: string) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    navigate(ROUTES.industryDetail(key))
  }

  const openIndustryHub = () => {
    navigate(homeSectionHref('product'))
  }

  return (
    <section id="product" className="b2b-section b2b-product-section">
      <div className="b2b-section-title b2b-product-head">
        <span className="b2b-eyebrow">{t('home.product.eyebrow')}</span>
        <h2>{t('home.product.title')}</h2>
        <p>
          {t('home.product.lead', {
            scenarios: PLATFORM_STATS.scenarios,
            capabilities: PLATFORM_STATS.capabilities,
            agents: PLATFORM_STATS.agents,
          })}
        </p>
      </div>

      {/* ── CapShip 平台编排：对话改页 ── */}
      <SectionBlock
        eyebrow={t('home.product.compose.eyebrow')}
        title={t('home.product.compose.title')}
        desc={t('home.product.compose.desc')}
      >
        <div className="b2b-orchestrate-grid">
          {PLATFORM_ORCHESTRATION_STEPS.map((s) => (
            <article key={s.id} className="b2b-orchestrate-card">
              <span className="b2b-orchestrate-step" aria-hidden>
                {s.step}
              </span>
              <h4>{s.title}</h4>
              <p>{s.summary}</p>
            </article>
          ))}
        </div>
        <div className="b2b-orchestrate-actions">
          <button type="button" className="b2b-btn-primary agent-action-btn" onClick={onTry}>
            <AgentButtonContent>{t('home.product.compose.cta_try')}</AgentButtonContent>
          </button>
          <button
            type="button"
            className="b2b-btn-outline agent-action-btn"
            onClick={() => navigate(ROUTES.capship)}
          >
            <AgentButtonContent>{t('home.product.compose.cta_oss')}</AgentButtonContent>
          </button>
        </div>
      </SectionBlock>

      {/* ── 开箱模板 ── */}
      <SectionBlock
        eyebrow={t('home.product.templates.eyebrow')}
        title={t('home.product.templates.title')}
        desc={t('home.product.templates.desc')}
      >
        <div className="b2b-template-grid">
          {AGENT_TEMPLATES.map((tpl) => {
            const Icon = CAPABILITY_ICONS[tpl.iconKey] ?? IconSparkles
            return (
              <article
                key={tpl.id}
                className="b2b-template-card"
                style={
                  {
                    '--tpl-color': tpl.color,
                    '--tpl-from': tpl.gradientFrom,
                    '--tpl-to': tpl.gradientTo,
                  } as CSSProperties
                }
              >
                <div className="b2b-template-preview-wrap">
                  <TemplatePreviewMock kind={tpl.preview} accent={tpl.color} />
                </div>
                <div className="b2b-template-body">
                  <div className="b2b-template-meta">
                    <span className="b2b-template-icon" aria-hidden>
                      <Icon size={18} />
                    </span>
                    <span className="b2b-template-tag">{tpl.tag}</span>
                  </div>
                  <h4>{tpl.name}</h4>
                  <p className="b2b-template-summary">{tpl.summary}</p>
                  <ul className="b2b-template-features">
                    {tpl.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <button type="button" className="b2b-btn-install agent-action-btn" onClick={onTry}>
                    <AgentButtonContent>体验模板</AgentButtonContent>
                  </button>
                </div>
              </article>
            )
          })}

          <article className="b2b-template-card b2b-template-more">
            <div className="b2b-template-preview-wrap">
              <TemplatePreviewMock kind="suite" accent="#0d47a1" />
            </div>
            <div className="b2b-template-body">
              <h4>更多 AI 模板</h4>
              <p className="b2b-template-summary">
                {PLATFORM_STATS.capabilities} 项能力模块 · {INDUSTRY_SOLUTIONS.length} 个行业包 ·
                {PLATFORM_STATS.scenarios}+ 场景可自由搭配
              </p>
              <button type="button" className="b2b-btn-install outline agent-action-btn" onClick={onTry}>
                <AgentButtonContent>浏览全部模板</AgentButtonContent>
              </button>
            </div>
          </article>
        </div>
      </SectionBlock>

      {/* ── 10 高频模块 ── */}
      <SectionBlock
        eyebrow={t('home.product.modules.eyebrow')}
        title={t('home.product.modules.title')}
        desc={t('home.product.modules.desc')}
      >
        <div className="b2b-module-grid">
          {COMMON_INSERT_MODULES.map((mod) => (
            <article
              key={mod.key}
              className="b2b-module-card"
              style={{ '--mod-color': mod.color } as CSSProperties}
            >
              <div className="b2b-module-top">
                <span className="b2b-module-icon" aria-hidden>{mod.icon}</span>
                <span className="b2b-module-cat">{mod.category}</span>
              </div>
              <h4>{mod.name}</h4>
              <p>{mod.desc}</p>
              <span className="b2b-module-use">{mod.useCase}</span>
              <button type="button" className="b2b-module-add agent-action-btn" onClick={onTry}>
                <AgentButtonContent trailing={false}>+ 插入模块</AgentButtonContent>
              </button>
            </article>
          ))}
        </div>
      </SectionBlock>

      {/* ── 全行业方案 ── */}
      <SectionBlock
        eyebrow={t('home.product.industry.eyebrow')}
        title={t('home.product.industry.title')}
        desc={t('home.product.industry.desc')}
      >
        <p className="b2b-industry-hub-link">
          <button type="button" className="link-btn" onClick={openIndustryHub}>
            浏览 20 个行业独立站 →
          </button>
        </p>
        <div className="b2b-industry-grid">
          {INDUSTRY_SOLUTIONS.map((ind) => {
            const Icon = INDUSTRY_ICONS[ind.iconKey] ?? IconSparkles
            return (
              <article
                key={ind.key}
                className="b2b-industry-card b2b-industry-card-clickable"
                style={{ '--ind-color': ind.color } as CSSProperties}
                role="link"
                tabIndex={0}
                onClick={() => openIndustryDetail(ind.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openIndustryDetail(ind.key)
                  }
                }}
              >
                <LazyCover
                  className="b2b-industry-visual"
                  src={industryCardImage(ind.key)}
                  alt={`${ind.name}行业特性配图`}
                >
                  <span className="industry-card-visual-title">{ind.name}</span>
                  <span className="b2b-industry-visual-count">{ind.count} 场景</span>
                </LazyCover>
                <div className="b2b-industry-body">
                <header className="b2b-industry-head">
                  <span className="b2b-industry-icon" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <div>
                    <h4>
                      {ind.name}
                      {ind.fullPack && <em className="b2b-ind-badge">深度包</em>}
                    </h4>
                    <p className="b2b-industry-tagline">{ind.tagline}</p>
                  </div>
                </header>
                <ul className="b2b-industry-solutions">
                  {ind.solutions.slice(0, 3).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                  {ind.solutions.length > 3 ? (
                    <li className="b2b-industry-solutions-more">+{ind.solutions.length - 3}</li>
                  ) : null}
                </ul>
                <button
                  type="button"
                  className="b2b-industry-cta"
                  onClick={(e) => {
                    e.stopPropagation()
                    openIndustryDetail(ind.key)
                  }}
                >
                  进入独立站
                </button>
                </div>
              </article>
            )
          })}
        </div>
      </SectionBlock>

      {/* ── 原子能力 ── */}
      <SectionBlock
        eyebrow={t('home.product.atomic.eyebrow')}
        title={t('home.product.atomic.title')}
        desc={t('home.product.atomic.desc')}
      >
        <div className="b2b-atomic-grid">
          {ATOMIC_AI_CAPABILITIES.map((cap) => {
            const Icon = CAPABILITY_ICONS[cap.iconKey] ?? IconSparkles
            return (
              <article
                key={cap.id}
                className={`b2b-atomic-card${cap.highlight ? ' highlight' : ''}`}
                style={{ '--atom-color': cap.color } as CSSProperties}
              >
                <div className="b2b-atomic-meta">
                  <span className="b2b-atomic-icon" aria-hidden>
                    <Icon size={18} />
                  </span>
                  <span className="b2b-atomic-tag">{cap.tag}</span>
                </div>
                <h4>{cap.name}</h4>
                <p>{cap.summary}</p>
              </article>
            )
          })}
        </div>
      </SectionBlock>

      {/* ── 大模型能力 ── */}
      <SectionBlock
        eyebrow={t('home.product.llm.eyebrow')}
        title={t('home.product.llm.title')}
        desc={t('home.product.llm.desc')}
      >
        <div className="b2b-deepseek-grid">
          {LLM_POWERED_AGENTS.map((agent) => (
            <article
              key={agent.id}
              className="b2b-deepseek-card"
              style={{ '--ds-color': agent.color } as CSSProperties}
            >
              <div className="b2b-deepseek-badge">
                <span className="b2b-ds-model">{agent.modelLabel}</span>
                <span className="b2b-ds-scene">{agent.scene}</span>
              </div>
              <h4>
                <span className="b2b-llm-prefix">大模型 · </span>
                {agent.name}
              </h4>
              <p className="b2b-ds-summary">{agent.summary}</p>
              <ul className="b2b-ds-features">
                {agent.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button type="button" className="b2b-btn-install agent-action-btn" onClick={onTry}>
                <AgentButtonContent>体验能力</AgentButtonContent>
              </button>
            </article>
          ))}
        </div>
      </SectionBlock>
    </section>
  )
}
