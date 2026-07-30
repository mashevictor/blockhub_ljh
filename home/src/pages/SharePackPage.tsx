import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useI18n, useT } from '@blockhub/i18n/react'
import { fetchSharePack, type ShareArtifact, type SharePack } from '../api/client'
import BrandMark from '../components/BrandMark'
import { AgentButtonContent, AgentChevronGlyph } from '../components/AgentChevron'
import { ROUTES } from '../routes/paths'
import { homeSectionHref } from '../data/homeNav'
import { usePageMeta } from '../hooks/usePageMeta'
import { localizeDownloadPath } from '../i18n/downloadLocale'
import '../styles/b2b-landing.css'

function summaryLines(text: string): string[] {
  return text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
}

function displayName(
  pack: SharePack,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const sal = pack.salutation.trim()
  const co = pack.company_name.trim()
  if (sal && co) return `${sal} · ${co}`
  return sal || co || t('home.booking.share.you')
}

function localizeArtifact(
  t: (key: string, vars?: Record<string, string | number>) => string,
  locale: string,
  item: ShareArtifact,
): ShareArtifact {
  const titleKey = `home.booking.artifact.${item.id}.title`
  const descKey = `home.booking.artifact.${item.id}.desc`
  const title = t(titleKey)
  const description = t(descKey)
  return {
    ...item,
    title: title === titleKey ? item.title : title,
    description: description === descKey ? item.description : description,
    href: item.href.startsWith('/downloads/')
      ? localizeDownloadPath(item.href, locale)
      : item.href,
  }
}

function ArtifactRow({ item }: { item: ShareArtifact }) {
  const href = item.href
  const isDownload = href.startsWith('/downloads/')
  const isExternal = href.startsWith('http') || isDownload
  const inner = (
    <>
      <AgentChevronGlyph size="xs" className="share-artifact-chev" />
      <span className="share-artifact-text">
        <strong>{item.title}</strong>
        {item.description ? <span>{item.description}</span> : null}
      </span>
    </>
  )
  if (isExternal) {
    return (
      <a className="share-artifact-item" href={href} target="_blank" rel="noreferrer">
        {inner}
      </a>
    )
  }
  return (
    <Link className="share-artifact-item" to={href}>
      {inner}
    </Link>
  )
}

export default function SharePackPage() {
  const t = useT()
  const { locale } = useI18n()
  const { token = '' } = useParams()
  const [pack, setPack] = useState<SharePack | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const name = pack ? displayName(pack, t) : ''

  usePageMeta({
    title: pack
      ? t('home.booking.share.meta_title', { name })
      : t('home.booking.share.meta_title_fallback'),
    description: t('home.booking.share.meta_desc'),
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchSharePack(token, locale)
      .then((data) => {
        if (!cancelled) setPack(data)
      })
      .catch(() => {
        if (!cancelled) setError(t('home.booking.share.invalid'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token, t, locale])

  const artifacts = pack
    ? pack.artifacts.map((item) => localizeArtifact(t, locale, item))
    : []

  return (
    <div className="b2b-app b2b-landing b2b-brand-scope share-pack-page">
      <header className="b2b-header share-pack-site-header">
        <div className="b2b-header-accent" aria-hidden />
        <div className="b2b-nav share-pack-site-nav">
          <Link to={ROUTES.home} className="b2b-logo">
            <BrandMark size={36} />
            <span className="b2b-logo-text">
              <strong>{t('home.booking.share.brand')}</strong>
            </span>
          </Link>
          <nav className="b2b-nav-rail" aria-label={t('home.booking.share.nav_aria')}>
            <ul className="b2b-nav-menu share-pack-site-nav-menu">
              <li>
                <Link to={ROUTES.home} className="b2b-nav-pill">
                  <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                  <span className="b2b-nav-label">{t('home.booking.share.nav_home')}</span>
                </Link>
              </li>
              <li>
                <Link to={homeSectionHref('product')} className="b2b-nav-pill">
                  <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                  <span className="b2b-nav-label">{t('home.booking.share.nav_industry')}</span>
                </Link>
              </li>
              <li>
                <a href={ROUTES.contactCreate} className="b2b-nav-pill marketing-site-nav-cta">
                  <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                  <span className="b2b-nav-label">{t('home.booking.share.nav_try')}</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      {loading && (
        <div className="share-pack-state">
          <p>
            <AgentChevronGlyph size="sign" />
            {t('home.booking.share.loading')}
          </p>
        </div>
      )}
      {error && (
        <div className="share-pack-state share-pack-error">
          <p>{error}</p>
          <Link to={ROUTES.home} className="b2b-btn-outline agent-action-btn">
            {t('home.booking.share.back_home')}
          </Link>
        </div>
      )}
      {pack && !loading && !error && (
        <>
          <header className="share-pack-hero">
            <span className="b2b-eyebrow share-pack-eyebrow">
              <AgentChevronGlyph size="sign" />
              {name}
            </span>
            <h1>{t('home.booking.share.hero_title')}</h1>
            <p>{t('home.booking.share.hero_sub')}</p>
          </header>
          <div className="share-pack-body">
            <main className="share-pack-main">
              <div className="share-pack-tabs" aria-label={t('home.booking.share.tabs_aria')}>
                <span className="share-pack-tab is-active">
                  <AgentChevronGlyph size="xs" />
                  {t('home.booking.share.tab_biz')}
                </span>
                <span className="share-pack-tab is-muted">
                  <AgentChevronGlyph size="xs" />
                  {t('home.booking.share.tab_it')}
                </span>
                <span className="share-pack-tab is-muted">
                  <AgentChevronGlyph size="xs" />
                  {t('home.booking.share.tab_finance')}
                </span>
              </div>
              {pack.agent_summary && (
                <div className="demo-booking-summary-box share-pack-summary">
                  <div className="demo-booking-summary-head">
                    <AgentChevronGlyph size="xs" />
                    {t('home.booking.share.summary_head')}
                  </div>
                  {summaryLines(pack.agent_summary).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
              <p className="share-pack-intro">{t('home.booking.share.intro')}</p>
            </main>
            <aside className="share-pack-aside">
              <h2>
                <AgentChevronGlyph size="sign" />
                {t('home.booking.share.downloads')}
              </h2>
              {artifacts.map((item) => (
                <ArtifactRow key={item.id} item={item} />
              ))}
              <Link to={`${ROUTES.home}#contact-create`} className="b2b-btn-primary agent-action-btn share-pack-cta">
                <AgentButtonContent trailing={false}>{t('home.booking.share.cta_try')}</AgentButtonContent>
              </Link>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
