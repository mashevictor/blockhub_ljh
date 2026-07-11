import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AGENT_TEMPLATES,
  ATOMIC_AI_CAPABILITIES,
  COMMON_INSERT_MODULES,
  LLM_POWERED_AGENTS,
  INDUSTRY_SOLUTIONS,
} from '../../data/productShowcase'
import { ROUTES } from '../../routes/paths'
import { industryAssets } from '../../data/industryAssets'
import { PLATFORM_STATS } from '@shared/platformStats'
import { CAPABILITY_ICONS, INDUSTRY_ICONS, IconSparkles } from '../icons'
import { AgentButtonContent } from '../AgentChevron'
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
  const navigate = useNavigate()

  const openIndustryDetail = (key: string) => {
    navigate(ROUTES.industryDetail(key))
  }

  const openIndustryHub = () => {
    navigate(ROUTES.industryHub)
  }

  return (
    <section id="product" className="b2b-section b2b-product-section">
      <div className="b2b-section-title b2b-product-head">
        <span className="b2b-eyebrow">智能体产品能力</span>
        <h2>
          丰富 <em>AI 模板</em>，模块积木 · 全行业方案 · 大模型驱动
        </h2>
        <p>
          {PLATFORM_STATS.scenarios}+ 场景、{PLATFORM_STATS.capabilities} 项模块、{PLATFORM_STATS.agents} 个智能体开箱即用；
          三种创建方式，一次发布五端可用。
        </p>
      </div>

      {/* ── 开箱模板 ── */}
      <SectionBlock
        eyebrow="场景模板"
        title={<>9 套 <em>AI 模板</em>，开箱即用</>}
        desc="问答、审批、知识库、看板、语音、集成等核心场景，含预览与能力清单"
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
        eyebrow="插入模块"
        title="10 个高频模块，搭积木式组装"
        desc="创建时一键插入，与行业场景、原子能力自由组合，大模型智能补全推荐"
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
        eyebrow="行业方案"
        title={`${INDUSTRY_SOLUTIONS.length} 个行业 · 独立方案站`}
        desc="覆盖 20 个行业深度包，每项有独立方案站与贴合行业配图，点选即可查看详情并创建"
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
                className="b2b-industry-card"
                style={{ '--ind-color': ind.color } as CSSProperties}
              >
                <div
                  className="b2b-industry-visual"
                  style={{ backgroundImage: `url(${industryAssets(ind.key).hero})` }}
                  role="img"
                  aria-label={`${ind.name}行业特性配图`}
                >
                  <span className="b2b-industry-visual-count">{ind.count} 场景</span>
                </div>
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
                  {ind.solutions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <button type="button" className="b2b-industry-cta" onClick={() => openIndustryDetail(ind.key)}>
                  进入独立站 →
                </button>
                </div>
              </article>
            )
          })}
        </div>
      </SectionBlock>

      {/* ── 原子能力 ── */}
      <SectionBlock
        eyebrow="原子能力"
        title="AI 智能体原子能力"
        desc="可独立启用或组合编排，沪语语音为特色方言交互能力"
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
        eyebrow="大模型"
        title="5 类大模型驱动的 AI 能力"
        desc="推荐、对话、生成、编排、方言五类大模型，覆盖意图解析到业务落地"
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
