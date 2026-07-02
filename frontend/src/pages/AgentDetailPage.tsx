import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, type Agent } from '../api/client'

interface Capability {
  key: string
  name: string
  category: string
  widget: string
  agent_id: string
}

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [caps, setCaps] = useState<Capability[]>([])

  useEffect(() => {
    if (!agentId) return
    api.get(`/agents/${agentId}`).then((r) => {
      setAgent(r.data.agent)
      setCaps(r.data.capabilities)
    })
  }, [agentId])

  if (!agent) {
    return <div className="placeholder-page"><div className="icon">⏳</div><h2>加载中…</h2></div>
  }

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <Link to="/agents" style={{ fontSize: 12 }}>← 返回能力中心</Link>
      </div>
      <div className="hero" style={{ background: `linear-gradient(135deg, ${agent.color}, #6366f1)` }}>
        <h1>{agent.icon} {agent.name}</h1>
        <p>{agent.description}</p>
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
