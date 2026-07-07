import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAgents, fetchCapabilities, type Agent } from '../api/client'
import { PLATFORM_STATS } from '@shared/platformStats'

export default function AgentCenterPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [capCount, setCapCount] = useState(0)

  useEffect(() => {
    fetchAgents().then(setAgents)
    fetchCapabilities().then((d) => setCapCount(d.total))
  }, [])

  return (
    <>
      <div className="page-header">
        <h1>能力中心</h1>
        <p>{PLATFORM_STATS.agents} 个助手：创建、问答、知识库、审批、报表、通知、对接、编排、安全与多端门户</p>
      </div>

      <div className="summary-pills">
        <div className="summary-pill"><div className="n">{agents.length || PLATFORM_STATS.agents}</div><div className="l">助手</div></div>
        <div className="summary-pill"><div className="n">{capCount || PLATFORM_STATS.capabilities}</div><div className="l">功能组件</div></div>
        <div className="summary-pill"><div className="n">{PLATFORM_STATS.officeScenarios}</div><div className="l">办公场景</div></div>
        <div className="summary-pill"><div className="n">{PLATFORM_STATS.industryScenarios}</div><div className="l">行业场景</div></div>
      </div>

      <div className="agent-grid">
        {agents.map((a) => (
          <Link key={a.id} to={`/agents/${a.id}`} className="agent-card">
            <div className="agent-card-header">
              <div className="agent-card-title">
                <span>{a.icon}</span> {a.name}
              </div>
              <span className="badge-active">已启用</span>
            </div>
            <div className="agent-card-desc">{a.description}</div>
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
              覆盖办公约 {a.office_count} 项 · 行业约 {a.industry_count} 项
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}
