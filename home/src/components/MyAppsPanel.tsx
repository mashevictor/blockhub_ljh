import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PublishResult } from '../data/constants'
import { loadMyApps, removeMyApp, type StoredMyApp } from '../lib/myAppsStorage'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { IconLayers, IconGlobe } from './icons'
import AppIconAvatar from './AppIconAvatar'

interface Props {
  onClose: () => void
  onOpenApp: (result: PublishResult) => void
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN')
  } catch {
    return iso
  }
}

export default function MyAppsPanel({ onClose, onOpenApp }: Props) {
  const [apps, setApps] = useState<StoredMyApp[]>([])
  const [mounted, setMounted] = useState(false)

  useBodyScrollLock(true)

  useEffect(() => {
    setMounted(true)
    setApps(loadMyApps())
  }, [])

  const handleRemove = (app: StoredMyApp) => {
    const key = app.appId || app.webUrl
    setApps(removeMyApp(key))
  }

  if (!mounted) return null

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card my-apps-panel" role="dialog" aria-modal="true" aria-labelledby="my-apps-title">
        <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        <div className="my-apps-head">
          <IconLayers size={22} />
          <div>
            <h3 id="my-apps-title">我的应用</h3>
            <p className="modal-sub">本浏览器发布过的应用（未登录也可查看，仅存于此设备）</p>
          </div>
        </div>

        {apps.length === 0 ? (
          <div className="my-apps-empty">
            <p>还没有发布过应用</p>
            <p className="my-apps-empty-hint">在首页创建并发布后，会出现在这里</p>
          </div>
        ) : (
          <ul className="my-apps-list">
            {apps.map((app) => (
              <li key={app.appId || app.webUrl} className="my-apps-item">
                <AppIconAvatar
                  name={app.appName}
                  iconUrl={app.iconUrl}
                  primaryColor={app.primaryColor}
                  size={40}
                />
                <div className="my-apps-item-main">
                  <strong>{app.appName}</strong>
                  <span className="my-apps-meta">
                    {app.moduleCount} 项功能 · {formatWhen(app.savedAt)}
                  </span>
                  <code className="my-apps-url">{app.webUrl}</code>
                </div>
                <div className="my-apps-actions">
                  <button type="button" className="btn-ghost" onClick={() => onOpenApp(app)}>
                    查看详情
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => navigator.clipboard.writeText(app.webUrl)}
                  >
                    复制链接
                  </button>
                  <a className="btn-ghost" href={app.webUrl} target="_blank" rel="noreferrer">
                    <IconGlobe size={14} />
                    打开
                  </a>
                  <button type="button" className="btn-ghost my-apps-remove" onClick={() => handleRemove(app)}>
                    移除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="btn-primary full" onClick={onClose}>关闭</button>
      </div>
    </div>,
    document.body,
  )
}
