import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchActivities,
  fetchAgents,
  fetchCreatedApps,
  fetchDashboard,
  fetchTrends,
  type Agent,
  type CreatedApp,
} from '../api/client'
import { BRAND } from '../data/brand'
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
  { key: 'agents', label: '智能能力', icon: IconBot, tone: 'violet' },
  { key: 'capabilities', label: '功能组件', icon: IconGrid, tone: 'sky' },
  { key: 'office_scenarios', label: '办公场景', icon: IconList, tone: 'indigo' },
  { key: 'industry_scenarios', label: '行业场景', icon: IconList, tone: 'amber' },
  { key: 'apps_created', label: '已建应用', icon: IconAppWindow, tone: 'emerald' },
  { key: 'chat_sessions', label: '对话次数', icon: IconMessage, tone: 'cyan' },
  { key: 'pending_approvals', label: '待我审批', icon: IconInbox, tone: 'orange' },
  { key: 'unread_notifications', label: '未读消息', icon: IconBell, tone: 'rose' },
] as const

const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL || 'http://101.32.209.251'

function appWebUrl(app: CreatedApp) {
  return app.web_url || `${PUBLIC_BASE}/r/${app.id}`
}

function appDownloadUrl(app: CreatedApp) {
  return app.download_url || `${PUBLIC_BASE}/r/${app.id}/download`
}

