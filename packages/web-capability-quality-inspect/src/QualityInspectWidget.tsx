import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  product_code: string
  process_name: string
  result: string
  note: string
  status: string
  reporter_name?: string
}

export function QualityInspectWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ result: 'pass' })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')
  const accent = primaryColor || '#0ea5e9'

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'product', label: '产品/批次', placeholder: 'LOT-…' },
      { key: 'process', label: '工序', optional: true, placeholder: '终检/焊接' },
      {
        key: 'result',
        label: '结论',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            <button type="button" className={value !== 'fail' ? 'btn' : 'btn btn-ghost'} style={value !== 'fail' ? { background: a } : undefined} onClick={() => setValue('pass')}>合格</button>
            <button type="button" className={value === 'fail' ? 'btn' : 'btn btn-ghost'} style={value === 'fail' ? { background: '#b91c1c' } : undefined} onClick={() => setValue('fail')}>不合格</button>
          </div>
        ),
      },
      { key: 'note', label: '备注', optional: true },
    ],
    [],
  )

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/quality-inspect/records${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !values.product?.trim()) return
    setBusy(true)
    try {
      await apiFetch('/api/v1/quality-inspect/records', token, {
        method: 'POST',
        body: JSON.stringify({
          product_code: values.product.trim(),
          process_name: (values.process || '').trim(),
          result: values.result === 'fail' ? 'fail' : 'pass',
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ result: 'pass' })
      setResetKey((k) => k + 1)
      setMsg('质检已入库')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建质检</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '质检协作' : '质检 SOP'}
          meta={entrySource === 'im' ? '群入口' : '工作台'}
          accent={accent}
          flowHint={`录入 → 推群 → 闭环${user?.display_name ? ` · ${user.display_name}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交质检"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>记录</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && !items.length && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.product_code}</strong>
              <span className="tag">{t.result === 'pass' ? '合格' : '不合格'} · {t.status}</span>
            </div>
            {t.status === 'open' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void apiFetch(`/api/v1/quality-inspect/records/${t.id}/close`, token!, { method: 'POST', body: '{}' }).then(load)}>闭环</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
