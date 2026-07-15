import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  title: string
  dept: string
  answer: string
  note: string
  status: string
  confidence?: number
  reporter_name?: string
}

const CAT_LABEL: Record<string, string> = {
  ask: '提问',
  policy: '制度',
  benefit: '福利',
}

export function PolicyQaWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [latest, setLatest] = useState<RecordItem | null>(null)
  const [msg, setMsg] = useState('')

  const accent = primaryColor || '#6366f1'

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'query',
        label: '你想查哪条制度 / 福利？',
        placeholder: '例如：年假怎么申请？试用期有社保吗？',
        hint: '一句话即可，不用自己填部门或答复',
      },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/policy-qa/records${q}`, token)
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

  const ask = async () => {
    if (!token || !values.query?.trim()) return
    setBusy(true)
    setMsg('')
    setLatest(null)
    try {
      const data = await apiFetch<{ record: RecordItem }>('/api/v1/policy-qa/answer', token, {
        method: 'POST',
        body: JSON.stringify({
          query: values.query.trim(),
          app_public_id: appId || '',
        }),
      })
      setLatest(data.record)
      setValues({})
      setResetKey((k) => k + 1)
      await load()
    } catch (e) {
      setMsg(String(e).replace(/^Error:\s*/, '') || '无法自动答复')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <GtgtStepComposer
        title={entrySource === 'im' ? '制度问答协作' : '制度问答'}
        meta="一问一答"
        accent={accent}
        flowHint="问一句 → DeepSeek 答复 → 可再问"
        steps={steps}
        values={values}
        onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onComplete={ask}
        busy={busy}
        resetKey={resetKey}
        submitLabel="帮我查"
      />
      {msg && <p className="status-msg">{msg}</p>}

      {latest && (
        <div className="list-card" style={{ marginTop: 12, borderColor: accent }}>
          <div className="list-card-head">
            <strong>{latest.title}</strong>
            <span className="tag">{CAT_LABEL[latest.category] || latest.category}</span>
          </div>
          {latest.dept ? <p className="muted" style={{ margin: '6px 0 0' }}>建议咨询 · {latest.dept}</p> : null}
          <p style={{ margin: '10px 0 0', fontSize: 14, lineHeight: 1.5 }}>{latest.answer}</p>
          {latest.note ? <p className="muted" style={{ margin: '8px 0 0', fontSize: 12 }}>{latest.note}</p> : null}
          <div className="row-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn" style={{ background: accent }} onClick={() => setLatest(null)}>
              有用
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setLatest(null)
                setResetKey((k) => k + 1)
              }}
            >
              再问
            </button>
          </div>
        </div>
      )}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>历史问答</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">还没有问答记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card" style={{ opacity: latest?.id === t.id ? 1 : 0.9 }}>
            <div className="list-card-head">
              <strong>{t.title}</strong>
              <span className="tag">{t.status === 'answered' ? '已答复' : t.status}</span>
            </div>
            {t.answer ? <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t.answer}</p> : null}
            {t.dept || t.note ? (
              <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                {[t.dept, t.note].filter(Boolean).join(' · ')}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
