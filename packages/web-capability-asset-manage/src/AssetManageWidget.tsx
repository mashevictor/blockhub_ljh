import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  asset_name: string
  asset_code: string
  quantity: string
  note: string
  status: string
  reporter_name?: string
}

const CAT_LABEL: Record<string, string> = {
  borrow: '领用',
  return: '归还',
  inventory: '盘点',
  scrap: '报废',
}

const STATUS_LABEL: Record<string, string> = {
  open: '待审批',
  approved: '已通过',
  rejected: '已驳回',
  returned: '已归还',
  done: '已完成',
}

export function AssetManageWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'borrow', quantity: '1' })
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#ca8a04'
  const open = items.filter((t) => t.status === 'open' || t.status === 'approved')

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '业务类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {(
              [
                ['borrow', '领用'],
                ['return', '归还'],
                ['inventory', '盘点'],
                ['scrap', '报废'],
              ] as const
            ).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={(value || 'borrow') === k ? 'btn' : 'btn btn-ghost'}
                style={(value || 'borrow') === k ? { background: a } : undefined}
                onClick={() => setValue(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        ),
      },
      { key: 'asset_name', label: '资产名称', placeholder: '如：ThinkPad X1 / 投影仪' },
      { key: 'asset_code', label: '资产编号（可空）', placeholder: 'FA-2026-001', optional: true },
      { key: 'quantity', label: '数量', placeholder: '1' },
      { key: 'note', label: '说明（可空）', placeholder: '用途 / 存放地…', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/asset-manage/records${q}`, token)
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
    if (!token || !values.asset_name?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/asset-manage/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: values.category || 'borrow',
          asset_name: values.asset_name.trim(),
          asset_code: (values.asset_code || '').trim(),
          quantity: (values.quantity || '1').trim(),
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'borrow', quantity: '1' })
      setResetKey((k) => k + 1)
      setMsg('已提交')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/asset-manage/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16 }}>
        <GtgtStepComposer
          title="资产管理"
          meta={user?.display_name || '申请人'}
          accent={accent}
          flowHint="选类型 → 资产信息 → 写入数据库"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交申请"
        />
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>资产单据 {open.length ? `· ${open.length}` : ''}</h4>
          {loading && <p className="muted">加载中…</p>}
          {!loading && open.length === 0 && <p className="muted">暂无单据，提交后写入数据库</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {open.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>
                    {CAT_LABEL[t.category] || t.category} · {t.asset_name}
                  </strong>
                  <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
                </div>
                <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                  {t.asset_code || '无编号'} · ×{t.quantity}
                </p>
                <div className="row-actions" style={{ marginTop: 12 }}>
                  {t.status === 'open' && (
                    <>
                      <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'approved')}>
                        通过
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'rejected')}>
                        驳回
                      </button>
                    </>
                  )}
                  {t.status === 'approved' && t.category === 'borrow' && (
                    <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'returned')}>
                      确认归还
                    </button>
                  )}
                  {t.status === 'approved' && (
                    <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'done')}>
                      完成
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
