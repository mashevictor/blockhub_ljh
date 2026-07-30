import type { CSSProperties } from 'react'
import { useT } from '@blockhub/i18n/react'
import type { IndustryPageTemplateKind } from '../../data/industryPageTemplates'

interface Props {
  kind: IndustryPageTemplateKind
  accent: string
  sceneName: string
}

export default function IndustryPageTemplateMock({ kind, accent, sceneName }: Props) {
  const t = useT()
  const style = { '--tpl-accent': accent } as CSSProperties

  return (
    <div className="industry-tpl-mock" style={style}>
      <div className="industry-tpl-mock-chrome">
        <span /><span /><span />
        <em>{sceneName}</em>
      </div>
      <div className="industry-tpl-mock-body">
        {kind === 'approval' && (
          <div className="industry-tpl-approval">
            <div className="industry-tpl-row"><span>{t('home.industry.tpl.mock.pending_me')}</span><strong>3</strong></div>
            <div className="industry-tpl-card"><span>{sceneName}</span><em>{t('home.industry.tpl.mock.pending')}</em></div>
            <div className="industry-tpl-actions">
              <span className="ok">{t('home.industry.tpl.mock.approve')}</span>
              <span>{t('home.industry.tpl.mock.reject')}</span>
            </div>
          </div>
        )}
        {kind === 'chat_kb' && (
          <div className="industry-tpl-chat">
            <div className="industry-tpl-bubble user">{t('home.industry.tpl.mock.ask')}</div>
            <div className="industry-tpl-bubble bot">{t('home.industry.tpl.mock.kb_reply')}</div>
          </div>
        )}
        {kind === 'dashboard' && (
          <div className="industry-tpl-dash">
            <div className="industry-tpl-kpis">
              <div><strong>86%</strong><span>{t('home.industry.tpl.mock.kpi_rate')}</span></div>
              <div><strong>128</strong><span>{t('home.industry.tpl.mock.kpi_today')}</span></div>
              <div><strong>12</strong><span>{t('home.industry.tpl.mock.kpi_alert')}</span></div>
            </div>
            <div className="industry-tpl-bars">
              {Array.from({ length: 7 }).map((_, i) => (
                <span key={i} style={{ height: `${35 + (i % 4) * 18}%` }} />
              ))}
            </div>
          </div>
        )}
        {kind === 'form' && (
          <div className="industry-tpl-form">
            <div className="industry-tpl-field">
              <label>{t('home.industry.tpl.mock.applicant')}</label>
              <span>{t('home.industry.tpl.mock.applicant_name')}</span>
            </div>
            <div className="industry-tpl-field">
              <label>{t('home.industry.tpl.mock.subject')}</label>
              <span>{sceneName}</span>
            </div>
            <div className="industry-tpl-field wide">
              <label>{t('home.industry.tpl.mock.notes')}</label>
              <span className="muted">{t('home.industry.tpl.mock.notes_ph')}</span>
            </div>
          </div>
        )}
        {kind === 'list' && (
          <div className="industry-tpl-list">
            {[1, 2, 3].map((n) => (
              <div key={n} className="industry-tpl-list-row">
                <span className="dot" />
                <span>{sceneName} #{n}</span>
                <em>{t('home.industry.tpl.mock.in_progress')}</em>
              </div>
            ))}
          </div>
        )}
        {kind === 'funnel' && (
          <div className="industry-tpl-funnel">
            <div style={{ width: '100%' }}>{t('home.industry.tpl.mock.funnel_lead')}</div>
            <div style={{ width: '72%' }}>{t('home.industry.tpl.mock.funnel_opp')}</div>
            <div style={{ width: '48%' }}>{t('home.industry.tpl.mock.funnel_sign')}</div>
            <div style={{ width: '31%' }}>{t('home.industry.tpl.mock.funnel_pay')}</div>
          </div>
        )}
        {kind === 'kb' && (
          <div className="industry-tpl-kb">
            <div className="industry-tpl-file">📄 {sceneName}.pdf</div>
            <div className="industry-tpl-file">📄 {t('home.industry.tpl.mock.manual')}</div>
            <div className="industry-tpl-search">🔍 {t('home.industry.tpl.mock.search')}</div>
          </div>
        )}
        {kind === 'notify' && (
          <div className="industry-tpl-notify">
            <div><span>🔔</span> {t('home.industry.tpl.mock.notify_pending', { name: sceneName })}</div>
            <div className="muted"><span>💼</span> {t('home.industry.tpl.mock.wecom_just_now')}</div>
          </div>
        )}
        {kind === 'integration' && (
          <div className="industry-tpl-sync">
            <span>ERP</span><span className="arrow">⇄</span>
            <span className="core">BlockHub</span><span className="arrow">⇄</span>
            <span>{t('home.industry.tpl.mock.wecom')}</span>
          </div>
        )}
        {kind === 'mobile_field' && (
          <div className="industry-tpl-mobile">
            <div className="industry-tpl-map" />
            <div className="industry-tpl-pin">📍 {sceneName}</div>
            <div className="industry-tpl-checkin">{t('home.industry.tpl.mock.checkin')}</div>
          </div>
        )}
      </div>
    </div>
  )
}
