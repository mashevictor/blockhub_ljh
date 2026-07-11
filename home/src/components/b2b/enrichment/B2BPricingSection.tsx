import { Link } from 'react-router-dom'
import { AgentButtonContent, AgentChevronGlyph } from '../../AgentChevron'
import { PRICING_INTRO, PRICING_TIERS } from '../../../data/sitePricing'
import { ROUTES } from '../../../routes/paths'

export default function B2BPricingSection() {
  return (
    <section className="enrich-pricing-bar" aria-labelledby="enrich-pricing-title">
      <div className="enrich-pricing-inner">
        <div className="b2b-section-title">
          <span className="b2b-eyebrow enrich-eyebrow">
            <AgentChevronGlyph size="btn" className="enrich-eyebrow-chev" />
            价格说明
          </span>
          <h2 id="enrich-pricing-title">定价框架</h2>
          <p>{PRICING_INTRO}</p>
        </div>
        <div className="enrich-pricing-grid">
          {PRICING_TIERS.map((tier) => (
            <article
              key={tier.id}
              className={`enrich-tier${tier.featured ? ' is-featured' : ''}`}
            >
              <h4>{tier.name}</h4>
              <div className="enrich-tier-range">{tier.range}</div>
              <ul>
                {tier.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <div className="enrich-section-foot">
          <Link to={ROUTES.pricing} className="enrich-link-btn agent-action-btn">
            <AgentButtonContent>查看完整定价说明</AgentButtonContent>
          </Link>
        </div>
      </div>
    </section>
  )
}
