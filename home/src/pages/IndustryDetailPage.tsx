import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useT, useI18n } from '@blockhub/i18n/react'
import { fetchIndustryPackDetail, fetchIndustrySites, type IndustryPackDetail, type IndustrySiteSummary } from '../api/client'
import { industryAlt, industryDesc, industryName } from '../i18n/industryLabels'
import {
  industryTagline,
  localizeIndustryPackDetail,
  localizeVisualTheme,
} from '../i18n/industryPackI18n'
import IndustrySiteShell from '../components/industry/IndustrySiteShell'
import { DynamicIcon, INDUSTRY_ICONS, IconSparkles } from '../components/icons'
import { usePageMeta } from '../hooks/usePageMeta'
import { useTheme } from '../context/ThemeContext'
import { categoryColor, iconWrapStyle } from '../data/iconPalette'
import { resolveCategoryIcon, INDUSTRIES_SHOWCASE } from '../data/showcase'
import { industryAssets, industryCardImage } from '../data/industryAssets'
import { buildIndustryPageTemplates } from '../data/industryPageTemplates'
import { buildIndustryPackDetailFallback } from '../data/industryDetailFallback'
import { getIndustryVisualTheme } from '../data/industryVisualThemes'
import { getIndustryStylePack, getStylePackMeta, industrySitePackClass } from '../data/industryStylePacks'
import IndustryHeroSection from '../components/industry/IndustryHeroSection'
import IndustryPageTemplateGallery from '../components/industry/IndustryPageTemplateGallery'
import IndustryMicrositePreview from '../components/industry/IndustryMicrositePreview'
import LazyCover from '../components/LazyCover'
import type { IndustryMicrositeTemplate } from '../data/industryMicrositeTemplates'
import { ROUTES } from '../routes/paths'
import '../styles/b2b-landing.css'
import '../styles/industry-style-packs.css'

