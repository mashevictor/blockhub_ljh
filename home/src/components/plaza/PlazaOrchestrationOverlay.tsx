import { useEffect } from 'react'
import { IconGlobe } from '../icons'
import AppIconAvatar from '../AppIconAvatar'
import DeliveryProgress from '../DeliveryProgress'
import PublishSuccessCard from '../PublishSuccessCard'
import PlazaModuleFlowPanel from './PlazaModuleFlowPanel'
import type { AuthUser } from '../../auth/session'
import type { StoredMyApp } from '../../lib/myAppsStorage'
import { showAppDeliver } from '../../data/deliverDisplay'

interface Props {
  app: StoredMyApp
  user: AuthUser | null
  onClose: () => void
  onRemove: () => void
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function moduleLabels(app: StoredMyApp): string[] {
  if (app.modules?.length) return app.modules.map((m) => m.label)
  return app.scenarios?.slice(0, 6) ?? []
}

export default function PlazaOrchestrationOverlay({ app, user, onClose, onRemove }: Props) {
  const appKey = app.appId || app.webUrl
  const showDelivery = showAppDeliver(app)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="plaza-orch-overlay" role="dialog" aria-modal="true" aria-label={`编排 ${app.appName}`}>
      <div className="plaza-orch-backdrop" onClick={onClose} aria-hidden />
      <div className="plaza-orch-sheet">
        <header className="plaza-orch-head">
          <div className="plaza-orch-head-main">
            <AppIconAvatar
              name={app.appName}
              iconUrl={app.iconUrl}
              primaryColor={app.primaryColor}
              size={48}
            />
            <div>
              <h2 className="plaza-orch-title">
                <span className="plaza-mflow-chev chev-hero" aria-hidden>&gt;&gt;</span>
                {app.appName}
              </h2>
              <div className="plaza-orch-pills">
                <span className="plaza-orch-pill">{app.moduleCount} 项能力</span>
                <span className="plaza-orch-pill">创建者</span>
                {showDelivery && !app.apkReady && (
                  <span className="plaza-orch-pill warn">APK 构建中</span>
                )}
                {app.apkReady && <span className="plaza-orch-pill ok">APK 就绪</span>}
                {app.plaza && <span className="plaza-orch-pill">{app.plaza.label}</span>}
                <span className="plaza-orch-pill muted">{formatWhen(app.savedAt)}</span>
              </div>
            </div>
          </div>
          <div className="plaza-orch-head-actions">
            <button type="button" className="btn-ghost" onClick={() => navigator.clipboard.writeText(app.webUrl)}>
              复制链接
            </button>
            <a className="btn-ghost" href={app.webUrl} target="_blank" rel="noreferrer">
              <IconGlobe size={14} /> 打开
            </a>
            <button type="button" className="btn-ghost plaza-my-remove" onClick={onRemove}>移除</button>
            <button type="button" className="btn-primary plaza-orch-close" onClick={onClose}>完成</button>
          </div>
        </header>

        <div className="plaza-orch-body">
          {showDelivery && (
            <div className="plaza-orch-delivery">
              <DeliveryProgress app={app} compact />
            </div>
          )}

          <PlazaModuleFlowPanel
            appKey={appKey}
            appName={app.appName}
            moduleLabels={moduleLabels(app)}
            isCreator
            orchestration
          />

          <details className="plaza-orch-share">
            <summary>
              <span className="plaza-mflow-chev">&gt;&gt;</span> 分享与发布
            </summary>
            <PublishSuccessCard
              result={app}
              showAdminLink={!!user}
              compact
              orchestration
              plazaMeta={app.plaza}
            />
          </details>
        </div>
      </div>
    </div>
  )
}
