import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandMark from '../BrandMark'
import { BRAND } from '../../data/brand'
import { getAdminUrl, getAdminDashboardUrl } from '../../data/constants'
import { ROUTES } from '../../routes/paths'
import type { AuthUser } from '../../auth/session'
import { AgentChevronGlyph } from '../AgentChevron'
import { IconLogIn } from '../icons'
import { scrollToHomeSection, type HomeSectionId } from '../../hooks/useHomeActiveSection'

type NavItem =
  | { kind: 'scroll'; id: HomeSectionId; label: string }
  | { kind: 'link'; to: string; label: string; match?: (path: string) => boolean }

const NAV_ITEMS: NavItem[] = [
  { kind: 'scroll', id: 'product', label: '产品能力' },
  { kind: 'link', to: ROUTES.cases, label: '落地案例', match: (p) => p.startsWith('/cases') },
  { kind: 'link', to: ROUTES.trust, label: '信任合规', match: (p) => p === ROUTES.trust },
  { kind: 'link', to: ROUTES.pricing, label: '定价说明', match: (p) => p === ROUTES.pricing },
  { kind: 'link', to: ROUTES.news, label: '新闻动态', match: (p) => p.startsWith('/news') },
]

interface Props {
  user: AuthUser | null
  activeSection: HomeSectionId
  onBook: () => void
  onLogout: () => void
}

export default function B2BHeader({ user, activeSection, onBook, onLogout }: Props) {
  const [compact, setCompact] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 48)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`b2b-header${compact ? ' is-compact' : ''}`}>
      <div className="b2b-header-accent" aria-hidden />
      <div className="b2b-nav">
        <Link to="/" className="b2b-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <BrandMark size={compact ? 36 : 42} />
          <span className="b2b-logo-text">
            <strong>{BRAND.nameZh}</strong>
            <em>{BRAND.nameEn}</em>
          </span>
        </Link>

        <nav className="b2b-nav-rail" aria-label="首页导航">
          <ul className="b2b-nav-menu">
            {NAV_ITEMS.map((item) => {
              if (item.kind === 'link') {
                const active = item.match ? item.match(pathname) : pathname === item.to
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`b2b-nav-pill${active ? ' on' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                      <span className="b2b-nav-label">{item.label}</span>
                    </Link>
                  </li>
                )
              }
              const active = activeSection === item.id
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`b2b-nav-pill${active ? ' on' : ''}`}
                    aria-current={active ? 'location' : undefined}
                    onClick={() => scrollToHomeSection(item.id)}
                  >
                    <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                    <span className="b2b-nav-label">{item.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="b2b-nav-actions">
          <div className="b2b-nav-actions-btns">
            <Link to={ROUTES.plazaFeed} className="b2b-nav-btn b2b-nav-btn-link b2b-nav-btn--compact">
              应用广场
            </Link>
            <button
              type="button"
              className={`b2b-nav-btn b2b-nav-btn--compact${activeSection === 'contact-create' ? ' is-active' : ''}`}
              onClick={() => scrollToHomeSection('contact-create')}
            >
              在线体验
            </button>
            <button type="button" className="b2b-nav-btn b2b-nav-btn--compact" onClick={onBook}>
              预约演示
            </button>
          </div>
          <div className="b2b-nav-actions-tail">
            {user ? (
              <>
                <span className="b2b-nav-user">{user.display_name}</span>
                <a className="b2b-nav-link" href={getAdminDashboardUrl()}>管理后台</a>
                <button type="button" className="b2b-nav-link b2b-nav-link-btn" onClick={onLogout}>退出</button>
              </>
            ) : (
              <a className="b2b-nav-login" href={getAdminUrl()} aria-label="登录" title="登录">
                <IconLogIn size={20} />
              </a>
            )}
          </div>
        </div>
      </div>
      <div id="header-float-anchor" className="b2b-header-float-anchor" aria-hidden />
    </header>
  )
}
