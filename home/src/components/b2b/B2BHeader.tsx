import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BrandMark from '../BrandMark'
import { BRAND } from '../../data/brand'
import { getAdminUrl, getAdminDashboardUrl } from '../../data/constants'
import { ROUTES } from '../../routes/paths'
import type { AuthUser } from '../../auth/session'
import { AgentButtonContent } from '../AgentChevron'
import type { HomeSectionId } from '../../hooks/useHomeActiveSection'

const NAV_ITEMS: { id: HomeSectionId; href: string; chev: string; label: string }[] = [
  { id: 'product', href: '#product', chev: '模板', label: '产品能力' },
  { id: 'case', href: '#case', chev: '案例', label: '落地案例' },
  { id: 'contact-create', href: '#contact-create', chev: '多选', label: '在线体验' },
]

interface Props {
  user: AuthUser | null
  activeSection: HomeSectionId
  onCreate: () => void
  onBook: () => void
  onLogout: () => void
}

export default function B2BHeader({ user, activeSection, onCreate, onBook, onLogout }: Props) {
  const [compact, setCompact] = useState(false)

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
          <BrandMark size={compact ? 32 : 36} />
          <span className="b2b-logo-text">
            <strong>{BRAND.nameZh}</strong>
            <em>{BRAND.nameEn}</em>
          </span>
        </Link>

        <nav className="b2b-nav-rail" aria-label="首页导航">
          <ul className="b2b-nav-menu">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  className={activeSection === item.id ? 'on' : ''}
                  aria-current={activeSection === item.id ? 'true' : undefined}
                >
                  <span className="b2b-nav-chev" aria-hidden>&gt;&gt;</span>
                  <span className="b2b-nav-chev-label">{item.chev}</span>
                  <span className="b2b-nav-label">{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="b2b-nav-actions">
          <Link to={ROUTES.plazaFeed} className="b2b-nav-plaza">
            <span className="b2b-nav-chev" aria-hidden>&gt;&gt;</span>
            应用广场
          </Link>
          {user ? (
            <>
              <span className="b2b-nav-user">{user.display_name}</span>
              <a className="b2b-nav-link" href={getAdminDashboardUrl()}>管理后台</a>
              <button type="button" className="b2b-nav-link b2b-nav-link-btn" onClick={onLogout}>退出</button>
            </>
          ) : (
            <a className="b2b-nav-link" href={getAdminUrl()}>登录</a>
          )}
          <button type="button" className="b2b-nav-btn-ghost agent-action-btn" onClick={onCreate}>
            <AgentButtonContent trailing={false}>生成应用</AgentButtonContent>
          </button>
          <button type="button" className="b2b-nav-btn agent-action-btn" onClick={onBook}>
            <AgentButtonContent>预约演示</AgentButtonContent>
          </button>
        </div>
      </div>
    </header>
  )
}
