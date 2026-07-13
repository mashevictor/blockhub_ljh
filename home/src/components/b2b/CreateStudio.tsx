import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PublishResult, ViewMode } from '../../data/constants'
import type { RoleApplyRequest } from '../../data/rolePresets'
import { viewModeToContext } from '../../data/agentContext'
import { useAgentPageContext } from '../../context/AgentPageContext'
import { useDemoBookingActive } from '../../context/DemoBookingContext'
import HeroCubeStage from '../HeroCubeStage'
import AgentSignLine from '../AgentSignLine'
import ViewModeSwitcher from '../ViewModeSwitcher'
import PromptView from '../../views/PromptView'
import IndustryView from '../../views/IndustryView'
import ModuleView from '../../views/ModuleView'
import { finishPublishNavigate } from '../../lib/publishFlow'
import { parseCreateDeepLink } from '../../lib/createDeepLink'
import { scrollToHomeSection } from '../../hooks/useHomeActiveSection'
import DemoBookingComposer from './DemoBookingComposer'

export default function CreateStudio() {
  const [view, setView] = useState<ViewMode>('prompt')
  const [initialIndustry, setInitialIndustry] = useState<string | undefined>()
  const [roleApply, setRoleApply] = useState<RoleApplyRequest | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { setContextKey } = useAgentPageContext()
  const bookingZoneActive = useDemoBookingActive()

  useEffect(() => {
    const applyDeepLink = () => {
      const { mode, pack } = parseCreateDeepLink()
      if (mode) setView(mode)
      if (pack && mode === 'industry') setInitialIndustry(pack)
    }
    applyDeepLink()
    window.addEventListener('hashchange', applyDeepLink)
    return () => window.removeEventListener('hashchange', applyDeepLink)
  }, [])

  useEffect(() => {
    const createEl = document.getElementById('contact-create')
    const demoEl = document.getElementById('contact-demo')
    if (!createEl) {
      setContextKey(viewModeToContext(view))
      return
    }

    const syncCreateContext = () => {
      if (bookingZoneActive) return
      setContextKey(viewModeToContext(view))
    }

    const io = new IntersectionObserver(
      (entries) => {
        const createEntry = entries.find((e) => e.target === createEl)
        const demoEntry = demoEl ? entries.find((e) => e.target === demoEl) : undefined
        const createVis = createEntry?.isIntersecting ? createEntry.intersectionRatio : 0
        const demoVis = demoEntry?.isIntersecting ? demoEntry.intersectionRatio : 0
        if (createVis > demoVis && createVis > 0.12) syncCreateContext()
      },
      { threshold: [0.12, 0.3, 0.5], rootMargin: '-60px 0px -35% 0px' },
    )

    io.observe(createEl)
    if (demoEl) io.observe(demoEl)
    syncCreateContext()
    return () => io.disconnect()
  }, [view, setContextKey, bookingZoneActive])

  const handleViewChange = (mode: ViewMode) => {
    setView(mode)
    scrollToHomeSection('contact-create')
  }

  const handleRoleApply = (role: RoleApplyRequest['preset'], generate?: boolean) => {
    setView('prompt')
    setRoleApply({ preset: role, generate })
    if (generate) scrollToHomeSection('contact-create')
  }

  const handlePublish = (result: PublishResult) => {
    finishPublishNavigate(navigate, result)
  }

  return (
    <div className="b2b-create-studio">
      <div className="b2b-create-head">
        <AgentSignLine variant="hero" className="hero-e-headline" />
        <div className="b2b-create-toolbar">
          <ViewModeSwitcher value={view} onChange={handleViewChange} />
        </div>
      </div>
      <div className="b2b-create-hero">
        <HeroCubeStage onRoleApply={handleRoleApply} showTitle={false} />
      </div>
      <div className="b2b-create-booking">
        <DemoBookingComposer />
      </div>
      <div ref={mainRef} className="b2b-create-main">
        <div className={view === 'prompt' ? undefined : 'view-hidden'} aria-hidden={view !== 'prompt'}>
          <PromptView
            active={view === 'prompt'}
            onPublish={handlePublish}
            roleApply={roleApply}
            onRoleApplyDone={() => setRoleApply(null)}
          />
        </div>
        <div className={view === 'industry' ? undefined : 'view-hidden'} aria-hidden={view !== 'industry'}>
          <IndustryView
            active={view === 'industry'}
            onPublish={handlePublish}
            initialIndustry={initialIndustry}
          />
        </div>
        <div className={view === 'module' ? undefined : 'view-hidden'} aria-hidden={view !== 'module'}>
          <ModuleView active={view === 'module'} onPublish={handlePublish} />
        </div>
      </div>
    </div>
  )
}
