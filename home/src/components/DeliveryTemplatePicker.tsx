import { useEffect, useRef, useState } from 'react'
import {
  fetchDeliveryTemplates,
  type AppUiTemplate,
  type WebTemplate,
} from '../api/client'

interface Props {
  webTemplateId: string
  appUiId: string
  onWebTemplateChange: (id: string) => void
  onAppUiChange: (id: string) => void
  recommendAppUiId?: string
  compact?: boolean
  className?: string
}

const FALLBACK_WEB: WebTemplate[] = [
  { id: 'tabs_portal', label: 'Tabs 门户', desc: '底部/顶部多页签，适合多能力并列' },
  { id: 'sidebar_admin', label: '侧栏后台', desc: '左侧导航 + 内容区，适合管理后台' },
  { id: 'landing_single', label: '单页落地', desc: '英雄区 + 能力块，适合少模块宣传页' },
]

const FALLBACK_APP: AppUiTemplate[] = [
  { id: 'bottom_tabs', label: '底部 Tab', desc: '经典底部导航多能力壳' },
  { id: 'drawer_nav', label: '侧栏抽屉', desc: '抽屉导航 + 内容页' },
  { id: 'immersive_chat', label: '沉浸对话', desc: '全屏对话/语音体验（上海话等语音能力推荐）' },
]

function TemplatePreview({ id }: { id: string }) {
  return (
    <span className={`tpl-preview tpl-preview--${id}`} aria-hidden>
      {id === 'tabs_portal' && (
        <svg viewBox="0 0 36 26" width="36" height="26">
          <rect x="1" y="1" width="34" height="24" rx="3" className="tpl-frame" />
          <rect x="4" y="4" width="28" height="12" rx="1.5" className="tpl-block" />
          <rect x="5" y="19" width="6" height="3" rx="1" className="tpl-accent" />
          <rect x="13" y="19" width="6" height="3" rx="1" className="tpl-muted" />
          <rect x="21" y="19" width="6" height="3" rx="1" className="tpl-muted" />
        </svg>
      )}
      {id === 'sidebar_admin' && (
        <svg viewBox="0 0 36 26" width="36" height="26">
          <rect x="1" y="1" width="34" height="24" rx="3" className="tpl-frame" />
          <rect x="3" y="3" width="8" height="20" rx="1.5" className="tpl-accent" />
          <rect x="13" y="4" width="19" height="5" rx="1" className="tpl-block" />
          <rect x="13" y="11" width="19" height="10" rx="1" className="tpl-muted" />
        </svg>
      )}
      {id === 'landing_single' && (
        <svg viewBox="0 0 36 26" width="36" height="26">
          <rect x="1" y="1" width="34" height="24" rx="3" className="tpl-frame" />
          <rect x="3" y="3" width="30" height="10" rx="1.5" className="tpl-accent" />
          <rect x="5" y="15" width="12" height="6" rx="1" className="tpl-block" />
          <rect x="19" y="15" width="12" height="6" rx="1" className="tpl-muted" />
        </svg>
      )}
      {id === 'bottom_tabs' && (
        <svg viewBox="0 0 36 26" width="36" height="26">
          <rect x="8" y="1" width="20" height="24" rx="3" className="tpl-frame" />
          <rect x="11" y="4" width="14" height="13" rx="1.5" className="tpl-block" />
          <circle cx="13.5" cy="21" r="1.4" className="tpl-accent" />
          <circle cx="18" cy="21" r="1.4" className="tpl-muted" />
          <circle cx="22.5" cy="21" r="1.4" className="tpl-muted" />
        </svg>
      )}
      {id === 'drawer_nav' && (
        <svg viewBox="0 0 36 26" width="36" height="26">
          <rect x="8" y="1" width="20" height="24" rx="3" className="tpl-frame" />
          <rect x="9" y="3" width="9" height="20" rx="1" className="tpl-accent" />
          <rect x="20" y="5" width="6" height="3" rx="0.8" className="tpl-block" />
          <rect x="20" y="10" width="6" height="8" rx="0.8" className="tpl-muted" />
        </svg>
      )}
      {id === 'immersive_chat' && (
        <svg viewBox="0 0 36 26" width="36" height="26">
          <rect x="8" y="1" width="20" height="24" rx="3" className="tpl-frame" />
          <circle cx="18" cy="10" r="4" className="tpl-accent" />
          <rect x="12" y="16" width="12" height="2.5" rx="1" className="tpl-block" />
          <rect x="14" y="20" width="8" height="2" rx="1" className="tpl-muted" />
        </svg>
      )}
    </span>
  )
}

