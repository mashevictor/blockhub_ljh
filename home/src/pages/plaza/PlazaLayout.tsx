import { Link, NavLink, Outlet } from 'react-router-dom'
import BrandMark from '../../components/BrandMark'
import { BRAND } from '../../data/brand'
import { PLAZA_TRENDS } from '../../data/plazaMock'
import { IconLayers } from '../../components/icons'
import { loadMyApps } from '../../lib/myAppsStorage'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'on' : undefined
}

export default function PlazaLayout() {
  const myAppsCount = loadMyApps().length

  return (
    <div className="plaza-page">
      <header className="plaza-topbar">
        <Link to="/" className="plaza-topbar-brand">
          <BrandMark size={36} />
          <span>{BRAND.nameZh} {BRAND.nameEn}</span>
        </Link>
        <nav className="plaza-topbar-nav">
          <Link to="/">创建应用</Link>
          <NavLink to="/plaza" end className={navClass}>广场</NavLink>
          <NavLink to="/plaza/my" className={({ isActive }) => `plaza-topbar-my${isActive ? ' on' : ''}`}>
            <IconLayers size={14} /> 我的应用
            {myAppsCount > 0 && <span className="plaza-my-badge">{myAppsCount}</span>}
          </NavLink>
        </nav>
      </header>

      <div className="plaza-layout">
        <aside className="plaza-side">
          <h4>导航</h4>
          <Link to="/">🏠 创建应用</Link>
          <NavLink to="/plaza" end className={navClass}>📡 广场 · Newsfeed</NavLink>
          <NavLink to="/plaza/my" className={navClass}>
            📱 我的应用
            {myAppsCount > 0 && <span className="plaza-side-count">{myAppsCount}</span>}
          </NavLink>
        </aside>

        <Outlet />

        <aside className="plaza-right">
          <h4>🔥 热门 @ 标签</h4>
          {PLAZA_TRENDS.map((t) => (
            <div key={t.tag} className="plaza-trend">
              <strong>{t.tag}</strong>
              <span>{t.count}</span>
            </div>
          ))}
          <h4 style={{ marginTop: 20 }}>📊 广场统计</h4>
          <p className="plaza-stats">今日发布 <strong>23</strong><br />互动 <strong>1.2k</strong><br />公开应用 <strong>456</strong></p>
        </aside>
      </div>
    </div>
  )
}
