import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ADMIN_URL, type PublishResult, type ViewMode } from './data/constants'
import type { RoleApplyRequest } from './data/rolePresets'
import PublishModal from './components/PublishModal'
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
} from './components/icons'
import { BRAND, LOGO } from './data/brand'
import './index.css'

export default function HomeApp() {
  const [view, setView] = useState<ViewMode>('prompt')
  const [published, setPublished] = useState<PublishResult | null>(null)
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
            <span className="brand-mark">
              <img src={LOGO.mark} alt="" width={42} height={42} />
            </span>
            <div>
              <strong>{BRAND.nameZh}｜<em className="brand-en">{BRAND.nameEn}｜</em></strong>
              <span>{BRAND.tagline}</span>
            </div>
          </div>
          <ViewModeSwitcher value={view} onChange={setView} />
          <div className="header-actions">
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
            onPublish={setPublished}
            roleApply={roleApply}
            onRoleApplyDone={() => setRoleApply(null)}
          />
        )}
        {view === 'industry' && <IndustryView onPublish={setPublished} />}
        {view === 'module' && <ModuleView onPublish={setPublished} />}
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
    </div>
  )
}
