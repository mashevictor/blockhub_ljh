import { useEffect, useRef, useState } from 'react'
import { PLATFORM_STATS } from '@shared/platformStats'

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

function StatCard({
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
    <div className="b2b-stat-card">
      <div className="b2b-stat-num" aria-live="polite">
        <span className="b2b-stat-value">{n}</span>
        {suffix && <span className="b2b-stat-suffix">{suffix}</span>}
      </div>
      <div className="b2b-stat-label">{label}</div>
      <div className="b2b-stat-sub">{sub}</div>
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
        <span className="b2b-hero-panel-tag">平台能力一览</span>
        <div className="b2b-stat-grid">
          <StatCard
            target={PLATFORM_STATS.scenarios}
            suffix="+"
            label="业务场景"
            sub="典型流程开箱即用"
            active={active}
          />
          <StatCard
            target={3}
            label="创建方式"
            sub="描述 · 行业 · 模块"
            active={active}
          />
          <StatCard
            target={PLATFORM_STATS.platforms}
            label="端交付"
            sub="Web · 移动 · 桌面"
            active={active}
          />
          <StatCard
            target={PLATFORM_STATS.industryPacks}
            label="行业方案"
            sub="办公 · 制造 · 销售 · 医疗…"
            active={active}
          />
        </div>
        <p className="b2b-hero-panel-foot">一次发布 · 跨端同步执行业务流程</p>
      </div>
    </div>
  )
}
