import { useEffect, useState } from 'react'
import ChevronDotLoader from '../ChevronDotLoader'

const INTRO_KEY = 'blockhub-page-intro-done'
const INTRO_MS = 2200

export function shouldSkipHomePageIntro(): boolean {
  if (typeof window === 'undefined') return true
  if (sessionStorage.getItem(INTRO_KEY) === '1') return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
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

export default function HomePageIntro({ onDone }: Props) {
  const [visible, setVisible] = useState(true)
  const [phase, setPhase] = useState<'in' | 'out'>('in')

  useEffect(() => {
    const t1 = window.setTimeout(() => setPhase('out'), INTRO_MS - 320)
    const t2 = window.setTimeout(() => {
      setVisible(false)
      sessionStorage.setItem(INTRO_KEY, '1')
      onDone()
    }, INTRO_MS)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [onDone])

  if (!visible) return null

  return (
    <div
      className={`home-page-intro${phase === 'out' ? ' is-exiting' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="页面加载中"
    >
      <ChevronDotLoader variant="intro" size="hero" label="加载中" />
    </div>
  )
}
