import { useT } from '@blockhub/i18n/react'
import type { PlazaRunPhase } from '../../context/PlazaFlowRunContext'
import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

export interface RunPhaseUi {
  phase: PlazaRunPhase
  badge: string
  badgeClass: string
}

export function runPhaseUi(
  phase: PlazaRunPhase,
  stepIndex: number,
  totalSteps: number,
  t: TranslateFn,
): RunPhaseUi {
  const a = Math.min(stepIndex + 1, totalSteps)
  switch (phase) {
    case 'running':
      return {
        phase,
        badge: t('home.plaza.run.badge.running', { a, b: totalSteps }),
        badgeClass: 'is-running',
      }
    case 'paused':
      return {
        phase,
        badge: t('home.plaza.run.badge.paused', { a, b: totalSteps }),
        badgeClass: 'is-paused',
      }
    case 'completed':
      return { phase, badge: t('home.plaza.run.badge.done'), badgeClass: 'is-done' }
    case 'error':
      return { phase, badge: t('home.plaza.run.badge.error'), badgeClass: 'is-error' }
    case 'stopped':
      return { phase, badge: t('home.plaza.run.badge.stopped'), badgeClass: 'is-stopped' }
    default:
      return { phase: 'idle', badge: t('home.plaza.run.badge.idle'), badgeClass: 'is-idle' }
  }
}

interface Props {
  compact?: boolean
  showBadge?: boolean
}

/** 流程预览控制 · 自动步进 + 手动上/下一步；不写库、不改模块结构 */
export default function PlazaRunControls({ compact = false, showBadge = true }: Props) {
  const t = useT()
  const run = usePlazaFlowRun()
  const ui = runPhaseUi(run.phase, run.stepIndex, run.steps.length, t)
  const disabled = !run.steps.length
  const inPreview =
    run.phase === 'running' || run.phase === 'paused' || run.phase === 'completed'
  const canStep = run.phase === 'running' || run.phase === 'paused'

  return (
    <div
      className={`plaza-run-controls${compact ? ' compact' : ''}`}
      role="group"
      aria-label={t('home.plaza.run.aria')}
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
          title={t('home.plaza.run.start_title')}
        >
          {t('home.plaza.run.start')}
        </button>
      )}

      {canStep && (
        <>
          <button
            type="button"
            className="plaza-run-btn prev"
            disabled={run.stepIndex <= 0}
            onClick={() => run.prevStep()}
            title={t('home.plaza.run.prev_title')}
          >
            {t('home.plaza.run.prev')}
          </button>
          <button
            type="button"
            className="plaza-run-btn next"
            onClick={() => run.nextStep()}
            title={t('home.plaza.run.next_title')}
          >
            {t('home.plaza.run.next')}
          </button>
        </>
      )}

      {run.phase === 'running' && (
        <>
          <button type="button" className="plaza-run-btn pause" onClick={() => run.pause()} title={t('home.plaza.run.pause_title')}>
            {t('home.plaza.run.pause')}
          </button>
          <button type="button" className="plaza-run-btn stop" onClick={() => run.stop()} title={t('home.plaza.run.stop_title')}>
            {t('home.plaza.run.stop')}
          </button>
        </>
      )}

      {run.phase === 'paused' && (
        <>
          <button type="button" className="plaza-run-btn resume" onClick={() => run.resume()} title={t('home.plaza.run.resume_title')}>
            {t('home.plaza.run.resume')}
          </button>
          <button type="button" className="plaza-run-btn stop" onClick={() => run.stop()} title={t('home.plaza.run.stop_title')}>
            {t('home.plaza.run.stop')}
          </button>
        </>
      )}

      {(run.phase === 'completed' || run.phase === 'stopped') && (
        <>
          <button type="button" className="plaza-run-btn restart" onClick={() => run.retry()} title={t('home.plaza.run.restart_title')}>
            {t('home.plaza.run.restart')}
          </button>
          <button type="button" className="plaza-run-btn reset" onClick={() => run.reset()} title={t('home.plaza.run.reset_title')}>
            {t('home.plaza.run.reset')}
          </button>
        </>
      )}

      {run.phase === 'error' && (
        <>
          <button type="button" className="plaza-run-btn retry" onClick={() => run.retry()} title={t('home.plaza.run.retry_title')}>
            {t('home.plaza.run.retry')}
          </button>
          <button type="button" className="plaza-run-btn reset" onClick={() => run.reset()} title={t('home.plaza.run.reset_title')}>
            {t('home.plaza.run.reset')}
          </button>
        </>
      )}

      {inPreview && !compact && (
        <span className="plaza-run-hint">{t('home.plaza.run.hint')}</span>
      )}
    </div>
  )
}
