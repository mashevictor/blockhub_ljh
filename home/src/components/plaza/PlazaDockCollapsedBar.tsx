import { useMemo } from 'react'
import { useFloatingDock } from '../../context/FloatingDockContext'
import { usePlazaFlowRun, type PlazaRunPhase } from '../../context/PlazaFlowRunContext'
import type { PlazaFocusTarget } from '../../context/PlazaFocusContext'
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
  const chevActions = usePlazaChevActions(focus, { onOpenApp, onFullscreen, onCopyLink })

  const summary = useMemo(() => {
    if (run.phase === 'idle') {
      return `${focus.appName} · ${focus.moduleCount} 项 · 就绪`
    }
    return run.progressLabel
  }, [run.phase, run.progressLabel, focus.appName, focus.moduleCount])

  return (
    <div className="plaza-dock-collapsed-bar is-dock-drag-surface" aria-label="编排执行状态">
      <div className="plaza-dock-collapsed-main">
        <PlazaChevTrigger actions={chevActions} />

        <span className={`plaza-dock-status-dot ${statusDotClass(run.phase)}`} aria-hidden />

        <button
          type="button"
          className="plaza-dock-collapsed-text"
          onClick={() => {
            /* 执行中/暂停：折叠条已有暂停停止，不必展开整框 */
            if (run.phase === 'running' || run.phase === 'paused') return
            dock?.expand()
          }}
          title={
            run.phase === 'running' || run.phase === 'paused'
              ? '试运营进行中 · 使用右侧暂停/停止'
              : '展开查看双轨编排'
          }
        >
          <strong>{focus.appName}</strong>
          <span>{summary}</span>
        </button>

        <PlazaRunControls compact showBadge={false} />
      </div>
    </div>
  )
}
