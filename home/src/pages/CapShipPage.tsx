import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, ExternalLink, Star, GitFork, ArrowUpRight, Copy, Check } from 'lucide-react'
import B2BHeader from '../components/b2b/B2BHeader'
import B2BSiteFooter from '../components/b2b/B2BSiteFooter'
import { IconGithub } from '../components/icons'
import { fetchMe, logout, type AuthUser } from '../auth/session'
import { getToken } from '../auth/storage'
import { usePageMeta } from '../hooks/usePageMeta'
import {
  CAPSHIP_GITHUB,
  CAPSHIP_PILLARS,
  CAPSHIP_STATS,
  buildCapshipCatalog,
  catalogToMarkdown,
  downloadTextFile,
} from '../data/capshipOss'
import { ROUTES } from '../routes/paths'
import '../styles/b2b-landing.css'
import '../styles/capship-oss.css'

function useCountUp(target: number, active: boolean, duration = 1600) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - (1 - t) ** 3
      setN(Math.round(target * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])
  return n
}

function StatCard({
  label,
  value,
  suffix,
  active,
}: {
  label: string
  value: number
  suffix: string
  active: boolean
}) {
  const n = useCountUp(value, active)
  return (
    <div className="cs-stat">
      <div className="cs-stat-value">
        <span className="cs-stat-num">{n.toLocaleString()}</span>
        {suffix ? <span className="cs-stat-suffix">{suffix}</span> : null}
      </div>
      <div className="cs-stat-label">{label}</div>
    </div>
  )
}

