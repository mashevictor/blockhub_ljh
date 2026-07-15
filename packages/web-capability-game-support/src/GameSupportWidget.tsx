import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  title: string
  content: string
  player_name: string
  status: string
  reporter_name?: string
}

const STEPS = ['类型', '标题', '内容'] as const

export function GameSupportWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [category, setCategory] = useState<'faq' | 'ticket'>('ticket')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#a855f7'
  const openCount = items.filter((t) => t.status === 'open').length

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/game-support/records${q}`, token)
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
    if (!token || !title.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/game-support/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category,
          title: title.trim(),
          content: content.trim(),
          player_name: playerName.trim() || user?.display_name || '',
          app_public_id: appId || '',
        }),
      })
      setTitle('')
      setContent('')
      setPlayerName('')
      setCategory('ticket')
      setStep(0)
      setMsg(category === 'faq' ? 'FAQ 已入库' : '客服工单已提交')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const closeRec = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/game-support/records/${id}/close`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`关闭失败：${String(e)}`)
    }
  }

  return (
    <div className="widget bh-flow-form" style={{ ['--accent' as string]: accent }}>
      <div className="bh-flow-head">
        <h3>{entrySource === 'im' ? '玩家支持协作' : '玩家 FAQ / 工单'}</h3>
        <span className="bh-flow-meta">{entrySource === 'im' ? '群消息入口' : '应用工作台'}</span>
      </div>
      <p className="muted">
        FAQ/工单入库 → 跟进 → 关闭
        {user?.display_name ? ` · ${user.display_name}` : ''}
      </p>
      <ol className="bh-process-flow">
        <li className={showForm ? 'is-active' : 'is-done'}>① 提交</li>
        <span className="arrow" aria-hidden>→</span>
        <li className={openCount ? 'is-active' : ''}>② 处理中{openCount ? `（${openCount}）` : ''}</li>
        <span className="arrow" aria-hidden>→</span>
        <li>③ 已关闭</li>
      </ol>

      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建 FAQ / 工单</button>
      ) : (
        <>
          <div className="bh-flow-steps">
            {STEPS.map((label, i) => (
              <div key={label} className={`bh-flow-step${i === step ? ' is-active' : ''}${i < step ? ' is-done' : ''}`}>
                <span className="bh-flow-dot" style={i <= step ? { background: accent } : undefined} />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="bh-flow-body">
            {step === 0 && (
              <>
                <div className="row-actions">
                  <button type="button" className={category === 'faq' ? 'btn' : 'btn btn-ghost'} style={category === 'faq' ? { background: accent } : undefined} onClick={() => setCategory('faq')}>FAQ/攻略</button>
                  <button type="button" className={category === 'ticket' ? 'btn' : 'btn btn-ghost'} style={category === 'ticket' ? { background: accent } : undefined} onClick={() => setCategory('ticket')}>客服工单</button>
                </div>
                <label>玩家昵称（可选）
                  <input className="input" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder={user?.display_name || ''} />
                </label>
              </>
            )}
            {step === 1 && (
              <label>标题
                <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="活动规则 / 掉线反馈…" autoFocus />
              </label>
            )}
            {step === 2 && (
              <label>详细内容
                <textarea className="input" rows={4} value={content} onChange={(e) => setContent(e.target.value)} placeholder="规则说明或问题复现步骤…" autoFocus />
              </label>
            )}
            <div className="bh-flow-actions">
              {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>上一步</button>}
              {step < 2 ? (
                <button type="button" className="btn" style={{ background: accent }} disabled={step === 1 && !title.trim()} onClick={() => setStep((s) => s + 1)}>下一步</button>
              ) : (
                <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>{busy ? '提交中…' : '提交'}</button>
              )}
            </div>
          </div>
        </>
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>记录</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.title}</strong>
              <span className="tag">{t.category === 'faq' ? 'FAQ' : '工单'} · {t.status === 'open' ? '处理中' : '已关闭'}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.player_name} · {t.reporter_name || '—'}</p>
            {t.content && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.content}</p>}
            {t.status === 'open' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void closeRec(t.id)}>关闭</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
