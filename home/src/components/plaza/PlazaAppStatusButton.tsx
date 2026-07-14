import { useEffect, useMemo, useRef, useState } from 'react'
import type { StoredMyApp } from '../../lib/myAppsStorage'
import { useApkBuildProgress } from '../../hooks/useApkBuildProgress'
import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'
import { runPhaseUi } from './PlazaRunControls'
import DeliveryProgress from '../DeliveryProgress'

interface Props {
  app: StoredMyApp
  isNew?: boolean
  isFocused?: boolean
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
  if (app.plaza?.onPlazaFeed) {
    return { variant: 'plaza' as const, label: app.plaza.label, sub: '已上广场' }
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

export default function PlazaAppStatusButton({ app, isNew = false, isFocused = false, onOpenDetail }: Props) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const delivery = useApkBuildProgress(app)
  const run = usePlazaFlowRun()

  const runActive = isFocused && (run.phase === 'running' || run.phase === 'paused')
  const runUi = runActive
    ? runPhaseUi(run.phase, run.stepIndex, run.steps.length)
    : null

  const deliveryStatus = useMemo(
    () => resolveDeliveryStatus(app, isNew, delivery),
    [app, isNew, delivery],
  )

  const display = runUi && runActive
    ? { variant: runVariantFromBadge(runUi.badgeClass), label: runUi.badge, sub: '试运营' }
    : deliveryStatus

  /** 试运营中：折叠悬浮条已有暂停/停止，勿再弹状态浮层 */
  const skipPopover = runActive

  useEffect(() => {
    if (!open) return
    if (skipPopover) {
      setOpen(false)
      return
    }
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open, skipPopover])

  return (
    <div ref={rootRef} className={`plaza-app-status-wrap${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className={`plaza-app-status-btn variant-${display.variant}${skipPopover ? ' is-run-live' : ''}`}
        aria-expanded={skipPopover ? undefined : open}
        title={skipPopover ? '试运营进行中 · 请在底部悬浮条暂停/停止' : undefined}
        onClick={(e) => {
          e.stopPropagation()
          if (skipPopover) return
          setOpen((v) => !v)
        }}
      >
        <span className="plaza-app-status-dot" aria-hidden />
        <span className="plaza-app-status-text">
          <strong>{display.label}</strong>
          <em>{display.sub}</em>
        </span>
      </button>

      {open && !skipPopover && (
        <div className="plaza-app-status-popover" role="dialog" aria-label={`${app.appName} 状态`}>
          <DeliveryProgress app={app} compact />
          {onOpenDetail && (
            <button
              type="button"
              className="btn-ghost-sm plaza-app-status-detail"
              onClick={() => {
                setOpen(false)
                onOpenDetail()
              }}
            >
              查看交付与编排
            </button>
          )}
        </div>
      )}
    </div>
  )
}
