import type { CSSProperties } from 'react'
import { useT } from '@blockhub/i18n/react'
import type { TemplatePreviewKind } from '../../data/agentTemplates'

interface Props {
  kind: TemplatePreviewKind
  accent: string
}

export default function TemplatePreviewMock({ kind, accent }: Props) {
  const t = useT()

  return (
    <div className="b2b-tpl-preview" style={{ '--tpl-accent': accent } as CSSProperties}>
      {kind === 'chat' && (
        <div className="b2b-mock-chat">
          <div className="b2b-mock-line user">{t('product.preview.chat.user')}</div>
          <div className="b2b-mock-line bot">
            <span className="b2b-mock-dot" />
            {t('product.preview.chat.bot')}
          </div>
        </div>
      )}
      {kind === 'approval' && (
        <div className="b2b-mock-approval">
          <div className="b2b-mock-row">
            <span>{t('product.preview.approval.title')}</span>
            <em>{t('product.preview.approval.status')}</em>
          </div>
          <div className="b2b-mock-row muted">{t('product.preview.approval.detail')}</div>
          <div className="b2b-mock-actions">
            <span className="ok">{t('product.preview.approval.approve')}</span>
            <span>{t('product.preview.approval.reject')}</span>
          </div>
        </div>
      )}
      {kind === 'dashboard' && (
        <div className="b2b-mock-dash">
          <div className="b2b-mock-kpis">
            <div>
              <strong>128</strong>
              <span>{t('product.preview.dash.sessions')}</span>
            </div>
            <div>
              <strong>86%</strong>
              <span>{t('product.preview.dash.pass_rate')}</span>
            </div>
            <div>
              <strong>24</strong>
              <span>{t('product.preview.dash.todos')}</span>
            </div>
          </div>
          <div className="b2b-mock-chart">
            <span /><span /><span /><span /><span /><span /><span />
          </div>
        </div>
      )}
      {kind === 'kb' && (
        <div className="b2b-mock-kb">
          <div className="b2b-mock-file">📄 {t('product.preview.kb.file1')}</div>
          <div className="b2b-mock-file">📄 {t('product.preview.kb.file2')}</div>
          <div className="b2b-mock-search">🔍 {t('product.preview.kb.search')}</div>
        </div>
      )}
      {kind === 'voice' && (
        <div className="b2b-mock-voice">
          <div className="b2b-mock-wave" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} style={{ height: `${20 + (i % 4) * 14}%` }} />
            ))}
          </div>
          <p>{t('product.preview.voice.line')}</p>
        </div>
      )}
      {kind === 'integration' && (
        <div className="b2b-mock-sync">
          <div className="b2b-mock-node">{t('product.preview.integration.oa')}</div>
          <div className="b2b-mock-arrow">⇄</div>
          <div className="b2b-mock-node core">{t('product.preview.integration.core')}</div>
          <div className="b2b-mock-arrow">⇄</div>
          <div className="b2b-mock-node">{t('product.preview.integration.im')}</div>
        </div>
      )}
      {kind === 'suite' && (
        <div className="b2b-mock-suite">
          <span>+43</span>
          <p>{t('product.preview.suite.label')}</p>
        </div>
      )}
      {kind === 'notify' && (
        <div className="b2b-mock-notify">
          <div className="b2b-mock-notify-item">
            <span>🔔</span> {t('product.preview.notify.approved')}
          </div>
          <div className="b2b-mock-notify-item muted">
            <span>💼</span> {t('product.preview.notify.im')}
          </div>
          <div className="b2b-mock-notify-item">
            <span>📢</span> {t('product.preview.notify.announce')}
          </div>
        </div>
      )}
      {kind === 'agent' && (
        <div className="b2b-mock-agent">
          <div className="b2b-mock-agent-node core">{t('product.preview.agent.router')}</div>
          <div className="b2b-mock-agent-row">
            <span>{t('product.preview.agent.qa')}</span>
            <span>{t('product.preview.agent.approval')}</span>
            <span>{t('product.preview.agent.report')}</span>
          </div>
        </div>
      )}
      {kind === 'llm' && (
        <div className="b2b-mock-deepseek">
          <div className="b2b-mock-ds-logo">{t('product.preview.llm.logo')}</div>
          <p>{t('product.preview.llm.flow')}</p>
          <div className="b2b-mock-ds-chips">
            <span>{t('product.preview.llm.chip_approval')}</span>
            <span>{t('product.preview.llm.chip_kb')}</span>
            <span>{t('product.preview.llm.chip_dash')}</span>
          </div>
        </div>
      )}
      {kind === 'module' && (
        <div className="b2b-mock-module">
          <span className="b2b-mock-mod-icon">🧩</span>
          <p>{t('product.preview.module.insert')}</p>
        </div>
      )}
    </div>
  )
}
