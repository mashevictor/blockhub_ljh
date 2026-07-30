import { useEffect, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import { Link } from 'react-router-dom'
import { fetchAgents, fetchCapabilities, type Agent } from '../api/client'
import { PLATFORM_STATS } from '@shared/platformStats'

export default function AgentCenterPage() {
  const t = useT()
  const [agents, setAgents] = useState<Agent[]>([])
  const [capCount, setCapCount] = useState(0)

  useEffect(() => {
    fetchAgents().then(setAgents)
    fetchCapabilities().then((d) => setCapCount(d.total))
  }, [])

  return (
    <>
      <div className="page-header">
        <h1>{t('admin.page.agents.title')}</h1>
        <p>{t('admin.page.agents.desc')}</p>
      </div>

      <div className="summary-pills">
        <div className="summary-pill"><div className="n">{agents.length || PLATFORM_STATS.agents}</div><div className="l">{t('admin.page.agents.pill_agents')}</div></div>
        <div className="summary-pill"><div className="n">{capCount || PLATFORM_STATS.capabilities}</div><div className="l">{t('admin.page.agents.pill_caps')}</div></div>
        <div className="summary-pill"><div className="n">{PLATFORM_STATS.officeScenarios}</div><div className="l">{t('admin.page.agents.pill_office')}</div></div>
        <div className="summary-pill"><div className="n">{PLATFORM_STATS.industryScenarios}</div><div className="l">{t('admin.page.agents.pill_industry')}</div></div>
      </div>

      <div className="agent-grid">
        {agents.map((a) => (
          <Link key={a.id} to={`/agents/${a.id}`} className="agent-card">
            <div className="agent-card-header">
              <div className="agent-card-title">
                <span>{a.icon}</span> {a.name}
              </div>
              <span className="badge-active">{t('admin.page.agents.enabled')}</span>
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
