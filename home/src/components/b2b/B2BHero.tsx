import { Link } from 'react-router-dom'
import { PLATFORM_STATS } from '@shared/platformStats'
import HeroStatsPanel from './HeroStatsPanel'
import { AgentButtonContent } from '../AgentChevron'
import AgentSignLine from '../AgentSignLine'
import { BRAND } from '../../data/brand'
import { ROUTES } from '../../routes/paths'
import { useHomePageReady } from '../../context/HomePageReadyContext'

interface Props {
  onBook: () => void
  onTry: () => void
}

function HeroTagline() {
  return <em>{BRAND.tagline}</em>
}

export default function B2BHero({ onBook, onTry }: Props) {
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
              <span>{PLATFORM_STATS.scenarios} 业务场景</span>
              <span className="b2b-hero-lead-sep" aria-hidden>
                ·
              </span>
              <Link to={ROUTES.capship} className="b2b-hero-compose-pill">
                对话改页
              </Link>
              <span className="b2b-hero-lead-sep" aria-hidden>
                ·
              </span>
              <span>审批后全员生效</span>
            </p>
            <div className="b2b-hero-btns" role="group" aria-label="预约与体验">
              <button type="button" className="b2b-btn-primary agent-action-btn b2b-hero-cta" onClick={onBook}>
                <AgentButtonContent chevSize="nav">预约演示</AgentButtonContent>
              </button>
              <button type="button" className="b2b-btn-outline agent-action-btn b2b-hero-cta" onClick={onTry}>
                <AgentButtonContent chevSize="nav">在线体验</AgentButtonContent>
              </button>
              <Link
                to={ROUTES.capship}
                className="b2b-btn-compose agent-action-btn b2b-hero-cta"
              >
                <AgentButtonContent chevSize="nav">对话改页</AgentButtonContent>
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
