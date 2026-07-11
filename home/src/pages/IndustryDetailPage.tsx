import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchIndustryPackDetail, fetchIndustrySites, type IndustryPackDetail, type IndustrySiteSummary } from '../api/client'
import IndustrySiteShell from '../components/industry/IndustrySiteShell'
import { ChevronDotLoadingRow } from '../components/ChevronDotLoader'
import { DynamicIcon, INDUSTRY_ICONS, IconSparkles } from '../components/icons'
import { usePageMeta } from '../hooks/usePageMeta'
import { useTheme } from '../context/ThemeContext'
import { categoryColor, iconWrapStyle } from '../data/iconPalette'
import { resolveCategoryIcon, INDUSTRIES_SHOWCASE } from '../data/showcase'
import { industryAssets } from '../data/industryAssets'
import { ROUTES } from '../routes/paths'
import '../styles/b2b-landing.css'

export default function IndustryDetailPage() {
  const { key = '' } = useParams<{ key: string }>()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const [detail, setDetail] = useState<IndustryPackDetail | null>(null)
  const [others, setOthers] = useState<IndustrySiteSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enriching, setEnriching] = useState(false)

  const load = (withEnrich = true) => {
    if (!key) return
    setLoading(true)
    setError(null)
    fetchIndustryPackDetail(key, { enrich: withEnrich })
      .then(setDetail)
      .catch(() => setError('无法加载行业深度包，请稍后重试'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(true)
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
  } : null)

  const sceneTips = useMemo(() => {
    const tips = detail?.enrichment?.scene_tips ?? []
    return new Map(tips.map((t) => [t.name, t.tip]))
  }, [detail])

  const handleUseIndustry = () => {
    navigate(`${ROUTES.home}#contact-create?mode=industry&pack=${key}`)
  }

  const handleReEnrich = () => {
    setEnriching(true)
    fetchIndustryPackDetail(key, { enrich: true })
      .then(setDetail)
      .finally(() => setEnriching(false))
  }

  if (loading && !detail) {
    return (
      <IndustrySiteShell theme={{ primary: '#0d47a1' }}>
        <ChevronDotLoadingRow variant="converge" size="md" text="正在加载行业独立站…" />
      </IndustrySiteShell>
    )
  }

  if (error || !detail || !site) {
    return (
      <IndustrySiteShell theme={{ primary: '#0d47a1' }}>
        <p className="industry-detail-error">{error ?? '行业包不存在'}</p>
        <Link to={ROUTES.industryHub} className="btn-secondary">返回行业索引</Link>
      </IndustrySiteShell>
    )
  }

  const { pack, groups, total, enrichment } = detail
  const Icon = INDUSTRY_ICONS[pack.key] ?? IconSparkles
  const accent = site.theme.primary

  return (
    <IndustrySiteShell theme={site.theme} industryName={pack.name}>
      <section
        className="industry-site-hero-banner"
        style={{ backgroundImage: `linear-gradient(105deg, color-mix(in srgb, ${accent} 88%, #0f172a) 0%, color-mix(in srgb, ${site.theme.gradient_to ?? accent} 55%, #0f172a) 55%), url(${site.assets.hero})` } as CSSProperties}
      >
        <div className="industry-site-hero-content">
          <Link to={ROUTES.industryHub} className="industry-detail-back">← 全部行业方案</Link>
          <div className="industry-site-hero-row">
            <span className="industry-detail-icon" aria-hidden>
              <Icon size={40} />
            </span>
            <div>
              <span className="industry-detail-badge">独立方案站 · 深度包 · {total} 场景</span>
              <h1>{pack.name}</h1>
              <p className="industry-detail-tagline">{pack.tagline}</p>
            </div>
          </div>
          <div className="industry-site-stats-row">
            <div><strong>{total}</strong><span>业务场景</span></div>
            <div><strong>{site.stats.platforms}</strong><span>端交付</span></div>
            <div><strong>AI</strong><span>DeepSeek 方案</span></div>
          </div>
          <div className="industry-detail-actions">
            <button type="button" className="btn-primary" onClick={handleUseIndustry}>
              {site.cta.create_label} →
            </button>
            <button type="button" className="btn-ghost industry-site-ghost" disabled={enriching} onClick={handleReEnrich}>
              {enriching ? 'DeepSeek 丰富中…' : 'DeepSeek 重新丰富'}
            </button>
          </div>
        </div>
      </section>

      <section className="industry-detail-overview industry-site-section industry-site-panel">
        <div className="b2b-section-title industry-site-section-head">
          <span className="b2b-eyebrow">方案总述</span>
          <h2>{pack.name} · 行业智能应用方案</h2>
        </div>
        <p className="industry-detail-overview-text">{enrichment?.overview}</p>
        {enrichment?.highlights?.length ? (
          <ul className="industry-detail-highlights">
            {enrichment.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        ) : null}
        {enrichment?.recommended_modules?.length ? (
          <div className="industry-site-modules">
            <h3>推荐模块</h3>
            <div className="industry-site-module-chips">
              {enrichment.recommended_modules.map((m) => (
                <code key={m}>{m}</code>
              ))}
            </div>
          </div>
        ) : null}
        {enrichment?.source ? (
          <span className="industry-detail-source">
            文案来源：{enrichment.source === 'deepseek' ? 'DeepSeek' : enrichment.source === 'static' ? '精选模板' : '自动生成'}
          </span>
        ) : null}
      </section>

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
                <div className="industry-hub-thumb" style={{ backgroundImage: `url(${s.assets.hero})` }} />
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
        <h2>选用 {pack.name}，五分钟搭好应用</h2>
        <p>{site.stats.delivery}</p>
        <button type="button" className="btn-primary agent-action-btn" onClick={handleUseIndustry}>
          {site.cta.create_label} →
        </button>
      </section>
    </IndustrySiteShell>
  )
}
