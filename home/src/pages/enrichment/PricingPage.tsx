import { Link } from 'react-router-dom'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import { AgentButtonContent, AgentChevronGlyph } from '../../components/AgentChevron'
import { PRICING_FAQ, PRICING_INTRO, PRICING_TIERS } from '../../data/sitePricing'
import { ROLE_PAGES } from '../../data/siteRoles'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function PricingPage() {
  usePageMeta({
    title: '定价说明 · 积木仓',
    description: PRICING_INTRO,
  })

  return (
    <MarketingSiteShell pageTitle="定价框架" pageEyebrow="定价说明" pageLead={PRICING_INTRO}>
      <div className="enrich-pricing-grid enrich-pricing-grid--page">
        {PRICING_TIERS.map((tier) => (
          <article key={tier.id} className={`enrich-tier${tier.featured ? ' is-featured' : ''}`}>
            <h3>{tier.name}</h3>
            <div className="enrich-tier-range">{tier.range}</div>
            <ul>
              {tier.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <section className="enrich-pricing-faq" aria-labelledby="pricing-faq-title">
        <h2 id="pricing-faq-title">常见问题</h2>
        <dl className="enrich-faq-dl">
          {PRICING_FAQ.map((item) => (
            <div key={item.q} className="enrich-faq-item">
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="enrich-role-links" aria-labelledby="pricing-roles-title">
        <h2 id="pricing-roles-title">按角色查看</h2>
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
          <AgentButtonContent>预约演示 · 获取专属报价说明</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
