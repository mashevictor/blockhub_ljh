import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  site_name: string
  checkpoint: string
  result: string
  note: string
  status: string
  reporter_name?: string
}

const RESULT_LABEL: Record<string, string> = { ok: '合格', issue: '隐患' }

export function SitePatrolWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ result: 'ok' })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#059669'
  const openCount = items.filter((t) => t.status === 'open').length

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'site_name', label: '站点', placeholder: '配电房/消防通道…' },
      { key: 'checkpoint', label: '打卡点', placeholder: 'A区-3号位', optional: true },
      {
        key: 'result',
        label: '巡检结果',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            <button type="button" className={value !== 'issue' ? 'btn' : 'btn btn-ghost'} style={value !== 'issue' ? { background: a } : undefined} onClick={() => setValue('ok')}>合格</button>
            <button type="button" className={value === 'issue' ? 'btn' : 'btn btn-ghost'} style={value === 'issue' ? { background: '#b91c1c' } : undefined} onClick={() => setValue('issue')}>隐患</button>
          </div>
        ),
      },
      { key: 'note', label: '备注', placeholder: '现场情况…', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/site-patrol/records${q}`, token)
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
    if (!token || !values.site_name?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/site-patrol/records', token, {
        method: 'POST',
        body: JSON.stringify({
          site_name: values.site_name.trim(),
          checkpoint: (values.checkpoint || '').trim(),
          result: values.result === 'issue' ? 'issue' : 'ok',
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ result: 'ok' })
      setResetKey((k) => k + 1)
      setMsg('巡检记录已入库')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const close = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/site-patrol/records/${id}/close`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`结案失败：${String(e)}`)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建巡检</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '巡检协作' : '巡检打卡'}
          meta={entrySource === 'im' ? '群入口' : '工作台'}
          accent={accent}
          flowHint={`站点 → 打卡 → 结论${user?.display_name ? ` · ${user.display_name}` : ''}${openCount ? ` · 待结案 ${openCount}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交巡检"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>巡检记录</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.site_name}</strong>
              <span className="tag">{RESULT_LABEL[t.result] || t.result} · {t.status === 'open' ? '进行中' : '已结案'}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.checkpoint || '—'} · {t.reporter_name || '—'}</p>
            {t.note && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.note}</p>}
            {t.status === 'open' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void close(t.id)}>结案</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
