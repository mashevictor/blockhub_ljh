import { useEffect, useState } from 'react'
import { PLATFORM_STATS } from '@shared/platformStats'
import HeroStatsPanel from './HeroStatsPanel'
import { AgentButtonContent } from '../AgentChevron'
import AgentSignLine from '../AgentSignLine'
import ChevronDotLoader from '../ChevronDotLoader'
import { BRAND } from '../../data/brand'

const INTRO_KEY = 'blockhub-hero-intro-done'
const INTRO_MS = 2600

interface Props {
  onBook: () => void
  onTry: () => void
}

function HeroTagline() {
  return <em>{BRAND.tagline}</em>
}

function shouldSkipIntro(): boolean {
  if (typeof window === 'undefined') return true
  if (sessionStorage.getItem(INTRO_KEY) === '1') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function B2BHero({ onBook, onTry }: Props) {
  const [introDone, setIntroDone] = useState(shouldSkipIntro)

  useEffect(() => {
    if (introDone) return
    const t = window.setTimeout(() => {
      setIntroDone(true)
      sessionStorage.setItem(INTRO_KEY, '1')
    }, INTRO_MS)
    return () => window.clearTimeout(t)
  }, [introDone])

  return (
    <section
      id="hero"
      className={`b2b-hero${introDone ? ' hero-ready' : ' hero-intro-active'}`}
    >
      {!introDone ? (
        <div className="hero-chevron-intro" aria-hidden>
          <div className="hero-chevron-intro-backdrop" />
          <ChevronDotLoader
            variant="intro"
            size="hero"
            className="hero-chevron-intro-glyph"
            label="智能交互"
          />
        </div>
      ) : null}

      <div className={`b2b-hero-body${introDone ? ' is-visible' : ''}`}>
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
      </div>
      <div id="hero-float-anchor" className="b2b-hero-float-anchor" aria-hidden />
    </section>
  )
}
