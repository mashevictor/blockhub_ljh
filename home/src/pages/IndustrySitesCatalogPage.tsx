import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../routes/paths'
import '../styles/b2b-landing.css'
import '../styles/industry-style-packs.css'

interface SiteItem {
  key: string
  name: string
  tagline: string
  template: string
  href: string
}

/** 行业独立网页目录 — 纯静态解耦交付入口（不依赖应用发布） */
export default function IndustrySitesCatalogPage() {
  const [items, setItems] = useState<SiteItem[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/industry-sites/catalog.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((rows: SiteItem[]) => setItems(Array.isArray(rows) ? rows : []))
      .catch(() => setError('无法加载独立网页目录'))
  }, [])

  return (
    <div className="b2b-brand-scope industry-sites-catalog">
      <header className="industry-sites-catalog-head">
        <Link to={ROUTES.home} className="industry-sites-catalog-back">← 积木仓首页</Link>
        <h1>行业独立网页 · 解耦目录</h1>
        <p>
          每个行业各有一份<strong>纯静态 HTML</strong>落地页，可单独打开、托管与投放；
          与「生成应用 / CapShip 编排」解耦。需要能力模块时，再进行业方案站编排。
        </p>
        <div className="industry-sites-catalog-actions">
          <a className="btn-primary" href="/industry-sites/index.html" target="_blank" rel="noreferrer">
            打开静态目录页
          </a>
          <Link className="btn-ghost" to={`${ROUTES.home}#product`}>行业方案站入口</Link>
        </div>
      </header>

      {error ? <p className="industry-detail-error">{error}</p> : null}

      <div className="industry-sites-catalog-grid">
        {items.map((it) => (
          <article key={it.key} className="industry-sites-catalog-card">
            <h2>{it.name}</h2>
            <p>{it.tagline}</p>
            <span className="industry-sites-catalog-tpl">{it.template}</span>
            <div className="industry-sites-catalog-card-actions">
              <a className="btn-primary" href={`/industry-sites/${it.key}/index.html`} target="_blank" rel="noreferrer">
                打开独立网页
              </a>
              <Link className="btn-ghost" to={ROUTES.industryDetail(it.key)}>
                方案站 / 编排应用
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
