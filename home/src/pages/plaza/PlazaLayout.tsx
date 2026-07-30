import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { LocaleSwitch, useT } from '@blockhub/i18n/react'
import BrandMark from '../../components/BrandMark'
import { BRAND } from '../../data/brand'
import { IconLayers, IconMenu, IconX } from '../../components/icons'
import { useMyApps } from '../../hooks/useMyApps'
import { loadPlazaFeedItemsAsync } from '../../lib/plazaFeedStorage'
import { ROUTES } from '../../routes/paths'
import { AgentPageProvider, useAgentPageContext } from '../../context/AgentPageContext'
import { PlazaFocusProvider } from '../../context/PlazaFocusContext'
import type { AgentContextKey } from '../../data/agentContext'
import PlazaFloatingAgent from '../../components/b2b/PlazaFloatingAgent'
import B2BSiteFooter from '../../components/b2b/B2BSiteFooter'
import PlazaRunBridge from '../../components/plaza/PlazaRunBridge'
import { bootstrapShanghaiVoiceProject } from '../../lib/shanghaiVoiceProject'
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
  const t = useT()
  const myApps = useMyApps()
  const myAppsCount = myApps.length
  const [publicFeedCount, setPublicFeedCount] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const onMyAppsPage = pathname === ROUTES.plazaMyApps

  useEffect(() => {
    void loadPlazaFeedItemsAsync().then((items) => setPublicFeedCount(items.length))
  }, [pathname])

  useEffect(() => {
    document.body.classList.add('b2b-landing')
    return () => document.body.classList.remove('b2b-landing')
  }, [])

  useEffect(() => {
    bootstrapShanghaiVoiceProject()
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const renderNavLinks = (opts?: { drawer?: boolean }) => (
    <>
      <Link to={ROUTES.home} onClick={closeMenu}>
        <span className="plaza-nav-label-full">{t('home.plaza.nav.create')}</span>
        {!opts?.drawer && <span className="plaza-nav-label-short">{t('home.plaza.nav.create_short')}</span>}
      </Link>
      <NavLink to={ROUTES.plazaFeed} end className={topLinkClass} onClick={closeMenu}>
        <span className="plaza-nav-label-full">{t('home.plaza.nav.feed')}</span>
        {!opts?.drawer && <span className="plaza-nav-label-short">{t('home.plaza.nav.feed_short')}</span>}
      </NavLink>
      <NavLink to={ROUTES.plazaMyApps} className={topLinkClass} onClick={closeMenu}>
        <IconLayers size={14} />
        <span className="plaza-nav-label-full">{t('home.plaza.nav.my')}</span>
        {!opts?.drawer && <span className="plaza-nav-label-short">{t('home.plaza.nav.my_short')}</span>}
        {myAppsCount > 0 && <span className="plaza-my-badge">{myAppsCount}</span>}
      </NavLink>
    </>
  )

  return (
    <AgentPageProvider initial="plaza_feed">
      <PlazaFocusProvider>
      <PlazaRunBridge>
      <PlazaContextSync />
      <div className={`plaza-page b2b-brand-scope b2b-has-floating-agent${menuOpen ? ' is-nav-open' : ''}`}>
      <header className="plaza-topbar">
        <Link to={ROUTES.home} className="plaza-topbar-brand" onClick={closeMenu}>
          <BrandMark size={32} />
          <span>
            <strong>{BRAND.nameZh}</strong>
            <em className="plaza-topbar-brand-en">{BRAND.nameEn}</em>
          </span>
        </Link>
        <nav className="plaza-topbar-nav plaza-topbar-nav--desktop" aria-label={t('home.plaza.nav.aria')}>
          {renderNavLinks()}
          <LocaleSwitch className="b2b-locale-switch" variant="toggle" />
        </nav>
        <div className="plaza-topbar-mobile-actions">
          <LocaleSwitch className="b2b-locale-switch plaza-topbar-locale-mobile" variant="toggle" />
          <button
            type="button"
            className="plaza-topbar-menu-btn"
            aria-expanded={menuOpen}
            aria-controls="plaza-nav-drawer"
            aria-label={menuOpen ? t('home.action.menu_close') : t('home.action.menu')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <IconX size={22} aria-hidden /> : <IconMenu size={22} aria-hidden />}
          </button>
        </div>
      </header>

      <div
        className={`plaza-nav-drawer-backdrop${menuOpen ? ' is-open' : ''}`}
        aria-hidden={!menuOpen}
        onClick={closeMenu}
      />
      <div
        id="plaza-nav-drawer"
        className={`plaza-nav-drawer${menuOpen ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('home.plaza.nav.aria')}
        aria-hidden={!menuOpen}
      >
        <div className="plaza-nav-drawer-head">
          <strong>{BRAND.nameZh}</strong>
          <button
            type="button"
            className="plaza-topbar-menu-btn"
            aria-label={t('home.action.menu_close')}
            onClick={closeMenu}
          >
            <IconX size={22} aria-hidden />
          </button>
        </div>
        <nav className="plaza-nav-drawer-nav" aria-label={t('home.plaza.nav.aria')}>
          {renderNavLinks({ drawer: true })}
        </nav>
      </div>

      <div className="plaza-flow-strip" role="marquee" aria-label={t('home.plaza.strip.aria')}>
        <p className="plaza-flow-strip-text plaza-flow-strip-text--full">{t('home.plaza.strip.full')}</p>
        <p className="plaza-flow-strip-text plaza-flow-strip-text--short">{t('home.plaza.strip.short')}</p>
      </div>

      <nav className="plaza-mobile-tabs" aria-label={t('home.plaza.mobile.aria')}>
        <NavLink to={ROUTES.plazaFeed} end className={sideLinkClass}>
          {t('home.plaza.nav.feed')}
          {publicFeedCount > 0 && <span className="plaza-side-count">{publicFeedCount}</span>}
        </NavLink>
        <NavLink to={ROUTES.plazaMyApps} className={sideLinkClass}>
          {t('home.plaza.nav.my')}
          {myAppsCount > 0 && <span className="plaza-side-count">{myAppsCount}</span>}
        </NavLink>
        <Link to={ROUTES.home}>{t('home.plaza.mobile.create')}</Link>
      </nav>

      <div className="plaza-layout">
        <aside className="plaza-side" aria-label={t('home.plaza.side.aria')}>
          <h4>{t('home.plaza.side.nav')}</h4>
          <Link to={ROUTES.home}>🏠 {t('home.plaza.side.create')}</Link>
          <NavLink to={ROUTES.plazaFeed} end className={sideLinkClass}>
            📡 {t('home.plaza.side.feed')}
            {publicFeedCount > 0 && <span className="plaza-side-count">{publicFeedCount}</span>}
          </NavLink>
          <NavLink to={ROUTES.plazaMyApps} className={sideLinkClass}>
            📱 {t('home.plaza.side.my')}
            {myAppsCount > 0 && <span className="plaza-side-count">{myAppsCount}</span>}
          </NavLink>
          <p className="plaza-side-note">{t('home.plaza.side.note')}</p>
        </aside>

        <Outlet />

        {!onMyAppsPage && (
          <aside className="plaza-right">
            <h4>📊 {t('home.plaza.right.title')}</h4>
            <p className="plaza-stats">{t('home.plaza.right.public')} <strong>{publicFeedCount}</strong></p>
            <p className="plaza-stats">{t('home.plaza.right.mine')} <strong>{myAppsCount}</strong></p>
            <Link to={ROUTES.plazaMyApps} className="plaza-right-link">{t('home.plaza.right.goto')}</Link>
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
