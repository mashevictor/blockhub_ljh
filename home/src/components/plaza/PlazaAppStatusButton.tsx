import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useT } from '@blockhub/i18n/react'
import type { StoredMyApp } from '../../lib/myAppsStorage'
import { useApkBuildProgress } from '../../hooks/useApkBuildProgress'
import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'
import { usePlazaFocus } from '../../context/PlazaFocusContext'
import { runPhaseUi } from './PlazaRunControls'
import DeliveryProgress from '../DeliveryProgress'

interface Props {
  app: StoredMyApp
  isNew?: boolean
  isFocused?: boolean
  /** 紧凑：状态点 +「已就绪」跟在应用名后 */
  inline?: boolean
  onFocusApp?: () => void
  onOpenDetail?: () => void
}

type TranslateFn = (key: string, vars?: Record<string, string | number>) => string

function resolveDeliveryStatus(
  app: StoredMyApp,
  isNew: boolean,
  delivery: ReturnType<typeof useApkBuildProgress>,
  t: TranslateFn,
) {
  if (delivery.timedOut) {
    return { variant: 'error' as const, label: t('home.plaza.status.error'), sub: t('home.plaza.status.error_sub') }
  }
  if (delivery.polling) {
    return {
      variant: 'building' as const,
      label: t('home.plaza.status.building', { pct: delivery.progress }),
      sub: t('home.plaza.status.building_sub'),
    }
  }
  if (isNew) {
    return { variant: 'new' as const, label: t('home.plaza.status.new'), sub: t('home.plaza.status.new_sub') }
  }
  if (app.plaza?.onPlazaFeed) {
    return { variant: 'plaza' as const, label: t('home.plaza.status.on_plaza'), sub: t('home.plaza.status.ready_sub') }
  }
  if (delivery.apkReady || !delivery.needApk) {
    return { variant: 'ready' as const, label: t('home.plaza.status.ready'), sub: t('home.plaza.status.ready_sub') }
  }
  return { variant: 'pending' as const, label: t('home.plaza.status.pending'), sub: t('home.plaza.status.pending_sub') }
}

function runVariantFromBadge(badgeClass: string): string {
  switch (badgeClass) {
    case 'is-running': return 'run-running'
    case 'is-paused': return 'run-paused'
    case 'is-done': return 'run-done'
    case 'is-error': return 'run-error'
    case 'is-stopped': return 'run-stopped'
    default: return 'run-idle'
  }
}

export default function PlazaAppStatusButton({
  app,
  isNew = false,
  isFocused = false,
  inline = false,
  onFocusApp,
  onOpenDetail,
}: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [pendingTrial, setPendingTrial] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const delivery = useApkBuildProgress(app)
  const run = usePlazaFlowRun()
  const { requestDockExpand } = usePlazaFocus()

  const runLive = isFocused && (
    run.phase === 'running' || run.phase === 'paused'
    || run.phase === 'completed' || run.phase === 'error' || run.phase === 'stopped'
  )
  const runUi = runLive
    ? runPhaseUi(run.phase, run.stepIndex, run.steps.length, t)
    : null

  const deliveryStatus = useMemo(
    () => resolveDeliveryStatus(app, isNew, delivery, t),
    [app, isNew, delivery, t],
  )

  const display = runUi && runLive
    ? {
        variant: runVariantFromBadge(runUi.badgeClass),
        label: runUi.badge,
        sub: run.phase === 'running' || run.phase === 'paused' ? t('home.plaza.status.preview_sub') : '',
      }
    : deliveryStatus

  useEffect(() => {
    if (!open) return
    const onDoc = (e: globalThis.MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  useEffect(() => {
    if (!isFocused || !pendingTrial) return
    setPendingTrial(false)
    const phase = run.phase
    if (phase === 'idle') {
      run.enterPreviewMode()
      run.start()
    } else if (phase === 'running') {
      run.pause()
    } else if (phase === 'paused') {
      run.resume()
    } else if (phase === 'stopped' || phase === 'completed' || phase === 'error') {
      run.retry()
    }
  }, [isFocused, pendingTrial, run])

  const focusAndExpand = () => {
    onFocusApp?.()
    requestDockExpand()
  }

  const handleStatusClick = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    focusAndExpand()
    setOpen((v) => !v)
  }

  const handleTrial = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    focusAndExpand()
    if (!isFocused) {
      setPendingTrial(true)
      return
    }
    const phase = run.phase
    if (phase === 'idle') {
      run.enterPreviewMode()
      run.start()
      return
    }
    if (phase === 'running') {
      run.pause()
      return
    }
    if (phase === 'paused') {
      run.resume()
      return
    }
    if (phase === 'stopped' || phase === 'completed' || phase === 'error') {
      run.retry()
    }
  }

  const handleStop = (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    focusAndExpand()
    run.stop()
    run.enterOverviewMode()
  }

  const trialPreview = t('home.plaza.status.trial_preview')
  const trialPause = t('home.plaza.status.trial_pause')
  const trialResume = t('home.plaza.status.trial_resume')
  const trialAgain = t('home.plaza.status.trial_again')

  const trialLabel =
    !isFocused || run.phase === 'idle'
      ? trialPreview
      : run.phase === 'running'
        ? trialPause
        : run.phase === 'paused'
          ? trialResume
          : run.phase === 'stopped' || run.phase === 'completed' || run.phase === 'error'
            ? trialAgain
            : trialPreview

  const showPlayGlyph = trialLabel === trialPreview || trialLabel === trialResume || trialLabel === trialAgain
  const showStop = isFocused && (run.phase === 'running' || run.phase === 'paused')

  return (
    <div
      ref={rootRef}
      className={`plaza-app-status-wrap${open ? ' is-open' : ''}${inline ? ' is-inline' : ''}`}
    >
      <button
        type="button"
        className={`plaza-app-status-btn variant-${display.variant}${inline ? ' is-inline' : ''}`}
        aria-expanded={open}
        title={t('home.plaza.status.view_title')}
        onClick={handleStatusClick}
      >
        <span className="plaza-app-status-dot" aria-hidden />
        <span className="plaza-app-status-text">
          <strong>{display.label}</strong>
          {!inline && display.sub ? <em>{display.sub}</em> : null}
        </span>
      </button>

      <button
        type="button"
        className="plaza-app-trial-btn"
        title={t('home.plaza.status.trial_title')}
        onClick={handleTrial}
      >
        {showPlayGlyph ? '▶ ' : '⏸ '}
        {trialLabel}
      </button>

      {showStop && (
        <button
          type="button"
          className="plaza-app-trial-btn is-stop"
          title={t('home.plaza.status.stop_title')}
          onClick={handleStop}
        >
          {t('home.plaza.status.trial_stop')}
        </button>
      )}

      {open && (
        <div className="plaza-app-status-popover" role="dialog" aria-label={t('home.plaza.status.dialog', { name: app.appName })}>
          <DeliveryProgress app={app} compact />
          <p className="plaza-app-status-hint">{t('home.plaza.status.hint')}</p>
          {onOpenDetail && (
            <button
              type="button"
              className="btn-ghost-sm plaza-app-status-detail"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onOpenDetail()
              }}
            >
              {t('home.plaza.status.fullscreen')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
