import { useEffect, useState } from 'react'
import { preserveCreateHashOnScroll } from '../lib/createDeepLink'

export type HomeSectionId = 'hero' | 'product' | 'case' | 'contact-create' | 'contact-demo'

const SECTION_IDS: HomeSectionId[] = [
  'hero',
  'product',
  'case',
  'contact-create',
  'contact-demo',
]

/** 首页锚点滚动动画时长（预约演示 / 在线体验等） */
export const HOME_SECTION_SCROLL_MS = 100

/** 路由 hash 落地后等待布局再滚动（与动画时长一致） */
export const HOME_HASH_NAV_DELAY_MS = 100

function headerScrollOffset(): number {
  const header = document.querySelector('.b2b-header')
  return (header?.getBoundingClientRect().height ?? 70) + 8
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}

function animateScrollTo(targetY: number, durationMs: number) {
  const startY = window.scrollY
  const delta = targetY - startY
  if (Math.abs(delta) < 2) return

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduced || durationMs <= 0) {
    window.scrollTo({ top: targetY, behavior: 'auto' })
    return
  }

  const start = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs)
    window.scrollTo({ top: startY + delta * easeOutCubic(t), behavior: 'auto' })
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

export function scrollToHomeSection(id: HomeSectionId | string, delayMs = 0) {
  const run = () => {
    const el = document.getElementById(id.replace(/^#/, ''))
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - headerScrollOffset()
    animateScrollTo(Math.max(0, top), HOME_SECTION_SCROLL_MS)
    if (typeof history !== 'undefined' && history.replaceState) {
      const hash = preserveCreateHashOnScroll(id)
      if (window.location.hash !== hash) {
        history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
      }
    }
  }
  if (delayMs > 0) window.setTimeout(run, delayMs)
  else requestAnimationFrame(run)
}

export function useHomeActiveSection() {
  const [active, setActive] = useState<HomeSectionId>('hero')

  useEffect(() => {
    const targets = SECTION_IDS.map((sid) => document.getElementById(sid)).filter(Boolean) as HTMLElement[]
    if (!targets.length) return

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (!visible.length) return
        const best = [...visible].sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const nextId = best.target.id as HomeSectionId
        if (SECTION_IDS.includes(nextId)) setActive(nextId)
      },
      { threshold: [0.12, 0.28, 0.45], rootMargin: '-72px 0px -42% 0px' },
    )

    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return active
}
