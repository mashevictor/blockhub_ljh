import { PLATFORM_STATS } from '@shared/platformStats'
import HeroStatsPanel from './HeroStatsPanel'
import { AgentButtonContent } from '../AgentChevron'
import AgentSignLine from '../AgentSignLine'
import { BRAND } from '../../data/brand'

interface Props {
  onBook: () => void
  onTry: () => void
}

function HeroTagline() {
  const comma = BRAND.tagline.indexOf('，')
  if (comma === -1) {
    return <em>{BRAND.tagline}</em>
  }
  return (
    <em>
      {BRAND.tagline.slice(0, comma + 1)}
      <wbr />
      {BRAND.tagline.slice(comma + 1)}
    </em>
  )
}

export default function B2BHero({ onBook, onTry }: Props) {
  return (
    <section id="hero" className="b2b-hero">
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
      <HeroStatsPanel />
    </section>
  )
}