function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data)}`
}

function sourceLabel(source?: string) {
  if (source === 'prompt') return '描述需求'
  if (source === 'module') return '自由搭配'
  return '按行业'
}

function AppCard({ app }: { app: CreatedApp }) {
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
          <h3>{app.name}</h3>
          <span className="badge-active">{app.status || 'published'}</span>
        </div>
        <p className="created-app-meta">
          {sourceLabel(app.source)} · {app.industry_key} · {app.scenarios.length} 个场景
          · {new Date(app.created_at).toLocaleString('zh-CN')}
        </p>
        <p className="created-app-features">
          <strong>功能介绍：</strong>{featureText || '智能问答 · 审批流 · 知识库'}
        </p>
        <div className="created-app-links">
          <div className="created-app-link-row">
            <span>网页访问</span>
            <a href={webUrl} target="_blank" rel="noreferrer">{webUrl}</a>
            <button type="button" onClick={() => navigator.clipboard.writeText(webUrl)}>复制</button>
          </div>
          <div className="created-app-link-row">
            <span>下载链接</span>
            <a href={downloadUrl} target="_blank" rel="noreferrer">{downloadUrl}</a>
            <button type="button" onClick={() => navigator.clipboard.writeText(downloadUrl)}>复制</button>
          </div>
        </div>
      </div>
      <div className="created-app-qr">
        <img src={qrImageUrl(webUrl)} alt={`${app.name} 二维码`} width={120} height={120} />
        <span>扫码打开应用</span>
      </div>
    </article>
  )
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof fetchDashboard>> | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [activities, setActivities] = useState<Array<{ id: number; icon: string; title: string; desc: string; time: string }>>([])
  const [trends, setTrends] = useState<{ growth: string; label: string; days: string[]; chat_qa: number[]; approval: number[] } | null>(null)
  const [createdApps, setCreatedApps] = useState<CreatedApp[]>([])

  useEffect(() => {
    fetchDashboard().then(setStats)
    fetchAgents().then(setAgents)
    fetchActivities().then(setActivities)
    fetchTrends().then(setTrends)
    fetchCreatedApps().then(setCreatedApps).catch(() => {})
  }, [])

  const maxVal = trends ? Math.max(...trends.chat_qa, ...trends.approval, 1) : 1

  return (
    <>
      <div className="hero hero-premium">
        <div className="hero-shimmer" aria-hidden />
        <div className="hero-content">
          <div className="hero-badge">
            <IconSparkles size={14} />
            工作台
          </div>
          <h1>欢迎回来</h1>
          <p>
            查看已生成的应用、复制访问链接或下载地址，分发给员工使用
          </p>
          <div className="hero-actions">
            <a href={PUBLIC_BASE} className="btn btn-primary" target="_blank" rel="noreferrer">
              <IconSparkles size={16} />
              前往创建页
            </a>
            <Link to="/chat" className="btn btn-ghost">
              <IconMessage size={16} />
              开始对话
            </Link>
          </div>
        </div>
      </div>

      <div className="stat-grid stagger-in">
        {STAT_META.map((s) => {
          const StatIcon = s.icon
          const value = stats?.[s.key as keyof typeof stats]
          return (
            <div key={s.label} className={`stat-card stat-tone-${s.tone}`}>
              <div className="stat-card-icon">
                <StatIcon size={20} />
              </div>
              <div className="stat-card-body">
                <div className="value">{value ?? '—'}</div>
                <div className="label">{s.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="card card-hover created-apps-section">
        <div className="section-header" style={{ marginBottom: 16 }}>
          <div>
            <h2>已创建应用</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              来自 Home 创建入口 · 链接均使用公网地址 {PUBLIC_BASE}
            </div>
          </div>
        </div>
        {createdApps.length === 0 ? (
          <div className="created-apps-empty">
            <p>还没有已发布的应用。请先在首页创建并发布。</p>
            <a href={PUBLIC_BASE} className="btn btn-primary" target="_blank" rel="noreferrer">去创建应用</a>
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
        <h2>十大能力</h2>
        <Link to="/agents" className="section-link">查看全部 →</Link>
      </div>
      <div className="agent-grid stagger-in">
        {agents.map((a, i) => (
          <Link
            key={a.id}
            to={`/agents/${a.id}`}
            className="agent-card"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className="agent-card-header">
              <div className="agent-card-title">
                <span className="agent-emoji">{a.icon}</span>
                {a.name}
              </div>
              <span className="badge-active">已启用</span>
            </div>
            <div className="agent-card-desc">{a.description}</div>
          </Link>
        ))}
      </div>

      <div className="two-col">
        <div className="card card-hover">
          <div className="section-header" style={{ marginBottom: 12 }}>
            <h2>最近动态</h2>
            <span className="live-dot">● 实时</span>
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
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>本周使用情况</h2>
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
                <span><i className="legend-dot" style={{ background: '#6366f1' }} /> 智能问答</span>
                <span><i className="legend-dot" style={{ background: '#f59e0b' }} /> 审批处理</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="two-col">
        <div className="card card-hover">
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div>
              <h2>{BRAND.nameZh} 能帮您做什么</h2>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>从创建到日常使用，一个平台搞定</div>
            </div>
          </div>
          <ul className="feature-list">
            <li><strong>创建应用</strong> — 勾选业务场景，一键发布给员工</li>
            <li><strong>制度问答</strong> — 上传 PDF，员工提问带出处</li>
            <li><strong>在线审批</strong> — 请假、报销等流程在线提交与处理</li>
            <li><strong>数据报表</strong> — 查看使用情况与业务指标</li>
            <li><strong>消息通知</strong> — 审批结果、公告及时送达</li>
          </ul>
        </div>

        <div className="card card-hover">
          <div className="section-header" style={{ marginBottom: 14 }}>
            <h2>快捷入口</h2>
          </div>
          <div className="quick-grid">
            {[
              { to: '/scenarios', icon: IconList, title: '业务场景', sub: '114 个可选' },
              { to: '/knowledge', icon: IconBook, title: '知识库', sub: '上传制度文档' },
              { to: '/approvals', icon: IconCheckCircle, title: '审批中心', sub: '处理待办' },
              { to: '/reports', icon: IconBarChart, title: '数据报表', sub: '查看统计' },
            ].map((q) => {
              const QIcon = q.icon
              return (
                <Link key={q.to} to={q.to} className="quick-item">
                  <span className="quick-icon-wrap">
                    <QIcon size={20} />
                  </span>
                  <div className="quick-text">
                    <strong>{q.title}</strong>
                    <span>{q.sub}</span>
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
