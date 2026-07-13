import type { PlazaRunPhase } from '../../context/PlazaFlowRunContext'
import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'

export interface RunPhaseUi {
  phase: PlazaRunPhase
  badge: string
  badgeClass: string
}

export function runPhaseUi(phase: PlazaRunPhase, stepIndex: number, totalSteps: number): RunPhaseUi {
  switch (phase) {
    case 'running':
      return {
        phase,
        badge: `执行中 ${Math.min(stepIndex + 1, totalSteps)}/${totalSteps}`,
        badgeClass: 'is-running',
      }
    case 'paused':
      return {
        phase,
        badge: `已暂停 ${Math.min(stepIndex + 1, totalSteps)}/${totalSteps}`,
        badgeClass: 'is-paused',
      }
    case 'completed':
      return { phase, badge: '已完成', badgeClass: 'is-done' }
    case 'error':
      return { phase, badge: '执行失败', badgeClass: 'is-error' }
    case 'stopped':
      return { phase, badge: '已停止', badgeClass: 'is-stopped' }
    default:
      return { phase: 'idle', badge: '就绪', badgeClass: 'is-idle' }
  }
}

interface Props {
  compact?: boolean
  showBadge?: boolean
}

/** 试运营状态机 · 各态独立按钮样式 */
export default function PlazaRunControls({ compact = false, showBadge = true }: Props) {
  const run = usePlazaFlowRun()
  const ui = runPhaseUi(run.phase, run.stepIndex, run.steps.length)
  const disabled = !run.steps.length

  return (
    <div
      className={`plaza-run-controls${compact ? ' compact' : ''}`}
      role="group"
      aria-label="试运营控制"
    >
      {showBadge && (
        <span className={`plaza-run-phase-badge ${ui.badgeClass}`} title={run.progressLabel}>
          {ui.badge}
        </span>
      )}

      {run.phase === 'idle' && (
        <button
          type="button"
          className="plaza-run-btn start"
          disabled={disabled}
          onClick={() => run.start()}
          title="从首步开始试运营"
        >
          ▶ 试运营
        </button>
      )}

      {run.phase === 'running' && (
        <>
          <button type="button" className="plaza-run-btn pause" onClick={() => run.pause()} title="暂停">
            ⏸ 暂停
          </button>
          <button type="button" className="plaza-run-btn stop" onClick={() => run.stop()} title="停止">
            ⏹ 停止
          </button>
        </>
      )}

      {run.phase === 'paused' && (
        <>
          <button type="button" className="plaza-run-btn resume" onClick={() => run.resume()} title="继续">
            ▶ 继续
          </button>
          <button type="button" className="plaza-run-btn stop" onClick={() => run.stop()} title="停止">
            ⏹ 停止
          </button>
        </>
      )}

      {run.phase === 'completed' && (
        <>
          <button type="button" className="plaza-run-btn restart" onClick={() => run.retry()} title="再跑一遍">
            ↻ 再试运营
          </button>
          <button type="button" className="plaza-run-btn reset" onClick={() => run.reset()} title="回到就绪">
            ✕ 重置
          </button>
        </>
      )}

      {run.phase === 'stopped' && (
        <>
          <button type="button" className="plaza-run-btn restart" onClick={() => run.retry()} title="重新开始">
            ↻ 重新试运营
          </button>
          <button type="button" className="plaza-run-btn reset" onClick={() => run.reset()} title="回到就绪">
            ✕ 重置
          </button>
        </>
      )}

      {run.phase === 'error' && (
        <>
          <button type="button" className="plaza-run-btn retry" onClick={() => run.retry()} title="重试">
            ↻ 重试
          </button>
          <button type="button" className="plaza-run-btn reset" onClick={() => run.reset()} title="回到就绪">
            ✕ 重置
          </button>
        </>
      )}
    </div>
  )
}
