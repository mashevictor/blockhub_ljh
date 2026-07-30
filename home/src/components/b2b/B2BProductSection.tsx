import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT, useTf } from '@blockhub/i18n/react'
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
import { industryAlt, industryDesc, industryName } from '../../i18n/industryLabels'
import { localizeSolutions } from '../../i18n/contentLabels'

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
  const tf = useTf()
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
              <h4>{tf(`product.orch.${s.id}.title`, s.title)}</h4>
              <p>{tf(`product.orch.${s.id}.summary`, s.summary)}</p>
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
                    <span className="b2b-template-tag">{tf(`product.tpl.${tpl.id}.tag`, tpl.tag)}</span>
                  </div>
                  <h4>{tf(`product.tpl.${tpl.id}.name`, tpl.name)}</h4>
                  <p className="b2b-template-summary">
                    {tf(`product.tpl.${tpl.id}.summary`, tpl.summary)}
                  </p>
                  <ul className="b2b-template-features">
                    {tpl.features.map((f, i) => (
                      <li key={f}>{tf(`product.tpl.${tpl.id}.f${i}`, f)}</li>
                    ))}
                  </ul>
                  <button type="button" className="b2b-btn-install agent-action-btn" onClick={onTry}>
                    <AgentButtonContent>{t('product.action.try_template')}</AgentButtonContent>
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
              <h4>{t('product.more.title')}</h4>
              <p className="b2b-template-summary">
                {t('product.more.summary', {
                  capabilities: PLATFORM_STATS.capabilities,
                  industries: INDUSTRY_SOLUTIONS.length,
                  scenarios: PLATFORM_STATS.scenarios,
                })}
              </p>
              <button type="button" className="b2b-btn-install outline agent-action-btn" onClick={onTry}>
                <AgentButtonContent>{t('product.action.browse_all')}</AgentButtonContent>
              </button>
            </div>
          </article>
        </div>
      </SectionBlock>

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
                <span className="b2b-module-cat">{tf(`product.mod.${mod.key}.category`, mod.category)}</span>
              </div>
              <h4>{tf(`product.mod.${mod.key}.name`, mod.name)}</h4>
              <p>{tf(`product.mod.${mod.key}.desc`, mod.desc)}</p>
              <span className="b2b-module-use">{tf(`product.mod.${mod.key}.use`, mod.useCase)}</span>
              <button type="button" className="b2b-module-add agent-action-btn" onClick={onTry}>
                <AgentButtonContent trailing={false}>{t('product.action.insert_module')}</AgentButtonContent>
              </button>
            </article>
          ))}
        </div>
      </SectionBlock>

      <SectionBlock
        eyebrow={t('home.product.industry.eyebrow')}
        title={t('home.product.industry.title')}
        desc={t('home.product.industry.desc')}
      >
        <p className="b2b-industry-hub-link">
          <button type="button" className="link-btn" onClick={openIndustryHub}>
            {t('home.industry.card.browse_hub')}
          </button>
        </p>
        <div className="b2b-industry-grid">
          {INDUSTRY_SOLUTIONS.map((ind) => {
            const Icon = INDUSTRY_ICONS[ind.iconKey] ?? IconSparkles
            const name = industryName(t, ind.key, ind.name)
            const tagline = industryDesc(t, ind.key, ind.tagline)
            const solutions = localizeSolutions(t, ind.key, ind.solutions)
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
                  alt={industryAlt(t, ind.key, ind.name)}
                >
                  <span className="industry-card-visual-title">{name}</span>
                  <span className="b2b-industry-visual-count">
                    {t('home.industry.card.scenes', { n: ind.count })}
                  </span>
                </LazyCover>
                <div className="b2b-industry-body">
                <header className="b2b-industry-head">
                  <span className="b2b-industry-icon" aria-hidden>
                    <Icon size={20} />
                  </span>
                  <div>
                    <h4>
                      {name}
                      {ind.fullPack && (
                        <em className="b2b-ind-badge">{t('home.industry.card.deep_pack')}</em>
                      )}
                    </h4>
                    <p className="b2b-industry-tagline">{tagline}</p>
                  </div>
                </header>
                <ul className="b2b-industry-solutions">
                  {solutions.slice(0, 3).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                  {solutions.length > 3 ? (
                    <li className="b2b-industry-solutions-more">+{solutions.length - 3}</li>
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
                  {t('home.industry.card.enter')}
                </button>
                </div>
              </article>
            )
          })}
        </div>
      </SectionBlock>

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
                  <span className="b2b-atomic-tag">{tf(`product.atom.${cap.id}.tag`, cap.tag)}</span>
                </div>
                <h4>{tf(`product.atom.${cap.id}.name`, cap.name)}</h4>
                <p>{tf(`product.atom.${cap.id}.summary`, cap.summary)}</p>
              </article>
            )
          })}
        </div>
      </SectionBlock>

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
                <span className="b2b-ds-model">{tf(`product.llm.${agent.id}.model`, agent.modelLabel)}</span>
                <span className="b2b-ds-scene">{tf(`product.llm.${agent.id}.scene`, agent.scene)}</span>
              </div>
              <h4>
                <span className="b2b-llm-prefix">{t('product.llm.prefix')}</span>
                {tf(`product.llm.${agent.id}.name`, agent.name)}
              </h4>
              <p className="b2b-ds-summary">{tf(`product.llm.${agent.id}.summary`, agent.summary)}</p>
              <ul className="b2b-ds-features">
                {agent.features.map((f, i) => (
                  <li key={f}>{tf(`product.llm.${agent.id}.f${i}`, f)}</li>
                ))}
              </ul>
              <button type="button" className="b2b-btn-install agent-action-btn" onClick={onTry}>
                <AgentButtonContent>{t('product.action.try_capability')}</AgentButtonContent>
              </button>
            </article>
          ))}
        </div>
      </SectionBlock>
    </section>
  )
}
