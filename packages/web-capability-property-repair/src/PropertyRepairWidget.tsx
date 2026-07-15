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
  done: '已完工',
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
  const openItems = items.filter((t) => t.status === 'open')
  const busyItems = items.filter((t) => t.status === 'dispatched')
  const doneItems = items.filter((t) => t.status === 'done')
  const processActive =
    openItems.length > 0 ? 1 : busyItems.length > 0 ? 2 : doneItems.length > 0 ? 3 : showForm ? 0 : 0

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'location', label: '楼栋 / 房号', placeholder: '例如：3号楼·502' },
      { key: 'asset_name', label: '报修对象', placeholder: '电梯 / 门禁 / 水管…' },
      { key: 'fault', label: '故障现象', placeholder: '渗水、异响、无法开门…' },
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
      setShowForm(false)
      setMsg('业主报修已提交，等待派工')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const advance = async (id: string, action: 'dispatch' | 'done') => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/property-repair/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`操作失败：${String(e)}`)
    }
  }

  return (
    <div>
      <p className="muted" style={{ marginBottom: 4 }}>物业报修流程</p>
      <ol className="bh-process-flow" aria-label="物业报修流程">
        <li className={processActive === 0 && showForm ? 'is-active' : processActive > 0 ? 'is-done' : ''}>① 业主提单</li>
        <span className="arrow" aria-hidden>
          →
        </span>
        <li className={processActive === 1 ? 'is-active' : processActive > 1 ? 'is-done' : ''}>
          ② 派工{openItems.length ? `（${openItems.length}）` : ''}
        </li>
        <span className="arrow" aria-hidden>
          →
        </span>
        <li className={processActive === 2 ? 'is-active' : processActive > 2 ? 'is-done' : ''}>
          ③ 维修{busyItems.length ? `（${busyItems.length}）` : ''}
        </li>
        <span className="arrow" aria-hidden>
          →
        </span>
        <li className={processActive === 3 ? 'is-done' : ''}>④ 完工</li>
      </ol>

      {showForm || items.length === 0 ? (
        <GtgtStepComposer
          title={entrySource === 'im' ? '物业报修协作' : '业主报修'}
          meta={user?.display_name || '业主'}
          accent={accent}
          flowHint="位置 → 对象 → 故障 → 派工维修"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交报修"
        />
      ) : (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>
          + 新建报修
        </button>
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待派工</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && openItems.length === 0 && <p className="muted">暂无待派工</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {openItems.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>
                {t.asset_name} · {t.location}
              </strong>
              <span className="tag">{STATUS_LABEL[t.status]}</span>
            </div>
            <p style={{ margin: '8px 0 0', fontSize: 13 }}>{t.fault}</p>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
              {t.reporter_name || '业主'} · {t.record_no}
            </p>
            <button type="button" className="btn" style={{ background: accent, marginTop: 10 }} onClick={() => void advance(t.id, 'dispatch')}>
              派给师傅
            </button>
          </li>
        ))}
      </ul>

      {busyItems.length > 0 && (
        <>
          <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>维修中</h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {busyItems.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>
                    {t.asset_name} · {t.location}
                  </strong>
                  <span className="tag">维修中</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>{t.fault}</p>
                <button type="button" className="btn" style={{ background: accent, marginTop: 10 }} onClick={() => void advance(t.id, 'done')}>
                  确认完工
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {doneItems.length > 0 && (
        <>
          <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>已完工 · {doneItems.length}</h4>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {doneItems.slice(0, 6).map((t) => (
              <li key={t.id} className="list-card" style={{ opacity: 0.85 }}>
                <strong>
                  {t.asset_name} · {t.location}
                </strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
