import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RepairTicket {
  id: string
  ticket_no: string
  asset_code: string
  location: string
  fault: string
  status: 'pending' | 'dispatched' | 'done' | string
  created_at: string
  reporter_name?: string
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待派工',
  dispatched: '维修中',
  done: '已完工',
}

export function DeviceRepairWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RepairTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [assetCode, setAssetCode] = useState('')
  const [location, setLocation] = useState('')
  const [fault, setFault] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      setError('请先登录后查看工单')
      return
    }
    setLoading(true)
    setError('')
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RepairTicket[] }>(`/api/v1/device-repair/tickets${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setItems([])
      setError(`加载失败：${String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    if (!assetCode.trim() || !fault.trim()) {
      setMsg('请填写设备编号与故障描述')
      return
    }
    if (!token) {
      setMsg('请先登录')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/device-repair/tickets', token, {
        method: 'POST',
        body: JSON.stringify({
          asset_code: assetCode.trim(),
          location: location.trim(),
          fault: fault.trim(),
          app_public_id: appId || '',
        }),
      })
      setAssetCode('')
      setLocation('')
      setFault('')
      setMsg('报修单已提交')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const advance = async (id: string, status: string) => {
    if (!token) return
    const action = status === 'pending' ? 'dispatch' : 'complete'
    try {
      await apiFetch(`/api/v1/device-repair/tickets/${id}/action`, token, {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
      await load()
    } catch (e) {
      setMsg(`操作失败：${String(e)}`)
    }
  }

  return (
    <div className="widget device-repair-widget">
      <h3>设备报修工单</h3>
      <p className="muted">
        弹幕场景「设备报修」· 租户内真实工单
        {user?.display_name ? ` · ${user.display_name}` : ''}
      </p>

      <div className="device-repair-form" style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
        <label>
          设备编号
          <input
            className="input"
            value={assetCode}
            onChange={(e) => setAssetCode(e.target.value)}
            placeholder="扫码或输入 CNC-A12"
          />
        </label>
        <label>
          位置 / 工位
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="一车间·3号线"
          />
        </label>
        <label>
          故障描述
          <textarea
            className="input"
            rows={3}
            value={fault}
            onChange={(e) => setFault(e.target.value)}
            placeholder="现象、影响产线…"
          />
        </label>
        <button
          type="button"
          className="btn"
          style={{
            background: primaryColor || '#0d47a1',
            color: '#fff',
            border: 'none',
            padding: '10px 14px',
            borderRadius: 8,
            cursor: 'pointer',
          }}
          disabled={busy}
          onClick={() => void submit()}
        >
          {busy ? '提交中…' : '提交报修'}
        </button>
        {msg && <p className="status-msg">{msg}</p>}
        {error && <p className="status-msg" style={{ color: '#b91c1c' }}>{error}</p>}
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>工单列表</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无工单，提交后将写入数据库</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li
            key={t.id}
            className="list-card"
            style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fff' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <strong>{t.ticket_no || t.id} · {t.asset_code}</strong>
              <span style={{ fontSize: 12, color: primaryColor || '#0d47a1', fontWeight: 600 }}>
                {STATUS_LABEL[t.status] || t.status}
              </span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>{t.location}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.fault}</p>
            {t.reporter_name && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#94a3b8' }}>报修人：{t.reporter_name}</p>
            )}
            {t.status !== 'done' && (
              <button
                type="button"
                className="btn"
                style={{ marginTop: 8, fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}
                onClick={() => void advance(t.id, t.status)}
              >
                {t.status === 'pending' ? '派工' : '完工确认'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
