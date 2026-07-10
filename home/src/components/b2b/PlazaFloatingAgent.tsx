import { Link } from 'react-router-dom'
import { useAgentPageContext } from '../../context/AgentPageContext'
import { AGENT_CONTEXTS } from '../../data/agentContext'
import { ROUTES } from '../../routes/paths'
import FloatingAgentDock from '../FloatingAgentDock'

/** 广场页底部悬浮 >> 入口，文案随页面切换 */
export default function PlazaFloatingAgent() {
  const { contextKey } = useAgentPageContext()
  const copy = AGENT_CONTEXTS[contextKey]

  return (
    <FloatingAgentDock
      storageKey="tc-floating-plaza"
      className="floating-agent-dock-plaza plaza-floating-dock"
      title="应用广场"
      chevLabel={copy.chevLabel}
      collapsedHint="点击展开"
      ariaLabel="智能体创建入口"
    >
      <Link to={`${ROUTES.home}#contact`} className="plaza-floating-agent-link">
        <span className="agent-brand-trigger mini" aria-hidden>
          <span className="agent-brand-chev">&gt;&gt;</span>
          <span className="agent-brand-chev-label">{copy.chevLabel}</span>
        </span>
        <span className="plaza-floating-agent-text">{copy.placeholder}</span>
        <span className="plaza-floating-agent-go agent-chevron-glyph">&gt;&gt;</span>
      </Link>
    </FloatingAgentDock>
  )
}
