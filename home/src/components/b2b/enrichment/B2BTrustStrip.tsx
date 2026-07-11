import { Link } from 'react-router-dom'
import { AgentButtonContent, AgentChevronGlyph } from '../../AgentChevron'
import { TRUST_HERO, TRUST_STRIP_DOWNLOADS } from '../../../data/siteTrust'
import { ROUTES } from '../../../routes/paths'

export default function B2BTrustStrip() {
  return (
    <section className="enrich-trust-strip" aria-labelledby="enrich-trust-title">
      <div className="enrich-trust-inner">
        <div className="enrich-trust-copy">
          <span className="b2b-eyebrow enrich-eyebrow">
            <AgentChevronGlyph size="btn" className="enrich-eyebrow-chev" />
            安全合规资料
          </span>
          <h3 id="enrich-trust-title">{TRUST_HERO.title}</h3>
          <p>{TRUST_HERO.desc}</p>
          <Link to={ROUTES.trust} className="enrich-trust-more">
            <AgentButtonContent chevSize="sm">进入信任中心</AgentButtonContent>
          </Link>
        </div>
        <div className="enrich-trust-dl">
          {TRUST_STRIP_DOWNLOADS.map((item) => (
            <a
              key={item.id}
              href={item.downloadPath}
              target="_blank"
              rel="noopener noreferrer"
              className="enrich-dl-btn"
            >
              <AgentChevronGlyph size="sm" className="enrich-dl-chev" />
              {item.title}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
