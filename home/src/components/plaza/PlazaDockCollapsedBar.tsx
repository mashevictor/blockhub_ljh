import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { useFloatingDock } from '../../context/FloatingDockContext'
import { usePlazaFlowRun, type PlazaRunPhase } from '../../context/PlazaFlowRunContext'
import { usePlazaFocus, type PlazaFocusTarget } from '../../context/PlazaFocusContext'
import { usePlazaChevActions } from '../../hooks/usePlazaChevActions'
import PlazaChevTrigger from './PlazaChevTrigger'
import PlazaRunControls, { runPhaseUi } from './PlazaRunControls'

function statusDotClass(phase: PlazaRunPhase): string {
  return runPhaseUi(phase, 0, 1).badgeClass
}

interface Props {
  focus: PlazaFocusTarget
  onOpenApp: () => void
  onFullscreen: () => void
  onCopyLink: () => void
}

export default function PlazaDockCollapsedBar({
  focus,
  onOpenApp,
  onFullscreen,
  onCopyLink,
}: Props) {
  const dock = useFloatingDock()
  const run = usePlazaFlowRun()
  const { runCommand } = usePlazaFocus()
  const chevActions = usePlazaChevActions(focus, { onOpenApp, onFullscreen, onCopyLink })
  const [cmd, setCmd] = useState('')

  const submit = () => {
    const text = cmd.trim()
    if (!text) return
    const stayCollapsed = /^(停止预览|停止试运营|停止运行|先停一下|停止|暂停|流程预览|开始试运营|试运营验收|跑一遍)$/.test(
      text.replace(/^>+\s*/, ''),
    )
    if (!stayCollapsed) dock?.expand()
    runCommand(text.startsWith('>>') ? text : `>> ${text}`)
    setCmd('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      setCmd('')
    }
  }

  const stopDragBubble = (e: MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div className="plaza-dock-collapsed-bar is-dock-drag-surface" aria-label="工作台指令">
      <div className="plaza-dock-collapsed-main">
        <PlazaChevTrigger actions={chevActions} />

        <span className={`plaza-dock-status-dot ${statusDotClass(run.phase)}`} aria-hidden />

        <button
          type="button"
          className="plaza-dock-collapsed-app"
          onClick={() => {
            if (run.phase === 'running' || run.phase === 'paused') return
            dock?.expand()
          }}
          title={focus.appName}
        >
          {focus.appName}
        </button>

        <div
          className="plaza-dock-collapsed-input-wrap"
          onPointerDown={stopDragBubble}
          onClick={stopDragBubble}
        >
          <span className="plaza-dock-collapsed-chev" aria-hidden>&gt;&gt;</span>
          <input
            type="text"
            className="plaza-dock-collapsed-input"
            value={cmd}
            placeholder="输入指令或提问，回车执行…"
            aria-label="折叠态业务指令输入"
            onChange={(e) => setCmd(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="plaza-dock-collapsed-go"
            disabled={!cmd.trim()}
            onClick={(e) => {
              e.stopPropagation()
              submit()
            }}
          >
            执行
          </button>
        </div>

        <PlazaRunControls compact showBadge={false} />
      </div>
    </div>
  )
}
