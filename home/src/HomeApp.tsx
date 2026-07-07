import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getAdminUrl, type PublishResult, type ViewMode } from './data/constants'
import type { RoleApplyRequest } from './data/rolePresets'
import HeroCubeStage from './components/HeroCubeStage'
import PlatformShowcaseFooter from './components/PlatformShowcaseFooter'
import ViewModeSwitcher from './components/ViewModeSwitcher'
import PromptView from './views/PromptView'
import IndustryView from './views/IndustryView'
import ModuleView from './views/ModuleView'
import { fetchMe, logout, type AuthUser } from './auth/session'
import { getToken } from './auth/storage'
import {
  IconSettings,
  IconArrowRight,
  IconLayers,
} from './components/icons'
import { BRAND } from './data/brand'
import BrandMark from './components/BrandMark'
import { finishPublishNavigate } from './lib/publishFlow'
import { useMyApps } from './hooks/useMyApps'
import { ROUTES } from './routes/paths'

export default function HomeApp() {
  const [view, setView] = useState<ViewMode>('prompt')
  const myApps = useMyApps()
  const myAppsCount = myApps.length
  const [roleApply, setRoleApply] = useState<RoleApplyRequest | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const location = useLocation()
  const navigate = useNavigate()

  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    document.body.classList.add('cube-theme')
    return () => document.body.classList.remove('cube-theme')
  }, [])

  const handleViewChange = (mode: ViewMode) => {
    setView(mode)
    requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  useEffect(() => {
    if (!getToken()) {
      setUser(null)
      return
    }
    fetchMe().then(setUser).catch(() => setUser(null))
  }, [location.pathname])

  const handlePublish = (result: PublishResult) => {
    finishPublishNavigate(navigate, result)
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

  return (
    <div className="app">
      <div className="ambient-bg" aria-hidden>
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      <header className="site-header">
        <div className="header-inner">
          <div className="brand animate-fade-in">
            <BrandMark size={42} />
            <div>
              <strong>{BRAND.nameZh}｜<em className="brand-en">{BRAND.nameEn}｜</em></strong>
              <span>{BRAND.tagline}</span>
            </div>
          </div>
          <ViewModeSwitcher value={view} onChange={handleViewChange} />
          <div className="header-actions">
            <Link to={ROUTES.plazaFeed} className="btn-plaza-nav">📡 应用广场</Link>
            <Link to={ROUTES.shanghaiVoice} className="btn-plaza-nav">🎙️ 上海话语音</Link>
            <Link to={ROUTES.plazaMyApps} className="btn-my-apps" title="查看本浏览器发布过的应用">
              <IconLayers size={15} />
              我的应用
              {myAppsCount > 0 && <span className="btn-my-apps-badge">{myAppsCount}</span>}
            </Link>
            {user ? (
              <>
                <span className="header-user">{user.display_name}</span>
                <button type="button" className="btn-login" onClick={() => logout()}>退出</button>
                <a className="btn-advanced" href={getAdminUrl()} target="_blank" rel="noreferrer">
                  <IconSettings size={15} />
                  <span className="btn-advanced-text">管理后台</span>
                  <IconArrowRight size={14} className="btn-arrow" />
                </a>
              </>
            ) : (
              <>
                <Link className="btn-login" to={ROUTES.login}>登录</Link>
                <Link className="btn-login btn-register" to={ROUTES.register}>注册</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="hero-banner hero-banner-cube">
        <div className="hero-glow" aria-hidden />
        <div className="hero-inner hero-inner-cube">
          <HeroCubeStage onRoleApply={handleRoleApply} />
        </div>
      </section>

      <main ref={mainRef} id="create-screen" className="main-content page-enter">
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
      </main>

      <PlatformShowcaseFooter />

      <footer className="site-footer">
        <span>{BRAND.footer}</span>
        {user && (
          <a href={getAdminUrl()} target="_blank" rel="noreferrer">
            管理后台
            <IconArrowRight size={14} />
          </a>
        )}
      </footer>
    </div>
  )
}
