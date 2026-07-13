import type { CSSProperties, ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import BrandMark from '../BrandMark'
import { AgentChevronGlyph } from '../AgentChevron'
import { BRAND } from '../../data/brand'
import { ROUTES } from '../../routes/paths'
import '../../styles/b2b-landing.css'

export interface IndustrySiteTheme {
  primary: string
  gradient_to?: string
}

interface Props {
  theme: IndustrySiteTheme
  children: ReactNode
  industryName?: string
  /** 行业差异化视觉：layout + pattern，见 industryVisualThemes.ts */
  layoutClass?: string
}

export default function IndustrySiteShell({ theme, children, industryName, layoutClass }: Props) {
  const { pathname } = useLocation()
  const onHub = pathname === ROUTES.industryHub
  const onDetail = pathname.startsWith('/industry/') && !onHub

  return (
    <div
      className={`b2b-app b2b-landing industry-site b2b-brand-scope${layoutClass ? ` ${layoutClass}` : ''}`}
      style={{
        '--site-primary': theme.primary,
        '--site-gradient-to': theme.gradient_to ?? theme.primary,
        '--ind-accent': theme.primary,
      } as CSSProperties}
    >
      <header className="b2b-header industry-site-header">
        <div className="b2b-header-accent" aria-hidden />
        <div className="b2b-nav industry-site-nav-row">
          <Link to={ROUTES.home} className="b2b-logo">
            <BrandMark size={40} />
            <span className="b2b-logo-text">
              <strong>{BRAND.nameZh}</strong>
              <em>{BRAND.nameEn}</em>
            </span>
          </Link>
          <nav className="b2b-nav-rail" aria-label="行业站导航">
            <ul className="b2b-nav-menu industry-site-nav-menu">
              <li>
                <Link
                  to={ROUTES.industryHub}
                  className={`b2b-nav-pill${onHub ? ' on' : ''}`}
                  aria-current={onHub ? 'page' : undefined}
                >
                  <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                  <span className="b2b-nav-label">全部行业</span>
                </Link>
              </li>
              <li>
                <Link
                  to={ROUTES.home}
                  className={`b2b-nav-pill${!onHub && !onDetail ? ' on' : ''}`}
                >
                  <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                  <span className="b2b-nav-label">平台首页</span>
                </Link>
              </li>
              {industryName ? (
                <li>
                  <span className="b2b-nav-pill on industry-site-nav-current" aria-current="page">
                    <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                    <span className="b2b-nav-label">{industryName}</span>
                  </span>
                </li>
              ) : null}
            </ul>
          </nav>
        </div>
      </header>
      <main className="industry-site-main">{children}</main>
      <footer className="industry-site-footer">
        <p>
          © {new Date().getFullYear()} {BRAND.nameZh}
          {industryName ? ` · ${industryName} 行业深度包` : ' · 20 个行业深度包'}
          {' · '}{BRAND.tagline}
        </p>
        <div className="industry-site-footer-links">
          <Link to={ROUTES.industryHub}>浏览 20 个行业方案</Link>
          <Link to={ROUTES.home}>返回首页创建</Link>
        </div>
      </footer>
    </div>
  )
}
