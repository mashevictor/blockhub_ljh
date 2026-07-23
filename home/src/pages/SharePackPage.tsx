import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchSharePack, type ShareArtifact, type SharePack } from '../api/client'
import BrandMark from '../components/BrandMark'
import { AgentButtonContent, AgentChevronGlyph } from '../components/AgentChevron'
import { ROUTES } from '../routes/paths'
import { homeSectionHref } from '../data/homeNav'
import { usePageMeta } from '../hooks/usePageMeta'
import '../styles/b2b-landing.css'

function summaryLines(text: string): string[] {
  return text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
}

function displayName(pack: SharePack): string {
  const sal = pack.salutation.trim()
  const co = pack.company_name.trim()
  if (sal && co) return `${sal} · ${co}`
  return sal || co || '您的'
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
  const { token = '' } = useParams()
  const [pack, setPack] = useState<SharePack | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  usePageMeta({
    title: pack ? `${displayName(pack)} · 演示资料包` : '演示资料包',
    description: '积木仓演示资料包 · 案例、安全合规与定价说明',
  })

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    void fetchSharePack(token)
      .then((data) => {
        if (!cancelled) setPack(data)
      })
      .catch(() => {
        if (!cancelled) setError('资料链接无效或已过期')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <div className="b2b-app b2b-landing b2b-brand-scope share-pack-page">
      <header className="b2b-header share-pack-site-header">
        <div className="b2b-header-accent" aria-hidden />
        <div className="b2b-nav share-pack-site-nav">
          <Link to={ROUTES.home} className="b2b-logo">
            <BrandMark size={36} />
            <span className="b2b-logo-text">
              <strong>积木仓</strong>
            </span>
          </Link>
          <nav className="b2b-nav-rail" aria-label="资料页导航">
            <ul className="b2b-nav-menu share-pack-site-nav-menu">
              <li>
                <Link to={ROUTES.home} className="b2b-nav-pill">
                  <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                  <span className="b2b-nav-label">平台首页</span>
                </Link>
              </li>
              <li>
                <Link to={homeSectionHref('product')} className="b2b-nav-pill">
                  <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                  <span className="b2b-nav-label">行业方案</span>
                </Link>
              </li>
              <li>
                <a href={ROUTES.contactCreate} className="b2b-nav-pill marketing-site-nav-cta">
                  <AgentChevronGlyph size="nav" className="b2b-nav-chev" />
                  <span className="b2b-nav-label">在线体验</span>
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
            正在加载资料包…
          </p>
        </div>
      )}
      {error && (
        <div className="share-pack-state share-pack-error">
          <p>{error}</p>
          <Link to={ROUTES.home} className="b2b-btn-outline agent-action-btn">
            返回首页
          </Link>
        </div>
      )}
      {pack && !loading && !error && (
        <>
          <header className="share-pack-hero">
            <span className="b2b-eyebrow share-pack-eyebrow">
              <AgentChevronGlyph size="sign" />
              {displayName(pack)}
            </span>
            <h1>您的积木仓演示资料包</h1>
            <p>同事打开同一链接 · 会看到与其岗位相关的资料栏目</p>
          </header>
          <div className="share-pack-body">
            <main className="share-pack-main">
              <div className="share-pack-tabs" aria-label="资料栏目">
                <span className="share-pack-tab is-active">
                  <AgentChevronGlyph size="xs" />
                  业务同事 · 当前
                </span>
                <span className="share-pack-tab is-muted">
                  <AgentChevronGlyph size="xs" />
                  信息部门
                </span>
                <span className="share-pack-tab is-muted">
                  <AgentChevronGlyph size="xs" />
                  财务同事
                </span>
              </div>
              {pack.agent_summary && (
                <div className="demo-booking-summary-box share-pack-summary">
                  <div className="demo-booking-summary-head">
                    <AgentChevronGlyph size="xs" />
                    方案要点
                  </div>
                  {summaryLines(pack.agent_summary).map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              )}
              <p className="share-pack-intro">
                本页汇总：案例说明、安全与合规材料、定价说明、最新产品动态等，方便您一次性转发给内部评审同事。
              </p>
            </main>
            <aside className="share-pack-aside">
              <h2>
                <AgentChevronGlyph size="sign" />
                资料下载
              </h2>
              {pack.artifacts.map((item) => (
                <ArtifactRow key={item.id} item={item} />
              ))}
              <Link to={`${ROUTES.home}#contact-create`} className="b2b-btn-primary agent-action-btn share-pack-cta">
                <AgentButtonContent trailing={false}>在线体验</AgentButtonContent>
              </Link>
            </aside>
          </div>
        </>
      )}
    </div>
  )
}