/** 网页模板 × App UI：触发按钮 + 弹框选择（默认第一项 tabs_portal / bottom_tabs） */
export default function DeliveryTemplatePicker({
  webTemplateId,
  appUiId,
  onWebTemplateChange,
  onAppUiChange,
  recommendAppUiId,
  compact,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false)
  const [web, setWeb] = useState<WebTemplate[]>(FALLBACK_WEB)
  const [appUi, setAppUi] = useState<AppUiTemplate[]>(FALLBACK_APP)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchDeliveryTemplates()
      .then((data) => {
        if (data.web_templates?.length) setWeb(data.web_templates)
        if (data.app_ui_templates?.length) setAppUi(data.app_ui_templates)
      })
      .catch(() => {
        /* keep fallback */
      })
  }, [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const webLabel = web.find((t) => t.id === webTemplateId)?.label || web[0]?.label || 'Tabs 门户'
  const appLabel = appUi.find((t) => t.id === appUiId)?.label || appUi[0]?.label || '底部 Tab'

  return (
    <div
      ref={rootRef}
      className={`delivery-template-picker is-trigger${compact ? ' compact' : ''}${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        type="button"
        className="delivery-template-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        title={`${webLabel} · ${appLabel}`}
      >
        <TemplatePreview id={webTemplateId || 'tabs_portal'} />
        <span className="delivery-template-trigger-text">
          <strong>模板</strong>
          <span>
            {webLabel} / {appLabel}
          </span>
        </span>
        <span className="delivery-template-caret" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="delivery-template-popover" role="dialog" aria-label="选择网页模板与 App UI">
          <div className="delivery-template-popover-head">
            <strong>选择模板</strong>
            <button type="button" className="delivery-template-popover-close" onClick={() => setOpen(false)} aria-label="关闭">
              ×
            </button>
          </div>

          <div className="delivery-template-section">
            <h4 className="delivery-template-title">网页模板</h4>
            <div className="delivery-template-grid">
              {web.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`delivery-template-chip${webTemplateId === t.id ? ' on' : ''}`}
                  onClick={() => onWebTemplateChange(t.id)}
                  title={t.desc}
                  aria-pressed={webTemplateId === t.id}
                >
                  <TemplatePreview id={t.id} />
                  <span className="delivery-template-chip-text">
                    <strong>{t.label}</strong>
                    <span>{t.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="delivery-template-section">
            <h4 className="delivery-template-title">
              App UI
              {recommendAppUiId && recommendAppUiId !== appUiId && (
                <button
                  type="button"
                  className="delivery-template-rec"
                  onClick={() => onAppUiChange(recommendAppUiId)}
                >
                  采用推荐
                </button>
              )}
            </h4>
            <div className="delivery-template-grid">
              {appUi.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`delivery-template-chip${appUiId === t.id ? ' on' : ''}`}
                  onClick={() => onAppUiChange(t.id)}
                  title={t.desc}
                  aria-pressed={appUiId === t.id}
                >
                  <TemplatePreview id={t.id} />
                  <span className="delivery-template-chip-text">
                    <strong>{t.label}</strong>
                    <span>{t.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="delivery-template-popover-foot">
            <button type="button" className="btn-primary delivery-template-done" onClick={() => setOpen(false)}>
              完成
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
