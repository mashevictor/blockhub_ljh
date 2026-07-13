import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import BrandMark from '../../components/BrandMark'
import { BRAND } from '../../data/brand'
import { IconLayers } from '../../components/icons'
import { useMyApps } from '../../hooks/useMyApps'
import { loadPlazaFeedItemsAsync } from '../../lib/plazaFeedStorage'
import { ROUTES } from '../../routes/paths'
import { AgentPageProvider, useAgentPageContext } from '../../context/AgentPageContext'
import { PlazaFocusProvider } from '../../context/PlazaFocusContext'
import type { AgentContextKey } from '../../data/agentContext'
import PlazaFloatingAgent from '../../components/b2b/PlazaFloatingAgent'
import B2BSiteFooter from '../../components/b2b/B2BSiteFooter'
import PlazaRunBridge from '../../components/plaza/PlazaRunBridge'
import '../../styles/b2b-landing.css'
import '../../styles/plaza-theme.css'

function PlazaContextSync() {
  const { pathname } = useLocation()
  const { setContextKey } = useAgentPageContext()

  useEffect(() => {
    const key: AgentContextKey = pathname === ROUTES.plazaMyApps ? 'plaza_my' : 'plaza_feed'
    setContextKey(key)
  }, [pathname, setContextKey])

  return null
}

function sideLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'on' : ''
}

function topLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'on' : ''
}

export default function PlazaLayout() {
  const myApps = useMyApps()
  const myAppsCount = myApps.length
  const [publicFeedCount, setPublicFeedCount] = useState(0)
  const { pathname } = useLocation()
  const onMyAppsPage = pathname === ROUTES.plazaMyApps

  useEffect(() => {
    void loadPlazaFeedItemsAsync().then((items) => setPublicFeedCount(items.length))
  }, [pathname])

  useEffect(() => {
    document.body.classList.add('b2b-landing')
    return () => document.body.classList.remove('b2b-landing')
  }, [])

  return (
    <AgentPageProvider initial="plaza_feed">
      <PlazaFocusProvider>
      <PlazaRunBridge>
      <PlazaContextSync />
      <div className="plaza-page b2b-brand-scope b2b-has-floating-agent">
      <header className="plaza-topbar">
        <Link to={ROUTES.home} className="plaza-topbar-brand">
          <BrandMark size={36} />
          <span>{BRAND.nameZh} {BRAND.nameEn}</span>
        </Link>
        <nav className="plaza-topbar-nav">
          <Link to={ROUTES.home}>生成应用</Link>
          <NavLink to={ROUTES.plazaFeed} end className={topLinkClass}>
            📡 应用广场
          </NavLink>
          <NavLink to={ROUTES.plazaMyApps} className={topLinkClass}>
            <IconLayers size={14} /> 我的应用
            {myAppsCount > 0 && <span className="plaza-my-badge">{myAppsCount}</span>}
          </NavLink>
        </nav>
      </header>

      <div className="plaza-flow-strip" role="marquee" aria-label="应用广场提示">
        <p className="plaza-flow-strip-text">应用发布 · 模块数据流 · @ 受众 · 应用广场 · 我的应用</p>
      </div>

      <div className="plaza-layout">
        <aside className="plaza-side" aria-label="应用广场导航">
          <h4>导航</h4>
          <Link to={ROUTES.home}>🏠 生成应用</Link>
          <NavLink to={ROUTES.plazaFeed} end className={sideLinkClass}>
            📡 应用广场
            {publicFeedCount > 0 && <span className="plaza-side-count">{publicFeedCount}</span>}
          </NavLink>
          <NavLink to={ROUTES.plazaMyApps} className={sideLinkClass}>
            📱 我的应用
            {myAppsCount > 0 && <span className="plaza-side-count">{myAppsCount}</span>}
          </NavLink>
          <p className="plaza-side-note">
            应用广场浏览 @公开 应用；我的应用管理你创建的应用与模块配置
          </p>
        </aside>

        <Outlet />

        {!onMyAppsPage && (
          <aside className="plaza-right">
            <h4>📊 应用广场</h4>
            <p className="plaza-stats">@公开 应用 <strong>{publicFeedCount}</strong></p>
            <p className="plaza-stats">我的应用 <strong>{myAppsCount}</strong></p>
            <Link to={ROUTES.plazaMyApps} className="plaza-right-link">去我的应用 →</Link>
          </aside>
        )}
      </div>
      <B2BSiteFooter variant="light" className="plaza-site-footer" />
      <PlazaFloatingAgent />
      </div>
      </PlazaRunBridge>
      </PlazaFocusProvider>
    </AgentPageProvider>
  )
}
