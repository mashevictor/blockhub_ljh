import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  location: string
  asset_name: string
  fault: string
  status: string
  reporter_name?: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '待派工',
  dispatched: '维修中',
  done: '已完成',
}

export function PropertyRepairWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#0d47a1'
  const pending = items.filter((t) => t.status === 'open').length

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'location', label: '位置', placeholder: '楼栋/单元/房号', optional: true },
      { key: 'asset_name', label: '资产名称', placeholder: '电梯/门禁/水管…' },
      { key: 'fault', label: '故障描述', placeholder: '现象、影响范围…' },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/property-repair/records${q}`, token)
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
    if (!token || !values.asset_name?.trim() || !values.fault?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/property-repair/records', token, {
        method: 'POST',
        body: JSON.stringify({
          location: (values.location || '未填位置').trim(),
          asset_name: values.asset_name.trim(),
          fault: values.fault.trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('报修已提交，等待物业派工')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const dispatch = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/property-repair/records/${id}/dispatch`, token, { method: 'POST', body: '{}' })
      setMsg('已派工')
      await load()
    } catch (e) {
      setMsg(`派工失败：${String(e)}`)
    }
  }

  const done = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/property-repair/records/${id}/done`, token, { method: 'POST', body: '{}' })
      setMsg('已完工')
      await load()
    } catch (e) {
      setMsg(`操作失败：${String(e)}`)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建报修</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '物业报修' : '业主报修'}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`提单 → 派工 → 完工${user?.display_name ? ` · ${user.display_name}` : ''}${pending ? ` · 待派工 ${pending}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交报修"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>报修列表</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.asset_name}</strong>
              <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.location} · {t.reporter_name || '—'}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.fault}</p>
            {t.status === 'open' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void dispatch(t.id)}>派工</button>
            )}
            {t.status === 'dispatched' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void done(t.id)}>完工</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
