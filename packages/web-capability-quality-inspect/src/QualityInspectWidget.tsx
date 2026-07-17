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
}

const PROCESSES = ['来料检', '工序检', '成品检', '出货检']

export function QualityInspectWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({ process_name: PROCESSES[0], result: 'pass' })
  const [resetKey, setResetKey] = useState(0)
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#b45309'

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'product_code',
        label: '产品编码 / 批次',
        placeholder: 'LOT-2026-0412',
        hint: '填写批号或产品编码，便于追溯。',
      },
      {
        key: 'process_name',
        label: '检验点',
        hint: '点选检验类型。',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions" style={{ flexWrap: 'wrap' }}>
            {PROCESSES.map((p) => (
              <button
                key={p}
                type="button"
                className={(value || PROCESSES[0]) === p ? 'btn' : 'btn btn-ghost'}
                style={(value || PROCESSES[0]) === p ? { background: a, fontSize: 12 } : { fontSize: 12 }}
                onClick={() => setValue(p)}
              >
                {p}
              </button>
            ))}
          </div>
        ),
      },
      {
        key: 'result',
        label: '判定结果',
        hint: '合格或不合格；不合格可在下一步写备注。',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {(
              [
                ['pass', '合格'],
                ['fail', '不合格'],
              ] as const
            ).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={(value || 'pass') === k ? 'btn' : 'btn btn-ghost'}
                style={(value || 'pass') === k ? { background: a } : undefined}
                onClick={() => setValue(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        ),
      },
      {
        key: 'note',
        label: '备注（可空）',
        optional: true,
        inputType: 'textarea',
        placeholder: '不合格原因 / 复检说明…',
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/quality-inspect/records${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setMsg(String(e))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  useEffect(() => {
    void load()
  }, [load])

  const submit = async () => {
    if (!token || !values.product_code?.trim()) {
      setMsg('请填写产品批号/编码')
      return
    }
    setBusy(true)
    setMsg('')
    const result = values.result === 'fail' ? 'fail' : 'pass'
    try {
      await apiFetch('/api/v1/quality-inspect/records', token, {
        method: 'POST',
        body: JSON.stringify({
          product_code: values.product_code.trim(),
          process_name: values.process_name || PROCESSES[0],
          result,
          note: (values.note || '').trim() || (result === 'fail' ? '不合格，待复检' : ''),
          app_public_id: appId || '',
        }),
      })
      setValues({ process_name: PROCESSES[0], result: 'pass' })
      setResetKey((k) => k + 1)
      setMsg(result === 'pass' ? '已判定合格（真库）' : '已判定不合格（真库）')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const close = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/quality-inspect/records/${id}/close`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <GtgtStepComposer
        title="质检判定"
        meta="Gtgt · Soft"
        accent={accent}
        variant="soft"
        flowHint="批号 → 检验点 → 判定 → 备注（可跳过）"
        steps={steps}
        values={values}
        onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onComplete={submit}
        busy={busy}
        resetKey={resetKey}
        submitLabel="提交判定"
      />
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待结案{open.length ? ` · ${open.length}` : ''}</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && open.length === 0 && <p className="muted">空库无待结案</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {open.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>
                {t.product_code} · {t.process_name}
              </strong>
              <span className="tag">{t.result === 'pass' ? '合格' : '不合格'}</span>
            </div>
            {t.note ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.note}</p> : null}
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void close(t.id)}>
              结案
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
