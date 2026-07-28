import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import { AgentButtonContent, AgentChevronGlyph } from '../../AgentChevron'
import { TRUST_STRIP_DOWNLOADS } from '../../../data/siteTrust'
import { ROUTES } from '../../../routes/paths'

export default function B2BTrustStrip() {
  const t = useT()
  return (
    <section className="enrich-trust-strip" aria-labelledby="enrich-trust-title">
      <div className="enrich-trust-inner">
        <div className="enrich-trust-copy">
          <span className="b2b-eyebrow enrich-eyebrow">
            <AgentChevronGlyph size="btn" className="enrich-eyebrow-chev" />
            {t('home.landing.trust.eyebrow')}
          </span>
          <h3 id="enrich-trust-title">{t('home.landing.trust.title')}</h3>
          <p>{t('home.landing.trust.lead')}</p>
          <Link to={ROUTES.trust} className="enrich-trust-more">
            <AgentButtonContent chevSize="sm">{t('home.landing.trust.cta')}</AgentButtonContent>
          </Link>
        </div>
        <div className="enrich-trust-dl">
          {TRUST_STRIP_DOWNLOADS.map((item) => (
            <Link key={item.id} to={ROUTES.trustDoc(item.id)} className="enrich-dl-btn">
              <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
              {item.title}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
