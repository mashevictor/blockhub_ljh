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

const STEPS = ['设备编号', '工位位置', '故障描述'] as const

export function DeviceRepairWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RepairTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
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

  const canNext =
    (step === 0 && assetCode.trim().length > 0) ||
    (step === 1 && true) ||
    (step === 2 && fault.trim().length > 0)

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
      setStep(0)
      setMsg('报修已提交，可在下方跟踪；也可打开「企微钉钉飞书」页配置推送通道')
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

  const accent = primaryColor || '#0d47a1'

  return (
    <div className="widget device-repair-widget bh-flow-form">
      <div className="bh-flow-head">
        <h3>设备报修</h3>
        <span className="bh-flow-meta">{step + 1}/{STEPS.length}</span>
      </div>
      <p className="muted">
        扫码/填编号 → 派工 → 完工跟踪
        {user?.display_name ? ` · ${user.display_name}` : ''}
      </p>

      <div className="bh-flow-steps" aria-label="报修填写进度">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`bh-flow-step${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}`}
          >
            <span className="bh-flow-dot" style={i <= step ? { background: accent } : undefined} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="bh-flow-body">
        {step === 0 && (
          <label>
            设备编号
            <input
              className="input"
              value={assetCode}
              onChange={(e) => setAssetCode(e.target.value)}
              placeholder="扫码或输入，如 CNC-A12"
              autoFocus
            />
          </label>
        )}
        {step === 1 && (
          <label>
            位置 / 工位
            <input
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="一车间·3号线（可留空）"
              autoFocus
            />
          </label>
        )}
        {step === 2 && (
          <label>
            故障描述
            <textarea
              className="input"
              rows={3}
              value={fault}
              onChange={(e) => setFault(e.target.value)}
              placeholder="现象、是否停机、影响产线…"
              autoFocus
            />
          </label>
        )}

        <div className="bh-flow-actions">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
              上一步
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn"
              style={{ background: accent }}
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
            >
              下一步
            </button>
          ) : (
            <button
              type="button"
              className="btn"
              style={{ background: accent }}
              disabled={busy || !canNext}
              onClick={() => void submit()}
            >
              {busy ? '提交中…' : '提交报修'}
            </button>
          )}
        </div>
        {msg && <p className="status-msg">{msg}</p>}
        {error && <p className="status-msg" style={{ color: '#b91c1c' }}>{error}</p>}
      </div>

      <h4 style={{ margin: '20px 0 8px', fontSize: 14 }}>我的工单</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无工单，按步骤提交后写入数据库</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.ticket_no || t.id} · {t.asset_code}</strong>
              <span className="tag" style={{ color: accent }}>{STATUS_LABEL[t.status] || t.status}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.location}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.fault}</p>
            {t.status !== 'done' && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginTop: 8, fontSize: 12 }}
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
