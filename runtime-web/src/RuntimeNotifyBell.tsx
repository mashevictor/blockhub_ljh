import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch, getStoredToken } from '@blockhub/web-core'

interface NoteItem {
  id: string
  title: string
  content: string
  read: boolean
  time: string
  type: string
}

/** Runtime 顶栏消息铃铛：站内信未读数 + 下拉列表 */
export default function RuntimeNotifyBell() {
  const token = getStoredToken()
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)
  const [items, setItems] = useState<NoteItem[]>([])
  const boxRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiFetch<{ unread: number; items: NoteItem[] }>('/api/v1/notifications', token)
      setUnread(data.unread || 0)
      setItems((data.items || []).slice(0, 8))
    } catch {
      /* ignore */
    }
  }, [token])

  useEffect(() => {
    void load()
    const t = window.setInterval(() => void load(), 45000)
    return () => window.clearInterval(t)
  }, [load])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const markAll = async () => {
    if (!token) return
    try {
      await apiFetch('/api/v1/notifications/read-all', token, { method: 'POST', body: '{}' })
      await load()
    } catch {
      /* ignore */
    }
  }

  const markOne = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/notifications/${id}/read`, token, { method: 'POST', body: '{}' })
      await load()
    } catch {
      /* ignore */
    }
  }

  if (!token) return null

  return (
    <div ref={boxRef} className="rt-notify" style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-ghost"
        aria-label="消息通知"
        onClick={() => {
          setOpen((v) => !v)
          void load()
        }}
        style={{ position: 'relative', minWidth: 40 }}
      >
        消息
        {unread > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              minWidth: 16,
              height: 16,
              padding: '0 4px',
              borderRadius: 999,
              background: '#dc2626',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              lineHeight: '16px',
              textAlign: 'center',
            }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="rt-notify-panel"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 6px)',
            width: 320,
            maxHeight: 360,
            overflow: 'auto',
            background: '#fff',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            boxShadow: '0 12px 40px rgba(15,23,42,.14)',
            zIndex: 200,
            padding: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 13 }}>站内消息</strong>
            {unread > 0 ? (
              <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 8px' }} onClick={() => void markAll()}>
                全部已读
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="muted" style={{ margin: 0, fontSize: 12, color: '#64748b' }}>
              暂无消息。线索分配到你时会出现在这里。
            </p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
              {items.map((n) => (
                <li
                  key={n.id}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    background: n.read ? '#f8fafc' : '#eff6ff',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                  }}
                  onClick={() => void markOne(n.id)}
                >
                  <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700 }}>{n.title}</div>
                  {n.content ? (
                    <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>{n.content}</div>
                  ) : null}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{n.time}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
