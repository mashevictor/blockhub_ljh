import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LocaleSwitch, useT } from '@blockhub/i18n/react'
import BrandMark from '../BrandMark'
import { BRAND } from '../../data/brand'
import { B2B_NAV_ITEMS, homeSectionHref } from '../../data/homeNav'
import { getAdminUrl, getAdminDashboardUrl } from '../../data/constants'
import { ROUTES } from '../../routes/paths'
import type { AuthUser } from '../../auth/session'
import { AgentChevronGlyph } from '../AgentChevron'
import { IconGithub, IconLogIn } from '../icons'
import { scrollToHomeSection, type HomeSectionId } from '../../hooks/useHomeActiveSection'

interface Props {
  user: AuthUser | null
  /** 仅首页滚动区高亮；子站不传或传 undefined */
  activeSection?: HomeSectionId
  onLogout: () => void
}

export default function B2BHeader({ user, activeSection = 'hero', onLogout }: Props) {
  const t = useT()
  const [compact, setCompact] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const isHome = pathname === ROUTES.home

  useEffect(() => {
    // 滞回：避免 scrollY 在阈值附近抖动时，logo 尺寸 36↔42 来回跳
    let compactNow = window.scrollY > 48
    setCompact(compactNow)
    const onScroll = () => {
      const y = window.scrollY
      const next = compactNow ? y > 28 : y > 64
      if (next === compactNow) return
      compactNow = next
      setCompact(next)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const goHomeSection = (id: HomeSectionId | string) => {
    if (isHome) {
      scrollToHomeSection(id)
      return
    }
    navigate(homeSectionHref(id))
  }

  return (
    <header className={`b2b-header${compact ? ' is-compact' : ''}`}>
      <div className="b2b-header-accent" aria-hidden />
      <div className="b2b-nav">
        <Link
          to={ROUTES.home}
          className="b2b-logo"
          onClick={(e) => {
            if (isHome) {
              e.preventDefault()
              scrollToHomeSection('hero')
            }
          }}
        >
          <BrandMark size={40} />
          <span className="b2b-logo-text">
            <strong>{BRAND.nameZh}</strong>
            <em>{BRAND.nameEn}</em>
          </span>
        </Link>

        <nav className="b2b-nav-rail" aria-label="站点导航">
          <ul className="b2b-nav-menu">
            {B2B_NAV_ITEMS.map((item) => {
              if (item.kind === 'link') {
                const active = item.match ? item.match(pathname) : pathname === item.to
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className={`b2b-nav-pill${active ? ' on' : ''}${item.icon === 'github' ? ' b2b-nav-pill--github' : ''}`}
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.icon === 'github' ? (
                        <IconGithub size={14} className="b2b-nav-github" aria-hidden />
                      ) : (
                        <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                      )}
                      <span className="b2b-nav-label">{t(item.labelKey)}</span>
                    </Link>
                  </li>
                )
              }
              const active = isHome
                ? activeSection === item.id
                : (item.match?.(pathname) ?? false)
              if (isHome) {
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`b2b-nav-pill${active ? ' on' : ''}`}
                      aria-current={active ? 'location' : undefined}
                      onClick={() => goHomeSection(item.id)}
                    >
                      <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                      <span className="b2b-nav-label">{t(item.labelKey)}</span>
                    </button>
                  </li>
                )
              }
              return (
                <li key={item.id}>
                  <Link
                    to={homeSectionHref(item.id)}
                    className={`b2b-nav-pill${active ? ' on' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                    <span className="b2b-nav-label">{t(item.labelKey)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="b2b-nav-actions">
          <div className="b2b-nav-actions-btns">
            <Link to={ROUTES.plazaFeed} className="b2b-nav-btn b2b-nav-btn-link b2b-nav-btn--compact">
              {t('home.action.plaza')}
            </Link>
            {isHome ? (
              <button
                type="button"
                className={`b2b-nav-btn b2b-nav-btn--compact${activeSection === 'contact-create' ? ' is-active' : ''}`}
                onClick={() => goHomeSection('contact-create')}
              >
                {t('home.action.try')}
              </button>
            ) : (
              <Link to={homeSectionHref('contact-create')} className="b2b-nav-btn b2b-nav-btn-link b2b-nav-btn--compact">
                {t('home.action.try')}
              </Link>
            )}
            {isHome ? (
              <button
                type="button"
                className={`b2b-nav-btn b2b-nav-btn--compact${activeSection === 'contact-demo' ? ' is-active' : ''}`}
                onClick={() => goHomeSection('contact-demo')}
              >
                {t('home.action.demo')}
              </button>
            ) : (
              <Link to={homeSectionHref('contact-demo')} className="b2b-nav-btn b2b-nav-btn-link b2b-nav-btn--compact">
                {t('home.action.demo')}
              </Link>
            )}
          </div>
          <div className="b2b-nav-actions-tail">
            {!pathname.startsWith(ROUTES.capship) && (
              <LocaleSwitch className="b2b-locale-switch" variant="chip" />
            )}
            {user ? (
              <>
                <Link className="b2b-nav-link" to={ROUTES.accountBilling}>{t('home.action.account')}</Link>
                <a className="b2b-nav-link" href={getAdminDashboardUrl()}>{t('home.action.admin')}</a>
                <button type="button" className="b2b-nav-link b2b-nav-link-btn" onClick={onLogout}>{t('home.action.logout')}</button>
              </>
            ) : (
              <a className="b2b-nav-login" href={getAdminUrl()} aria-label={t('home.action.login')} title={t('home.action.login')}>
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
