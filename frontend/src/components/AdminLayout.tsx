import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { fetchCatalogSummary, fetchDashboard, type CatalogSummary, type DashboardStats } from '../api/client'
import { fetchMe, logout, type AuthUser } from '../auth/session'
import ThemePicker from './ThemePicker'
import BrandMark from './BrandMark'
import { BRAND } from '../data/brand'
import {
  IconHome,
  IconBot,
  IconList,
  IconSparkles,
  IconMessage,
  IconBook,
  IconCheckCircle,
  IconBarChart,
  IconBell,
} from './icons'

const NAV = [
  { to: '/', label: '工作台', icon: IconHome, end: true },
  { to: '/agents', label: '能力中心', icon: IconBot },
  { to: '/scenarios', label: '业务场景', icon: IconList },
  { to: '/create', label: '创建应用', icon: IconSparkles },
  { to: '/chat', label: '智能问答', icon: IconMessage },
  { to: '/knowledge', label: '知识库', icon: IconBook },
  { to: '/approvals', label: '审批中心', icon: IconCheckCircle },
  { to: '/reports', label: '数据报表', icon: IconBarChart },
  { to: '/notifications', label: '消息通知', icon: IconBell },
]

export default function AdminLayout() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [catalog, setCatalog] = useState<CatalogSummary | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const location = useLocation()

  useEffect(() => {
    fetchDashboard().then(setStats).catch(() => {})
    fetchCatalogSummary().then(setCatalog).catch(() => {})
    fetchMe().then(setUser).catch(() => {})
  }, [])

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <BrandMark size={42} className="sidebar-brand-mark" />
          <div>
            <h2>{BRAND.nameZh}</h2>
            <p>{BRAND.nameEn} · 管理后台</p>
          </div>
        </div>
        <div className="sidebar-meta">
          {catalog ? `${catalog.total} 个业务场景` : '加载中…'}
          {stats && (
            <>
              <br />
              {stats.agents} 大能力 · 运行正常
            </>
          )}
        </div>
        <nav className="nav-section">
          <div className="nav-label">导航</div>
          {NAV.map((n) => {
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
            <a className="topbar-home-link" href={BRAND.homeUrl} target="_blank" rel="noreferrer">
              创建入口
            </a>
            <ThemePicker />
            {user && <span className="topbar-user">{user.display_name || user.email}</span>}
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
