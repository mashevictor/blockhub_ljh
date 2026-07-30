import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import {
  fetchActivities,
  fetchAgents,
  fetchCreatedApps,
  fetchDashboard,
  fetchTrends,
  type Agent,
  type CreatedApp,
} from '../api/client'
import { fetchBillingMe, type BillingMe } from '../api/billing'
import { useAuth } from '../auth/AuthContext'
import { BRAND, homeAbsoluteUrl, homePublicUrl } from '../data/brand'
import { PLATFORM_STATS } from '@shared/platformStats'
import { canAccessRole, isTenantAdmin, type AppRole } from '../lib/roles'
import {
  IconBot,
  IconGrid,
  IconList,
  IconAppWindow,
  IconMessage,
  IconInbox,
  IconBell,
  IconSparkles,
  IconBook,
  IconCheckCircle,
  IconBarChart,
} from '../components/icons'

const STAT_META = [
  { key: 'agents', labelKey: 'admin.overview.stat.agents', icon: IconBot, tone: 'violet' },
  { key: 'capabilities', labelKey: 'admin.overview.stat.capabilities', icon: IconGrid, tone: 'sky' },
  { key: 'office_scenarios', labelKey: 'admin.overview.stat.office_scenarios', icon: IconList, tone: 'indigo' },
  { key: 'industry_scenarios', labelKey: 'admin.overview.stat.industry_scenarios', icon: IconList, tone: 'amber' },
  { key: 'apps_created', labelKey: 'admin.overview.stat.apps_created', icon: IconAppWindow, tone: 'emerald' },
  { key: 'chat_sessions', labelKey: 'admin.overview.stat.chat_sessions', icon: IconMessage, tone: 'cyan' },
  { key: 'pending_approvals', labelKey: 'admin.overview.stat.pending_approvals', icon: IconInbox, tone: 'orange' },
  { key: 'unread_notifications', labelKey: 'admin.overview.stat.unread_notifications', icon: IconBell, tone: 'rose' },
] as const

const QUICK_LINKS: Array<{
  to: string
  icon: typeof IconList
  titleKey: string
  subKey: string
  subParams?: Record<string, string | number>
  roles: AppRole[]
}> = [
  { to: '/scenarios', icon: IconList, titleKey: 'admin.overview.quick.scenarios', subKey: 'admin.overview.quick.scenarios_sub', subParams: { n: PLATFORM_STATS.scenarios }, roles: ['admin'] },
  { to: '/create', icon: IconSparkles, titleKey: 'admin.overview.quick.create', subKey: 'admin.overview.quick.create_sub', roles: ['admin'] },
  { to: '/knowledge', icon: IconBook, titleKey: 'admin.overview.quick.knowledge', subKey: 'admin.overview.quick.knowledge_sub', roles: ['admin', 'tenant_owner', 'employee'] },
  { to: '/approvals', icon: IconCheckCircle, titleKey: 'admin.overview.quick.approvals', subKey: 'admin.overview.quick.approvals_sub', roles: ['admin', 'tenant_owner', 'employee'] },
  { to: '/reports', icon: IconBarChart, titleKey: 'admin.overview.quick.reports', subKey: 'admin.overview.quick.reports_sub', roles: ['admin'] },
  { to: '/chat', icon: IconMessage, titleKey: 'admin.overview.quick.chat', subKey: 'admin.overview.quick.chat_sub', roles: ['admin', 'tenant_owner', 'employee'] },
  { to: '/notifications', icon: IconBell, titleKey: 'admin.overview.quick.notifications', subKey: 'admin.overview.quick.notifications_sub', roles: ['admin', 'tenant_owner', 'employee'] },
]

const PUBLIC_HOME = homePublicUrl().replace(/\/$/, '') || 'https://blockhub.club'

function appWebUrl(app: CreatedApp) {
  return app.web_url || homeAbsoluteUrl(`/r/${app.id}`)
}

