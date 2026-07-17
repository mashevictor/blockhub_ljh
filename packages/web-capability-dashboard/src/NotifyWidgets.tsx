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

interface FunnelStage {
  name: string
  value: number
}

/** 空库 = 空漏斗；禁止静态假数冒充业务 */
export function FunnelWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [stages, setStages] = useState<FunnelStage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setStages([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
    // 优先读销售漏斗真接口；无数据或失败 → 空态
    void apiFetch<{ items?: FunnelStage[]; stages?: FunnelStage[] }>(
      `/api/v1/sales-lead/funnel${q}`,
      token,
    )
      .then((d) => {
        const list = d.stages || d.items || []
        setStages(Array.isArray(list) ? list : [])
      })
      .catch(() => setStages([]))
      .finally(() => setLoading(false))
  }, [token, appId])

  const max = Math.max(1, ...stages.map((s) => s.value))

  return (
    <div className="widget funnel-widget">
      <h3>销售漏斗</h3>
      {loading && <p className="muted">加载中…</p>}
      {!loading && stages.length === 0 && (
        <p className="muted">空库无漏斗数据 — 有销售线索后会显示各阶段数量</p>
      )}
      <div className="funnel-stages">
        {stages.map((s) => (
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
    <div className="widget">
      <h3>邮件通知（示意）</h3>
      <p className="muted" style={{ fontSize: 12 }}>
        本页为布局示意，不发送真实邮件。请使用企微钉钉飞书等正式通知能力。
      </p>
      <input className="input" placeholder="收件人" value={to} onChange={(e) => setTo(e.target.value)} disabled />
      <input className="input" placeholder="主题" value={subject} onChange={(e) => setSubject(e.target.value)} disabled />
      <textarea className="input" rows={3} placeholder="正文" value={body} onChange={(e) => setBody(e.target.value)} disabled />
      <button
        type="button"
        className="btn"
        style={{ background: primaryColor, marginTop: 8 }}
        disabled
        onClick={() => setMsg('示意页不可发送')}
      >
        发送
      </button>
      {msg ? <p className="status-msg">{msg}</p> : null}
    </div>
  )
}
