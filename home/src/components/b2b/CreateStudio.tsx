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
import { COMPOSER_MODES } from '@capship/composer'
import { finishPublishNavigate } from '../../lib/publishFlow'
import { parseCreateDeepLink, buildCreateDeepLinkHash } from '../../lib/createDeepLink'
import { scrollToHomeSection } from '../../hooks/useHomeActiveSection'
import DemoBookingComposer from './DemoBookingComposer'

/** Home 创建三入口 ↔ CapShip Composer 模式映射（消费 @capship/composer 契约） */
const HOME_VIEW_TO_COMPOSER = {
  module: 'select_modules',
  industry: 'module_flow',
  prompt: 'live_edit',
} as const satisfies Record<string, (typeof COMPOSER_MODES)[number]['id']>

const CREATE_MAIN_ID = 'create-studio-main'

export default function CreateStudio() {
  const [view, setView] = useState<ViewMode>('prompt')
  const [initialIndustry, setInitialIndustry] = useState<string | undefined>()
  const [initialMicrosite, setInitialMicrosite] = useState<string | undefined>()
  const [roleApply, setRoleApply] = useState<RoleApplyRequest | null>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { setContextKey } = useAgentPageContext()
  const bookingZoneActive = useDemoBookingActive()

  useEffect(() => {
    const applyDeepLink = () => {
      const { mode, pack, microsite } = parseCreateDeepLink()
      if (mode) setView(mode)
      if (pack && mode === 'industry') setInitialIndustry(pack)
      if (microsite && mode === 'industry') setInitialMicrosite(microsite)
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

  const syncCreateHash = (mode: ViewMode, pack?: string, microsite?: string) => {
    if (typeof history === 'undefined' || !history.replaceState) return
    const hash = buildCreateDeepLinkHash(mode, pack, microsite)
    const next = `${window.location.pathname}${window.location.search}${hash}`
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== next) {
      history.replaceState(null, '', next)
    }
  }

  const scrollToCreateMain = () => {
    requestAnimationFrame(() => {
      const el = mainRef.current ?? document.getElementById(CREATE_MAIN_ID)
      if (!el) {
        scrollToHomeSection('contact-create')
        return
      }
      const header = document.querySelector('.b2b-header')
      const offset = (header?.getBoundingClientRect().height ?? 70) + 8
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    })
  }

  const handleViewChange = (mode: ViewMode) => {
    setView(mode)
    syncCreateHash(mode, mode === 'industry' ? initialIndustry : undefined)
    if (mode === 'prompt') {
      scrollToHomeSection('contact-create')
    } else {
      scrollToCreateMain()
    }
  }

  const handleRoleApply = (role: RoleApplyRequest['preset'], generate?: boolean) => {
    setView('prompt')
    setRoleApply({ preset: role, generate })
    syncCreateHash('prompt')
    if (generate) scrollToHomeSection('contact-create')
  }

  const handlePublish = (result: PublishResult) => {
    // 行业包本地缓存：打开 /preview/industry-runtime/{pack}，禁止误跳 /r/cache-*（服务端无此应用）
    const isLocalCache =
      result.source === 'industry-cache' ||
      (typeof result.appId === 'string' && result.appId.startsWith('cache-'))
    if (view === 'industry' && isLocalCache && result.webUrl) {
      try {
        finishPublishNavigate(navigate, result)
      } catch {
        /* ignore */
      }
      window.setTimeout(() => {
        window.location.assign(result.webUrl)
      }, 80)
      return
    }
    // 真服务端发布：进入 /r/{id}
    if (view === 'industry' && result.appId && !String(result.appId).startsWith('cache-')) {
      const runtimePath = `/r/${result.appId}`
      try {
        finishPublishNavigate(navigate, result)
      } catch {
        /* ignore */
      }
      window.setTimeout(() => {
        window.location.assign(runtimePath)
      }, 80)
      return
    }
    finishPublishNavigate(navigate, result)
  }

  const showPromptStage = view === 'prompt'

  const composerMode = HOME_VIEW_TO_COMPOSER[view]

  return (
    <div className="b2b-create-studio" data-capship-mode={composerMode}>
      <div className="b2b-create-head">
        <AgentSignLine variant="hero" className="hero-e-headline" />
        <div className="b2b-create-toolbar">
          <ViewModeSwitcher value={view} onChange={handleViewChange} />
        </div>
      </div>
      {showPromptStage && (
        <>
          <div className="b2b-create-hero">
            <HeroCubeStage onRoleApply={handleRoleApply} showTitle={false} />
          </div>
          <div className="b2b-create-booking">
            <DemoBookingComposer />
          </div>
        </>
      )}
      <div ref={mainRef} id={CREATE_MAIN_ID} className="b2b-create-main">
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
            initialMicrosite={initialMicrosite}
          />
        </div>
        <div className={view === 'module' ? undefined : 'view-hidden'} aria-hidden={view !== 'module'}>
          <ModuleView active={view === 'module'} onPublish={handlePublish} />
        </div>
      </div>
    </div>
  )
}
