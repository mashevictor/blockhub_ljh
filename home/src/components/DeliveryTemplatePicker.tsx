import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@blockhub/i18n/react'
import type { AppUiTemplate, WebTemplate } from '../api/client'

interface Props {
  webTemplateId: string
  appUiId: string
  onWebTemplateChange: (id: string) => void
  onAppUiChange: (id: string) => void
  recommendAppUiId?: string
  compact?: boolean
  className?: string
}

const WEB_IDS = ['tabs_portal', 'sidebar_admin', 'landing_single'] as const
const APP_IDS = ['bottom_tabs', 'drawer_nav', 'immersive_chat'] as const

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

type PopoverPos =
  | { mode: 'above'; left: number; bottom: number; width: number; maxHeight: number }
  | { mode: 'below'; left: number; top: number; width: number; maxHeight: number }

/** 网页模板 × App UI：触发按钮 + portal 弹层（避开悬浮框 overflow 裁切） */
export default function DeliveryTemplatePicker({
  webTemplateId,
  appUiId,
  onWebTemplateChange,
  onAppUiChange,
  recommendAppUiId,
  compact,
  className = '',
}: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<PopoverPos | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  const web: WebTemplate[] = WEB_IDS.map((id) => ({
    id,
    label: t(`home.tpl.web.${id}.label`),
    desc: t(`home.tpl.web.${id}.desc`),
  }))
  const appUi: AppUiTemplate[] = APP_IDS.map((id) => ({
    id,
    label: t(`home.tpl.app.${id}.label`),
    desc: t(`home.tpl.app.${id}.desc`),
  }))

  const updatePosition = () => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const width = Math.min(300, window.innerWidth - 24)
    const gap = 8
    const spaceAbove = Math.max(0, rect.top - gap - 12)
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - gap - 12)
    const preferAbove = spaceAbove >= 200 || spaceAbove >= spaceBelow
    let left = rect.right - width
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12))
    if (preferAbove) {
      setPos({
        mode: 'above',
        left,
        bottom: window.innerHeight - rect.top + gap,
        width,
        maxHeight: Math.min(360, Math.max(180, spaceAbove)),
      })
    } else {
      setPos({
        mode: 'below',
        left,
        top: rect.bottom + gap,
        width,
        maxHeight: Math.min(360, Math.max(180, spaceBelow)),
      })
    }
  }

  useLayoutEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    updatePosition()
    const onWin = () => updatePosition()
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    return () => {
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const node = e.target as Node
      if (rootRef.current?.contains(node)) return
      if (popoverRef.current?.contains(node)) return
      setOpen(false)
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

  const webLabel = web.find((x) => x.id === webTemplateId)?.label || web[0]?.label || t('home.tpl.web.tabs_portal.label')
  const appLabel = appUi.find((x) => x.id === appUiId)?.label || appUi[0]?.label || t('home.tpl.app.bottom_tabs.label')

  const popover =
    open &&
    pos &&
    createPortal(
      <div
        ref={popoverRef}
        className="delivery-template-popover is-ported b2b-brand-scope"
        role="dialog"
        aria-label={t('home.tpl.aria')}
        style={{
          position: 'fixed',
          left: pos.left,
          width: pos.width,
          maxHeight: pos.maxHeight,
          zIndex: 12000,
          ...(pos.mode === 'above'
            ? { bottom: pos.bottom, top: 'auto' }
            : { top: pos.top, bottom: 'auto' }),
        }}
      >
        <div className="delivery-template-popover-head">
          <strong>{t('home.tpl.pick_title')}</strong>
          <button
            type="button"
            className="delivery-template-popover-close"
            onClick={() => setOpen(false)}
            aria-label={t('home.tpl.close')}
          >
            ×
          </button>
        </div>

        <div className="delivery-template-popover-body">
          <div className="delivery-template-section">
            <h4 className="delivery-template-title">{t('home.tpl.web_title')}</h4>
            <div className="delivery-template-grid">
              {web.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`delivery-template-chip${webTemplateId === item.id ? ' on' : ''}`}
                  onClick={() => onWebTemplateChange(item.id)}
                  title={item.desc}
                  aria-pressed={webTemplateId === item.id}
                >
                  <TemplatePreview id={item.id} />
                  <span className="delivery-template-chip-text">
                    <strong>{item.label}</strong>
                    <span className="delivery-template-chip-desc">{item.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="delivery-template-section">
            <h4 className="delivery-template-title">
              {t('home.tpl.app_title')}
              {recommendAppUiId && recommendAppUiId !== appUiId && (
                <button
                  type="button"
                  className="delivery-template-rec"
                  onClick={() => onAppUiChange(recommendAppUiId)}
                >
                  {t('home.tpl.use_recommend')}
                </button>
              )}
            </h4>
            <div className="delivery-template-grid">
              {appUi.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`delivery-template-chip${appUiId === item.id ? ' on' : ''}`}
                  onClick={() => onAppUiChange(item.id)}
                  title={item.desc}
                  aria-pressed={appUiId === item.id}
                >
                  <TemplatePreview id={item.id} />
                  <span className="delivery-template-chip-text">
                    <strong>{item.label}</strong>
                    <span className="delivery-template-chip-desc">{item.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="delivery-template-popover-foot">
          <button type="button" className="btn-primary delivery-template-done" onClick={() => setOpen(false)}>
            {t('home.tpl.done')}
          </button>
        </div>
      </div>,
      document.body,
    )

  return (
    <div
      ref={rootRef}
      className={`delivery-template-picker is-trigger${compact ? ' compact' : ''}${open ? ' is-open' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        className="delivery-template-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        title={`${webLabel} · ${appLabel}`}
      >
        <TemplatePreview id={webTemplateId || 'tabs_portal'} />
        <span className="delivery-template-trigger-text">
          <strong>{t('home.tpl.trigger')}</strong>
          <span>
            {webLabel} / {appLabel}
          </span>
        </span>
        <span className="delivery-template-caret" aria-hidden>
          ▾
        </span>
      </button>
      {popover}
    </div>
  )
}
