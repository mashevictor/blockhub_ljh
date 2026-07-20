import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  customer: string
  evidence_type: string
  title: string
  summary: string
  target_stage: string
  status: string
  reporter_name?: string
}

const EVIDENCE_OPTS: { value: string; label: string }[] = [
  { value: 'meeting_notes', label: '会议纪要' },
  { value: 'buyer_reply', label: '买方回执' },
  { value: 'poc_result', label: 'POC 结果' },
  { value: 'signed_intent', label: '签约意向' },
  { value: 'payment_proof', label: '回款证明' },
  { value: 'other', label: '其他' },
]

const STAGE_OPTS: { value: string; label: string }[] = [
  { value: 'following', label: '解锁跟进中' },
  { value: 'won', label: '解锁成交' },
]

function chipRow(
  opts: { value: string; label: string }[],
  value: string,
  setValue: (v: string) => void,
  accent: string,
) {
  return (
    <div className="row-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? 'btn' : 'btn btn-ghost'}
          style={value === o.value ? { background: accent } : undefined}
          onClick={() => setValue(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function DealEvidenceWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#0f766e'

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'customer', label: '客户名称', placeholder: '与线索客户名一致即可关联' },
      {
        key: 'evidence_type',
        label: '证据类型',
        render: ({ value, setValue, accent: a }) => chipRow(EVIDENCE_OPTS, value || 'meeting_notes', setValue, a),
      },
      {
        key: 'target_stage',
        label: '用于晋级',
        render: ({ value, setValue, accent: a }) => chipRow(STAGE_OPTS, value || 'following', setValue, a),
      },
      {
        key: 'summary',
        label: '证据摘要',
        inputType: 'textarea',
        placeholder: '会议结论 / 买方原话 / POC 结论…',
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/deal-evidence/records${q}`, token)
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
    const customer = (values.customer || '').trim()
    if (!token || !customer) return
    setBusy(true)
    setMsg('')
    try {
      const et = values.evidence_type || 'meeting_notes'
      await apiFetch('/api/v1/deal-evidence/records', token, {
        method: 'POST',
        body: JSON.stringify({
          customer,
          evidence_type: et,
          title: EVIDENCE_OPTS.find((o) => o.value === et)?.label || et,
          summary: (values.summary || '').trim(),
          target_stage: values.target_stage || 'following',
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('证据已写入真库 · 可回销售线索晋级')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const verify = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/deal-evidence/records/${id}/verify`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`核验失败：${String(e)}`)
    }
  }

  const typeLabel = (t: string) => EVIDENCE_OPTS.find((o) => o.value === t)?.label || t

  return (
    <div className="bh-flow-body">
      <GtgtStepComposer
        title="登记成交证据"
        flowHint="无证据不晋级 · 打假漏斗"
        accent={accent}
        steps={steps}
        values={values}
        onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
        onComplete={() => void submit()}
        busy={busy}
        resetKey={resetKey}
        submitLabel="写入证据"
      />
      {msg ? <p className="muted" style={{ marginTop: 8 }}>{msg}</p> : null}
      <h3 style={{ marginTop: 20 }}>证据台账{items.length ? ` · ${items.length}` : ''}</h3>
      {loading ? (
        <p className="muted">加载中…</p>
      ) : items.length === 0 ? (
        <p className="muted">暂无证据（空库空列表）</p>
      ) : (
        <ul className="bh-simple-list">
          {items.map((it) => (
            <li key={it.id} style={{ marginBottom: 12 }}>
              <strong>{it.customer}</strong>
              <span className="muted"> · {typeLabel(it.evidence_type)} · {it.target_stage} · {it.status}</span>
              {it.summary ? <div className="muted" style={{ marginTop: 4 }}>{it.summary}</div> : null}
              {it.status === 'open' ? (
                <button type="button" className="btn btn-ghost" style={{ marginTop: 6 }} onClick={() => void verify(it.id)}>
                  标记已核验
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
