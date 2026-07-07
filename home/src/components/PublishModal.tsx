import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PublishResult } from '../data/constants'
import { getAdminUrl } from '../data/constants'
import AppIconAvatar from './AppIconAvatar'
import { pickPhonePreviewModules, widgetTint } from '../data/publishDisplay'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import PublishDeliveryLinks from './PublishDeliveryLinks'
import { deliverLabel, normalizeDeliver, showWebDeliver } from '../data/deliverDisplay'
import { DynamicIcon } from './icons'

interface Props {
  result: PublishResult
  onClose: () => void
  onViewMyApps?: () => void
  showAdminLink?: boolean
  showMyAppsHint?: boolean
}

const MAX_CHIPS = 8

function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data)}`
}

export default function PublishModal({ result, onClose, onViewMyApps, showAdminLink = false, showMyAppsHint = false }: Props) {
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
  const qrTarget = showWebDeliver(result) ? result.webUrl : (result.downloadUrl || `${result.webUrl}/download`)

  if (!mounted) return null

  return createPortal(
    <div className="modal-overlay modal-overlay-compact" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card publish-result-card" role="dialog" aria-modal="true">
        <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">×</button>

        <header className="publish-result-head">
          <AppIconAvatar
            name={result.appName}
            iconUrl={result.iconUrl}
            primaryColor={result.primaryColor}
            size={36}
            className="publish-result-logo"
          />
          <div>
            <h3>发布成功</h3>
            <p className="modal-sub publish-result-sub">
              {result.appName} · {result.moduleCount} 项功能 · {deliverLabel(deliverMode)}
            </p>
          </div>
        </header>

        {showMyAppsHint && (
          <div className="publish-my-apps-tip" role="note">
            <DynamicIcon name="layers" size={14} />
            <span>已保存到右上角 <strong>「我的应用」</strong></span>
          </div>
        )}

        <div className="publish-result-scroll">
          {visibleChips.length > 0 && (
            <ul className="publish-module-list" aria-label="已包含模块与能力">
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
            <div className="publish-qr-block">
              <img className="publish-qr-img" src={qrImageUrl(qrTarget)} alt={`${result.appName} 二维码`} width={88} height={88} />
              <span>{showWebDeliver(result) ? '扫码打开网页' : '扫码下载 App'}</span>
            </div>
          </div>

          <PublishDeliveryLinks result={result} />
        </div>

        <footer className="publish-result-foot">
          {showAdminLink && (
            <a className="btn-ghost full" href={getAdminUrl()} target="_blank" rel="noreferrer">
              在管理后台查看 →
            </a>
          )}
          <div className="publish-result-foot-actions">
            <button type="button" className="btn-ghost" onClick={onClose}>继续创建</button>
            <button type="button" className="btn-primary" onClick={onViewMyApps ?? onClose}>
              查看我的应用
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
