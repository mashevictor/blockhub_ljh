import { useEffect, useRef, useState } from 'react'
import { HERO_PLATFORM_INTRO, HERO_PLATFORM_STATS, type HeroStatModule } from '../../data/heroPlatformHighlights'
import { scrollToHomeSection } from '../../hooks/useHomeActiveSection'
import { AgentChevronGlyph } from '../AgentChevron'

function useCountUp(target: number, active: boolean, duration = 1400) {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) {
      setValue(0)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - progress) ** 3
      setValue(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, active, duration])

  return value
}

function StatModule({
  target,
  suffix,
  label,
  sub,
  active,
}: HeroStatModule & { active: boolean }) {
  const n = useCountUp(target, active)
  return (
    <div className="b2b-stat-module">
      <div className="b2b-stat-module-num" aria-live="polite">
        <span className="b2b-stat-value">{n}</span>
        {suffix && <span className="b2b-stat-suffix">{suffix}</span>}
      </div>
      <div className="b2b-stat-module-text">
        <div className="b2b-stat-label">{label}</div>
        <div className="b2b-stat-sub">{sub}</div>
      </div>
    </div>
  )
}

export default function HeroStatsPanel() {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setActive(true)
      },
      { threshold: 0.35 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div className="b2b-hero-panel" ref={ref}>
      <div className="b2b-hero-panel-inner">
        <span className="b2b-hero-panel-tag">智能体 PaaS · 规模一览</span>
        <h2 className="b2b-hero-panel-title">平台能力一览</h2>
        <p className="b2b-hero-panel-intro">{HERO_PLATFORM_INTRO}</p>

        <div className="b2b-hero-panel-stats-grid" aria-label="平台能力指标">
          {HERO_PLATFORM_STATS.map((item) => (
            <StatModule key={item.label} {...item} active={active} />
          ))}
        </div>

        <button
          type="button"
          className="b2b-hero-panel-more"
          onClick={() => scrollToHomeSection('product')}
        >
          <AgentChevronGlyph size="xs" className="b2b-hero-panel-more-chev" />
          查看完整产品能力
        </button>
      </div>
    </div>
  )
}