export default function IndustryDetailPage() {
  const { key = '' } = useParams<{ key: string }>()
  const t = useT()
  const { locale } = useI18n()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const fallbackDetail = useMemo(() => buildIndustryPackDetailFallback(key), [key])
  const [detailRaw, setDetailRaw] = useState<IndustryPackDetail | null>(fallbackDetail)
  const [others, setOthers] = useState<IndustrySiteSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [enriching, setEnriching] = useState(false)

  const showcaseMeta = useMemo(
    () => INDUSTRIES_SHOWCASE.find((i) => i.key === key),
    [key],
  )

  const visualThemeRaw = useMemo(() => getIndustryVisualTheme(key), [key])
  const visualTheme = useMemo(() => localizeVisualTheme(t, visualThemeRaw), [t, visualThemeRaw])
  const detail = useMemo(
    () => (detailRaw ? localizeIndustryPackDetail(t, detailRaw, visualThemeRaw) : null),
    [detailRaw, t, visualThemeRaw],
  )
  const stylePack = useMemo(() => getIndustryStylePack(key), [key])
  const stylePackMeta = useMemo(() => getStylePackMeta(stylePack), [stylePack])
  const layoutClass = `${industrySitePackClass(key)} industry-site--pattern-${visualTheme.pattern}`

  useEffect(() => {
    const fb = buildIndustryPackDetailFallback(key)
    setDetailRaw(fb)
    setError(fb ? null : 'PACK_MISSING')
    if (!key || !fb) return

    fetchIndustryPackDetail(key, { enrich: false })
      .then((next) => {
        setDetailRaw(next)
        setError(null)
      })
      .catch(() => {
        /* 保留本地 fallback，不阻断页面 */
      })
  }, [key, locale])

  useEffect(() => {
    fetchIndustrySites()
      .then((items) => setOthers(items.filter((s) => s.key !== key).slice(0, 6)))
      .catch(() => {
        setOthers(
          INDUSTRIES_SHOWCASE.filter((i) => i.key !== key).slice(0, 6).map((ind) => ({
            key: ind.key,
            name: ind.name,
            icon: '📦',
            color: ind.color,
            tagline: ind.desc,
            scenes: ind.count,
            site_url: ROUTES.industryDetail(ind.key),
            assets: industryAssets(ind.key),
            theme: { primary: ind.color },
          })),
        )
      })
  }, [key, locale])

  const site = detail?.site
  usePageMeta(site ? {
    title: site.title,
    description: site.description,
    ogImage: site.assets.og,
    ogUrl: typeof window !== 'undefined' ? `${window.location.origin}${site.site_url}` : undefined,
  } : showcaseMeta ? {
    title: t('home.industry.detail.meta_suffix', { name: industryName(t, key, showcaseMeta.name) }),
    description: industryDesc(t, key, showcaseMeta.desc),
    ogImage: industryAssets(key).og,
  } : null)

  const sceneTips = useMemo(() => {
    const rawTips = detailRaw?.enrichment?.scene_tips ?? []
    const localizedTips = detail?.enrichment?.scene_tips ?? []
    const rawScenes = detailRaw?.scenes ?? []
    const map = new Map<string, string>()
    rawTips.forEach((tip, i) => {
      const loc = localizedTips[i]
      if (!loc) return
      const match = rawScenes.find((s) => s.name === tip.name)
      if (!match) return
      const locScene = detail?.scenes.find((s) => s.id === match.id)
      if (locScene) map.set(locScene.name, loc.tip)
    })
    return map
  }, [detail, detailRaw])

  const pageTemplates = useMemo(() => {
    if (!detail) return []
    const flat = detail.groups.flatMap((g) => g.items)
    return buildIndustryPageTemplates(detail.pack.name, flat)
  }, [detail])

  const handleOpenDecoupledSite = () => {
    window.open(ROUTES.industrySiteHtml(key), '_blank', 'noopener,noreferrer')
  }

  const handleUseIndustry = () => {
    navigate(`${ROUTES.home}#contact-create?mode=industry&pack=${encodeURIComponent(key)}`)
  }

  const handleComposeWithTemplate = (tpl: IndustryMicrositeTemplate) => {
    const q = new URLSearchParams({
      mode: 'industry',
      pack: key,
      microsite: tpl.id,
    })
    navigate(`${ROUTES.home}#contact-create?${q.toString()}`)
  }

  const handleReEnrich = () => {
    setEnriching(true)
    fetchIndustryPackDetail(key, { enrich: true })
      .then(setDetailRaw)
      .finally(() => setEnriching(false))
  }

  if (error || !detail || !site) {
    return (
      <IndustrySiteShell theme={{ primary: '#0d47a1' }}>
        <p className="industry-detail-error">
          {error === 'PACK_MISSING' || !error ? t('home.industry.detail.not_found') : error}
        </p>
        <Link to={`${ROUTES.home}#product`} className="btn-secondary">{t('home.industry.detail.back_home')}</Link>
      </IndustrySiteShell>
    )
  }

  const { pack, groups, total, enrichment } = detail
  const Icon = INDUSTRY_ICONS[pack.key] ?? IconSparkles
  const accent = site.theme.primary
  const packDisplayName = pack.name
  const heroTagline = visualTheme.heroPitch ?? pack.tagline ?? industryTagline(t, key)
  const overviewText = enrichment?.overview ?? pack.tagline
  const highlightList = enrichment?.highlights?.length ? enrichment.highlights : visualTheme.highlights
  const enrichmentSourceLabel =
    enrichment?.source === 'deepseek'
      ? t('home.industry.detail.source.deepseek')
      : enrichment?.source === 'static'
        ? t('home.industry.detail.source.static')
        : enrichment?.source
          ? t('home.industry.detail.source.auto')
          : null

  return (
    <IndustrySiteShell theme={site.theme} industryName={packDisplayName} layoutClass={layoutClass}>
      <IndustryHeroSection
        variant={stylePackMeta.heroVariant}
        accent={accent}
        gradientTo={site.theme.gradient_to}
        heroImage={site.assets.hero}
        motif={visualTheme.motif}
        badge={t('home.industry.detail.badge', { n: total })}
        title={packDisplayName}
        tagline={heroTagline}
        stats={visualTheme.stats}
        icon={<Icon size={40} />}
        ctaPrimary={
          <button type="button" className="btn-primary" onClick={handleUseIndustry}>
            {t('home.industry.detail.cta_compose')}
          </button>
        }
        ctaSecondary={
          <>
            <button type="button" className="btn-ghost industry-site-ghost" onClick={handleOpenDecoupledSite}>
              {t('home.industry.detail.cta_preview')}
            </button>
            <button type="button" className="btn-ghost industry-site-ghost" disabled={enriching} onClick={handleReEnrich}>
              {enriching ? t('home.industry.detail.cta_enriching') : t('home.industry.detail.cta_enrich')}
            </button>
          </>
        }
      />

      <section className="industry-detail-overview industry-site-section industry-site-panel">
        <div className="b2b-section-title industry-site-section-head">
          <span className="b2b-eyebrow">{t('home.industry.detail.overview_eyebrow')}</span>
          <h2>{t('home.industry.detail.overview_title', { name: packDisplayName })}</h2>
        </div>
        <p className="industry-detail-overview-text">{overviewText}</p>
        <ul className="industry-detail-highlights">
          {highlightList.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <div className="industry-site-modules">
          <h3>{t('home.industry.detail.modules_title')}</h3>
          <div className="industry-site-module-chips">
            {(enrichment?.recommended_modules?.length ? enrichment.recommended_modules : visualTheme.focusModules).map((m) => (
              <code key={m}>{m}</code>
            ))}
          </div>
        </div>
        {enrichmentSourceLabel ? (
          <span className="industry-detail-source">{t('home.industry.detail.source', { source: enrichmentSourceLabel })}</span>
        ) : null}
      </section>

      <IndustryMicrositePreview
        packKey={pack.key}
        packName={packDisplayName}
        tagline={heroTagline}
        overview={overviewText}
        highlights={highlightList}
        scenes={(enrichment?.scene_tips?.length
          ? enrichment.scene_tips.map((tip) => ({ name: tip.name, detail: tip.tip }))
          : groups.flatMap((g) => g.items).slice(0, 6).map((s) => ({
              name: s.name,
              detail: s.problem || s.name,
            }))
        )}
        accent={accent}
        onCompose={handleComposeWithTemplate}
      />

      {pageTemplates.length > 0 ? (
        <IndustryPageTemplateGallery
          templates={pageTemplates}
          accent={accent}
          packName={packDisplayName}
        />
      ) : null}

      <section className="industry-detail-scenes industry-site-section industry-site-panel">
        <div className="b2b-section-title industry-site-section-head">
          <span className="b2b-eyebrow">{t('home.industry.detail.scenes_eyebrow')}</span>
          <h2>{t('home.industry.detail.scenes_title', { n: total })}</h2>
        </div>
        {groups.map(({ category, items }) => (
          <div key={category} className="industry-detail-group">
            <h3>
              <span className="industry-detail-cat-icon icon-themed" style={iconWrapStyle(categoryColor(category, theme))}>
                <DynamicIcon name={resolveCategoryIcon(category, 'industry')} size={16} color={categoryColor(category, theme)} />
              </span>
              {category}
              <em>{t('home.industry.detail.items', { n: items.length })}</em>
            </h3>
            <div className="industry-detail-scene-grid">
              {items.map((scene) => (
                <article key={scene.id} className="industry-detail-scene-card">
                  <header>
                    <strong>{scene.name}</strong>
                    <span className={`ind-scene-std std-${scene.standard === '✓' ? 'ok' : 'partial'}`}>
                      {scene.standard || '✓'}
                    </span>
                  </header>
                  <p className="ind-scene-problem">{scene.problem}</p>
                  {scene.pages ? <p className="ind-scene-pages">{t('home.industry.detail.pages')}<code>{scene.pages}</code></p> : null}
                  {scene.agent ? <p className="ind-scene-agent">{t('home.industry.detail.agent')}<code>{scene.agent}</code></p> : null}
                  {sceneTips.get(scene.name) ? <p className="ind-scene-tip">💡 {sceneTips.get(scene.name)}</p> : null}
                </article>
              ))}
            </div>
          </div>
        ))}
      </section>

      {others.length > 0 ? (
        <section className="industry-site-others industry-site-section industry-site-panel">
          <div className="b2b-section-title industry-site-section-head">
            <span className="b2b-eyebrow">{t('home.industry.others.eyebrow')}</span>
            <h2>{t('home.industry.others.title')}</h2>
          </div>
          <div className="industry-hub-grid industry-hub-grid-compact">
            {others.map((s) => {
              const name = industryName(t, s.key, s.name)
              return (
              <Link
                key={s.key}
                to={ROUTES.industryDetail(s.key)}
                className="industry-hub-card"
                style={{ '--card-accent': s.color } as CSSProperties}
              >
                <LazyCover
                  className="industry-hub-thumb"
                  src={industryCardImage(s.key)}
                  alt={industryAlt(t, s.key, s.name)}
                >
                  <span className="industry-card-visual-title">{name}</span>
                </LazyCover>
                <div className="industry-hub-body">
                  <h3>{name}</h3>
                  <p>{t('home.industry.card.scenes', { n: s.scenes })}</p>
                </div>
              </Link>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="industry-site-cta-band">
        <h2>{t('home.industry.detail.cta_band_title')}</h2>
        <p>{site.stats.delivery}</p>
        <div className="industry-site-cta-band-actions">
          <button type="button" className="btn-primary agent-action-btn" onClick={handleUseIndustry}>
            {site.cta.create_label} →
          </button>
          <button type="button" className="btn-ghost" onClick={handleOpenDecoupledSite}>
            {t('home.industry.detail.cta_preview')}
          </button>
        </div>
      </section>
    </IndustrySiteShell>
  )
}
