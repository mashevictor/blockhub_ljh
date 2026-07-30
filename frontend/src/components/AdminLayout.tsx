import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { LocaleSwitch, useI18n, useT } from '@blockhub/i18n/react'
import { fetchCatalogSummary, fetchDashboard, type CatalogSummary, type DashboardStats } from '../api/client'
import { fetchBillingMe, type BillingMe } from '../api/billing'
import { logout } from '../auth/session'
import { useAuth } from '../auth/AuthContext'
import ThemePicker from './ThemePicker'
import BrandMark from './BrandMark'
import { BRAND, homePublicUrl } from '../data/brand'
import { PLATFORM_STATS } from '@shared/platformStats'
import { canAccessRole, roleDisplayLabel, type AppRole } from '../lib/roles'
import {
  IconHome,
  IconBot,
  IconList,
  IconSparkles,
  IconMessage,
  IconMic,
  IconBook,
  IconCheckCircle,
  IconBarChart,
  IconBell,
  IconStamp,
  IconLayers,
  IconSettings,
  IconGrid,
  IconMenu,
  IconX,
} from './icons'

const NAV: Array<{ to: string; labelKey: string; icon: typeof IconHome; end?: boolean; roles: AppRole[] }> = [
  { to: '/', labelKey: 'admin.nav.workbench', icon: IconHome, end: true, roles: ['admin', 'tenant_owner', 'employee'] },
  { to: '/agents', labelKey: 'admin.nav.agents', icon: IconBot, roles: ['admin'] },
  { to: '/capabilities/review', labelKey: 'admin.nav.review', icon: IconGrid, roles: ['admin'] },
  { to: '/scenarios', labelKey: 'admin.nav.scenarios', icon: IconList, roles: ['admin'] },
  { to: '/create', labelKey: 'admin.nav.create', icon: IconSparkles, roles: ['admin'] },
  { to: '/chat', labelKey: 'admin.nav.chat', icon: IconMessage, roles: ['admin', 'tenant_owner', 'employee'] },
  { to: '/voice/shanghai', labelKey: 'admin.nav.voice', icon: IconMic, roles: ['admin', 'tenant_owner', 'employee'] },
  { to: '/knowledge', labelKey: 'admin.nav.knowledge', icon: IconBook, roles: ['admin', 'tenant_owner', 'employee'] },
  { to: '/approvals', labelKey: 'admin.nav.approvals', icon: IconCheckCircle, roles: ['admin', 'tenant_owner', 'employee'] },
  { to: '/contracts', labelKey: 'admin.nav.contracts', icon: IconStamp, roles: ['admin'] },
  { to: '/reports', labelKey: 'admin.nav.reports', icon: IconBarChart, roles: ['admin'] },
  { to: '/integrations', labelKey: 'admin.nav.integrations', icon: IconLayers, roles: ['admin'] },
  { to: '/settings/tenant', labelKey: 'admin.nav.settings', icon: IconSettings, roles: ['admin'] },
  { to: '/notifications', labelKey: 'admin.nav.notifications', icon: IconBell, roles: ['admin', 'tenant_owner', 'employee'] },
]

