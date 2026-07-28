import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import { AgentButtonContent, AgentChevronGlyph } from '../../AgentChevron'
import { PRICING_TIERS, PRICING_TIP } from '../../../data/sitePricing'
import { ROUTES } from '../../../routes/paths'

export default function B2BPricingSection() {
  const t = useT()
  return (
    <section className="enrich-pricing-bar" aria-labelledby="enrich-pricing-title">
      <div className="enrich-pricing-inner">
        <div className="b2b-section-title">
          <span className="b2b-eyebrow enrich-eyebrow">
            <AgentChevronGlyph size="btn" className="enrich-eyebrow-chev" />
            {t('home.landing.pricing.eyebrow')}
          </span>
          <h2 id="enrich-pricing-title">Free · Plus · Business · Enterprise</h2>
        </div>
        <div className="enrich-pricing-grid">
          {PRICING_TIERS.map((tier) => (
            <article key={tier.id} className={`enrich-tier${tier.featured ? ' is-featured' : ''}`}>
              <h4>{tier.name}</h4>
              <div className="enrich-tier-range">{tier.range}</div>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 8px' }}>{tier.desc}</p>
              <ul>
                {tier.features.slice(0, 4).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#9ca3af' }}>{PRICING_TIP}</p>
        <div className="enrich-section-foot" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link to={ROUTES.pricing} className="enrich-link-btn agent-action-btn">
            <AgentButtonContent>{t('home.landing.pricing.cta')}</AgentButtonContent>
          </Link>
          <Link to={ROUTES.accountBilling} className="enrich-link-btn agent-action-btn">
            <AgentButtonContent>{t('home.action.account')}</AgentButtonContent>
          </Link>
        </div>
      </div>
    </section>
  )
}