function appDownloadUrl(app: CreatedApp) {
  return app.download_url || homeAbsoluteUrl(`/r/${app.id}/download`)
}

function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data)}`
}

function sourceLabel(source: string | undefined, t: ReturnType<typeof useT>) {
  if (source === 'prompt') return t('admin.overview.source.prompt')
  if (source === 'module') return t('admin.overview.source.module')
  return t('admin.overview.source.industry')
}

function deliverLabel(deliver: string | undefined, t: ReturnType<typeof useT>) {
  if (deliver === 'web') return t('admin.overview.deliver.web')
  if (deliver === 'app') return t('admin.overview.deliver.app')
  return t('admin.overview.deliver.both')
}

function AppIcon({ app }: { app: CreatedApp }) {
  const color = app.primary_color || '#4338ca'
  const size = 48
  if (app.icon_url) {
    return (
      <img
        src={app.icon_url}
        alt=""
        width={size}
        height={size}
        style={{ borderRadius: 12, objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: color,
        color: '#fff',
        display: 'grid',
        placeItems: 'center',
        fontWeight: 700,
        fontSize: 20,
        flexShrink: 0,
      }}
      aria-hidden
    >
      {(app.name || '应').slice(0, 1)}
    </span>
  )
}

function AppCard({ app }: { app: CreatedApp }) {
  const t = useT()
  const webUrl = appWebUrl(app)
  const downloadUrl = appDownloadUrl(app)
  const modules = app.modules ?? []
  const featureText = modules.length > 0
    ? modules.slice(0, 6).map((m) => m.label).join(' · ')
    : app.scenarios.slice(0, 6).join(' · ')

  return (
    <article className="created-app-card">
      <div className="created-app-main">
        <div className="created-app-head">
          <AppIcon app={app} />
          <div>
            <h3>{app.name}</h3>
            <span className="badge-active">{app.status || 'published'}</span>
          </div>
        </div>
        <p className="created-app-meta">
          {sourceLabel(app.source, t)} · {deliverLabel(app.deliver, t)} · {app.industry_key} · {t('admin.overview.app.scenes', { n: app.scenarios.length })}
          · {new Date(app.created_at).toLocaleString('zh-CN')}
        </p>
        <p className="created-app-features">
          <strong>{t('admin.overview.app.features')}</strong>{featureText || t('admin.overview.app.features_fallback')}
        </p>
        <div className="created-app-links">
          {(app.deliver === 'web' || app.deliver === 'both' || !app.deliver) && (
            <div className="created-app-link-row">
              <span>{t('admin.overview.app.web')}</span>
              <a href={webUrl} target="_blank" rel="noreferrer">{webUrl}</a>
              <button type="button" onClick={() => navigator.clipboard.writeText(webUrl)}>{t('admin.overview.app.copy')}</button>
            </div>
          )}
          {(app.deliver === 'app' || app.deliver === 'both' || !app.deliver) && (
            <div className="created-app-link-row">
              <span>{t('admin.overview.app.apk')}</span>
              <a href={downloadUrl} target="_blank" rel="noreferrer">{downloadUrl}</a>
              <button type="button" onClick={() => navigator.clipboard.writeText(downloadUrl)}>{t('admin.overview.app.copy')}</button>
            </div>
          )}
        </div>
      </div>
      <div className="created-app-qr">
        <img src={qrImageUrl(webUrl)} alt={t('admin.overview.app.qr_alt', { name: app.name })} width={120} height={120} />
        <span>{t('admin.overview.app.scan')}</span>
      </div>
    </article>
  )
}

export default function OverviewPage() {
  const t = useT()
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDashboard>> | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [activities, setActivities] = useState<Array<{ id: number; icon: string; title: string; desc: string; time: string }>>([])
  const [trends, setTrends] = useState<{ growth: string; label: string; days: string[]; chat_qa: number[]; approval: number[] } | null>(null)
  const [createdApps, setCreatedApps] = useState<CreatedApp[]>([])
  const [billing, setBilling] = useState<BillingMe | null>(null)
  const { user, role } = useAuth()

  useEffect(() => {
    fetchDashboard().then(setStats)
    fetchAgents().then(setAgents)
    fetchActivities().then(setActivities)
    fetchTrends().then(setTrends)
    fetchCreatedApps().then(setCreatedApps).catch(() => {})
    fetchBillingMe().then(setBilling).catch(() => {})
  }, [])

  const adminLike = isTenantAdmin(user?.role ?? role)
  const visibleQuickLinks = useMemo(
    () => QUICK_LINKS.filter((l) => canAccessRole(user?.role ?? role, l.roles)),
    [user, role],
  )
  const planName = billing?.plan?.name || billing?.plan_tier
  const planFeatures = billing?.plan?.features || []
  const packs = billing?.plan?.industry_packs
  const schemaApproval = Boolean(billing?.plan?.schema_approval)

  const maxVal = trends ? Math.max(...trends.chat_qa, ...trends.approval, 1) : 1

  return (
    <>
      <div className="hero hero-premium">
        <div className="hero-shimmer" aria-hidden />
        <div className="hero-content">
          <div className="hero-badge">
            <IconSparkles size={14} />
            {t('admin.overview.badge')}
          </div>
          <h1>{t('admin.overview.welcome')}</h1>
          <p>
            {t('admin.overview.lead')}
          </p>
          <div className="hero-actions">
            <a href={PUBLIC_HOME || homePublicUrl()} className="btn btn-primary" target="_blank" rel="noreferrer">
              <IconSparkles size={16} />
              {t('admin.overview.cta_create')}
            </a>
            <Link to="/chat" className="btn btn-ghost">
              <IconMessage size={16} />
              {t('admin.overview.cta_chat')}
            </Link>
          </div>
        </div>
      </div>

      {planName ? (
        <div className="card card-hover" style={{ marginBottom: 16 }}>
          <div className="section-header" style={{ marginBottom: 8 }}>
            <div>
              <h2>{t('admin.overview.plan_title', { name: planName })}</h2>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                {packs === null || packs === undefined
                  ? t('admin.overview.packs_unlimited')
                  : packs === 0
                    ? t('admin.overview.packs_none')
                    : t('admin.overview.packs_max', { n: packs })}
                {' · '}
                {schemaApproval ? t('admin.overview.schema_approval') : t('admin.overview.schema_instant')}
                {' · '}{t('admin.overview.seats', { n: billing?.seat_quota ?? '—' })}
              </div>
            </div>
            <a
              href={`${homePublicUrl().replace(/\/$/, '')}/account/billing`}
              className="btn btn-ghost"
            >
              {t('admin.overview.manage_plan')}
            </a>
          </div>
          {planFeatures.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--muted)' }}>
              {planFeatures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="stat-grid stagger-in">
        {STAT_META.map((s) => {
          const StatIcon = s.icon
          const value = stats?.[s.key as keyof typeof stats]
          return (
            <div key={s.key} className={`stat-card stat-tone-${s.tone}`}>
              <div className="stat-card-icon">
                <StatIcon size={20} />
              </div>
              <div className="stat-card-body">
                <div className="value">{value ?? '—'}</div>
                <div className="label">{t(s.labelKey)}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card card-hover created-apps-section">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <h2>{t('admin.overview.apps_title')}</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              {t('admin.overview.apps_sub', { host: PUBLIC_HOME })}
            </div>
          </div>
        </div>
        {createdApps.length === 0 ? (
          <div className="created-apps-empty">
            <p>{t('admin.overview.apps_empty')}</p>
            <a href={PUBLIC_HOME || homePublicUrl()} className="btn btn-primary" target="_blank" rel="noreferrer">{t('admin.overview.apps_cta')}</a>
          </div>
        ) : (
          <div className="created-apps-grid">
            {createdApps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>

      <div className="section-header animate-fade-up">
        <h2>{t('admin.overview.agents_title', { n: PLATFORM_STATS.agents })}</h2>
        {adminLike && <Link to="/agents" className="section-link">{t('admin.overview.view_all')}</Link>}
      </div>
      <div className="agent-grid stagger-in">
        {(adminLike ? agents : agents.slice(0, 4)).map((a, i) => {
          const card = (
            <>
              <div className="agent-card-header">
                <div className="agent-card-title">
                  <span className="agent-emoji">{a.icon}</span>
                  {a.name}
                </div>
                <span className="badge-active">{t('admin.overview.enabled')}</span>
              </div>
              <div className="agent-card-desc">{a.description}</div>
            </>
          )
          return adminLike ? (
            <Link key={a.id} to={`/agents/${a.id}`} className="agent-card" style={{ animationDelay: `${i * 0.05}s` }}>
              {card}
            </Link>
          ) : (
            <div key={a.id} className="agent-card" style={{ animationDelay: `${i * 0.05}s` }}>
              {card}
            </div>
          )
        })}
      </div>

      <div className="two-col">
        <div className="card card-hover">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2>{t('admin.overview.activity')}</h2>
            <span className="live-dot">{t('admin.overview.live')}</span>
          </div>
          <ul className="activity-list">
            {activities.map((a, i) => (
              <li key={a.id} className="activity-item" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="activity-icon">{a.icon}</div>
                <div>
                  <div className="activity-title">{a.title}</div>
                  <div className="activity-desc">{a.desc}</div>
                  <div className="activity-time">{a.time}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card card-hover">
          <div className="trend-header">
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>{t('admin.overview.trends')}</h2>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{trends?.label}</div>
            </div>
            <div className="trend-growth">{trends?.growth}</div>
          </div>
          {trends && (
            <>
              <div className="trend-chart">
                {trends.days.map((day, i) => (
                  <div key={day} className="trend-bar-group">
                    <div className="trend-bars">
                      <div
                        className="trend-bar chat bar-animate"
                        style={{
                          height: `${(trends.chat_qa[i] / maxVal) * 80}px`,
                          animationDelay: `${i * 0.08}s`,
                        }}
                        title={`问答: ${trends.chat_qa[i]}`}
                      />
                      <div
                        className="trend-bar approval bar-animate"
                        style={{
                          height: `${(trends.approval[i] / maxVal) * 80}px`,
                          animationDelay: `${i * 0.08 + 0.04}s`,
                        }}
                        title={`审批: ${trends.approval[i]}`}
                      />
                    </div>
                    <div className="trend-day">{day}</div>
                  </div>
                ))}
              </div>
              <div className="trend-legend">
                <span><i className="legend-dot" style={{ background: '#6366f1' }} /> {t('admin.overview.legend_chat')}</span>
                <span><i className="legend-dot" style={{ background: '#f59e0b' }} /> {t('admin.overview.legend_approval')}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="two-col">
        <div className="card card-hover">
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div>
              <h2>{t('admin.overview.help_title', { brand: BRAND.nameZh })}</h2>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('admin.overview.help_sub')}</div>
            </div>
          </div>
          <ul className="feature-list">
            <li>{t('admin.overview.help.1')}</li>
            <li>{t('admin.overview.help.2')}</li>
            <li>{t('admin.overview.help.3')}</li>
            <li>{t('admin.overview.help.4')}</li>
            <li>{t('admin.overview.help.5')}</li>
          </ul>
        </div>

        <div className="card card-hover">
          <div className="section-header" style={{ marginBottom: 14 }}>
            <h2>{t('admin.overview.quick')}</h2>
          </div>
          <div className="quick-grid">
            {visibleQuickLinks.map((q) => {
              const QIcon = q.icon
              return (
                <Link key={q.to} to={q.to} className="quick-item">
                  <span className="quick-icon-wrap">
                    <QIcon size={20} />
                  </span>
                  <div className="quick-text">
                    <strong>{t(q.titleKey)}</strong>
                    <span>{t(q.subKey, q.subParams)}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
