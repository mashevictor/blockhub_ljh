import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormFieldDef, SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, resolveFormSteps, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  site_name: string
  checkpoint: string
  result: string
  note: string
  status: string
}

const POINTS = ['客户前台', '会议室', '展厅', '大门', '电梯厅', '停车场']

export function SitePatrolWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const formHeadline = String(node.props?.form_headline || '外勤签到')
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({ checkpoint: POINTS[0], result: 'ok' })
  const [resetKey, setResetKey] = useState(0)
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#15803d'

  const steps: GtgtStep[] = useMemo(() => {
    const defaults: FormFieldDef[] = [
      { key: 'site_name', label: '客户 / 地点', placeholder: '客户名称或拜访地址' },
      { key: 'checkpoint', label: '打卡点' },
      { key: 'result', label: '拜访结果' },
      { key: 'note', label: '备注（可空）', placeholder: '拜访说明', type: 'textarea', optional: true },
    ]
    const resolved = resolveFormSteps({
      defaults,
      formFields: node.props?.form_fields,
      pageMockFields: (node.props?.page_mock as { fields?: unknown } | undefined)?.fields,
    })
    return resolved.map((s) => {
      if (s.key === 'checkpoint') {
        return {
          ...s,
          render: ({ value, setValue, accent: a }) => (
            <div className="row-actions" style={{ flexWrap: 'wrap' }}>
              {POINTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={(value || POINTS[0]) === p ? 'btn' : 'btn btn-ghost'}
                  style={(value || POINTS[0]) === p ? { background: a, fontSize: 12 } : { fontSize: 12 }}
                  onClick={() => setValue(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          ),
        }
      }
      if (s.key === 'result') {
        return {
          ...s,
          render: ({ value, setValue, accent: a }) => (
            <div className="row-actions">
              {(
                [
                  ['ok', '已拜访'],
                  ['issue', '待跟进'],
                ] as const
              ).map(([k, lab]) => (
                <button
                  key={k}
                  type="button"
                  className={(value || 'ok') === k ? 'btn' : 'btn btn-ghost'}
                  style={(value || 'ok') === k ? { background: a } : undefined}
                  onClick={() => setValue(k)}
                >
                  {lab}
                </button>
              ))}
            </div>
          ),
        }
      }
      return s
    })
  }, [node.props?.form_fields, node.props?.page_mock])

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/site-patrol/records${q}`, token)
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
    const site = (values.site_name || values.site || values.customer || values.location || '').trim()
    if (!token || !site) {
      setMsg('请先填写客户 / 地点')
      return
    }
    setBusy(true)
    setMsg('')
    const result = values.result === 'issue' ? 'issue' : 'ok'
    try {
      await apiFetch('/api/v1/site-patrol/records', token, {
        method: 'POST',
        body: JSON.stringify({
          site_name: site,
          checkpoint: values.checkpoint || POINTS[0],
          result,
          note: (values.note || values.remark || '').trim() || (result === 'issue' ? '待跟进' : ''),
          app_public_id: appId || '',
        }),
      })
      setValues({ checkpoint: POINTS[0], result: 'ok' })
      setResetKey((k) => k + 1)
      setMsg(result === 'ok' ? '已签到（真库）' : '已记录待跟进（真库）')
      await load()
    } catch (e) {
      setMsg(String(e))
    } finally {
      setBusy(false)
    }
  }

  const close = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/site-patrol/records/${id}/close`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <GtgtStepComposer
        title={formHeadline}
        meta="Gtgt · Soft"
        accent={accent}
        variant="soft"
        flowHint=">> 单字段推进 → 提交真库"
        steps={steps}
        values={values}
        onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onComplete={submit}
        busy={busy}
        resetKey={resetKey}
        submitLabel="提交签到"
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
                {t.site_name} · {t.checkpoint}
              </strong>
              <span className="tag">{t.result === 'ok' ? '合格' : '隐患'}</span>
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
