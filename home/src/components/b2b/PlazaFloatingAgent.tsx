import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAgentPageContext } from '../../context/AgentPageContext'
import { usePlazaFocus } from '../../context/PlazaFocusContext'
import { AGENT_CONTEXTS } from '../../data/agentContext'
import { ROUTES } from '../../routes/paths'
import FloatingAgentDock from '../FloatingAgentDock'

function scrollToFlowPanel() {
  document.querySelector('.plaza-mflow-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

/** 广场页底部悬浮 >> 入口，绑定当前选中应用并提供快捷操作 */
export default function PlazaFloatingAgent() {
  const { contextKey } = useAgentPageContext()
  const copy = AGENT_CONTEXTS[contextKey]
  const { focus, requestOrchestration } = usePlazaFocus()

  const collapsedHint = useMemo(() => {
    if (focus) return `>> ${focus.appName} · ${focus.moduleCount} 项`
    return copy.placeholderCollapsed ?? copy.placeholder
  }, [focus, copy])

  const title = focus ? `当前应用 · ${focus.appName}` : '应用广场'

  return (
    <FloatingAgentDock
      storageKey="tc-floating-plaza"
      className="floating-agent-dock-plaza plaza-floating-dock"
      title={title}
      chevLabel={copy.chevLabel}
      collapsedHint={collapsedHint}
      ariaLabel="应用广场智能助手"
      variant="capsule"
      showDockToggle
    >
      {focus ? (
        <div className="plaza-floating-focus">
          <div className="plaza-floating-focus-head">
            <strong>{focus.appName}</strong>
            <span>
              {focus.moduleCount} 项
              {focus.plazaLabel ? ` · ${focus.plazaLabel}` : ' · 未发布到广场'}
              {focus.inOrchestration ? ' · 编排中' : ''}
            </span>
          </div>
          <div className="plaza-floating-focus-actions">
            {focus.source === 'my' && focus.isCreator && !focus.inOrchestration && (
              <button
                type="button"
                className="plaza-floating-act primary"
                onClick={() => requestOrchestration(focus.appKey)}
              >
                <span className="plaza-mflow-chev">&gt;&gt;</span> 编排
              </button>
            )}
            <a
              className="plaza-floating-act"
              href={focus.webUrl}
              target="_blank"
              rel="noreferrer"
            >
              打开应用
            </a>
            <button
              type="button"
              className="plaza-floating-act"
              onClick={() => navigator.clipboard.writeText(focus.webUrl)}
            >
              复制链接
            </button>
            {focus.source === 'feed' && (
              <button type="button" className="plaza-floating-act" onClick={scrollToFlowPanel}>
                查看数据流
              </button>
            )}
            {focus.source === 'my' && focus.isCreator && (
              <button
                type="button"
                className="plaza-floating-act"
                onClick={() => {
                  if (!focus.inOrchestration) {
                    requestOrchestration(focus.appKey)
                    return
                  }
                  const details = document.querySelector('.plaza-orch-share') as HTMLDetailsElement | null
                  if (details) {
                    details.open = true
                    details.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                  }
                }}
              >
                @公开 发布
              </button>
            )}
          </div>
          <div className="plaza-floating-focus-foot">
            <Link to={ROUTES.home} className="plaza-floating-create">
              <span className="agent-chevron-glyph">&gt;&gt;</span> 继续创建应用
            </Link>
            {focus.source === 'feed' && (
              <Link to={ROUTES.plazaMyApps} className="plaza-floating-create secondary">
                去我的应用
              </Link>
            )}
          </div>
        </div>
      ) : (
        <Link to={`${ROUTES.home}#contact`} className="plaza-floating-agent-link">
          <span className="agent-brand-trigger mini" aria-hidden>
            <span className="agent-brand-chev">&gt;&gt;</span>
            <span className="agent-brand-chev-label">{copy.chevLabel}</span>
          </span>
          <span className="plaza-floating-agent-text">{copy.placeholder}</span>
          <span className="plaza-floating-agent-go agent-chevron-glyph">&gt;&gt;</span>
        </Link>
      )}
    </FloatingAgentDock>
  )
}
