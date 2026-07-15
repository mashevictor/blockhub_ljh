import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  candidate: string
  stage: string
  owner: string
  note: string
  status: string
  reporter_name?: string
}

const STATUS_LABEL: Record<string, string> = {
  open: '待处理',
  interview: 'interview',
  offered: 'offered',
  joined: 'joined',
}

export function HireOnboardWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'job' })
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#a855f7'
  const openCount = items.filter((t) => t.status === 'open').length

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '环节',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            <button type="button" className={(value || 'job') === 'job' ? 'btn' : 'btn btn-ghost'} style={(value || 'job') === 'job' ? { background: a } : undefined} onClick={() => setValue('job')}>岗位</button>
            <button type="button" className={(value || 'job') === 'resume' ? 'btn' : 'btn btn-ghost'} style={(value || 'job') === 'resume' ? { background: a } : undefined} onClick={() => setValue('resume')}>简历</button>
            <button type="button" className={(value || 'job') === 'onboard' ? 'btn' : 'btn btn-ghost'} style={(value || 'job') === 'onboard' ? { background: a } : undefined} onClick={() => setValue('onboard')}>入职</button>
          </div>
        ),
      },
      { key: 'candidate', label: '候选人/岗位', placeholder: '候选人/岗位' },
      { key: 'stage', label: '阶段', placeholder: '阶段', optional: true },
      { key: 'owner', label: '负责人', placeholder: '负责人', optional: true },
      { key: 'note', label: '备注', placeholder: '备注', optional: true },
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
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/hire-onboard/records${q}`, token)
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
    if (!token || !values.candidate?.trim()) return
    setBusy(true)
    setMsg('')
    const category = values.category || 'job'
    try {
      await apiFetch('/api/v1/hire-onboard/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category,
          candidate: (values.candidate || '').trim(),
          stage: (values.stage || '').trim(),
          owner: (values.owner || '').trim(),
          note: (values.note || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'job' })
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
      await apiFetch(`/api/v1/hire-onboard/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建招聘入职</button>
      ) : (
        <GtgtStepComposer
          title={entrySource === 'im' ? '招聘入职协作' : '招聘入职'}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`登记 → 状态跟进闭环${user?.display_name ? ` · ${user.display_name}` : ''}${openCount ? ` · 待处理 ${openCount}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交"
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>招聘入职列表</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {(t as any).candidate || t.category}</strong>
              <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.category}{t.note ? ` · ${t.note}` : ''}</p>
            {t.status !== 'interview' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'interview')}>面试</button>
            )}
            {t.status !== 'offered' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'offered')}>Offer</button>
            )}
            {t.status !== 'joined' && t.status !== 'done' && t.status !== 'closed' && t.status !== 'cancelled' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12, marginRight: 8 }} onClick={() => void advance(t.id, 'joined')}>已入职</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
