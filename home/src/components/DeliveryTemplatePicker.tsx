import { useEffect, useState } from 'react'
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
}

const FALLBACK_WEB: WebTemplate[] = [
  { id: 'tabs_portal', label: 'Tabs 门户', desc: '多页签并列能力' },
  { id: 'sidebar_admin', label: '侧栏后台', desc: '左侧导航管理壳' },
  { id: 'landing_single', label: '单页落地', desc: '英雄区 + 能力块' },
]

const FALLBACK_APP: AppUiTemplate[] = [
  { id: 'bottom_tabs', label: '底部 Tab', desc: '经典多能力导航' },
  { id: 'drawer_nav', label: '侧栏抽屉', desc: '抽屉 + 内容页' },
  { id: 'immersive_chat', label: '沉浸对话', desc: '语音/对话全屏（上海话推荐）' },
]

/** 迷你布局示意（约 36×26），展示壳形态而非装饰图 */
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

/** 发布前：网页模板 × App UI 壳（默认 tabs_portal + bottom_tabs） */
export default function DeliveryTemplatePicker({
  webTemplateId,
  appUiId,
  onWebTemplateChange,
  onAppUiChange,
  recommendAppUiId,
  compact,
}: Props) {
  const [web, setWeb] = useState<WebTemplate[]>(FALLBACK_WEB)
  const [appUi, setAppUi] = useState<AppUiTemplate[]>(FALLBACK_APP)

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

  return (
    <div className={`delivery-template-picker${compact ? ' compact' : ''}`}>
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
    </div>
  )
}
