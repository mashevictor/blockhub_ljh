import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent, AgentChevronGlyph } from '../../components/AgentChevron'
import { TRUST_DOCS, TRUST_FAQ_SAMPLES, TRUST_HERO } from '../../data/siteTrust'
import { enrichCardStyle, trustDocTheme } from '../../data/enrichVisualThemes'
import { ROLE_PAGES } from '../../data/siteRoles'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function TrustCenterPage() {
  usePageMeta({
    title: '信任与合规中心 · 积木仓',
    description: TRUST_HERO.desc,
  })

  return (
    <MarketingSiteShell
      skin="landed"
      pageTitle={TRUST_HERO.title}
      pageEyebrow="信任与合规"
      pageLead={TRUST_HERO.desc}
    >
      <section className="enrich-panel enrich-trust-docs" aria-labelledby="trust-docs-title">
        <div className="enrich-panel-head">
          <h2 id="trust-docs-title">可下载资料</h2>
          <p>安全白皮书、集成清单、DPA 摘要等 · 可直接转发给信息部门</p>
        </div>
        <div className="enrich-panel-body">
          <div className="enrich-trust-doc-grid">
            {TRUST_DOCS.map((doc) => {
              const theme = trustDocTheme(doc.id)
              return (
                <article
                  key={doc.id}
                  className="enrich-card enrich-trust-doc-card"
                  style={enrichCardStyle(theme) as CSSProperties}
                >
                  <EnrichCardVisual icon={theme.icon} label={doc.title} />
                  <div className="enrich-card-body enrich-card-body--compact">
                    <p>{doc.description}</p>
                    <Link to={ROUTES.trustDoc(doc.id)} className="enrich-link-btn agent-action-btn">
                      <AgentButtonContent>在线阅读</AgentButtonContent>
                    </Link>
                    <a
                      href={doc.downloadPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="enrich-dl-btn enrich-dl-btn--secondary"
                    >
                      <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
                      下载 PDF
                    </a>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="enrich-panel enrich-trust-faq" aria-labelledby="trust-faq-title">
        <div className="enrich-panel-head">
          <h2 id="trust-faq-title">常见安全提问</h2>
          <p>可直接向全站智能体助手提问，以下为高频问题示例</p>
        </div>
        <div className="enrich-panel-body">
          <ul className="enrich-faq-list enrich-faq-list--cards">
            {TRUST_FAQ_SAMPLES.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="enrich-panel enrich-role-links" aria-labelledby="trust-roles-title">
        <div className="enrich-panel-head">
          <h2 id="trust-roles-title">按角色查看</h2>
          <p>业务、信息、采购等不同视角的入口与资料</p>
        </div>
        <div className="enrich-panel-body">
          <div className="enrich-role-chip-grid">
            {ROLE_PAGES.map((role) => (
              <Link key={role.key} to={ROUTES.rolePage(role.key)} className="enrich-role-chip">
                <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
                {role.title}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="enrich-section-foot">
        <a href={ROUTES.contactDemo} className="b2b-btn-primary agent-action-btn">
          <AgentButtonContent>预约演示 · 获取完整资质包</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
