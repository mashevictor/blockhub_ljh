import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@blockhub/i18n/react'
import type { PublishResult } from '../data/constants'
import { getAdminUrl } from '../data/constants'
import AppIconAvatar from './AppIconAvatar'
import { pickPhonePreviewModules, widgetTint } from '../data/publishDisplay'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import PublishDeliveryLinks from './PublishDeliveryLinks'
import { deliverLabel, normalizeDeliver } from '../data/deliverDisplay'
import { DynamicIcon } from './icons'

interface Props {
  result: PublishResult
  onClose: () => void
  onViewMyApps?: () => void
  showAdminLink?: boolean
  showMyAppsHint?: boolean
}

const MAX_CHIPS = 8

export default function PublishModal({ result, onClose, onViewMyApps, showAdminLink = false, showMyAppsHint = false }: Props) {
  const t = useT()
  const [mounted, setMounted] = useState(false)

  useBodyScrollLock(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  const phoneWidgets = useMemo(
    () => pickPhonePreviewModules(result.modules).slice(0, 3),
    [result.modules],
  )

  const chipModules = useMemo(() => {
    if (result.modules.length > 0) return result.modules
    return (result.scenarios ?? []).map((name) => ({
      key: `scene:${name}`,
      label: name,
      iconKey: 'workflow',
      kind: 'scenario' as const,
      source: 'user' as const,
    }))
  }, [result.modules, result.scenarios])

  const visibleChips = chipModules.slice(0, MAX_CHIPS)
  const extraChipCount = chipModules.length - visibleChips.length
  const deliverMode = normalizeDeliver(result.deliver)

  if (!mounted) return null

  return createPortal(
    <div className="modal-overlay modal-overlay-compact" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card publish-result-card" role="dialog" aria-modal="true">
        <button type="button" className="modal-close" onClick={onClose} aria-label={t('home.publish.close')}>×</button>

        <header className="publish-result-head">
          <AppIconAvatar
            name={result.appName}
            iconUrl={result.iconUrl}
            primaryColor={result.primaryColor}
            size={36}
            className="publish-result-logo"
          />
          <div>
            <h3>{t('home.publish.success.title')}</h3>
            <p className="modal-sub publish-result-sub">
              {t('home.publish.success.sub', {
                name: result.appName,
                n: result.moduleCount,
                deliver: deliverLabel(deliverMode, t),
              })}
            </p>
          </div>
        </header>

        {showMyAppsHint && (
          <div className="publish-my-apps-tip" role="note">
            <DynamicIcon name="layers" size={14} />
            <span>{t('home.publish.my_apps_tip')}</span>
          </div>
        )}

        {result.buildManifest?.web_pkgs && result.buildManifest.web_pkgs.length > 0 && (
          <div className="publish-my-apps-tip" role="status">
            <DynamicIcon name="layers" size={14} />
            <span>
              {t('home.publish.manifest.will_pkgs', { n: result.buildManifest.web_pkgs.length })}
              {' '}
              {result.buildManifest.web_pkgs.slice(0, 3).map((p) => p.replace('@blockhub/', '')).join(' · ')}
              {result.buildManifest.web_pkgs.length > 3 ? ` +${result.buildManifest.web_pkgs.length - 3}` : ''}
            </span>
          </div>
        )}

        <div className="publish-result-scroll">
          {visibleChips.length > 0 && (
            <ul className="publish-module-list" aria-label={t('home.publish.modules_aria')}>
              {visibleChips.map((m) => (
                <li
                  key={`${m.kind}:${m.key}`}
                  className={`publish-module-chip${m.source === 'auto' ? ' auto' : ''}${m.source === 'user' ? ' user' : ''}${m.source === 'suggest' ? ' suggest' : ''}`}
                >
                  <DynamicIcon name={m.iconKey} size={11} />
                  <span>{m.label}</span>
                </li>
              ))}
              {extraChipCount > 0 && (
                <li className="publish-module-chip more">+{extraChipCount}</li>
              )}
            </ul>
          )}

          <div className="publish-result-preview-row">
            <div className="phone-preview phone-preview-compact">
              <div className="phone-screen" style={{ '--phone-accent': result.primaryColor || '#4338ca' } as React.CSSProperties}>
                <div className="phone-title-row">
                  <AppIconAvatar name={result.appName} iconUrl={result.iconUrl} primaryColor={result.primaryColor} size={22} />
                  <div className="phone-title">{result.appName}</div>
                </div>
                {phoneWidgets.length > 0 ? (
                  phoneWidgets.map((m, i) => (
                    <div
                      key={`${m.kind}:${m.key}`}
                      className="phone-widget"
                      style={{ '--widget-bg': widgetTint(i) } as React.CSSProperties}
                    >
                      <DynamicIcon name={m.iconKey} size={12} />
                      {m.label}
                    </div>
                  ))
                ) : (
                  <>
                    <div className="phone-bar" />
                    <div className="phone-bar short" />
                  </>
                )}
              </div>
            </div>
          </div>

          <PublishDeliveryLinks result={result} emphasize />
        </div>

        <footer className="publish-result-foot">
          {showAdminLink && (
            <a className="btn-ghost full" href={getAdminUrl()} target="_blank" rel="noreferrer">
              {t('home.publish.admin_view')}
            </a>
          )}
          <div className="publish-result-foot-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>{t('home.publish.keep_creating')}</button>
            <button type="button" className="btn-primary" onClick={onViewMyApps ?? onClose}>
              {t('home.publish.view_my_apps')}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
