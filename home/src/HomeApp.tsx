import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ADMIN_URL, type PublishResult, type ViewMode } from './data/constants'
import type { RoleApplyRequest } from './data/rolePresets'
import PublishModal from './components/PublishModal'
import MyAppsPanel from './components/MyAppsPanel'
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
import { addMyApp, loadMyApps } from './lib/myAppsStorage'
import './index.css'

export default function HomeApp() {
  const [view, setView] = useState<ViewMode>('prompt')
  const [published, setPublished] = useState<PublishResult | null>(null)
  const [showMyApps, setShowMyApps] = useState(false)
  const [myAppsCount, setMyAppsCount] = useState(0)
  const [roleApply, setRoleApply] = useState<RoleApplyRequest | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const location = useLocation()

  useEffect(() => {
    document.body.classList.add('cube-theme')
    return () => document.body.classList.remove('cube-theme')
  }, [])

  useEffect(() => {
    if (!getToken()) {
      setUser(null)
      return
    }
    fetchMe().then(setUser).catch(() => setUser(null))
  }, [location.pathname])

  useEffect(() => {
    setMyAppsCount(loadMyApps().length)
  }, [published, showMyApps])

  const handlePublish = (result: PublishResult) => {
    addMyApp(result)
    setMyAppsCount(loadMyApps().length)
    setPublished(result)
  }

  const handleRoleApply = (role: RoleApplyRequest['preset'], generate?: boolean) => {
    setView('prompt')
    setRoleApply({ preset: role, generate })
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
          <ViewModeSwitcher value={view} onChange={setView} />
          <div className="header-actions">
            <button
              type="button"
              className="btn-my-apps"
              onClick={() => setShowMyApps(true)}
              title="查看本浏览器发布过的应用"
            >
              <IconLayers size={15} />
              我的应用
              {myAppsCount > 0 && <span className="btn-my-apps-badge">{myAppsCount}</span>}
            </button>
            {user ? (
              <>
                <span className="header-user">{user.display_name}</span>
                <button type="button" className="btn-login" onClick={() => logout()}>退出</button>
                <a className="btn-advanced" href={ADMIN_URL} target="_blank" rel="noreferrer">
                  <IconSettings size={15} />
                  <span className="btn-advanced-text">管理后台</span>
                  <IconArrowRight size={14} className="btn-arrow" />
                </a>
              </>
            ) : (
              <>
                <Link className="btn-login" to="/login">登录</Link>
                <Link className="btn-login btn-register" to="/login">注册</Link>
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

      <main key={view} className="main-content page-enter">
        {view === 'prompt' && (
          <PromptView
            onPublish={handlePublish}
            roleApply={roleApply}
            onRoleApplyDone={() => setRoleApply(null)}
          />
        )}
        {view === 'industry' && <IndustryView onPublish={handlePublish} />}
        {view === 'module' && <ModuleView onPublish={handlePublish} />}
      </main>

      <PlatformShowcaseFooter />

      <footer className="site-footer">
        <span>{BRAND.footer}</span>
        {user && (
          <a href={ADMIN_URL} target="_blank" rel="noreferrer">
            管理后台
            <IconArrowRight size={14} />
          </a>
        )}
      </footer>

      {published && (
        <PublishModal
          result={published}
          showAdminLink={!!user}
          onClose={() => setPublished(null)}
        />
      )}

      {showMyApps && (
        <MyAppsPanel
          onClose={() => setShowMyApps(false)}
          onOpenApp={(app) => {
            setShowMyApps(false)
            setPublished(app)
          }}
        />
      )}
    </div>
  )
}
