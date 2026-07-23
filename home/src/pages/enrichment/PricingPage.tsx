import { Link } from 'react-router-dom'
import type { CSSProperties } from 'react'
import MarketingSiteShell from '../../components/b2b/enrichment/MarketingSiteShell'
import EnrichCardVisual from '../../components/b2b/enrichment/EnrichCardVisual'
import { AgentButtonContent, AgentChevronGlyph } from '../../components/AgentChevron'
import {
  PRICING_TIERS,
  PRICING_FAQ,
  PRICING_TIP,
  COMPOSE_EDIT_HINT,
  SMART_PAGE_HINT,
  SMART_PAGE_LABEL,
  type PricingTier,
} from '../../data/sitePricing'
import { enrichCardStyle, pricingTierTheme } from '../../data/enrichVisualThemes'
import { ROLE_PAGES } from '../../data/siteRoles'
import { ROUTES } from '../../routes/paths'
import { usePageMeta } from '../../hooks/usePageMeta'

const PAID_ONLINE = new Set(['c_plus', 'b_business'])

function TierCta({ tier }: { tier: PricingTier }) {
  if (tier.cta === 'buy' && PAID_ONLINE.has(tier.id)) {
    return (
      <Link
        to={`${ROUTES.pricingCheckout}?plan=${tier.id}`}
        className="b2b-btn-primary agent-action-btn"
        style={{ marginTop: 12, display: 'inline-flex' }}
      >
        <AgentButtonContent>{tier.ctaLabel}</AgentButtonContent>
      </Link>
    )
  }
  if (tier.cta === 'start') {
    return (
      <Link
        to={ROUTES.home}
        className="b2b-btn-ghost"
        style={{ marginTop: 12, display: 'inline-block' }}
      >
        {tier.ctaLabel}
      </Link>
    )
  }
  return (
    <a href={ROUTES.contactDemo} className="b2b-btn-ghost" style={{ marginTop: 12, display: 'inline-block' }}>
      {tier.ctaLabel}
    </a>
  )
}

function TierGrid({ tiers }: { tiers: PricingTier[] }) {
  return (
    <div className="enrich-pricing-grid enrich-pricing-grid--page">
      {tiers.map((tier) => {
        const theme = pricingTierTheme(tier.id)
        return (
          <article
            key={tier.id}
            className={`enrich-card enrich-tier${tier.featured ? ' is-featured' : ''}`}
            style={enrichCardStyle(theme) as CSSProperties}
          >
            {tier.tag ? (
              <span className="enrich-tier-tag" style={{ fontSize: 12, fontWeight: 600, color: theme.color }}>
                {tier.tag}
              </span>
            ) : null}
            <EnrichCardVisual icon={theme.icon} label={tier.name} sublabel={tier.range} />
            <div className="enrich-card-body enrich-card-body--compact">
              <p style={{ margin: '0 0 8px', fontSize: 14, color: 'var(--muted, #6b7280)' }}>{tier.desc}</p>
              <div className="enrich-tier-range">{tier.range}</div>
              <ul className="enrich-tier-features">
                {tier.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
                {(tier.limits || []).map((f) => (
                  <li key={f} style={{ opacity: 0.72 }}>
                    {f}
                  </li>
                ))}
              </ul>
              <TierCta tier={tier} />
            </div>
          </article>
        )
      })}
    </div>
  )
}

export default function PricingPage() {
  usePageMeta({
    title: '套餐定价 · 积木仓 AI',
    description: `Free / Plus / Business / Enterprise；含对话改页与${SMART_PAGE_LABEL}配额说明`,
  })

  return (
    <MarketingSiteShell skin="landed" pageTitle="套餐定价" pageEyebrow="定价说明">
      <p style={{ marginBottom: 20 }}>
        <Link to={ROUTES.accountBilling}>我的套餐与用量</Link>
      </p>

      <section className="enrich-panel" aria-labelledby="pricing-tiers-title" style={{ marginBottom: 28 }}>
        <div className="enrich-panel-head">
          <h2 id="pricing-tiers-title">四档套餐</h2>
          <p>
            <strong>对话改页</strong>：{COMPOSE_EDIT_HINT}
            <br />
            <strong>{SMART_PAGE_LABEL}</strong>：{SMART_PAGE_HINT}
          </p>
        </div>
        <TierGrid tiers={PRICING_TIERS} />
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#9ca3af' }}>{PRICING_TIP}</p>
      </section>

      <section className="enrich-panel enrich-pricing-faq" aria-labelledby="pricing-faq-title">
        <div className="enrich-panel-head">
          <h2 id="pricing-faq-title">常见问题</h2>
          <p>套餐边界、{SMART_PAGE_LABEL}、商用与试点</p>
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
