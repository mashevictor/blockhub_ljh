import { useEffect, useRef, useState } from 'react'
import ChevronDotLoader from '../ChevronDotLoader'

const INTRO_KEY = 'blockhub-page-intro-done'
/** assemble → fly → settle（主流 FLIP 衔接，避免突兀淡出） */
const ASSEMBLE_MS = 980
const FLY_MS = 780
const SETTLE_MS = 320
const INTRO_MS = ASSEMBLE_MS + FLY_MS + SETTLE_MS

export function shouldSkipHomePageIntro(): boolean {
  if (typeof window === 'undefined') return true
  if (sessionStorage.getItem(INTRO_KEY) === '1') return true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
  if (window.matchMedia('(max-width: 768px)').matches) return true
  return false
}

interface Props {
  onDone: () => void
}

export function useHomePageIntro() {
  const [introDone, setIntroDone] = useState(shouldSkipHomePageIntro)

  useEffect(() => {
    if (introDone) return
    const t = window.setTimeout(() => {
      setIntroDone(true)
      sessionStorage.setItem(INTRO_KEY, '1')
    }, INTRO_MS)
    return () => window.clearTimeout(t)
  }, [introDone])

  return introDone
}

type Phase = 'assemble' | 'fly' | 'settle' | 'gone'

export default function HomePageIntro({ onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('assemble')
  const loaderRef = useRef<HTMLSpanElement>(null)
  const doneRef = useRef(false)

  useEffect(() => {
    if (doneRef.current) return

    const finish = () => {
      if (doneRef.current) return
      doneRef.current = true
      sessionStorage.setItem(INTRO_KEY, '1')
      document.querySelectorAll('[data-intro-sign-target]').forEach((el) => {
        el.classList.add('is-intro-landed')
      })
      setPhase('gone')
      onDone()
    }

    const flyTimer = window.setTimeout(() => {
      const loader = loaderRef.current
      const target = document.querySelector('[data-intro-sign-target]') as HTMLElement | null
      if (!loader || !target) {
        setPhase('settle')
        return
      }

      const from = loader.getBoundingClientRect()
      const to = target.getBoundingClientRect()
      if (to.width < 2 || to.height < 2) {
        setPhase('settle')
        return
      }

      const dx = to.left + to.width / 2 - (from.left + from.width / 2)
      const dy = to.top + to.height / 2 - (from.top + from.height / 2)
      const scale = Math.min(to.width / from.width, to.height / from.height) * 0.98

      loader.style.willChange = 'transform, opacity'
      loader.style.transition =
        'transform 0.78s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease 0.5s'
      loader.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${Math.max(0.22, Math.min(scale, 0.42))})`
      loader.style.opacity = '0'

      target.classList.add('is-intro-receiving')
      setPhase('fly')
    }, ASSEMBLE_MS)

    const settleTimer = window.setTimeout(() => {
      setPhase('settle')
      document.querySelectorAll('[data-intro-sign-target]').forEach((el) => {
        el.classList.add('is-intro-landed')
      })
    }, ASSEMBLE_MS + FLY_MS)

    const doneTimer = window.setTimeout(finish, INTRO_MS)

    return () => {
      window.clearTimeout(flyTimer)
      window.clearTimeout(settleTimer)
      window.clearTimeout(doneTimer)
    }
  }, [onDone])

  if (phase === 'gone') return null

  return (
    <div
      className={[
        'home-page-intro',
        phase === 'fly' ? 'is-flying' : '',
        phase === 'settle' ? 'is-exiting' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
      aria-live="polite"
      aria-label="页面加载中"
    >
      <ChevronDotLoader
        ref={loaderRef}
        variant="intro"
        size="hero"
        label="加载中"
        className="home-page-intro-loader"
      />
    </div>
  )
}
