import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { PublishResult } from '../data/constants'
import { ADMIN_URL } from '../data/constants'
import { LOGO } from '../data/brand'
import { pickPhonePreviewModules, widgetTint } from '../data/publishDisplay'
import { useBodyScrollLock } from '../hooks/useBodyScrollLock'
import { DynamicIcon } from './icons'

interface Props {
  result: PublishResult
  onClose: () => void
  showAdminLink?: boolean
  showMyAppsHint?: boolean
}

const MAX_CHIPS = 8

function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data)}`
}

export default function PublishModal({ result, onClose, showAdminLink = false, showMyAppsHint = false }: Props) {
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
  const downloadUrl = result.downloadUrl || `${result.webUrl}/download`

  if (!mounted) return null

  return createPortal(
    <div className="modal-overlay modal-overlay-compact" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card publish-result-card" role="dialog" aria-modal="true">
        <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">×</button>

        <header className="publish-result-head">
          <img src={LOGO.mark} alt="" width={36} height={36} className="publish-result-logo" />
          <div>
            <h3>发布成功</h3>
            <p className="modal-sub publish-result-sub">
              {result.appName} · {result.moduleCount} 项功能
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
              <div className="phone-screen">
                <div className="phone-title">{result.appName}</div>
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
              <img className="publish-qr-img" src={qrImageUrl(result.webUrl)} alt={`${result.appName} 二维码`} width={88} height={88} />
              <span>扫码访问</span>
            </div>
          </div>

          <div className="publish-links publish-links-compact">
            <div className="link-row">
              <span className="link-row-label">
                <DynamicIcon name="web" size={14} />
                网页
              </span>
              <code>{result.webUrl}</code>
              <button type="button" onClick={() => navigator.clipboard.writeText(result.webUrl)}>复制</button>
            </div>
            <div className="link-row">
              <span className="link-row-label">
                <DynamicIcon name="android" size={14} />
                下载
              </span>
              <code>{downloadUrl}</code>
              <button type="button" onClick={() => navigator.clipboard.writeText(downloadUrl)}>复制</button>
            </div>
          </div>
        </div>

        <footer className="publish-result-foot">
          {showAdminLink && (
            <a className="btn-ghost full" href={ADMIN_URL} target="_blank" rel="noreferrer">
              在管理后台查看 →
            </a>
          )}
          <button type="button" className="btn-primary full" onClick={onClose}>完成，继续创建</button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
