import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import { PLATFORM_STATS } from '@shared/platformStats'
import HeroStatsPanel from './HeroStatsPanel'
import { AgentButtonContent } from '../AgentChevron'
import AgentSignLine from '../AgentSignLine'
import { ROUTES } from '../../routes/paths'
import { useHomePageReady } from '../../context/HomePageReadyContext'

interface Props {
  onBook: () => void
  onTry: () => void
}

function HeroTagline() {
  const t = useT()
  return <em>{t('home.brand.tagline')}</em>
}

export default function B2BHero({ onBook, onTry }: Props) {
  const t = useT()
  const pageReady = useHomePageReady()

  return (
    <section
      id="hero"
      className={`b2b-hero${pageReady ? ' hero-ready' : ''}`}
    >
      <div className={`b2b-hero-body${pageReady ? ' is-visible' : ''}`}>
        <div className="b2b-hero-top">
          <div className="b2b-hero-text">
            <AgentSignLine variant="eyebrow" className="b2b-hero-eyebrow" as="p" />
            <h1 className="b2b-hero-tagline">
              <HeroTagline />
            </h1>
            <p className="b2b-hero-lead">
              <span>{t('home.hero.lead_scenes', { n: PLATFORM_STATS.scenarios })}</span>
              <span className="b2b-hero-lead-sep" aria-hidden>
                ·
              </span>
              <Link to={ROUTES.capship} className="b2b-hero-compose-pill">
                {t('home.hero.lead_compose')}
              </Link>
              <span className="b2b-hero-lead-sep" aria-hidden>
                ·
              </span>
              <span>{t('home.hero.lead_effect')}</span>
            </p>
            <div className="b2b-hero-btns" role="group" aria-label={t('home.hero.cta_group')}>
              <button type="button" className="b2b-btn-primary agent-action-btn b2b-hero-cta" onClick={onBook}>
                <AgentButtonContent chevSize="nav">{t('home.action.demo')}</AgentButtonContent>
              </button>
              <button type="button" className="b2b-btn-outline agent-action-btn b2b-hero-cta" onClick={onTry}>
                <AgentButtonContent chevSize="nav">{t('home.action.try')}</AgentButtonContent>
              </button>
              <Link
                to={ROUTES.capship}
                className="b2b-btn-compose agent-action-btn b2b-hero-cta"
              >
                <AgentButtonContent chevSize="nav">{t('home.action.compose')}</AgentButtonContent>
              </Link>
            </div>
          </div>
          <div id="hero-dock-anchor" className="b2b-hero-dock-anchor" aria-hidden />
        </div>
        <HeroStatsPanel />
      </div>
    </section>
  )
}
