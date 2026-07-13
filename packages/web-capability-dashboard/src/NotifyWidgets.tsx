import { useEffect, useState } from 'react'
import { apiFetch, useRuntime, type SchemaNode } from '@blockhub/web-core'

interface NotificationItem {
  id: string
  title: string
  content: string
  type: string
  read: boolean
  time?: string
}

const FUNNEL_STAGES = [
  { name: '线索', value: 420 },
  { name: '商机', value: 280 },
  { name: '方案', value: 160 },
  { name: '成交', value: 72 },
]

export function FunnelWidget(_props: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const max = FUNNEL_STAGES[0]?.value ?? 1
  return (
    <div className="widget funnel-widget">
      <h3>销售漏斗</h3>
      <div className="funnel-stages">
        {FUNNEL_STAGES.map((s) => (
          <div key={s.name} className="funnel-row">
            <span className="funnel-label">{s.name}</span>
            <div className="funnel-bar-wrap">
              <div
                className="funnel-bar"
                style={{ width: `${(s.value / max) * 100}%`, background: primaryColor }}
              />
            </div>
            <span className="funnel-value">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function InboxWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor } = useRuntime()
  const [items, setItems] = useState<NotificationItem[]>([])

  useEffect(() => {
    apiFetch<{ items: NotificationItem[] }>('/api/v1/notifications', token)
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]))
  }, [token])

  return (
    <div className="widget inbox-widget">
      <h3>消息中心</h3>
      {items.length === 0 && <p className="muted">暂无消息</p>}
      {items.map((n) => (
        <div key={n.id} className={`list-card${n.read ? '' : ' unread'}`}>
          <div className="list-card-head">
            <strong>{n.title}</strong>
            <span className="tag">{n.type}</span>
          </div>
          <p className="muted">{n.content}</p>
          {n.time && <small className="muted">{n.time}</small>}
        </div>
      ))}
      <p className="muted" style={{ marginTop: 8 }}>
        未读 {items.filter((i) => !i.read).length} 条
      </p>
    </div>
  )
}

export function EmailWidget(_props: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [msg, setMsg] = useState('')

  return (
    <div className="widget email-widget">
      <h3>邮件通知</h3>
      <p className="muted">配置并发送业务邮件通知（演示模式）。</p>
      <label>
        收件人
        <input className="input" value={to} onChange={(e) => setTo(e.target.value)} placeholder="user@company.com" />
      </label>
      <label>
        主题
        <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </label>
      <label>
        正文
        <textarea className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <button
        type="button"
        className="btn"
        style={{ background: primaryColor }}
        onClick={() => setMsg(`邮件任务已创建（演示）：${subject || '无主题'}`)}
      >
        发送
      </button>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
