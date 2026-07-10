import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PublishResult, ViewMode } from '../../data/constants'
import type { RoleApplyRequest } from '../../data/rolePresets'
import { viewModeToContext } from '../../data/agentContext'
import { useAgentPageContext } from '../../context/AgentPageContext'
import { useDemoBookingActive } from '../../context/DemoBookingContext'
import HeroCubeStage from '../HeroCubeStage'
import ViewModeSwitcher from '../ViewModeSwitcher'
import PromptView from '../../views/PromptView'
import IndustryView from '../../views/IndustryView'
import ModuleView from '../../views/ModuleView'
import { finishPublishNavigate } from '../../lib/publishFlow'

export default function CreateStudio() {
  const [view, setView] = useState<ViewMode>('prompt')
  const [roleApply, setRoleApply] = useState<RoleApplyRequest | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { setContextKey } = useAgentPageContext()
  const bookingZoneActive = useDemoBookingActive()

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
    requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleRoleApply = (role: RoleApplyRequest['preset'], generate?: boolean) => {
    setView('prompt')
    setRoleApply({ preset: role, generate })
    if (generate) {
      requestAnimationFrame(() => {
        mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }

  const handlePublish = (result: PublishResult) => {
    finishPublishNavigate(navigate, result)
  }

  return (
    <div className="b2b-create-studio">
      <div className="b2b-create-hero">
        <HeroCubeStage onRoleApply={handleRoleApply} />
      </div>
      <div className="b2b-create-toolbar">
        <ViewModeSwitcher value={view} onChange={handleViewChange} />
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
          <IndustryView active={view === 'industry'} onPublish={handlePublish} />
        </div>
        <div className={view === 'module' ? undefined : 'view-hidden'} aria-hidden={view !== 'module'}>
          <ModuleView active={view === 'module'} onPublish={handlePublish} />
        </div>
      </div>
    </div>
  )
}
