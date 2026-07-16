import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface TicketItem {
  id: string
  ticket_no: string
  category: string
  title: string
  detail: string
  urgency: string
  status: string
  reporter_name?: string
}

const CAT_LABEL: Record<string, string> = {
  hardware: '硬件',
  network: '网络',
  account: '账号权限',
  software: '软件',
  other: '其他',
}

const STATUS_LABEL: Record<string, string> = {
  open: '待受理',
  processing: '处理中',
  done: '已解决',
  closed: '已关闭',
}

export function ItTicketWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<TicketItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ category: 'hardware', urgency: 'medium' })
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#0ea5e9'

  const open = items.filter((t) => t.status === 'open' || t.status === 'processing')

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'category',
        label: '报障类型',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {(
              [
                ['hardware', '硬件'],
                ['network', '网络'],
                ['account', '账号'],
                ['software', '软件'],
                ['other', '其他'],
              ] as const
            ).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={(value || 'hardware') === k ? 'btn' : 'btn btn-ghost'}
                style={(value || 'hardware') === k ? { background: a } : undefined}
                onClick={() => setValue(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        ),
      },
      { key: 'title', label: '问题标题', placeholder: '如：无法连接公司 VPN' },
      { key: 'detail', label: '现象描述（可空）', placeholder: '出错时间、报错截图说明…', optional: true },
      {
        key: 'urgency',
        label: '紧急程度',
        render: ({ value, setValue, accent: a }) => (
          <div className="row-actions">
            {(
              [
                ['low', '低'],
                ['medium', '中'],
                ['high', '高'],
              ] as const
            ).map(([k, lab]) => (
              <button
                key={k}
                type="button"
                className={(value || 'medium') === k ? 'btn' : 'btn btn-ghost'}
                style={(value || 'medium') === k ? { background: a } : undefined}
                onClick={() => setValue(k)}
              >
                {lab}
              </button>
            ))}
          </div>
        ),
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
      const data = await apiFetch<{ items: TicketItem[] }>(`/api/v1/it-ticket/tickets${q}`, token)
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
    if (!token || !values.title?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/it-ticket/tickets', token, {
        method: 'POST',
        body: JSON.stringify({
          category: values.category || 'hardware',
          title: values.title.trim(),
          detail: (values.detail || '').trim(),
          urgency: values.urgency || 'medium',
          app_public_id: appId || '',
        }),
      })
      setValues({ category: 'hardware', urgency: 'medium' })
      setResetKey((k) => k + 1)
      setMsg('已提单，等待 IT 受理')
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
      await apiFetch(`/api/v1/it-ticket/tickets/${id}/${action}`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`更新失败：${String(e)}`)
    }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(280px, 1fr)', gap: 16 }}>
        <GtgtStepComposer
          title="IT 报障"
          meta={entrySource === 'im' ? '群消息入口' : user?.display_name || '提单人'}
          accent={accent}
          flowHint="选类型 → 写标题 → 选紧急度 → 写入数据库"
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel="提交报障"
        />
        <div>
          <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>在办工单 {open.length ? `· ${open.length}` : ''}</h4>
          {loading && <p className="muted">加载中…</p>}
          {!loading && open.length === 0 && <p className="muted">暂无工单，提交后写入数据库</p>}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
            {open.map((t) => (
              <li key={t.id} className="list-card">
                <div className="list-card-head">
                  <strong>
                    {t.ticket_no} · {CAT_LABEL[t.category] || t.category}
                  </strong>
                  <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 13 }}>{t.title}</p>
                {t.detail ? <p className="muted" style={{ margin: '4px 0 0' }}>{t.detail}</p> : null}
                <div className="row-actions" style={{ marginTop: 12 }}>
                  {t.status === 'open' && (
                    <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'processing')}>
                      受理
                    </button>
                  )}
                  {t.status === 'processing' && (
                    <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'done')}>
                      已解决
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'closed')}>
                    关闭
                  </button>
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
