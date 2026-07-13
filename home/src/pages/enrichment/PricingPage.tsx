import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent, AgentChevronGlyph } from '../../components/AgentChevron'
import { PRICING_FAQ, PRICING_TIERS } from '../../data/sitePricing'
import { enrichCardStyle, pricingTierTheme } from '../../data/enrichVisualThemes'
import { ROLE_PAGES } from '../../data/siteRoles'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

export default function PricingPage() {
  usePageMeta({
    title: '定价说明 · 积木仓',
    description: 'PaaS、混合部署与私有化定价框架',
  })

  return (
    <MarketingSiteShell pageTitle="定价框架" pageEyebrow="定价说明">
      <div className="enrich-pricing-grid enrich-pricing-grid--page">
        {PRICING_TIERS.map((tier) => {
          const theme = pricingTierTheme(tier.id)
          return (
            <article
              key={tier.id}
              className={`enrich-card enrich-tier${tier.featured ? ' is-featured' : ''}`}
              style={enrichCardStyle(theme) as CSSProperties}
            >
              <EnrichCardVisual icon={theme.icon} label={tier.name} sublabel={tier.range} />
              <div className="enrich-card-body enrich-card-body--compact">
                <div className="enrich-tier-range">{tier.range}</div>
                <ul className="enrich-tier-features">
                  {tier.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </div>
            </article>
          )
        })}
      </div>

      <section className="enrich-panel enrich-pricing-faq" aria-labelledby="pricing-faq-title">
        <div className="enrich-panel-head">
          <h2 id="pricing-faq-title">常见问题</h2>
          <p>价格影响因素、付款方式与试点收费说明</p>
        </div>
        <div className="enrich-panel-body">
          <dl className="enrich-faq-dl enrich-faq-dl--grid">
            {PRICING_FAQ.map((item) => (
              <div key={item.q} className="enrich-faq-item">
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="enrich-panel enrich-role-links" aria-labelledby="pricing-roles-title">
        <div className="enrich-panel-head">
          <h2 id="pricing-roles-title">按角色查看</h2>
          <p>采购、业务负责人与信息部门的不同关注点</p>
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

      <div className="enrich-section-foot enrich-detail-actions">
        <a href={ROUTES.contactDemo} className="b2b-btn-primary agent-action-btn">
          <AgentButtonContent>预约演示 · 获取专属报价说明</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
