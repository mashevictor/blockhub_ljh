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
        badge: `预览 ${Math.min(stepIndex + 1, totalSteps)}/${totalSteps}`,
        badgeClass: 'is-running',
      }
    case 'paused':
      return {
        phase,
        badge: `暂停 ${Math.min(stepIndex + 1, totalSteps)}/${totalSteps}`,
        badgeClass: 'is-paused',
      }
    case 'completed':
      return { phase, badge: '预览完成', badgeClass: 'is-done' }
    case 'error':
      return { phase, badge: '预览失败', badgeClass: 'is-error' }
    case 'stopped':
      return { phase, badge: '已停止', badgeClass: 'is-stopped' }
    default:
      return { phase: 'idle', badge: '概览', badgeClass: 'is-idle' }
  }
}

interface Props {
  compact?: boolean
  showBadge?: boolean
}

/** 流程预览控制 · 自动步进 + 手动上/下一步；不写库、不改模块结构 */
export default function PlazaRunControls({ compact = false, showBadge = true }: Props) {
  const run = usePlazaFlowRun()
  const ui = runPhaseUi(run.phase, run.stepIndex, run.steps.length)
  const disabled = !run.steps.length
  const inPreview =
    run.phase === 'running' || run.phase === 'paused' || run.phase === 'completed'
  const canStep = run.phase === 'running' || run.phase === 'paused'

  return (
    <div
      className={`plaza-run-controls${compact ? ' compact' : ''}`}
      role="group"
      aria-label="流程预览控制"
    >
      {showBadge && (
        <span className={`plaza-run-phase-badge ${ui.badgeClass}`} title={run.progressLabel}>
          {ui.badge}
          {run.currentStep && run.phase !== 'idle' ? (
            <em className="plaza-run-phase-step"> · {run.currentStep.label}</em>
          ) : null}
        </span>
      )}

      {run.phase === 'idle' && (
        <button
          type="button"
          className="plaza-run-btn start"
          disabled={disabled}
          onClick={() => run.start()}
          title="自动走一遍意图→模块→输出；也可点「下一步」或点选节点推进"
        >
          ▶ 流程预览
        </button>
      )}

      {canStep && (
        <>
          <button
            type="button"
            className="plaza-run-btn prev"
            disabled={run.stepIndex <= 0}
            onClick={() => run.prevStep()}
            title="上一步"
          >
            ← 上一步
          </button>
          <button
            type="button"
            className="plaza-run-btn next"
            onClick={() => run.nextStep()}
            title="下一步（会暂停自动播放）"
          >
            下一步 →
          </button>
        </>
      )}

      {run.phase === 'running' && (
        <>
          <button type="button" className="plaza-run-btn pause" onClick={() => run.pause()} title="暂停自动">
            ⏸ 暂停
          </button>
          <button type="button" className="plaza-run-btn stop" onClick={() => run.stop()} title="停止预览">
            ⏹ 停止
          </button>
        </>
      )}

      {run.phase === 'paused' && (
        <>
          <button type="button" className="plaza-run-btn resume" onClick={() => run.resume()} title="继续自动步进">
            ▶ 继续自动
          </button>
          <button type="button" className="plaza-run-btn stop" onClick={() => run.stop()} title="停止预览">
            ⏹ 停止
          </button>
        </>
      )}

      {(run.phase === 'completed' || run.phase === 'stopped') && (
        <>
          <button type="button" className="plaza-run-btn restart" onClick={() => run.retry()} title="再预览一遍">
            ↻ 再预览
          </button>
          <button type="button" className="plaza-run-btn reset" onClick={() => run.reset()} title="回到概览">
            ✕ 概览
          </button>
        </>
      )}

      {run.phase === 'error' && (
        <>
          <button type="button" className="plaza-run-btn retry" onClick={() => run.retry()} title="重试">
            ↻ 重试
          </button>
          <button type="button" className="plaza-run-btn reset" onClick={() => run.reset()} title="回到概览">
            ✕ 概览
          </button>
        </>
      )}

      {inPreview && !compact && (
        <span className="plaza-run-hint">
          自动约 1.4s/步 · 或点「下一步」/ 点选上方节点
        </span>
      )}
    </div>
  )
}
