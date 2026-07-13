import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchMe, logout, type AuthUser } from './auth/session'
import { getToken } from './auth/storage'
import { BRAND } from './data/brand'
import B2BHeader from './components/b2b/B2BHeader'
import B2BHero from './components/b2b/B2BHero'
import B2BProductSection from './components/b2b/B2BProductSection'
import B2BTrustStrip from './components/b2b/enrichment/B2BTrustStrip'
import B2BCaseEnrichedSection from './components/b2b/enrichment/B2BCaseEnrichedSection'
import B2BPricingSection from './components/b2b/enrichment/B2BPricingSection'
import B2BNewsSection from './components/b2b/enrichment/B2BNewsSection'
import CreateStudio from './components/b2b/CreateStudio'
import B2BDemoForm from './components/b2b/B2BDemoForm'
import HomeScrollRails from './components/b2b/HomeScrollRails'
import HomePageIntro, { shouldSkipHomePageIntro } from './components/b2b/HomePageIntro'
import { HomePageReadyProvider } from './context/HomePageReadyContext'
import { AgentPageProvider, useAgentPageContext } from './context/AgentPageContext'
import { PromptDraftProvider } from './context/PromptDraftContext'
import { DemoBookingProvider } from './context/DemoBookingContext'
import type { AgentContextKey } from './data/agentContext'
import { scrollToHomeSection, useHomeActiveSection } from './hooks/useHomeActiveSection'
import { parseCreateDeepLink } from './lib/createDeepLink'
import './styles/b2b-landing.css'

const LANDING_SECTIONS: { id: string; key: AgentContextKey }[] = [
  { id: 'hero', key: 'landing_hero' },
  { id: 'product', key: 'landing_product' },
  { id: 'case', key: 'landing_case' },
]

function HomeScrollContext() {
  const { setContextKey } = useAgentPageContext()

  useEffect(() => {
    const targets = LANDING_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    const contactCreate = document.getElementById('contact-create')
    const contactDemo = document.getElementById('contact-demo')
    if (!targets.length && !contactCreate && !contactDemo) return

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (!visible.length) return

        const demoEntry = visible.find((e) => e.target.id === 'contact-demo')
        const createEntry = visible.find((e) => e.target.id === 'contact-create')
        if (demoEntry && (!createEntry || demoEntry.intersectionRatio >= createEntry.intersectionRatio)) {
          setContextKey('landing_booking')
          return
        }
        if (createEntry && createEntry.intersectionRatio > 0.2) {
          /* CreateStudio 负责 create_prompt / create_industry / create_module */
          return
        }

        const best = visible
          .filter((e) => LANDING_SECTIONS.some((s) => s.id === e.target.id))
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (best) {
          const hit = LANDING_SECTIONS.find((s) => s.id === best.target.id)
          if (hit) setContextKey(hit.key)
        }
      },
      { threshold: [0.15, 0.35, 0.55], rootMargin: '-80px 0px -40% 0px' },
    )

    targets.forEach((el) => io.observe(el))
    if (contactCreate) io.observe(contactCreate)
    if (contactDemo) io.observe(contactDemo)
    return () => io.disconnect()
  }, [setContextKey])

  return null
}

export default function HomeApp() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [pageReady, setPageReady] = useState(shouldSkipHomePageIntro)
  const location = useLocation()
  const activeSection = useHomeActiveSection()

  useEffect(() => {
    document.body.classList.add('b2b-landing')
    return () => document.body.classList.remove('b2b-landing')
  }, [])

  useEffect(() => {
    if (!getToken()) {
      setUser(null)
      return
    }
    fetchMe().then(setUser).catch(() => setUser(null))
  }, [location.pathname])

  useEffect(() => {
    const { mode } = parseCreateDeepLink()
    if (mode) {
      requestAnimationFrame(() => scrollToHomeSection('contact-create'))
    }
  }, [location.hash])

  useEffect(() => {
    const hash = location.hash.replace('#', '')
    const sectionIds = ['product', 'case', 'contact-create', 'contact-demo', 'hero']
    if (location.pathname === '/' && hash && sectionIds.includes(hash)) {
      requestAnimationFrame(() => {
        window.setTimeout(() => scrollToHomeSection(hash), 80)
      })
    }
  }, [location.pathname, location.hash])

  const scrollToCreate = () => scrollToHomeSection('contact-create')
  const scrollToDemo = () => scrollToHomeSection('contact-demo')

  return (
    <AgentPageProvider initial="landing_hero">
      <PromptDraftProvider>
      <DemoBookingProvider>
      <HomePageReadyProvider ready={pageReady}>
      {!pageReady && <HomePageIntro onDone={() => setPageReady(true)} />}
      <HomeScrollContext />
      <div className={`b2b-app b2b-brand-scope b2b-has-floating-agent${pageReady ? ' is-page-ready' : ' is-page-intro'}`}>
      <B2BHeader
        user={user}
        activeSection={activeSection}
        onLogout={() => logout()}
      />

      <B2BHero onBook={scrollToDemo} onTry={scrollToCreate} />

      <B2BProductSection onTry={scrollToCreate} />
      <B2BTrustStrip />
      <B2BCaseEnrichedSection />
      <B2BPricingSection />
      <B2BNewsSection />

      <section id="contact" className="b2b-form-wrap">
        <div className="b2b-demo-block" id="contact-create">
          <CreateStudio />
        </div>
        <B2BDemoForm />
      </section>

      <footer className="b2b-footer">
        <p>© {new Date().getFullYear()} {BRAND.nameZh} · {BRAND.tagline}</p>
      </footer>
      <HomeScrollRails />
      </div>
      </HomePageReadyProvider>
      </DemoBookingProvider>
      </PromptDraftProvider>
    </AgentPageProvider>
  )
}
