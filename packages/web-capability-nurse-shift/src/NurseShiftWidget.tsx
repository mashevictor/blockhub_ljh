import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  nurse_name: string
  shift_date: string
  from_shift: string
  to_shift: string
  reason: string
  status: string
  reporter_name?: string
}

export function NurseShiftWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({
    from_shift: '白班',
    to_shift: '夜班',
  })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#059669'
  const pending = items.filter((t) => t.status === 'pending').length

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'nurse_name', label: '护士姓名', placeholder: user?.display_name || '可默认当前用户', optional: true },
      {
        key: 'shift_date',
        label: '值班日期',
        render: ({ value, setValue }) => (
          <input className="bh-gtgt-input" type="date" value={value} onChange={(e) => setValue(e.target.value)} />
        ),
      },
      { key: 'from_shift', label: '原班次', placeholder: '白班 / 小夜 / 大夜' },
      { key: 'to_shift', label: '目标班次', placeholder: '希望调至' },
      { key: 'reason', label: '调班原因', placeholder: '家庭事由 / 倒班换休…', optional: true },
    ],
    [user?.display_name],
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/nurse-shift/records${q}`, token)
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
    if (!token || !values.shift_date?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/nurse-shift/records', token, {
        method: 'POST',
        body: JSON.stringify({
          nurse_name: (values.nurse_name || '').trim() || user?.display_name || '',
          shift_date: values.shift_date.trim(),
          from_shift: (values.from_shift || '白班').trim(),
          to_shift: (values.to_shift || '夜班').trim(),
          reason: (values.reason || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ from_shift: '白班', to_shift: '夜班' })
      setResetKey((k) => k + 1)
      setMsg('调班已提交 · 待护士长批复')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const decide = async (id: string, approve: boolean) => {
    if (!token) return
    const path = approve ? 'approve' : 'reject'
    try {
      await apiFetch(`/api/v1/nurse-shift/records/${id}/${path}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`操作失败：${String(e)}`)
    }
  }

  const statusLabel = (s: string) => (s === 'pending' ? '待批复' : s === 'approved' ? '已通过' : '已驳回')

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建调班申请</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '排班协作' : '护士排班'}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`调班申请 → 护士长批复 → 值班通知${user?.display_name ? ` · ${user.display_name}` : ''}${pending ? ` · 待批复 ${pending}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交申请"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>调班记录</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.nurse_name}</strong>
              <span className="tag">{statusLabel(t.status)}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.shift_date}：{t.from_shift} → {t.to_shift}</p>
            {t.reason && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.reason}</p>}
            {t.status === 'pending' && (
              <div className="row-actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => void decide(t.id, true)}>通过</button>
                <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => void decide(t.id, false)}>驳回</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
