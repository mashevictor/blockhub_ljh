import { useEffect, useState } from 'react'
import { useDemoBookingActive } from '../../context/DemoBookingContext'
import { scrollToHomeSection } from '../../hooks/useHomeActiveSection'

/** 右侧快捷滚动：顶部 / 底部（悬浮框上方） */
export default function HomeScrollRails() {
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

  return (
    <div className="b2b-scroll-rail" aria-label="页面快捷导航">
      {showTop && (
        <button
          type="button"
          className="b2b-scroll-rail-btn"
          onClick={() => scrollToHomeSection('hero')}
          aria-label="回到顶部"
          title="回到顶部"
        >
          <span className="b2b-scroll-rail-icon" aria-hidden>↑</span>
          <span className="b2b-scroll-rail-label">顶部</span>
        </button>
      )}
      {showBottom && (
        <button
          type="button"
          className="b2b-scroll-rail-btn"
          onClick={goBottom}
          aria-label={bookingZone ? '去预约区' : '去体验区'}
          title={bookingZone ? '去预约区' : '去体验区'}
        >
          <span className="b2b-scroll-rail-icon" aria-hidden>↓</span>
          <span className="b2b-scroll-rail-label">{bookingZone ? '预约' : '体验'}</span>
        </button>
      )}
    </div>
  )
}
