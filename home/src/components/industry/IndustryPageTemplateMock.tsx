import type { CSSProperties } from 'react'
import type { IndustryPageTemplateKind } from '../../data/industryPageTemplates'

interface Props {
  kind: IndustryPageTemplateKind
  accent: string
  sceneName: string
}

export default function IndustryPageTemplateMock({ kind, accent, sceneName }: Props) {
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
            <div className="industry-tpl-row"><span>待我审批</span><strong>3</strong></div>
            <div className="industry-tpl-card"><span>{sceneName}</span><em>待处理</em></div>
            <div className="industry-tpl-actions"><span className="ok">通过</span><span>驳回</span></div>
          </div>
        )}
        {kind === 'chat_kb' && (
          <div className="industry-tpl-chat">
            <div className="industry-tpl-bubble user">如何办理？</div>
            <div className="industry-tpl-bubble bot">已检索知识库，为您找到 3 条相关制度…</div>
          </div>
        )}
        {kind === 'dashboard' && (
          <div className="industry-tpl-dash">
            <div className="industry-tpl-kpis">
              <div><strong>86%</strong><span>达成率</span></div>
              <div><strong>128</strong><span>今日量</span></div>
              <div><strong>12</strong><span>预警</span></div>
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
            <div className="industry-tpl-field"><label>申请人</label><span>张三</span></div>
            <div className="industry-tpl-field"><label>事项</label><span>{sceneName}</span></div>
            <div className="industry-tpl-field wide"><label>说明</label><span className="muted">填写业务详情…</span></div>
          </div>
        )}
        {kind === 'list' && (
          <div className="industry-tpl-list">
            {[1, 2, 3].map((n) => (
              <div key={n} className="industry-tpl-list-row">
                <span className="dot" />
                <span>{sceneName} #{n}</span>
                <em>进行中</em>
              </div>
            ))}
          </div>
        )}
        {kind === 'funnel' && (
          <div className="industry-tpl-funnel">
            <div style={{ width: '100%' }}>线索 100%</div>
            <div style={{ width: '72%' }}>商机 72%</div>
            <div style={{ width: '48%' }}>签约 48%</div>
            <div style={{ width: '31%' }}>回款 31%</div>
          </div>
        )}
        {kind === 'kb' && (
          <div className="industry-tpl-kb">
            <div className="industry-tpl-file">📄 {sceneName}.pdf</div>
            <div className="industry-tpl-file">📄 操作手册.docx</div>
            <div className="industry-tpl-search">🔍 语义检索…</div>
          </div>
        )}
        {kind === 'notify' && (
          <div className="industry-tpl-notify">
            <div><span>🔔</span> {sceneName} 待处理</div>
            <div className="muted"><span>💼</span> 企微 · 刚刚</div>
          </div>
        )}
        {kind === 'integration' && (
          <div className="industry-tpl-sync">
            <span>ERP</span><span className="arrow">⇄</span>
            <span className="core">BlockHub</span><span className="arrow">⇄</span>
            <span>企微</span>
          </div>
        )}
        {kind === 'mobile_field' && (
          <div className="industry-tpl-mobile">
            <div className="industry-tpl-map" />
            <div className="industry-tpl-pin">📍 {sceneName}</div>
            <div className="industry-tpl-checkin">签到 · 09:32</div>
          </div>
        )}
      </div>
    </div>
  )
}
