import { useEffect, useState } from 'react'

export type HomeSectionId = 'hero' | 'product' | 'case' | 'contact-create' | 'contact-demo'

const SECTION_IDS: HomeSectionId[] = [
  'hero',
  'product',
  'case',
  'contact-create',
  'contact-demo',
]

export function useHomeActiveSection() {
  const [active, setActive] = useState<HomeSectionId>('hero')

  useEffect(() => {
    const targets = SECTION_IDS.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (!targets.length) return

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (!visible.length) return
        const best = [...visible].sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const id = best.target.id as HomeSectionId
        if (SECTION_IDS.includes(id)) setActive(id)
      },
      { threshold: [0.12, 0.28, 0.45], rootMargin: '-72px 0px -42% 0px' },
    )

    targets.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return active
}

export function scrollToHomeSection(id: HomeSectionId | string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
