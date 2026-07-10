import type { CSSProperties } from 'react'
import type { TemplatePreviewKind } from '../../data/agentTemplates'

interface Props {
  kind: TemplatePreviewKind
  accent: string
}

export default function TemplatePreviewMock({ kind, accent }: Props) {
  return (
    <div className="b2b-tpl-preview" style={{ '--tpl-accent': accent } as CSSProperties}>
      {kind === 'chat' && (
        <div className="b2b-mock-chat">
          <div className="b2b-mock-line user">请假流程怎么走？</div>
          <div className="b2b-mock-line bot">
            <span className="b2b-mock-dot" />
            已引用《员工手册》§3.2…
          </div>
        </div>
      )}
      {kind === 'approval' && (
        <div className="b2b-mock-approval">
          <div className="b2b-mock-row"><span>请假申请</span><em>待审批</em></div>
          <div className="b2b-mock-row muted">研发部 · 年假 3 天</div>
          <div className="b2b-mock-actions">
            <span className="ok">同意</span>
            <span>驳回</span>
          </div>
        </div>
      )}
      {kind === 'dashboard' && (
        <div className="b2b-mock-dash">
          <div className="b2b-mock-kpis">
            <div><strong>128</strong><span>会话</span></div>
            <div><strong>86%</strong><span>通过率</span></div>
            <div><strong>24</strong><span>待办</span></div>
          </div>
          <div className="b2b-mock-chart">
            <span /><span /><span /><span /><span /><span /><span />
          </div>
        </div>
      )}
      {kind === 'kb' && (
        <div className="b2b-mock-kb">
          <div className="b2b-mock-file">📄 员工手册.pdf</div>
          <div className="b2b-mock-file">📄 报销制度.docx</div>
          <div className="b2b-mock-search">🔍 检索「年假」…</div>
        </div>
      )}
      {kind === 'voice' && (
        <div className="b2b-mock-voice">
          <div className="b2b-mock-wave" aria-hidden>
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} style={{ height: `${20 + (i % 4) * 14}%` }} />
            ))}
          </div>
          <p>侬好，阿拉来讲上海闲话</p>
        </div>
      )}
      {kind === 'integration' && (
        <div className="b2b-mock-sync">
          <div className="b2b-mock-node">OA</div>
          <div className="b2b-mock-arrow">⇄</div>
          <div className="b2b-mock-node core">BlockHub</div>
          <div className="b2b-mock-arrow">⇄</div>
          <div className="b2b-mock-node">企微</div>
        </div>
      )}
      {kind === 'suite' && (
        <div className="b2b-mock-suite">
          <span>+43</span>
          <p>能力模块</p>
        </div>
      )}
      {kind === 'notify' && (
        <div className="b2b-mock-notify">
          <div className="b2b-mock-notify-item"><span>🔔</span> 请假审批已通过</div>
          <div className="b2b-mock-notify-item muted"><span>💼</span> 企微 · 2 分钟前</div>
          <div className="b2b-mock-notify-item"><span>📢</span> 本周制度更新公告</div>
        </div>
      )}
      {kind === 'agent' && (
        <div className="b2b-mock-agent">
          <div className="b2b-mock-agent-node core">路由</div>
          <div className="b2b-mock-agent-row">
            <span>问答</span>
            <span>审批</span>
            <span>报表</span>
          </div>
        </div>
      )}
      {kind === 'llm' && (
        <div className="b2b-mock-deepseek">
          <div className="b2b-mock-ds-logo">大模型</div>
          <p>意图解析 → 模块推荐</p>
          <div className="b2b-mock-ds-chips">
            <span>审批流</span>
            <span>知识库</span>
            <span>看板</span>
          </div>
        </div>
      )}
      {kind === 'module' && (
        <div className="b2b-mock-module">
          <span className="b2b-mock-mod-icon">🧩</span>
          <p>+ 插入模块</p>
        </div>
      )}
    </div>
  )
}
