import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
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
  const t = useT()
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

  const footerPack = industryName
    ? t('home.industry.shell.footer_pack', { name: industryName })
    : t('home.industry.shell.footer_all')

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
          {' · '}{footerPack}
          {' · '}{t('home.brand.tagline')}
        </p>
        <div className="industry-site-footer-links marketing-site-footer-links">
          <Link to={homeSectionHref('product')}>{t('home.footer.link.industries')}</Link>
          <Link to={ROUTES.capship}>CapShip</Link>
          <Link to={ROUTES.cases}>{t('home.footer.link.cases')}</Link>
          <Link to={ROUTES.trust}>{t('home.nav.trust')}</Link>
          <Link to={ROUTES.pricing}>{t('home.footer.link.pricing')}</Link>
          <Link to={ROUTES.news}>{t('home.footer.link.news')}</Link>
          <Link to={homeSectionHref('contact-demo')}>{t('home.footer.link.demo')}</Link>
        </div>
      </footer>
    </div>
  )
}
