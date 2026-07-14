import { Link } from 'react-router-dom'
import BrandMark from '../BrandMark'
import { BRAND } from '../../data/brand'
import { ROUTES } from '../../routes/paths'
import { SITE_FOOTER_COLUMNS, SITE_FOOTER_LEGAL } from '../../data/siteFooter'

interface Props {
  /** dark：首页深色底；light：广场/子站浅色底 */
  variant?: 'dark' | 'light'
  className?: string
}

function FooterLink({ to, external, children }: { to: string; external?: boolean; children: React.ReactNode }) {
  if (external || to.startsWith('http') || to.startsWith('mailto:') || to.startsWith('/downloads')) {
    return (
      <a href={to} target={to.startsWith('http') ? '_blank' : undefined} rel={to.startsWith('http') ? 'noreferrer' : undefined}>
        {children}
      </a>
    )
  }
  if (to.includes('#')) {
    return <a href={to}>{children}</a>
  }
  return <Link to={to}>{children}</Link>
}

export default function B2BSiteFooter({ variant = 'dark', className = '' }: Props) {
  const year = new Date().getFullYear()

  return (
    <footer className={`b2b-site-footer variant-${variant}${className ? ` ${className}` : ''}`}>
      <div className="b2b-site-footer-inner">
        <div className="b2b-site-footer-brand">
          <Link to={ROUTES.home} className="b2b-site-footer-logo">
            <BrandMark size={40} />
            <span>
              <strong>{BRAND.nameZh}</strong>
              <em>{BRAND.nameEn}</em>
            </span>
          </Link>
          <p className="b2b-site-footer-tagline">{BRAND.tagline}</p>
        </div>

        <div className="b2b-site-footer-columns">
          {SITE_FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="b2b-site-footer-col">
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <FooterLink to={link.to} external={link.external}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="b2b-site-footer-bottom">
        <p className="b2b-site-footer-copy">
          © {year} {BRAND.nameZh} {BRAND.nameEn} · {BRAND.tagline}
        </p>
        <nav className="b2b-site-footer-legal" aria-label="法律与合规">
          {SITE_FOOTER_LEGAL.map((link) => (
            <FooterLink key={link.label} to={link.to}>{link.label}</FooterLink>
          ))}
        </nav>
      </div>
    </footer>
  )
}
