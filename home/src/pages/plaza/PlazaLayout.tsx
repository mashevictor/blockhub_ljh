import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import BrandMark from '../../components/BrandMark'
import { BRAND } from '../../data/brand'
import { PLAZA_TRENDS } from '../../data/plazaMock'
import { IconLayers } from '../../components/icons'
import { useMyApps } from '../../hooks/useMyApps'
import { ROUTES } from '../../routes/paths'

function sideLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'on' : ''
}

function topLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'on' : ''
}

export default function PlazaLayout() {
  const myApps = useMyApps()
  const myAppsCount = myApps.length
  const { pathname } = useLocation()
  const onMyApps = pathname === ROUTES.plazaMyApps

  return (
    <div className="plaza-page">
      <header className="plaza-topbar">
        <Link to={ROUTES.home} className="plaza-topbar-brand">
          <BrandMark size={36} />
          <span>{BRAND.nameZh} {BRAND.nameEn}</span>
        </Link>
        <nav className="plaza-topbar-nav">
          <Link to={ROUTES.home}>创建应用</Link>
          <NavLink to={ROUTES.plazaFeed} end className={topLinkClass}>广场</NavLink>
          <NavLink to={ROUTES.plazaMyApps} className={topLinkClass}>
            <IconLayers size={14} /> 我的应用
            {myAppsCount > 0 && <span className="plaza-my-badge">{myAppsCount}</span>}
          </NavLink>
        </nav>
      </header>

      <div className="plaza-flow-strip" aria-hidden>
        <span>&gt;&gt; 应用发布 · 模块数据流 · @ 受众 · Newsfeed &gt;&gt;</span>
        <span>&gt;&gt; 应用发布 · 模块数据流 · @ 受众 · Newsfeed &gt;&gt;</span>
      </div>

      <div className="plaza-layout">
        <aside className="plaza-side" aria-label="广场导航">
          <h4>导航</h4>
          <Link to={ROUTES.home}>🏠 创建应用</Link>
          <NavLink to={ROUTES.plazaFeed} end className={sideLinkClass}>
            📡 广场 · Newsfeed
          </NavLink>
          <NavLink to={ROUTES.plazaMyApps} className={sideLinkClass}>
            📱 我的应用
            {myAppsCount > 0 && <span className="plaza-side-count">{myAppsCount}</span>}
          </NavLink>
          <p className="plaza-side-note">
            <span className="plaza-side-chev">&gt;&gt;</span>
            Feed 用应用数据 · 弹幕区展示模块流
          </p>
        </aside>

        <Outlet />

        {!onMyApps && (
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
        )}
      </div>
    </div>
  )
}
