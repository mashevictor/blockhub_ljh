import { Link } from 'react-router-dom'
import { AgentButtonContent, AgentChevronGlyph } from '../../AgentChevron'
import { PRICING_B_TIERS, PRICING_C_TIERS } from '../../../data/sitePricing'
import { ROUTES } from '../../../routes/paths'

export default function B2BPricingSection() {
  const highlight = [...PRICING_C_TIERS, ...PRICING_B_TIERS.filter((t) => t.id !== 'b_team')]
  return (
    <section className="enrich-pricing-bar" aria-labelledby="enrich-pricing-title">
      <div className="enrich-pricing-inner">
        <div className="b2b-section-title">
          <span className="b2b-eyebrow enrich-eyebrow">
            <AgentChevronGlyph size="btn" className="enrich-eyebrow-chev" />
            价格说明
          </span>
          <h2 id="enrich-pricing-title">C 端 + B 端套餐</h2>
        </div>
        <div className="enrich-pricing-grid">
          {highlight.map((tier) => (
            <article
              key={tier.id}
              className={`enrich-tier${tier.featured ? ' is-featured' : ''}`}
            >
              <h4>{tier.name}</h4>
              <div className="enrich-tier-range">{tier.range}</div>
              <ul>
                {tier.features.slice(0, 4).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="enrich-section-foot" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link to={ROUTES.pricing} className="enrich-link-btn agent-action-btn">
            <AgentButtonContent>查看完整定价说明</AgentButtonContent>
          </Link>
          <Link to={ROUTES.accountBilling} className="enrich-link-btn agent-action-btn">
            <AgentButtonContent>我的套餐</AgentButtonContent>
          </Link>
        </div>
      </div>
    </section>
  )
}
