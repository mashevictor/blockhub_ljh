import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAgentPageContext } from '../../context/AgentPageContext'
import { usePlazaFocus, type PlazaFocusTarget } from '../../context/PlazaFocusContext'
import { AGENT_CONTEXTS } from '../../data/agentContext'
import { usePlazaChevActions } from '../../hooks/usePlazaChevActions'
import { ROUTES } from '../../routes/paths'
import FloatingAgentDock from '../FloatingAgentDock'
import PlazaChevTrigger from '../plaza/PlazaChevTrigger'
import PlazaDockCollapsedBar from '../plaza/PlazaDockCollapsedBar'
import PlazaDualRailFlowPanel from '../plaza/PlazaDualRailFlowPanel'

function PlazaFocusDockBody({
  focus,
  moduleLabels,
  menuOpen,
  setMenuOpen,
  onOrchestration,
}: {
  focus: PlazaFocusTarget
  moduleLabels: string[]
  menuOpen: boolean
  setMenuOpen: (v: boolean | ((prev: boolean) => boolean)) => void
  onOrchestration: (appKey: string) => void
}) {
  const openApp = () => window.open(focus.webUrl, '_blank', 'noopener,noreferrer')
  const copyLink = () => void navigator.clipboard.writeText(focus.webUrl)
  const chevActions = usePlazaChevActions(focus, {
    onOpenApp: openApp,
    onFullscreen: () => onOrchestration(focus.appKey),
    onCopyLink: copyLink,
  })

  return (
    <>
      <PlazaDockCollapsedBar
        focus={focus}
        onOpenApp={openApp}
        onFullscreen={() => onOrchestration(focus.appKey)}
        onCopyLink={copyLink}
      />
      <div className="plaza-dual-rail-dock-body plaza-dual-rail-dock-expanded">
        <div className="plaza-dual-rail-dock-toolbar is-dock-drag-surface">
          <PlazaChevTrigger actions={chevActions} className="plaza-dock-chev-toolbar" />
          <span className="plaza-dual-rail-dock-toolbar-title">
            {focus.appName}
            {focus.plazaLabel ? ` · ${focus.plazaLabel}` : ''}
          </span>
          <div className="plaza-dual-rail-dock-tools">
            {focus.source === 'my' && focus.isCreator && !focus.inOrchestration && (
              <button
                type="button"
                className="plaza-dual-rail-tool"
                onClick={() => onOrchestration(focus.appKey)}
              >
                全屏
              </button>
            )}
            <a
              className="plaza-dual-rail-tool"
              href={focus.webUrl}
              target="_blank"
              rel="noreferrer"
            >
              打开
            </a>
            <div className="plaza-dual-rail-menu-wrap">
              <button
                type="button"
                className="plaza-dual-rail-tool"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
              >
                ···
              </button>
              {menuOpen && (
                <div className="plaza-dual-rail-menu" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      void navigator.clipboard.writeText(focus.webUrl)
                      setMenuOpen(false)
                    }}
                  >
                    复制网页链接
                  </button>
                  {focus.source === 'my' && focus.isCreator && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onOrchestration(focus.appKey)
                        setMenuOpen(false)
                      }}
                    >
                      全屏编排 / 分享发布
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {moduleLabels.length > 0 ? (
          <PlazaDualRailFlowPanel
            appKey={focus.appKey}
            appName={focus.appName}
            moduleLabels={moduleLabels}
            isCreator={focus.isCreator && focus.source === 'my'}
          />
        ) : (
          <p className="plaza-dual-rail-empty">暂无模块信息，请从「我的应用」进入全屏编排</p>
        )}

        <div className="plaza-dual-rail-dock-foot">
          <Link to={ROUTES.home} className="plaza-floating-create">
            <span className="agent-chevron-glyph">&gt;&gt;</span> 继续创建应用
          </Link>
        </div>
      </div>
    </>
  )
}

/** 广场页底部 >> 双轨编排（方案 C） */
export default function PlazaFloatingAgent() {
  const { contextKey } = useAgentPageContext()
  const copy = AGENT_CONTEXTS[contextKey]
  const { focus, requestOrchestration } = usePlazaFocus()
  const [menuOpen, setMenuOpen] = useState(false)

  const collapsedHint = useMemo(() => {
    if (focus) return `${focus.appName} · ${focus.moduleCount} 项`
    return copy.placeholderCollapsed ?? copy.placeholder
  }, [focus, copy])

  const moduleLabels = useMemo(() => {
    if (!focus?.moduleLabels?.length) return []
    return focus.moduleLabels
  }, [focus?.moduleLabels])

  const title = focus ? (
    <span className="plaza-dual-rail-dock-title">
      <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span>
      <span className="plaza-dual-rail-dock-name">{focus.appName}</span>
      <span className="plaza-dual-rail-dock-meta">· {focus.moduleCount} 项</span>
    </span>
  ) : (
    <>当前应用 · 应用广场</>
  )

  return (
    <FloatingAgentDock
      storageKey="tc-floating-plaza"
      className="floating-agent-dock-plaza plaza-floating-dock plaza-dual-rail-dock"
      title={title}
      chevLabel=""
      collapsedHint={collapsedHint}
      ariaLabel="应用广场双轨编排"
      variant="capsule"
      showDockToggle
      collapseToggleInTail
      snapBottomOnExpand
      defaultExpanded={false}
    >
      {focus ? (
        <PlazaFocusDockBody
            focus={focus}
            moduleLabels={moduleLabels}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
            onOrchestration={requestOrchestration}
          />
      ) : (
        <Link to={`${ROUTES.home}#contact`} className="plaza-floating-agent-link">
          <span className="agent-brand-trigger mini" aria-hidden>
            <span className="agent-brand-chev">&gt;&gt;</span>
          </span>
          <span className="plaza-floating-agent-text">{copy.placeholder}</span>
          <span className="plaza-floating-agent-go agent-chevron-glyph">&gt;&gt;</span>
        </Link>
      )}
    </FloatingAgentDock>
  )
}
