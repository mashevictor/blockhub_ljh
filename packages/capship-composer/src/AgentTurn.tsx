import type { ReactNode } from 'react'

export type AgentPhase = 'thinking' | 'understood' | 'applying' | 'codegen' | 'done' | 'error'

export type AgentStep = {
  id: string
  label: string
  state: 'pending' | 'active' | 'done' | 'error'
}

export type AgentOpCard = {
  op: string
  label: string
  detail?: string
}

export type AgentTurnState = {
  phase: AgentPhase
  steps: AgentStep[]
  intent?: string
  matched?: Array<{ key: string; label?: string; score?: number }>
  ops?: AgentOpCard[]
  codegen?: {
    jobId: string
    status: string
    keys: string[]
    progress?: number
    pageCount?: number
  }
  source?: string
  /** 402 配额不足时展示升级 */
  quotaBlocked?: boolean
  upgradeHref?: string
  upgradeLabel?: string
}

const OP_LABEL: Record<string, string> = {
  add: '新增页面',
  remove: '删除页面',
  rename: '重命名',
  move: '调整顺序',
  patch_page: '改控件',
  revise_generated: '修订生成页',
}

export function buildThinkingSteps(): AgentStep[] {
  return [
    { id: 'ctx', label: '读取当前菜单与上下文', state: 'active' },
    { id: 'intent', label: '理解改页意图', state: 'pending' },
    { id: 'ops', label: '规划页面操作', state: 'pending' },
    { id: 'apply', label: '写入左侧预览', state: 'pending' },
  ]
}

export function advanceThinkingSteps(steps: AgentStep[], tick: number): AgentStep[] {
  const n = Math.min(steps.length, Math.floor(tick / 2) + 1)
  return steps.map((s, i) => {
    if (i < n - 1) return { ...s, state: 'done' }
    if (i === n - 1) return { ...s, state: 'active' }
    return { ...s, state: 'pending' }
  })
}

export function opsToCards(
  ops: Array<{ op?: string; label?: string; capability_key?: string; from?: string; to?: string; summary?: string }>,
): AgentOpCard[] {
  return ops.map((o) => {
    const op = String(o.op || 'add')
    const title = OP_LABEL[op] || op
    const name = o.label || o.capability_key || (o.from && o.to ? `${o.from}→${o.to}` : '') || ''
    return {
      op,
      label: name ? `${title} · ${name}` : title,
      detail: o.summary || o.capability_key || undefined,
    }
  })
}

export function AgentTurnBody({
  text,
  agent,
  onCancel,
}: {
  text: string
  agent?: AgentTurnState
  /** 取消当前工具步 / 出页 */
  onCancel?: () => void
}): ReactNode {
  if (!agent) {
    return <div className="capship-composer-msg-text">{text}</div>
  }

  const phaseHint =
    agent.phase === 'thinking'
      ? '思考中'
      : agent.phase === 'codegen'
        ? '智能出页进行中'
        : agent.phase === 'done'
          ? '本轮完成'
          : agent.phase === 'error'
            ? '出错'
            : '处理中'

  const canCancel =
    Boolean(onCancel) &&
    (agent.phase === 'thinking' ||
      agent.phase === 'codegen' ||
      agent.phase === 'applying' ||
      agent.phase === 'understood')

  return (
    <div className="capship-agent-turn">
      <div className="capship-agent-phase" data-phase={agent.phase}>
        <span className="capship-agent-phase-dot" aria-hidden />
        <strong>{phaseHint}</strong>
        {agent.source === 'fallback' ? <span className="capship-agent-src">本地规则</span> : null}
        {agent.source && agent.source !== 'fallback' ? (
          <span className="capship-agent-src">{agent.source}</span>
        ) : null}
        {canCancel ? (
          <button type="button" className="capship-agent-cancel" onClick={onCancel} aria-label="取消本轮">
            取消
          </button>
        ) : null}
      </div>

      {agent.steps?.length ? (
        <ol className="capship-agent-steps">
          {agent.steps.map((s) => (
            <li key={s.id} className={`is-${s.state}`}>
              <span className="capship-agent-step-mark" aria-hidden />
              {s.label}
            </li>
          ))}
        </ol>
      ) : null}

      {agent.intent ? (
        <p className="capship-agent-intent">
          <span>意图</span>
          {agent.intent}
        </p>
      ) : null}

      {agent.matched?.length ? (
        <div className="capship-agent-chips" aria-label="匹配能力">
          {agent.matched.slice(0, 6).map((m) => (
            <span key={m.key} className="capship-agent-chip" title={m.key}>
              {m.label || m.key}
              {typeof m.score === 'number' ? ` · ${m.score.toFixed(1)}` : ''}
            </span>
          ))}
        </div>
      ) : null}

      {agent.ops?.length ? (
        <ul className="capship-agent-ops">
          {agent.ops.map((o, i) => (
            <li key={`${o.op}-${i}`}>
              <code>{o.op}</code>
              <span>{o.label}</span>
              {o.detail ? <em>{o.detail}</em> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {agent.codegen ? (
        <div
          className={`capship-agent-codegen${
            agent.codegen.status === 'cancelled' || agent.codegen.status === 'failed'
              ? ' is-error'
              : agent.codegen.status === 'ready'
                ? ' is-ready'
                : ''
          }`}
          role="status"
        >
          <div className="capship-agent-codegen-head">
            <strong>智能出页</strong>
            <span data-status={agent.codegen.status}>{agent.codegen.status}</span>
          </div>
          <div className="capship-agent-codegen-track" aria-hidden>
            <div
              className="capship-agent-codegen-fill"
              data-status={agent.codegen.status}
              style={{ width: `${Math.max(8, Math.min(100, agent.codegen.progress ?? 12))}%` }}
            />
          </div>
          <p className="capship-agent-codegen-keys">
            {(agent.codegen.keys || []).slice(0, 4).join(' · ') || '生成中…'}
            {agent.codegen.pageCount ? ` · 已出 ${agent.codegen.pageCount} 页` : ''}
            {agent.codegen.jobId ? ` · #${agent.codegen.jobId.slice(0, 6)}` : ''}
          </p>
        </div>
      ) : null}

      {agent.upgradeHref ? (
        <div className={`capship-agent-quota${agent.quotaBlocked ? '' : ' is-auth'}`}>
          <p>
            {agent.quotaBlocked
              ? '当前套餐配额不足，升级后可继续对话改页 / 智能出页。'
              : '需要登录后才能继续改页或取消服务端出页任务。'}
          </p>
          <a className="capship-agent-upgrade" href={agent.upgradeHref}>
            {agent.upgradeLabel || (agent.quotaBlocked ? '升级套餐' : '去登录')}
          </a>
        </div>
      ) : null}

      {text ? <div className="capship-composer-msg-text capship-agent-reply">{text}</div> : null}
    </div>
  )
}