function CloneCopyRow({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="cs-clone-row">
      <code className="cs-clone" title={value}>{value}</code>
      <button type="button" className="cs-clone-copy" onClick={onCopy} aria-label={copied ? 'Copied' : 'Copy clone URL'}>
        {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
        <span>{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </div>
  )
}

function MarqueeStrip({ items }: { items: string[] }) {
  const loop = [...items, ...items]
  return (
    <div className="cs-marquee" aria-hidden>
      <div className="cs-marquee-track">
        {loop.map((t, i) => (
          <span key={`${t}-${i}`} className="cs-marquee-item">
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function CapShipPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [statsInView, setStatsInView] = useState(false)
  const [liveStars, setLiveStars] = useState<number | null>(null)
  const [liveForks, setLiveForks] = useState<number | null>(null)
  const statsRef = useRef<HTMLElement | null>(null)

  usePageMeta({
    title: 'CapShip · >> Ship in 5 minutes',
    description:
      'CapShip: type >> to mount real capabilities. Publish Web + App in five minutes — leave, repair, expense, meetings with real APIs, not demos.',
  })

  useEffect(() => {
    document.body.classList.add('b2b-landing', 'capship-oss-page')
    return () => document.body.classList.remove('b2b-landing', 'capship-oss-page')
  }, [])

  useEffect(() => {
    if (!getToken()) {
      setUser(null)
      return
    }
    fetchMe().then(setUser).catch(() => setUser(null))
  }, [])

  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setStatsInView(true)
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`https://api.github.com/repos/${CAPSHIP_GITHUB.edge.owner}/${CAPSHIP_GITHUB.edge.repo}`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return
        if (typeof data.stargazers_count === 'number') setLiveStars(data.stargazers_count)
        if (typeof data.forks_count === 'number') setLiveForks(data.forks_count)
      })
      .catch(() => {
        /* keep fallbacks */
      })
    return () => ctrl.abort()
  }, [])

  const stats = CAPSHIP_STATS.map((s) => {
    if (s.key === 'stars' && liveStars != null) return { ...s, value: liveStars }
    if (s.key === 'forks' && liveForks != null) return { ...s, value: liveForks }
    return s
  })

  const onDownloadCatalogJson = () => {
    const catalog = buildCapshipCatalog()
    downloadTextFile('capship-catalog.json', JSON.stringify(catalog, null, 2), 'application/json')
  }

  const onDownloadCatalogMd = () => {
    const catalog = buildCapshipCatalog()
    downloadTextFile('capship-catalog.md', catalogToMarkdown(catalog), 'text/markdown;charset=utf-8')
  }

  const onDownloadLinks = () => {
    const catalog = buildCapshipCatalog()
    const body = ['# CapShip Links', '', ...catalog.links.map((l) => `- ${l.name}: ${l.url}`), ''].join('\n')
    downloadTextFile('capship-links.md', body, 'text/markdown;charset=utf-8')
  }

  const sceneNames = buildCapshipCatalog().scenarios.map((s) => `${s.id} · ${s.title}`)

  return (
    <div className="b2b-app b2b-landing marketing-site b2b-brand-scope cs-root">
      <B2BHeader user={user} onLogout={() => logout()} />

      <main className="cs-main">
        <section className="cs-hero">
          <div className="cs-hero-atmosphere" aria-hidden />
          <div className="cs-hero-inner">
            <p className="cs-kicker">
              <span className="cs-gtgt" aria-hidden>
                &gt;&gt;
              </span>
              Selection → Delivery · Open Source
            </p>
            <h1 className="cs-brand">
              <span className="cs-brand-gtgt" aria-hidden>
                &gt;&gt;
              </span>
              CapShip
            </h1>
            <p className="cs-tagline">Ship it in 5 minutes</p>
            <p className="cs-lead">
              <span className="cs-lead-line">
                Type <em className="cs-inline-gtgt">&gt;&gt;</em> to mount real capabilities — publish Web + App.
              </span>
            </p>

            <div className="cs-hero-cta">
              <Link className="cs-btn cs-btn-primary" to={ROUTES.home}>
                Try &gt;&gt; on home <ArrowUpRight size={16} aria-hidden />
              </Link>
              <a className="cs-btn cs-btn-ghost" href={CAPSHIP_GITHUB.stable.url} target="_blank" rel="noreferrer">
                <IconGithub size={18} aria-hidden /> CapShip Stable
              </a>
              <a className="cs-btn cs-btn-text" href={CAPSHIP_GITHUB.edge.url} target="_blank" rel="noreferrer">
                <Star size={16} aria-hidden /> Star Edge
              </a>
            </div>
          </div>
        </section>

        <MarqueeStrip items={sceneNames} />

        <section className="cs-section cs-stats-section" ref={statsRef}>
          <div className="cs-section-head">
            <h2>Numbers in motion</h2>
            <p>Stars, forks, and CapShip scenario coverage — live when GitHub responds.</p>
          </div>
          <div className="cs-stats-grid">
            {stats.map((s) => (
              <StatCard key={s.key} label={s.label} value={s.value} suffix={s.suffix} active={statsInView} />
            ))}
          </div>
        </section>

        <section className="cs-section">
          <div className="cs-section-head">
            <h2>Two GitHub lanes</h2>
            <p>Pin Stable for production. Follow Edge (capship-dev) for the test lane.</p>
          </div>
          <div className="cs-repo-grid">
            <article className="cs-repo-panel cs-repo-stable">
              <div className="cs-repo-top">
                <IconGithub size={22} aria-hidden />
                <span className="cs-repo-badge">Stable</span>
              </div>
              <h3>{CAPSHIP_GITHUB.stable.label}</h3>
              <p>{CAPSHIP_GITHUB.stable.blurb}</p>
              <CloneCopyRow value={CAPSHIP_GITHUB.stable.clone} />
              <div className="cs-repo-actions">
                <a className="cs-btn cs-btn-primary" href={CAPSHIP_GITHUB.stable.url} target="_blank" rel="noreferrer">
                  Open Stable <ExternalLink size={14} aria-hidden />
                </a>
                <a className="cs-btn cs-btn-ghost" href={CAPSHIP_GITHUB.stable.releaseUrl} target="_blank" rel="noreferrer">
                  Releases
                </a>
              </div>
            </article>
            <article className="cs-repo-panel">
              <div className="cs-repo-top">
                <GitFork size={22} aria-hidden />
                <span className="cs-repo-badge cs-repo-badge-edge">Dev</span>
              </div>
              <h3>{CAPSHIP_GITHUB.edge.label}</h3>
              <p>{CAPSHIP_GITHUB.edge.blurb}</p>
              <CloneCopyRow value={CAPSHIP_GITHUB.edge.clone} />
              <div className="cs-repo-actions">
                <a className="cs-btn cs-btn-ghost" href={CAPSHIP_GITHUB.edge.url} target="_blank" rel="noreferrer">
                  Open Edge <ExternalLink size={14} aria-hidden />
                </a>
              </div>
            </article>
          </div>
        </section>

        <section className="cs-section cs-pillars">
          <div className="cs-section-head">
            <h2>Why &gt;&gt;</h2>
            <p>One command mounts a capability — intent to a runnable Runtime in five minutes.</p>
          </div>
          <div className="cs-pillar-list">
            {CAPSHIP_PILLARS.map((p) => (
              <div key={p.title} className="cs-pillar">
                <h3>{p.title}</h3>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="cs-section">
          <div className="cs-section-head">
            <h2>Download catalog &amp; links</h2>
            <p>Export the scenario directory and repository links for offline handoff.</p>
          </div>
          <div className="cs-download-row">
            <button type="button" className="cs-btn cs-btn-primary" onClick={onDownloadCatalogJson}>
              <Download size={16} aria-hidden /> Catalog JSON
            </button>
            <button type="button" className="cs-btn cs-btn-ghost" onClick={onDownloadCatalogMd}>
              <Download size={16} aria-hidden /> Catalog Markdown
            </button>
            <button type="button" className="cs-btn cs-btn-ghost" onClick={onDownloadLinks}>
              <Download size={16} aria-hidden /> Links Markdown
            </button>
          </div>
        </section>
      </main>

      <B2BSiteFooter variant="dark" />
    </div>
  )
}
