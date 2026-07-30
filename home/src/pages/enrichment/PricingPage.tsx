import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
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
import {
  localizePricingFaq,
  localizePricingTier,
  localizeRolePage,
  pricingComposeEditHint,
  pricingComposeEditLabel,
  pricingSmartPageHint,
  pricingSmartPageLabel,
  pricingTip,
} from '../../i18n/contentLabels'
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
  const t = useT()
  return (
    <div className="enrich-pricing-grid enrich-pricing-grid--page">
      {tiers.map((raw) => {
        const tier = localizePricingTier(t, raw)
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
  const t = useT()
  const smartPageLabel = pricingSmartPageLabel(t, SMART_PAGE_LABEL)
  const smartPageHint = pricingSmartPageHint(t, SMART_PAGE_HINT)
  const composeEditLabel = pricingComposeEditLabel(t, '对话改页')
  const composeEditHint = pricingComposeEditHint(t, COMPOSE_EDIT_HINT)
  const tip = pricingTip(t, PRICING_TIP)
  const localizedFaq = PRICING_FAQ.map((item, i) => localizePricingFaq(t, item, i))
  const rolePages = ROLE_PAGES.map((r) => localizeRolePage(t, r))

  usePageMeta({
    title: `${t('home.enrich.pricing.title')} · BlockHub`,
    description: t('home.enrich.pricing.meta_desc', { smart: smartPageLabel }),
  })

  return (
    <MarketingSiteShell
      skin="landed"
      pageTitle={t('home.enrich.pricing.title')}
      pageEyebrow={t('home.enrich.pricing.eyebrow')}
    >
      <p style={{ marginBottom: 20 }}>
        <Link to={ROUTES.accountBilling}>{t('home.enrich.pricing.my_plan')}</Link>
      </p>

      <section className="enrich-panel" aria-labelledby="pricing-tiers-title" style={{ marginBottom: 28 }}>
        <div className="enrich-panel-head">
          <h2 id="pricing-tiers-title">{t('home.enrich.pricing.tiers_title')}</h2>
          <p>
            <strong>{composeEditLabel}</strong>：{composeEditHint}
            <br />
            <strong>{smartPageLabel}</strong>：{smartPageHint}
          </p>
        </div>
        <TierGrid tiers={PRICING_TIERS} />
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#9ca3af' }}>{tip}</p>
      </section>

      <section className="enrich-panel enrich-pricing-faq" aria-labelledby="pricing-faq-title">
        <div className="enrich-panel-head">
          <h2 id="pricing-faq-title">{t('home.enrich.pricing.faq_title')}</h2>
          <p>{t('home.enrich.pricing.faq_lead', { smart: smartPageLabel })}</p>
        </div>
        <div className="enrich-panel-body">
          <dl className="enrich-faq-dl enrich-faq-dl--grid">
            {localizedFaq.map((item) => (
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
          <h2 id="pricing-roles-title">{t('home.enrich.pricing.roles_title')}</h2>
          <p>{t('home.enrich.pricing.roles_lead')}</p>
        </div>
        <div className="enrich-panel-body">
          <div className="enrich-role-chip-grid">
            {rolePages.map((role) => (
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
          <AgentButtonContent>{t('home.enrich.pricing.cta_quote')}</AgentButtonContent>
        </a>
      </div>
    </MarketingSiteShell>
  )
}
