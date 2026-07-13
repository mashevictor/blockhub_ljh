import { useEffect, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { fetchIndustrySites, type IndustrySiteSummary } from '../api/client'
import { INDUSTRIES_SHOWCASE } from '../data/showcase'
import { industryAssets, industryCardImage } from '../data/industryAssets'
import { usePageMeta } from '../hooks/usePageMeta'
import { ROUTES } from '../routes/paths'
import IndustrySiteShell from '../components/industry/IndustrySiteShell'
import { INDUSTRY_ICONS, IconSparkles } from '../components/icons'
import { AgentButtonContent } from '../components/AgentChevron'
import '../styles/b2b-landing.css'

const FALLBACK_SITES: IndustrySiteSummary[] = INDUSTRIES_SHOWCASE.map((ind) => ({
  key: ind.key,
  name: ind.name,
  icon: '📦',
  color: ind.color,
  tagline: ind.desc,
  scenes: ind.count,
  site_url: ROUTES.industryDetail(ind.key),
  assets: industryAssets(ind.key),
  theme: { primary: ind.color },
}))

export default function IndustrySitesIndexPage() {
  const [sites, setSites] = useState<IndustrySiteSummary[]>(FALLBACK_SITES)

  usePageMeta({
    title: '20 个行业深度包 · 独立方案站 | 积木仓 BlockHub',
    description: '通用办公、制造、销售、医疗等 20 个行业深度包，每项含完整场景清单与独立方案站，一键生成 Web 与 App。',
    ogImage: industryAssets('office').og,
    ogUrl: typeof window !== 'undefined' ? `${window.location.origin}/industry` : undefined,
  })

  useEffect(() => {
    fetchIndustrySites()
      .then(setSites)
      .catch(() => setSites(FALLBACK_SITES))
  }, [])

  return (
    <IndustrySiteShell theme={{ primary: '#0d47a1' }}>
      <section
        className="industry-hub-hero-banner"
        style={{
          backgroundImage: `linear-gradient(105deg, rgba(13, 71, 161, 0.92) 0%, rgba(25, 118, 210, 0.78) 55%, rgba(0, 184, 148, 0.35) 100%), url(${industryAssets('office').hero})`,
        }}
      >
        <div className="industry-hub-hero-inner">
          <span className="b2b-eyebrow industry-hub-eyebrow-light">20 个行业 · 独立方案站</span>
          <h1>每个行业深度包，都有专属网站</h1>
          <p>
            与主页同一套品牌视觉：完整场景清单、方案总述、推荐模块与一键创建入口。
            每个行业配有独立特性配图。
          </p>
          <Link to={ROUTES.home} className="btn-primary industry-hub-hero-cta">
            <AgentButtonContent>去首页创建应用</AgentButtonContent>
          </Link>
        </div>
      </section>

      <section className="b2b-section industry-hub-section">
        <div className="b2b-section-title">
          <span className="b2b-eyebrow">行业方案</span>
          <h2>
            <em>{sites.length} 个行业</em> · 点击进入独立站
          </h2>
          <p>深度包含完整业务场景，Web / App 双端一键生成，配图贴合行业特征</p>
        </div>

        <div className="industry-hub-grid">
          {sites.map((site) => {
            const Icon = INDUSTRY_ICONS[site.key] ?? IconSparkles
            return (
              <Link
                key={site.key}
                to={ROUTES.industryDetail(site.key)}
                className="industry-hub-card"
                style={{ '--card-accent': site.color } as CSSProperties}
              >
                <div
                  className="industry-hub-feature-img"
                  style={{ backgroundImage: `url(${industryCardImage(site.key)})` }}
                  role="img"
                  aria-label={`${site.name}行业特性配图`}
                >
                  <span className="industry-hub-feature-icon" aria-hidden>
                    <Icon size={22} />
                  </span>
                  <span className="industry-hub-feature-shade" aria-hidden />
                </div>
                <div className="industry-hub-body">
                  <span className="industry-hub-badge">深度包 · {site.scenes} 场景</span>
                  <h2>{site.name}</h2>
                  <p>{site.tagline}</p>
                  <span className="industry-hub-cta">
                    <AgentButtonContent>进入独立站</AgentButtonContent>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </section>
    </IndustrySiteShell>
  )
}
