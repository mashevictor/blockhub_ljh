import { useMemo } from 'react'
import { useFloatingDock } from '../../context/FloatingDockContext'
import { usePlazaFlowRun, type PlazaRunPhase } from '../../context/PlazaFlowRunContext'
import type { PlazaFocusTarget } from '../../context/PlazaFocusContext'
import { usePlazaChevActions } from '../../hooks/usePlazaChevActions'
import PlazaChevTrigger from './PlazaChevTrigger'

function statusDotClass(phase: PlazaRunPhase): string {
  switch (phase) {
    case 'running':
      return 'is-running'
    case 'paused':
      return 'is-paused'
    case 'completed':
      return 'is-done'
    case 'error':
      return 'is-error'
    case 'stopped':
      return 'is-stopped'
    default:
      return 'is-idle'
  }
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
          onClick={() => dock?.expand()}
          title="展开查看双轨编排"
        >
          <strong>{focus.appName}</strong>
          <span>{summary}</span>
        </button>

        <div className="plaza-dock-run-controls">
          {run.phase === 'running' && (
            <>
              <button type="button" className="plaza-dock-run-btn" onClick={() => run.pause()} title="暂停">
                暂停
              </button>
              <button type="button" className="plaza-dock-run-btn danger" onClick={() => run.stop()} title="停止">
                停止
              </button>
            </>
          )}
          {run.phase === 'paused' && (
            <>
              <button type="button" className="plaza-dock-run-btn primary" onClick={() => run.resume()} title="继续">
                继续
              </button>
              <button type="button" className="plaza-dock-run-btn danger" onClick={() => run.stop()} title="停止">
                停止
              </button>
            </>
          )}
          {(run.phase === 'idle' || run.phase === 'completed' || run.phase === 'stopped') && (
            <button
              type="button"
              className="plaza-dock-run-btn primary"
              onClick={() => run.start()}
              disabled={!run.steps.length}
              title="试运行"
            >
              试运行
            </button>
          )}
          {run.phase === 'error' && (
            <button type="button" className="plaza-dock-run-btn primary" onClick={() => run.retry()} title="重试">
              重试
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
