import { PLATFORM_STATS } from '@shared/platformStats'
import HeroStatsPanel from './HeroStatsPanel'
import { AgentButtonContent } from '../AgentChevron'
import AgentSignLine from '../AgentSignLine'
import { BRAND } from '../../data/brand'
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
            <p>
              {PLATFORM_STATS.scenarios}+ 业务场景 · 三种创建方式 · 一次发布五端可用
            </p>
            <div className="b2b-hero-btns">
              <button type="button" className="b2b-btn-primary agent-action-btn" onClick={onBook}>
                <AgentButtonContent>预约演示</AgentButtonContent>
              </button>
              <button type="button" className="b2b-btn-outline agent-action-btn" onClick={onTry}>
                <AgentButtonContent>在线体验</AgentButtonContent>
              </button>
            </div>
          </div>
          <div id="hero-dock-anchor" className="b2b-hero-dock-anchor" aria-hidden />
        </div>
        <HeroStatsPanel />
      </div>
    </section>
  )
}
