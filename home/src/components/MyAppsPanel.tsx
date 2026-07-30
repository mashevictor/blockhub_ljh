import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT, useI18n } from '@blockhub/i18n/react'
import type { PublishResult } from '../data/constants'
import { loadMyApps, removeMyApp, type StoredMyApp } from '../lib/myAppsStorage'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { IconLayers, IconGlobe } from './icons'
import AppIconAvatar from './AppIconAvatar'

interface Props {
  onClose: () => void
  onOpenApp: (result: PublishResult) => void
}

function formatWhen(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(locale === 'en-US' ? 'en-US' : 'zh-CN')
  } catch {
    return iso
  }
}

export default function MyAppsPanel({ onClose, onOpenApp }: Props) {
  const t = useT()
  const { locale } = useI18n()
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
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('home.my_apps.close')}>×</button>
        <div className="my-apps-head">
          <IconLayers size={22} />
          <div>
            <h3 id="my-apps-title">{t('home.plaza.my.title')}</h3>
            <p className="modal-sub">{t('home.my_apps.sub')}</p>
          </div>
        </div>

        {apps.length === 0 ? (
          <div className="my-apps-empty">
            <p>{t('home.plaza.my.empty')}</p>
            <p className="my-apps-empty-hint">{t('home.plaza.my.empty_hint')}</p>
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
                    {t('home.plaza.my.modules_n', { n: app.moduleCount })} · {formatWhen(app.savedAt, locale)}
                  </span>
                  <code className="my-apps-url">{app.webUrl}</code>
                </div>
                <div className="my-apps-actions">
                  <button type="button" className="btn-ghost" onClick={() => onOpenApp(app)}>
                    {t('home.my_apps.detail')}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => navigator.clipboard.writeText(app.webUrl)}
                  >
                    {t('home.plaza.my.copy_link')}
                  </button>
                  <a className="btn-ghost" href={app.webUrl} target="_blank" rel="noreferrer">
                    <IconGlobe size={14} />
                    {t('home.plaza.my.open_web')}
                  </a>
                  <button type="button" className="btn-ghost my-apps-remove" onClick={() => handleRemove(app)}>
                    {t('home.my_apps.remove')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="btn-primary full" onClick={onClose}>{t('home.my_apps.close')}</button>
      </div>
    </div>,
    document.body,
  )
}
