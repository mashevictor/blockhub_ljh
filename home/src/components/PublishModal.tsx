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
}

function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(data)}`
}

export default function PublishModal({ result, onClose, showAdminLink = false }: Props) {
  const [mounted, setMounted] = useState(false)

  useBodyScrollLock(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  const phoneWidgets = useMemo(
    () => pickPhonePreviewModules(result.modules),
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

  const downloadUrl = result.downloadUrl || `${result.webUrl}/download`

  if (!mounted) return null

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-card publish-result-card" role="dialog" aria-modal="true">
        <button type="button" className="modal-close" onClick={onClose} aria-label="关闭">×</button>
        <div className="modal-icon-svg">
          <img src={LOGO.mark} alt="" width={48} height={48} className="modal-brand-logo" />
        </div>
        <h3>发布成功</h3>
        <p className="modal-sub">
          {result.appName} · 已包含 {result.moduleCount} 项功能
          {result.scenarios && result.scenarios.length > 0 && (
            <span className="publish-scenario-hint">
              {' '}· {result.scenarios.slice(0, 3).join('、')}
              {result.scenarios.length > 3 ? ` 等 ${result.scenarios.length} 个场景` : ''}
            </span>
          )}
        </p>

        {chipModules.length > 0 && (
          <ul className="publish-module-list" aria-label="已包含模块与能力">
            {chipModules.map((m) => (
              <li
                key={`${m.kind}:${m.key}`}
                className={`publish-module-chip${m.source === 'auto' ? ' auto' : ''}${m.source === 'user' ? ' user' : ''}${m.source === 'suggest' ? ' suggest' : ''}`}
              >
                <DynamicIcon name={m.iconKey} size={12} />
                <span>{m.label}</span>
                {m.source === 'auto' && <em>自动</em>}
                {m.source === 'suggest' && <em>AI</em>}
              </li>
            ))}
          </ul>
        )}

        <div className="phone-preview">
          <div className="phone-screen">
            <div className="phone-title">{result.appName}</div>
            <div className="phone-bar" />
            {phoneWidgets.length > 0 ? (
              phoneWidgets.map((m, i) => (
                <div
                  key={`${m.kind}:${m.key}`}
                  className="phone-widget"
                  style={{ '--widget-bg': widgetTint(i) } as React.CSSProperties}
                >
                  <DynamicIcon name={m.iconKey} size={14} />
                  {m.label}
                </div>
              ))
            ) : (
              <>
                <div className="phone-bar short" />
                <div className="phone-bar" />
              </>
            )}
          </div>
        </div>

        <div className="publish-links">
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="web" size={16} />
              网页版
            </span>
            <code>{result.webUrl}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(result.webUrl)}>复制</button>
          </div>
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="android" size={16} />
              下载链接
            </span>
            <code>{downloadUrl}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(downloadUrl)}>复制</button>
          </div>
          <div className="link-row publish-qr-row">
            <span className="link-row-label">
              <DynamicIcon name="android" size={16} />
              扫码访问
            </span>
            <img className="publish-qr-img" src={qrImageUrl(result.webUrl)} alt={`${result.appName} 二维码`} width={96} height={96} />
          </div>
        </div>

        {showAdminLink && (
          <a className="btn-ghost full" href={ADMIN_URL} target="_blank" rel="noreferrer" style={{ marginBottom: 10, display: 'block', textAlign: 'center' }}>
            在管理后台查看已创建应用 →
          </a>
        )}
        <button type="button" className="btn-primary full" onClick={onClose}>完成，继续创建</button>
      </div>
    </div>,
    document.body,
  )
}
