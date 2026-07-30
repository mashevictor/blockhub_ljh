import { useEffect, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import { useDemoBookingActive } from '../../context/DemoBookingContext'
import { scrollToHomeSection } from '../../hooks/useHomeActiveSection'

/** 右侧快捷滚动：顶部 / 底部（悬浮框上方） */
export default function HomeScrollRails() {
  const t = useT()
  const bookingZone = useDemoBookingActive()
  const [showTop, setShowTop] = useState(false)
  const [showBottom, setShowBottom] = useState(false)

  useEffect(() => {
    const sync = () => {
      const y = window.scrollY
      const max = document.documentElement.scrollHeight - window.innerHeight
      setShowTop(y > 280)
      setShowBottom(y < max - 120)
    }
    sync()
    window.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => {
      window.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
    }
  }, [])

  if (!showTop && !showBottom) return null

  const goBottom = () => {
    scrollToHomeSection(bookingZone ? 'contact-demo' : 'contact-create')
  }

  const topLabel = t('home.scroll.rail.top')
  const topAria = t('home.scroll.rail.top_aria')
  const bottomLabel = bookingZone ? t('home.scroll.rail.book') : t('home.scroll.rail.try')
  const bottomAria = bookingZone ? t('home.scroll.rail.book_aria') : t('home.scroll.rail.try_aria')

  return (
    <div className="b2b-scroll-rail" aria-label={t('home.scroll.rail.aria')}>
      {showTop && (
        <button
          type="button"
          className="b2b-scroll-rail-btn"
          onClick={() => scrollToHomeSection('hero')}
          aria-label={topAria}
          title={topAria}
        >
          <span className="b2b-scroll-rail-icon" aria-hidden>
            ↑
          </span>
          <span className="b2b-scroll-rail-label">{topLabel}</span>
        </button>
      )}
      {showBottom && (
        <button
          type="button"
          className="b2b-scroll-rail-btn"
          onClick={goBottom}
          aria-label={bottomAria}
          title={bottomAria}
        >
          <span className="b2b-scroll-rail-icon" aria-hidden>
            ↓
          </span>
          <span className="b2b-scroll-rail-label">{bottomLabel}</span>
        </button>
      )}
    </div>
  )
}
