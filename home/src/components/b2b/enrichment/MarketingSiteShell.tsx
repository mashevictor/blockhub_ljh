import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandMark from '../../BrandMark'
import { AgentChevronGlyph } from '../../AgentChevron'
import { BRAND } from '../../../data/brand'
import { ROUTES } from '../../../routes/paths'
import '../../../styles/b2b-landing.css'

const NAV_ITEMS = [
  { label: '平台首页', to: ROUTES.home, hash: false },
  { label: '行业方案', to: ROUTES.industryHub, hash: false },
  { label: '信任合规', to: ROUTES.trust, hash: false },
  { label: '客户案例', to: ROUTES.cases, hash: false },
  { label: '定价说明', to: ROUTES.pricing, hash: false },
  { label: '新闻动态', to: ROUTES.news, hash: false },
] as const

interface Props {
  children: ReactNode
  pageTitle?: string
  pageEyebrow?: string
  pageLead?: string
}

export default function MarketingSiteShell({ children, pageTitle, pageEyebrow, pageLead }: Props) {
  const { pathname } = useLocation()

  return (
    <div className="b2b-app b2b-landing marketing-site b2b-brand-scope">
      <header className="b2b-header marketing-site-header">
        <div className="b2b-header-accent" aria-hidden />
        <div className="b2b-nav marketing-site-nav-row">
          <Link to={ROUTES.home} className="b2b-logo">
            <BrandMark size={40} />
            <span className="b2b-logo-text">
              <strong>{BRAND.nameZh}</strong>
              <em>{BRAND.nameEn}</em>
            </span>
          </Link>
          <nav className="b2b-nav-rail" aria-label="官网导航">
            <ul className="b2b-nav-menu marketing-site-nav-menu">
              {NAV_ITEMS.map((item) => {
                const active = pathname === item.to || (item.to !== ROUTES.home && pathname.startsWith(item.to))
                return (
                  <li key={item.label}>
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
              })}
              <li>
                <a href={ROUTES.contactDemo} className="b2b-nav-pill marketing-site-nav-cta">
                  <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                  <span className="b2b-nav-label">预约演示</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="marketing-site-main">
        {pageTitle ? (
          <div className="b2b-section-title marketing-site-page-head">
            {pageEyebrow ? <span className="b2b-eyebrow">{pageEyebrow}</span> : null}
            <h1>{pageTitle}</h1>
            {pageLead ? <p>{pageLead}</p> : null}
          </div>
        ) : null}
        <div className="marketing-site-content">{children}</div>
      </main>
      <footer className="marketing-site-footer">
        <p>
          © {new Date().getFullYear()} {BRAND.nameZh} · {BRAND.tagline}
        </p>
        <div className="marketing-site-footer-links">
          <Link to={ROUTES.industryHub}>20 个行业方案</Link>
          <Link to={ROUTES.trust}>信任与合规</Link>
          <Link to={ROUTES.cases}>客户案例</Link>
          <Link to={ROUTES.pricing}>定价说明</Link>
          <Link to={ROUTES.news}>新闻动态</Link>
          <a href={ROUTES.contactDemo}>预约演示</a>
        </div>
      </footer>
    </div>
  )
}
