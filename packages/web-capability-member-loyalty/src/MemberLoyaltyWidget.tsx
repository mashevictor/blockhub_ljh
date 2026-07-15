import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  member_name: string
  member_phone: string
  campaign_name: string
  points: number
  note: string
  status: string
  reporter_name?: string
}

const STEPS = ['会员', '活动', '积分'] as const

export function MemberLoyaltyWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState(0)
  const [memberName, setMemberName] = useState('')
  const [phone, setPhone] = useState('')
  const [campaign, setCampaign] = useState('')
  const [points, setPoints] = useState('100')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const accent = primaryColor || '#fb923c'
  const pending = items.filter((t) => t.status === 'pending').length

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/member-loyalty/records${q}`, token)
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
    if (!token || !memberName.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/member-loyalty/records', token, {
        method: 'POST',
        body: JSON.stringify({
          member_name: memberName.trim(),
          member_phone: phone.trim(),
          campaign_name: campaign.trim(),
          points: Number(points) || 0,
          note: note.trim(),
          app_public_id: appId || '',
        }),
      })
      setMemberName('')
      setPhone('')
      setCampaign('')
      setPoints('100')
      setNote('')
      setStep(0)
      setMsg('已入库 · 待确认触达（可推 IM）')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const markSent = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/member-loyalty/records/${id}/send`, token, { method: 'POST', body: '{}' })
      await load()
    } catch (e) {
      setMsg(`确认失败：${String(e)}`)
    }
  }

  return (
    <div className="widget bh-flow-form" style={{ ['--accent' as string]: accent }}>
      <div className="bh-flow-head">
        <h3>{entrySource === 'im' ? '会员营销协作' : '会员营销'}</h3>
        <span className="bh-flow-meta">{entrySource === 'im' ? '群消息入口' : '应用工作台'}</span>
      </div>
      <p className="muted">
        登记活动 → 确认触达 → IM 推送
        {user?.display_name ? ` · ${user.display_name}` : ''}
      </p>
      <ol className="bh-process-flow">
        <li className={showForm ? 'is-active' : 'is-done'}>① 登记</li>
        <span className="arrow" aria-hidden>→</span>
        <li className={pending ? 'is-active' : ''}>② 待触达{pending ? `（${pending}）` : ''}</li>
        <span className="arrow" aria-hidden>→</span>
        <li>③ 已发送</li>
      </ol>

      {!showForm ? (
        <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>新建营销记录</button>
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
                <label>会员姓名
                  <input className="input" value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="张三" autoFocus />
                </label>
                <label>手机号（可选）
                  <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="138****" />
                </label>
              </>
            )}
            {step === 1 && (
              <label>活动 / 券码名称
                <input className="input" value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="暑期双倍积分 / 新客券" autoFocus />
              </label>
            )}
            {step === 2 && (
              <>
                <label>积分
                  <input className="input" type="number" min={0} value={points} onChange={(e) => setPoints(e.target.value)} />
                </label>
                <label>备注
                  <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="渠道、门店…" />
                </label>
              </>
            )}
            <div className="bh-flow-actions">
              {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>上一步</button>}
              {step < 2 ? (
                <button type="button" className="btn" style={{ background: accent }} disabled={step === 0 && !memberName.trim()} onClick={() => setStep((s) => s + 1)}>下一步</button>
              ) : (
                <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>{busy ? '提交中…' : '提交登记'}</button>
              )}
            </div>
          </div>
        </>
      )}
      {msg && <p className="status-msg">{msg}</p>}

      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>营销记录</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无记录</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.record_no} · {t.member_name}</strong>
              <span className="tag">{t.status === 'pending' ? '待触达' : '已发送'} · {t.points} 分</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.campaign_name} · {t.reporter_name || '—'}</p>
            {t.note && <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.note}</p>}
            {t.status === 'pending' && (
              <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void markSent(t.id)}>确认已触达</button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
