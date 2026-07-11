import { Link } from 'react-router-dom'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import { AgentButtonContent, AgentChevronGlyph } from '../../components/AgentChevron'
import { TRUST_DOCS, TRUST_FAQ_SAMPLES, TRUST_HERO } from '../../data/siteTrust'
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
      pageTitle={TRUST_HERO.title}
      pageEyebrow="信任与合规"
      pageLead={TRUST_HERO.desc}
    >
      <section className="enrich-trust-docs" aria-labelledby="trust-docs-title">
        <h2 id="trust-docs-title">可下载资料</h2>
        <div className="enrich-trust-doc-grid">
          {TRUST_DOCS.map((doc) => (
            <article key={doc.id} className="enrich-trust-doc-card">
              <h3>{doc.title}</h3>
              <p>{doc.description}</p>
              <a
                href={doc.downloadPath}
                target="_blank"
                rel="noopener noreferrer"
                className="enrich-dl-btn"
              >
                <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
                下载 / 打印 PDF
              </a>
            </article>
          ))}
        </div>
      </section>

      <section className="enrich-trust-faq" aria-labelledby="trust-faq-title">
        <h2 id="trust-faq-title">常见安全提问</h2>
        <p className="marketing-lead">可直接向全站智能体助手提问，以下为高频问题示例：</p>
        <ul className="enrich-faq-list">
          {TRUST_FAQ_SAMPLES.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      </section>

      <section className="enrich-role-links" aria-labelledby="trust-roles-title">
        <h2 id="trust-roles-title">按角色查看</h2>
        <div className="enrich-role-chip-grid">
          {ROLE_PAGES.map((role) => (
            <Link key={role.key} to={ROUTES.rolePage(role.key)} className="enrich-role-chip">
              <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
              {role.title}
            </Link>
          ))}
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
