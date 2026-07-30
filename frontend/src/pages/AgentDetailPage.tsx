import { useEffect, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import { Link, useParams } from 'react-router-dom'
import { api, type Agent } from '../api/client'

const PUBLIC_BASE = import.meta.env.VITE_PUBLIC_BASE_URL || window.location.origin.replace(/\/admin\/?$/, '')

interface Capability {
  key: string
  name: string
  category: string
  widget: string
  agent_id: string
}

export default function AgentDetailPage() {
  const t = useT()
  const { agentId } = useParams<{ agentId: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [caps, setCaps] = useState<Capability[]>([])

  useEffect(() => {
    if (!agentId) return
    api.get(`/agents/${agentId}`)
      .then((r) => {
        setAgent(r.data.agent)
        setCaps(r.data.capabilities)
      })
      .catch(() => setAgent(null))
  }, [agentId])

  if (!agent) {
    return (
      <div className="placeholder-page">
        <div className="icon">⏳</div>
        <h2>{agentId ? t('admin.agent.loading') : t('admin.agent.missing')}</h2>
        {agentId && (
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            若长时间无内容，请确认已执行 seed 且 API 正常。
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link to="/agents" style={{ fontSize: 12 }}>← 返回能力中心</Link>
      </div>
      <div className="hero" style={{ background: `linear-gradient(135deg, ${agent.color}, #6366f1)` }}>
        <h1>{agent.icon} {agent.name}</h1>
        <p>{agent.description}</p>
        {agentId === 'shanghai_voice' && (
          <a
            className="btn"
            href={`${PUBLIC_BASE}/agents/shanghai-voice`}
            target="_blank"
            rel="noreferrer"
            style={{ marginTop: 12, display: 'inline-block' }}
          >
            打开实时语音演示 →
          </a>
        )}
      </div>

      <div className="summary-pills">
        <div className="summary-pill"><div className="n">{caps.length}</div><div className="l">功能组件</div></div>
        <div className="summary-pill"><div className="n">{agent.office_count}</div><div className="l">办公场景</div></div>
        <div className="summary-pill"><div className="n">{agent.industry_count}</div><div className="l">行业场景</div></div>
        <div className="summary-pill"><div className="n" style={{ color: 'var(--ok)' }}>已启用</div><div className="l">状态</div></div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 14, color: 'var(--pri)' }}>包含的功能</h3>
        <div className="cap-grid module-page">
          {caps.map((c) => (
            <div key={c.key} className="cap-card">
              <div className="name">{c.name}</div>
              <div className="meta">{c.category}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
