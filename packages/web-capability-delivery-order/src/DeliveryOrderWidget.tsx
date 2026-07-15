import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  pickup: string
  dropoff: string
  rider_name: string
  note: string
  status: string
  reporter_name?: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '待派送',
  delivering: '配送中',
  done: '已送达',
  exception: '异常',
}

const TRACK = ['open', 'delivering', 'done'] as const

function TrackBar({ status, accent }: { status: string; accent: string }) {
  const idx = TRACK.indexOf(status as (typeof TRACK)[number])
  const active = idx < 0 ? (status === 'exception' ? 0 : 0) : idx
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
      {TRACK.map((s, i) => (
        <div key={s} style={{ flex: 1 }}>
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: i <= active && status !== 'exception' ? accent : 'rgba(0,0,0,0.12)',
            }}
          />
          <div style={{ fontSize: 10, marginTop: 2, color: i <= active ? accent : '#888' }}>
            {STATUS_LABEL[s]}
          </div>
        </div>
      ))}
    </div>
  )
}

export function DeliveryOrderWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(true)

  const accent = primaryColor || '#f43f5e'

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'pickup', label: '取餐 / 取货点', placeholder: '例如：陆家嘴店' },
      { key: 'dropoff', label: '送达地址', placeholder: '例如：浦东新区××路' },
      { key: 'rider_name', label: '骑手（可空）', placeholder: '指派骑手', optional: true },
    ],
    [],
  )

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/delivery-order/records${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    if (!token || !values.pickup?.trim() || !values.dropoff?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/delivery-order/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: 'dispatch',
          pickup: values.pickup.trim(),
          dropoff: values.dropoff.trim(),
          rider_name: (values.rider_name || '').trim(),
          note: '',
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setShowForm(false)
      setMsg('运单已创建')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/delivery-order/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  const active = items.filter((t) => t.status !== 'done')
  const finished = items.filter((t) => t.status === 'done')

  return (
    <div>
      {showForm || items.length === 0 ? (
        <GtgtStepComposer
          title="新建运单"
          meta={entrySource === 'im' ? '群消息入口' : '配送调度'}
          accent={accent}
          flowHint="取货点 → 送达地址 → 可选骑手"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="创建运单"
        />
      ) : (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>
          + 新建运单
        </button>
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>在途运单</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && active.length === 0 && <p className="muted">暂无在途订单</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
        {active.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no}</strong>
              <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>
              {t.pickup} → {t.dropoff}
            </p>
            {t.rider_name ? <p className="muted" style={{ margin: '4px 0 0' }}>骑手 {t.rider_name}</p> : null}
            <TrackBar status={t.status} accent={accent} />
            <div className="row-actions" style={{ marginTop: 12 }}>
              {t.status === 'open' && (
                <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'delivering')}>
                  开始配送
                </button>
              )}
              {t.status === 'delivering' && (
                <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'done')}>
                  送达完成
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {finished.length > 0 && (
        <>
          <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>已送达 · {finished.length}</h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {finished.slice(0, 8).map((t) => (
              <li key={t.id} className="list-card" style={{ opacity: 0.85 }}>
                <div className="list-card-head">
                  <strong>
                    {t.pickup} → {t.dropoff}
                  </strong>
                  <span className="tag">已送达</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
