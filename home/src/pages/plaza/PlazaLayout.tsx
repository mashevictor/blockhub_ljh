import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { LocaleSwitch, useT } from '@blockhub/i18n/react'
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

  return (
    <AgentPageProvider initial="plaza_feed">
      <PlazaFocusProvider>
      <PlazaRunBridge>
      <PlazaContextSync />
      <div className="plaza-page b2b-brand-scope b2b-has-floating-agent">
      <header className="plaza-topbar">
        <Link to={ROUTES.home} className="plaza-topbar-brand">
          <BrandMark size={32} />
          <span>
            <strong>{BRAND.nameZh}</strong>
            <em className="plaza-topbar-brand-en">{BRAND.nameEn}</em>
          </span>
        </Link>
        <nav className="plaza-topbar-nav" aria-label={t('home.plaza.nav.aria')}>
          <Link to={ROUTES.home}>
            <span className="plaza-nav-label-full">{t('home.plaza.nav.create')}</span>
            <span className="plaza-nav-label-short">{t('home.plaza.nav.create_short')}</span>
          </Link>
          <NavLink to={ROUTES.plazaFeed} end className={topLinkClass}>
            <span className="plaza-nav-label-full">{t('home.plaza.nav.feed')}</span>
            <span className="plaza-nav-label-short">{t('home.plaza.nav.feed_short')}</span>
          </NavLink>
          <NavLink to={ROUTES.plazaMyApps} className={topLinkClass}>
            <IconLayers size={14} />
            <span className="plaza-nav-label-full">{t('home.plaza.nav.my')}</span>
            <span className="plaza-nav-label-short">{t('home.plaza.nav.my_short')}</span>
            {myAppsCount > 0 && <span className="plaza-my-badge">{myAppsCount}</span>}
          </NavLink>
          <LocaleSwitch className="b2b-locale-switch" variant="chip" />
        </nav>
      </header>

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
