import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { fetchCatalogSummary, fetchDashboard, type CatalogSummary, type DashboardStats } from '../api/client'
import { logout } from '../auth/session'
import { useAuth } from '../auth/AuthContext'
import ThemePicker from './ThemePicker'
import BrandMark from './BrandMark'
import { BRAND, homePublicUrl } from '../data/brand'
import { PLATFORM_STATS } from '@shared/platformStats'
import { canAccessRole, type AppRole } from '../lib/roles'
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
  { to: '/', label: '工作台', icon: IconHome, end: true, roles: ['admin', 'employee'] },
  { to: '/agents', label: '能力中心', icon: IconBot, roles: ['admin'] },
  { to: '/capabilities/review', label: '能力审核', icon: IconGrid, roles: ['admin'] },
  { to: '/scenarios', label: '业务场景', icon: IconList, roles: ['admin'] },
  { to: '/create', label: '创建应用', icon: IconSparkles, roles: ['admin'] },
  { to: '/chat', label: '智能问答', icon: IconMessage, roles: ['admin', 'employee'] },
  { to: '/voice/shanghai', label: '上海话语音', icon: IconMic, roles: ['admin', 'employee'] },
  { to: '/knowledge', label: '知识库', icon: IconBook, roles: ['admin', 'employee'] },
  { to: '/approvals', label: '审批中心', icon: IconCheckCircle, roles: ['admin', 'employee'] },
  { to: '/contracts', label: '合同盖章', icon: IconStamp, roles: ['admin'] },
  { to: '/reports', label: '数据报表', icon: IconBarChart, roles: ['admin'] },
  { to: '/integrations', label: '系统集成', icon: IconLayers, roles: ['admin'] },
  { to: '/settings/tenant', label: '租户配置', icon: IconSettings, roles: ['admin'] },
  { to: '/notifications', label: '消息通知', icon: IconBell, roles: ['admin', 'employee'] },
]

export default function AdminLayout() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null)
  const { user, role } = useAuth()
  const location = useLocation()

  useEffect(() => {
    fetchDashboard().then(setStats).catch(() => {})
    fetchCatalogSummary().then(setCatalog).catch(() => {})
  }, [])

  const visibleNav = useMemo(
    () => NAV.filter((n) => canAccessRole(user?.role ?? role, n.roles)),
    [user, role],
  )

  const roleLabel = user?.role === 'admin' ? '管理员' : user?.role === 'employee' ? '使用者' : user?.role

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
            <a className="topbar-home-link" href={homePublicUrl()} target="_blank" rel="noreferrer">
              创建入口
            </a>
            <ThemePicker />
            {user && (
              <span className="topbar-user">
                {user.display_name || user.email}
                {roleLabel ? ` · ${roleLabel}` : ''}
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
          <Outlet />
        </main>
      </div>
    </div>
  )
}
