import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  customer: string
  kill_reason: string
  learning: string
  amount_lost: string
  competitor: string
  status: string
  reporter_name?: string
}

interface ReasonStat {
  name: string
  value: number
  reason: string
}

const REASON_OPTS: { value: string; label: string }[] = [
  { value: 'no_budget', label: '无预算' },
  { value: 'no_authority', label: '无决策权' },
  { value: 'competitor', label: '竞品' },
  { value: 'timing', label: '时机不对' },
  { value: 'product_fit', label: '产品不适配' },
  { value: 'fake_pipeline', label: '假管线' },
  { value: 'other', label: '其他' },
]

export function KillPipelineWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [reasons, setReasons] = useState<ReasonStat[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#b91c1c'

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'customer', label: '客户名称', placeholder: '要清理的商机客户' },
      {
        key: 'kill_reason',
        label: '杀单原因',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions" style={{ flexWrap: 'wrap', gap: 8 }}>
            {REASON_OPTS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={value === o.value ? 'btn' : 'btn btn-ghost'}
                style={value === o.value ? { background: a } : undefined}
                onClick={() => setValue(o.value)}
              >
                {o.label}
              </button>
            ))}
          </div>
        ),
      },
      {
        key: 'learning',
        label: '可复用教训',
        inputType: 'textarea',
        placeholder: '下次如何早发现？哪些信号被忽略？',
      },
      {
        key: 'amount_lost',
        label: '损失金额（可空）',
        optional: true,
        placeholder: '预估管线金额',
      },
      {
        key: 'competitor',
        label: '竞对（可空）',
        optional: true,
        placeholder: '若因竞品丢失',
      },
    ],
    [],
  )

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setReasons([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const [listData, reasonData] = await Promise.all([
        apiFetch<{ items: RecordItem[] }>(`/api/v1/kill-pipeline/records${q}`, token),
        apiFetch<{ items: ReasonStat[] }>(`/api/v1/kill-pipeline/reasons${q}`, token),
      ])
      setItems(listData.items || [])
      setReasons(reasonData.items || [])
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
      setItems([])
      setReasons([])
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
      await apiFetch('/api/v1/kill-pipeline/records', token, {
        method: 'POST',
        body: JSON.stringify({
          customer,
          kill_reason: values.kill_reason || 'other',
          learning: (values.learning || '').trim(),
          amount_lost: (values.amount_lost || '').trim(),
          competitor: (values.competitor || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('已杀单并回写线索为丢单')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const reasonLabel = (r: string) => REASON_OPTS.find((o) => o.value === r)?.label || r

  return (
    <div className="bh-flow-body">
      <GtgtStepComposer
        title="杀单工作台"
        flowHint="结构化丢单 · 清理假管线"
        accent={accent}
        steps={steps}
        values={values}
        onChange={(k, v) => setValues((prev) => ({ ...prev, [k]: v }))}
        onComplete={() => void submit()}
        busy={busy}
        resetKey={resetKey}
        submitLabel="确认杀单"
      />
      {msg ? <p className="muted" style={{ marginTop: 8 }}>{msg}</p> : null}
      {reasons.length > 0 ? (
        <p className="muted" style={{ marginTop: 12 }}>
          原因分布：{reasons.map((r) => `${r.name} ${r.value}`).join(' · ')}
        </p>
      ) : null}
      <h3 style={{ marginTop: 20 }}>杀单台账{items.length ? ` · ${items.length}` : ''}</h3>
      {loading ? (
        <p className="muted">加载中…</p>
      ) : items.length === 0 ? (
        <p className="muted">暂无杀单（空库空列表）</p>
      ) : (
        <ul className="bh-simple-list">
          {items.map((it) => (
            <li key={it.id} style={{ marginBottom: 12 }}>
              <strong>{it.customer}</strong>
              <span className="muted"> · {reasonLabel(it.kill_reason)}{it.amount_lost ? ` · ${it.amount_lost}` : ''}</span>
              {it.learning ? <div className="muted" style={{ marginTop: 4 }}>{it.learning}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
