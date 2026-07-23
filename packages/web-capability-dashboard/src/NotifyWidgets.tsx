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
  const [stale, setStale] = useState<Array<{ id: string; customer: string; status: string; updated_at?: string }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) {
      setStages([])
      setStale([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
    void Promise.all([
      apiFetch<{ items?: FunnelStage[]; stages?: FunnelStage[] }>(`/api/v1/sales-lead/funnel${q}`, token)
        .then((d) => {
          const list = d.stages || d.items || []
          setStages(Array.isArray(list) ? list : [])
        })
        .catch(() => setStages([])),
      apiFetch<{ items?: Array<{ id: string; customer: string; status: string; updated_at?: string }> }>(
        `/api/v1/sales-lead/stale${q}${q ? '&' : '?'}days=7`,
        token,
      )
        .then((d) => setStale(Array.isArray(d.items) ? d.items : []))
        .catch(() => setStale([])),
    ]).finally(() => setLoading(false))
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
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>商机到期提醒（≥7 天未更新）</h4>
      {!loading && stale.length === 0 && <p className="muted">暂无滞留商机</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {stale.map((t) => (
          <li key={t.id} className="list-card" style={{ padding: 10 }}>
            <strong style={{ fontSize: 13 }}>{t.customer}</strong>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
              {t.status}
              {t.updated_at ? ` · 更新于 ${t.updated_at.slice(0, 10)}` : ''}
            </p>
          </li>
        ))}
      </ul>
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
  const { token, primaryColor } = useRuntime()
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const send = async () => {
    if (!token) return
    const t = to.trim()
    const s = subject.trim()
    const b = body.trim()
    if (!t || !s || !b) {
      setMsg('请填写收件人、主题与正文')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      const res = await apiFetch<{ success?: boolean; message?: string; smtp?: boolean }>(
        '/api/v1/notifications/email',
        token,
        {
          method: 'POST',
          body: JSON.stringify({ to: t, subject: s, body: b }),
        },
      )
      setMsg(res.message || (res.smtp ? '已发送并写入通知' : '已写入站内通知（SMTP 未配置则仅入库）'))
      setTo('')
      setSubject('')
      setBody('')
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="widget">
      <h3>邮件通知</h3>
      <p className="muted" style={{ fontSize: 12 }}>
        写入真通知表；若服务端已配置 SMTP 则同步外发。金融场景优先使用企微钉钉飞书。
      </p>
      <input className="input" placeholder="收件人邮箱" value={to} onChange={(e) => setTo(e.target.value)} />
      <input className="input" placeholder="主题" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea className="input" rows={3} placeholder="正文" value={body} onChange={(e) => setBody(e.target.value)} />
      <button
        type="button"
        className="btn"
        style={{ background: primaryColor, marginTop: 8 }}
        disabled={busy || !token}
        onClick={() => void send()}
      >
        {busy ? '提交中…' : '发送 / 入库'}
      </button>
      {msg ? <p className="status-msg">{msg}</p> : null}
    </div>
  )
}
