import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchIndustryPackDetail, fetchIndustrySites, type IndustryPackDetail, type IndustrySiteSummary } from '../api/client'
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
import type { IndustryMicrositeTemplate } from '../data/industryMicrositeTemplates'
import { ROUTES } from '../routes/paths'
import '../styles/b2b-landing.css'
import '../styles/industry-style-packs.css'

export default function IndustryDetailPage() {
  const { key = '' } = useParams<{ key: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const fallbackDetail = useMemo(() => buildIndustryPackDetailFallback(key), [key])
  const [detail, setDetail] = useState<IndustryPackDetail | null>(fallbackDetail)
  const [others, setOthers] = useState<IndustrySiteSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const [enriching, setEnriching] = useState(false)

  const showcaseMeta = useMemo(
    () => INDUSTRIES_SHOWCASE.find((i) => i.key === key),
    [key],
  )

  const visualTheme = useMemo(() => getIndustryVisualTheme(key), [key])
  const stylePack = useMemo(() => getIndustryStylePack(key), [key])
  const stylePackMeta = useMemo(() => getStylePackMeta(stylePack), [stylePack])
  const layoutClass = `${industrySitePackClass(key)} industry-site--pattern-${visualTheme.pattern}`

  useEffect(() => {
    const fb = buildIndustryPackDetailFallback(key)
    setDetail(fb)
    setError(fb ? null : '行业包不存在')
    if (!key || !fb) return

    fetchIndustryPackDetail(key, { enrich: false })
      .then((next) => {
        setDetail(next)
        setError(null)
      })
      .catch(() => {
        /* 保留本地 fallback，不阻断页面 */
      })
  }, [key])

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
  }, [key])

  const site = detail?.site
  usePageMeta(site ? {
    title: site.title,
    description: site.description,
    ogImage: site.assets.og,
    ogUrl: typeof window !== 'undefined' ? `${window.location.origin}${site.site_url}` : undefined,
  } : showcaseMeta ? {
    title: `${showcaseMeta.name} · 行业深度包`,
    description: showcaseMeta.desc,
    ogImage: industryAssets(key).og,
  } : null)

  const sceneTips = useMemo(() => {
    const tips = detail?.enrichment?.scene_tips ?? []
    return new Map(tips.map((t) => [t.name, t.tip]))
  }, [detail])

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
      .then(setDetail)
      .finally(() => setEnriching(false))
  }

  if (error || !detail || !site) {
    return (
      <IndustrySiteShell theme={{ primary: '#0d47a1' }}>
        <p className="industry-detail-error">{error ?? '行业包不存在'}</p>
        <Link to={`${ROUTES.home}#product`} className="btn-secondary">返回首页行业方案</Link>
      </IndustrySiteShell>
    )
  }

  const { pack, groups, total, enrichment } = detail
  const Icon = INDUSTRY_ICONS[pack.key] ?? IconSparkles
  const accent = site.theme.primary
  const enrichmentSourceLabel =
    enrichment?.source === 'deepseek'
      ? '大模型（已缓存，可再丰富）'
      : enrichment?.source === 'static'
        ? '第一版生产文案（可大模型再丰富）'
        : enrichment?.source
          ? '自动生成'
          : null

  return (
    <IndustrySiteShell theme={site.theme} industryName={pack.name} layoutClass={layoutClass}>
      <IndustryHeroSection
        variant={stylePackMeta.heroVariant}
        accent={accent}
        gradientTo={site.theme.gradient_to}
        heroImage={site.assets.hero}
        motif={visualTheme.motif}
        badge={`独立方案站 · ${total} 场景`}
        title={pack.name}
        tagline={visualTheme.heroPitch ?? pack.tagline}
        stats={visualTheme.stats}
        icon={<Icon size={40} />}
        ctaPrimary={
          <button type="button" className="btn-primary" onClick={handleUseIndustry}>
            编排生成应用 →
          </button>
        }
        ctaSecondary={
          <>
            <button type="button" className="btn-ghost industry-site-ghost" onClick={handleOpenDecoupledSite}>
              打开落地页预览
            </button>
            <button type="button" className="btn-ghost industry-site-ghost" disabled={enriching} onClick={handleReEnrich}>
              {enriching ? '大模型丰富中…' : '大模型重新丰富'}
            </button>
          </>
        }
      />

      <section className="industry-detail-overview industry-site-section industry-site-panel">
        <div className="b2b-section-title industry-site-section-head">
          <span className="b2b-eyebrow">方案总述</span>
          <h2>{pack.name} · 行业智能应用方案</h2>
        </div>
        <p className="industry-detail-overview-text">{enrichment?.overview}</p>
        <ul className="industry-detail-highlights">
          {(enrichment?.highlights?.length ? enrichment.highlights : visualTheme.highlights).map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <div className="industry-site-modules">
          <h3>推荐模块（正式能力，可在悬浮框增减）</h3>
          <div className="industry-site-module-chips">
            {(enrichment?.recommended_modules?.length ? enrichment.recommended_modules : visualTheme.focusModules).map((m) => (
              <code key={m}>{m}</code>
            ))}
          </div>
        </div>
        {enrichmentSourceLabel ? (
          <span className="industry-detail-source">文案来源：{enrichmentSourceLabel}</span>
        ) : null}
      </section>

      <IndustryMicrositePreview
        packKey={pack.key}
        packName={pack.name}
        tagline={visualTheme.heroPitch ?? pack.tagline}
        overview={enrichment?.overview ?? pack.tagline}
        highlights={enrichment?.highlights?.length ? enrichment.highlights : visualTheme.highlights}
        scenes={(enrichment?.scene_tips?.length
          ? enrichment.scene_tips.map((t) => ({ name: t.name, detail: t.tip }))
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
          packName={pack.name}
        />
      ) : null}

      <section className="industry-detail-scenes industry-site-section industry-site-panel">
        <div className="b2b-section-title industry-site-section-head">
          <span className="b2b-eyebrow">场景清单</span>
          <h2>按业务分类 · 共 {total} 项</h2>
        </div>
        {groups.map(({ category, items }) => (
          <div key={category} className="industry-detail-group">
            <h3>
              <span className="industry-detail-cat-icon icon-themed" style={iconWrapStyle(categoryColor(category, theme))}>
                <DynamicIcon name={resolveCategoryIcon(category, 'industry')} size={16} color={categoryColor(category, theme)} />
              </span>
              {category}
              <em>{items.length} 项</em>
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
                  {scene.pages ? <p className="ind-scene-pages">页面组合：<code>{scene.pages}</code></p> : null}
                  {scene.agent ? <p className="ind-scene-agent">主智能体：<code>{scene.agent}</code></p> : null}
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
            <span className="b2b-eyebrow">更多行业</span>
            <h2>探索其他独立站</h2>
          </div>
          <div className="industry-hub-grid industry-hub-grid-compact">
            {others.map((s) => (
              <Link
                key={s.key}
                to={ROUTES.industryDetail(s.key)}
                className="industry-hub-card"
                style={{ '--card-accent': s.color } as CSSProperties}
              >
                <div className="industry-hub-thumb" style={{ backgroundImage: `url(${industryCardImage(s.key)})` }}>
                  <span className="industry-card-visual-title">{s.name}</span>
                </div>
                <div className="industry-hub-body">
                  <h3>{s.name}</h3>
                  <p>{s.scenes} 场景</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="industry-site-cta-band">
        <h2>确认方案后去编排应用</h2>
        <p>{site.stats.delivery}</p>
        <div className="industry-site-cta-band-actions">
          <button type="button" className="btn-primary agent-action-btn" onClick={handleUseIndustry}>
            {site.cta.create_label} →
          </button>
          <button type="button" className="btn-ghost" onClick={handleOpenDecoupledSite}>
            打开落地页预览
          </button>
        </div>
      </section>
    </IndustrySiteShell>
  )
}