export default function AdminLayout() {
  const t = useT()
  const { locale } = useI18n()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null)
  const [billing, setBilling] = useState<BillingMe | null>(null)
  const [navOpen, setNavOpen] = useState(false)
  const { user, role } = useAuth()
  const location = useLocation()

  const isEn = locale === 'en-US'
  const brandPrimary = isEn ? BRAND.nameEn : BRAND.nameZh
  const brandSecondary = isEn ? BRAND.nameZh : BRAND.nameEn
  const roleModeLabel =
    user?.role === 'employee' ? t('admin.shell.brand_workbench') : t('admin.shell.brand_admin')

  useEffect(() => {
    fetchDashboard().then(setStats).catch(() => {})
    fetchCatalogSummary().then(setCatalog).catch(() => {})
    const loadBilling = () => {
      fetchBillingMe().then(setBilling).catch(() => {})
    }
    loadBilling()
    const onFocus = () => {
      if (document.visibilityState === 'visible') loadBilling()
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'blockhub:quota-ping' && e.newValue) loadBilling()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  useEffect(() => {
    setNavOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [navOpen])

  useEffect(() => {
    document.documentElement.lang = locale === 'en-US' ? 'en' : 'zh-CN'
  }, [locale])

  const visibleNav = useMemo(
    () => NAV.filter((n) => canAccessRole(user?.role ?? role, n.roles)),
    [user, role],
  )

  const roleLabel = roleDisplayLabel(user?.role, t)
  const planName = billing?.plan?.name || billing?.plan_tier || ''
  const planFeatures = (billing?.plan?.features || []).slice(0, 3)
  const hasApproval = Boolean(billing?.plan?.schema_approval)
  const industryPacks = billing?.plan?.industry_packs
  const packsText =
    industryPacks === null || industryPacks === undefined
      ? t('admin.sidebar.packs_unlimited')
      : industryPacks === 0
        ? t('admin.sidebar.packs_none')
        : t('admin.sidebar.packs_n', { n: industryPacks })

  const closeNav = () => setNavOpen(false)
  const billingHref = `${homePublicUrl().replace(/\/$/, '')}/account/billing`

  return (
    <div className={`layout${navOpen ? ' is-nav-open' : ''}`}>
      <div
        className={`nav-backdrop${navOpen ? ' is-open' : ''}`}
        aria-hidden={!navOpen}
        onClick={closeNav}
      />
      <aside className="sidebar" id="admin-sidebar-nav">
        <div className="sidebar-brand">
          <BrandMark size={42} className="sidebar-brand-mark" />
          <div className="sidebar-brand-text">
            <h2>{brandPrimary}</h2>
            <p>
              {brandSecondary} · {roleModeLabel}
            </p>
          </div>
          <button
            type="button"
            className="sidebar-close-btn"
            aria-label={t('admin.topbar.menu_close')}
            onClick={closeNav}
          >
            <IconX size={20} aria-hidden />
          </button>
        </div>
        {planName ? (
          <div className="sidebar-meta" style={{ marginBottom: 8 }}>
            <strong>{planName}</strong>
            <br />
            {packsText}
            {' · '}
            {hasApproval ? t('admin.sidebar.approval_required') : t('admin.sidebar.approval_instant')}
            {planFeatures.length > 0 ? (
              <>
                <br />
                <span style={{ opacity: 0.85 }}>{planFeatures.join(' · ')}</span>
              </>
            ) : null}
          </div>
        ) : null}
        <div className="sidebar-meta">
          {t('admin.sidebar.scenarios', { n: catalog?.total ?? PLATFORM_STATS.scenarios })}
          <>
            <br />
            {t('admin.sidebar.platform', {
              caps: PLATFORM_STATS.capabilities,
              agents: PLATFORM_STATS.agents,
            })}
          </>
        </div>
        <nav className="nav-section" aria-label={t('admin.nav.section')}>
          <div className="nav-label">{t('admin.nav.section')}</div>
          {visibleNav.map((n) => {
            const NavIcon = n.icon
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={closeNav}
              >
                <span className="nav-icon">
                  <NavIcon size={17} />
                </span>
                <span className="nav-link-text">{t(n.labelKey)}</span>
              </NavLink>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-footer-links">
            <a className="sidebar-footer-link" href={billingHref} onClick={closeNav}>
              {t('admin.topbar.billing')}
            </a>
            <a
              className="sidebar-footer-link"
              href={homePublicUrl()}
              target="_blank"
              rel="noreferrer"
              onClick={closeNav}
            >
              {t('admin.topbar.create')}
            </a>
          </div>
          <LocaleSwitch className="b2b-locale-switch admin-locale-switch" variant="toggle" />
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-leading">
            <button
              type="button"
              className="topbar-menu-btn"
              aria-expanded={navOpen}
              aria-controls="admin-sidebar-nav"
              aria-label={navOpen ? t('admin.topbar.menu_close') : t('admin.topbar.menu')}
              onClick={() => setNavOpen((v) => !v)}
            >
              {navOpen ? <IconX size={22} aria-hidden /> : <IconMenu size={22} aria-hidden />}
            </button>
            <span className="topbar-title">{t('admin.topbar.title')}</span>
          </div>
          <div className="topbar-actions">
            <a className="topbar-home-link topbar-link-desktop" href={billingHref}>
              {t('admin.topbar.billing')}
            </a>
            <a
              className="topbar-home-link topbar-link-desktop"
              href={homePublicUrl()}
              target="_blank"
              rel="noreferrer"
            >
              {t('admin.topbar.create')}
            </a>
            <ThemePicker />
            <LocaleSwitch className="b2b-locale-switch admin-locale-switch topbar-locale" variant="toggle" />
            {user && (
              <span className="topbar-user">
                {user.display_name || user.email}
                {roleLabel ? ` · ${roleLabel}` : ''}
                {planName ? ` · ${planName}` : ''}
              </span>
            )}
            <button type="button" className="topbar-logout" onClick={() => logout()}>
              {t('admin.topbar.logout')}
            </button>
            <span className="status-badge">
              <span className="status-dot" />
              {stats?.status_text ?? t('admin.topbar.status_ok')}
            </span>
          </div>
        </header>
        <main key={location.pathname} className="page-content page-enter">
          <Outlet context={{ billing }} />
        </main>
      </div>
    </div>
  )
}
