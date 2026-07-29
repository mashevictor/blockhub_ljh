import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { LocaleSwitch, useT } from '@blockhub/i18n/react'
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
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null)
  const [billing, setBilling] = useState<BillingMe | null>(null)
  const { user, role } = useAuth()
  const location = useLocation()

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

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandMark size={42} className="sidebar-brand-mark" />
          <div>
            <h2>{BRAND.nameZh}</h2>
            <p>
              {BRAND.nameEn} ·{' '}
              {user?.role === 'employee' ? t('admin.sidebar.workbench') : t('admin.sidebar.admin')}
            </p>
          </div>
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
        <nav className="nav-section">
          <div className="nav-label">{t('admin.nav.section')}</div>
          {visibleNav.map((n) => {
            const NavIcon = n.icon
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">
                  <NavIcon size={17} />
                </span>
                {t(n.labelKey)}
              </NavLink>
            )
          })}
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span className="topbar-title">{BRAND.adminTitle}</span>
          <div className="topbar-actions">
            <a
              className="topbar-home-link"
              href={`${homePublicUrl().replace(/\/$/, '')}/account/billing`}
            >
              {t('admin.topbar.billing')}
            </a>
            <a className="topbar-home-link" href={homePublicUrl()} target="_blank" rel="noreferrer">
              {t('admin.topbar.create')}
            </a>
            <ThemePicker />
            <LocaleSwitch className="topbar-home-link" />
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
