import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import B2BHeader from '../b2b/B2BHeader'
import { BRAND } from '../../data/brand'
import { ROUTES } from '../../routes/paths'
import { homeSectionHref } from '../../data/homeNav'
import { fetchMe, logout, type AuthUser } from '../../auth/session'
import { getToken } from '../../auth/storage'
import '../../styles/b2b-landing.css'

export interface IndustrySiteTheme {
  primary: string
  gradient_to?: string
}

interface Props {
  theme: IndustrySiteTheme
  children: ReactNode
  industryName?: string
  /** 12 套样式包 + pattern 叠加，见 industryStylePacks.ts / industryVisualThemes.ts */
  layoutClass?: string
}

/** 行业独立站 — 与首页 / 案例 / 定价等子站共用 B2BHeader */
export default function IndustrySiteShell({ theme, children, industryName, layoutClass }: Props) {
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    document.body.classList.add('b2b-landing')
    return () => document.body.classList.remove('b2b-landing')
  }, [])

  useEffect(() => {
    if (!getToken()) {
      setUser(null)
      return
    }
    fetchMe().then(setUser).catch(() => setUser(null))
  }, [])

  return (
    <div
      className={`b2b-app b2b-landing industry-site b2b-brand-scope${layoutClass ? ` ${layoutClass}` : ''}`}
      style={{
        '--site-primary': theme.primary,
        '--site-gradient-to': theme.gradient_to ?? theme.primary,
        '--ind-accent': theme.primary,
      } as CSSProperties}
    >
      <B2BHeader user={user} onLogout={() => logout()} />

      <main className="industry-site-main">{children}</main>

      <footer className="b2b-footer industry-site-footer">
        <p>
          © {new Date().getFullYear()} {BRAND.nameZh}
          {industryName ? ` · ${industryName} 行业深度包` : ' · 20 个行业深度包'}
          {' · '}{BRAND.tagline}
        </p>
        <div className="industry-site-footer-links marketing-site-footer-links">
          <Link to={homeSectionHref('product')}>20 个行业方案</Link>
          <Link to={ROUTES.cases}>落地案例</Link>
          <Link to={ROUTES.trust}>信任合规</Link>
          <Link to={ROUTES.pricing}>定价说明</Link>
          <Link to={ROUTES.news}>新闻动态</Link>
          <Link to={homeSectionHref('contact-demo')}>预约演示</Link>
        </div>
      </footer>
    </div>
  )
}
