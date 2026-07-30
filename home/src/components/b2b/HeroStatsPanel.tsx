import { useEffect, useRef, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import {
  AGENT_TEMPLATES,
  ATOMIC_AI_CAPABILITIES,
  COMMON_INSERT_MODULES,
  LLM_POWERED_AGENTS,
} from '../../data/productShowcase'
import { PLATFORM_STATS } from '@shared/platformStats'
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
}: {
  target: number
  suffix?: string
  label: string
  sub: string
  active: boolean
}) {
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

const STAT_DEFS = [
  { target: PLATFORM_STATS.scenarios, key: 'scenarios' },
  { target: PLATFORM_STATS.officeScenarios, key: 'office' },
  { target: PLATFORM_STATS.industryScenarios, key: 'industry' },
  { target: PLATFORM_STATS.capabilities, key: 'capabilities' },
  { target: AGENT_TEMPLATES.length, key: 'templates' },
  { target: COMMON_INSERT_MODULES.length, key: 'modules' },
  { target: PLATFORM_STATS.agents, key: 'agents' },
  { target: ATOMIC_AI_CAPABILITIES.length, key: 'atomic' },
  { target: LLM_POWERED_AGENTS.length, key: 'llm' },
  { target: PLATFORM_STATS.platforms, key: 'platforms' },
  { target: PLATFORM_STATS.industryPacks, key: 'packs' },
  { target: 3, key: 'create' },
] as const

export default function HeroStatsPanel() {
  const t = useT()
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
        <span className="b2b-hero-panel-tag">{t('home.hero.stats.tag')}</span>
        <h2 className="b2b-hero-panel-title">{t('home.hero.stats.title')}</h2>
        <p className="b2b-hero-panel-intro">
          {t('home.hero.stats.intro', {
            scenarios: PLATFORM_STATS.scenarios,
            capabilities: PLATFORM_STATS.capabilities,
            templates: AGENT_TEMPLATES.length,
            agents: PLATFORM_STATS.agents,
          })}
        </p>

        <div className="b2b-hero-panel-stats-grid" aria-label={t('home.hero.stats.aria')}>
          {STAT_DEFS.map((item) => (
            <StatModule
              key={item.key}
              target={item.target}
              label={t(`home.hero.stat.${item.key}.label`)}
              sub={t(`home.hero.stat.${item.key}.sub`)}
              active={active}
            />
          ))}
        </div>

        <button
          type="button"
          className="b2b-hero-panel-more"
          onClick={() => scrollToHomeSection('product')}
        >
          <AgentChevronGlyph size="xs" className="b2b-hero-panel-more-chev" />
          {t('home.hero.stats.more')}
        </button>
      </div>
    </div>
  )
}
