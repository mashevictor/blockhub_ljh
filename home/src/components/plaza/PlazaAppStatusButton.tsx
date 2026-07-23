import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
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

function resolveDeliveryStatus(
  app: StoredMyApp,
  isNew: boolean,
  delivery: ReturnType<typeof useApkBuildProgress>,
) {
  if (delivery.timedOut) {
    return { variant: 'error' as const, label: '交付异常', sub: 'APK 未完成' }
  }
  if (delivery.polling) {
    return { variant: 'building' as const, label: `APK ${delivery.progress}%`, sub: '构建中' }
  }
  if (isNew) {
    return { variant: 'new' as const, label: '刚发布', sub: '交付检测中' }
  }
  // 受众文案（@公开 等）由 PlazaPublishButton 展示，此处不重复
  if (app.plaza?.onPlazaFeed) {
    return { variant: 'plaza' as const, label: '已上广场', sub: '可打开使用' }
  }
  if (delivery.apkReady || !delivery.needApk) {
    return { variant: 'ready' as const, label: '已就绪', sub: '可打开使用' }
  }
  return { variant: 'pending' as const, label: '交付中', sub: '等待就绪' }
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
    ? runPhaseUi(run.phase, run.stepIndex, run.steps.length)
    : null

  const deliveryStatus = useMemo(
    () => resolveDeliveryStatus(app, isNew, delivery),
    [app, isNew, delivery],
  )

  const display = runUi && runLive
    ? {
        variant: runVariantFromBadge(runUi.badgeClass),
        label: runUi.badge,
        sub: run.phase === 'running' || run.phase === 'paused' ? '流程预览' : '',
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

  const trialLabel =
    !isFocused || run.phase === 'idle'
      ? '流程预览'
      : run.phase === 'running'
        ? '暂停'
        : run.phase === 'paused'
          ? '继续'
          : run.phase === 'stopped' || run.phase === 'completed' || run.phase === 'error'
            ? '再预览'
            : '流程预览'

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
        title="查看状态"
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
        title="在列表中切换流程预览"
        onClick={handleTrial}
      >
        {trialLabel === '流程预览' || trialLabel === '继续' || trialLabel === '再预览' ? '▶ ' : '⏸ '}
        {trialLabel}
      </button>

      {showStop && (
        <button
          type="button"
          className="plaza-app-trial-btn is-stop"
          title="停止流程预览"
          onClick={handleStop}
        >
          ⏹ 停止
        </button>
      )}

      {open && (
        <div className="plaza-app-status-popover" role="dialog" aria-label={`${app.appName} 状态`}>
          <DeliveryProgress app={app} compact />
          <p className="plaza-app-status-hint">可问答与测接口；改模块请打开 Runtime。可在此启动流程预览。</p>
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
              进入全屏概览
            </button>
          )}
        </div>
      )}
    </div>
  )
}
