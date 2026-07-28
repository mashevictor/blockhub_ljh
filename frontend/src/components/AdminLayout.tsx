import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { LocaleSwitch } from '@blockhub/i18n/react'
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

const NAV: Array<{ to: string; label: string; icon: typeof IconHome; end?: boolean; roles: AppRole[] }> = [
  // 全员
  { to: '/', label: '工作台', icon: IconHome, end: true, roles: ['admin', 'tenant_owner', 'employee'] },
  // 本租户管理（admin + tenant_owner；canAccessRole 对 admin 项也会放行 owner）
  { to: '/agents', label: '能力中心', icon: IconBot, roles: ['admin'] },
  { to: '/capabilities/review', label: '能力审核', icon: IconGrid, roles: ['admin'] },
  { to: '/scenarios', label: '业务场景', icon: IconList, roles: ['admin'] },
  { to: '/create', label: '创建应用', icon: IconSparkles, roles: ['admin'] },
  // 全员协作
  { to: '/chat', label: '智能问答', icon: IconMessage, roles: ['admin', 'tenant_owner', 'employee'] },
  { to: '/voice/shanghai', label: '上海话语音', icon: IconMic, roles: ['admin', 'tenant_owner', 'employee'] },
  { to: '/knowledge', label: '知识库', icon: IconBook, roles: ['admin', 'tenant_owner', 'employee'] },
  { to: '/approvals', label: '审批中心', icon: IconCheckCircle, roles: ['admin', 'tenant_owner', 'employee'] },
  // 本租户管理
  { to: '/contracts', label: '合同盖章', icon: IconStamp, roles: ['admin'] },
  { to: '/reports', label: '数据报表', icon: IconBarChart, roles: ['admin'] },
  { to: '/integrations', label: '系统集成', icon: IconLayers, roles: ['admin'] },
  { to: '/settings/tenant', label: '租户配置', icon: IconSettings, roles: ['admin'] },
  // 全员
  { to: '/notifications', label: '消息通知', icon: IconBell, roles: ['admin', 'tenant_owner', 'employee'] },
]

export default function AdminLayout() {
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

  const roleLabel = roleDisplayLabel(user?.role)
  const planName = billing?.plan?.name || billing?.plan_tier || ''
  const planFeatures = (billing?.plan?.features || []).slice(0, 3)
  const hasApproval = Boolean(billing?.plan?.schema_approval)
  const industryPacks = billing?.plan?.industry_packs

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandMark size={42} className="sidebar-brand-mark" />
          <div>
            <h2>{BRAND.nameZh}</h2>
            <p>{BRAND.nameEn} · {user?.role === 'employee' ? '工作台' : '管理后台'}</p>
          </div>
        </div>
        {planName ? (
          <div className="sidebar-meta" style={{ marginBottom: 8 }}>
            <strong>{planName}</strong>
            <br />
            {industryPacks === null || industryPacks === undefined
              ? '行业包不限'
              : industryPacks === 0
                ? '无行业包（办公/模块）'
                : `行业包 ${industryPacks} 个`}
            {' · '}
            {hasApproval ? '改页需审批' : '改页即生效'}
            {planFeatures.length > 0 ? (
              <>
                <br />
                <span style={{ opacity: 0.85 }}>{planFeatures.join(' · ')}</span>
              </>
            ) : null}
          </div>
        ) : null}
        <div className="sidebar-meta">
          {catalog ? `${catalog.total} 个业务场景` : `${PLATFORM_STATS.scenarios} 个业务场景`}
          <>
            <br />
            {PLATFORM_STATS.capabilities} 项能力 · {PLATFORM_STATS.agents} 个助手 · 运行正常
          </>
        </div>
        <nav className="nav-section">
          <div className="nav-label">导航</div>
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
                {n.label}
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
              我的套餐
            </a>
            <a className="topbar-home-link" href={homePublicUrl()} target="_blank" rel="noreferrer">
              创建入口
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
            <button type="button" className="topbar-logout" onClick={() => logout()}>退出</button>
            <span className="status-badge">
              <span className="status-dot" />
              {stats?.status_text ?? '系统运行正常'}
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
