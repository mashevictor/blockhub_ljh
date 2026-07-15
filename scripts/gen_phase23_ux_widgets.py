# -*- coding: utf-8 -*-
"""Generate Phase2/3 domain-specific CapShip web widgets (no Gtgt clone)."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def w(rel: str, content: str) -> None:
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.lstrip("\n"), encoding="utf-8")
    print("wrote", rel)


w(
    "packages/web-capability-site-patrol/src/SitePatrolWidget.tsx",
    r'''
import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  site_name: string
  checkpoint: string
  result: string
  note: string
  status: string
}

const POINTS = ['大门', '电梯厅', '消防通道', '配电间', '楼顶', '地下室']

export function SitePatrolWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [siteName, setSiteName] = useState('')
  const [checkpoint, setCheckpoint] = useState(POINTS[0])
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#15803d'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/site-patrol/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const punch = async (result: 'ok' | 'issue') => {
    if (!token || !siteName.trim()) { setMsg('请先填写巡逻站点'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/site-patrol/records', token, {
        method: 'POST',
        body: JSON.stringify({
          site_name: siteName.trim(), checkpoint, result,
          note: result === 'issue' ? '发现隐患，待跟进' : '',
          app_public_id: appId || '',
        }),
      })
      setMsg(result === 'ok' ? '已打卡：合格' : '已记录隐患')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const close = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/site-patrol/records/${id}/close`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>巡检打卡</h4>
      <input className="input" style={{ width: '100%', marginBottom: 8 }} placeholder="站点名称，如：A区物业" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
      <p className="muted" style={{ fontSize: 12, margin: '0 0 6px' }}>打卡点</p>
      <div className="row-actions" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        {POINTS.map((p) => (
          <button key={p} type="button" className={checkpoint === p ? 'btn' : 'btn btn-ghost'} style={checkpoint === p ? { background: accent, fontSize: 12 } : { fontSize: 12 }} onClick={() => setCheckpoint(p)}>{p}</button>
        ))}
      </div>
      <div className="row-actions" style={{ marginBottom: 12 }}>
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void punch('ok')}>合格打卡</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void punch('issue')}>发现隐患</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待结案{open.length ? ` · ${open.length}` : ''}</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {open.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.site_name} · {t.checkpoint}</strong>
              <span className="tag">{t.result === 'ok' ? '合格' : '隐患'}</span>
            </div>
            {t.note ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.note}</p> : null}
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void close(t.id)}>结案</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
''',
)

w(
    "packages/web-capability-quality-inspect/src/QualityInspectWidget.tsx",
    r'''
import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

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
  const [product, setProduct] = useState('')
  const [processName, setProcessName] = useState(PROCESSES[0])
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#b45309'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/quality-inspect/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const judge = async (result: 'pass' | 'fail') => {
    if (!token || !product.trim()) { setMsg('请填写产品批号/编码'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/quality-inspect/records', token, {
        method: 'POST',
        body: JSON.stringify({
          product_code: product.trim(),
          process_name: processName,
          result,
          note: result === 'fail' ? '不合格，待复检' : '',
          app_public_id: appId || '',
        }),
      })
      setMsg(result === 'pass' ? '已判定合格' : '已判定不合格')
      setProduct('')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const close = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/quality-inspect/records/${id}/close`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>质检判定</h4>
      <input className="input" style={{ width: '100%', marginBottom: 8 }} placeholder="产品编码 / 批次号" value={product} onChange={(e) => setProduct(e.target.value)} />
      <div className="row-actions" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
        {PROCESSES.map((p) => (
          <button key={p} type="button" className={processName === p ? 'btn' : 'btn btn-ghost'} style={processName === p ? { background: accent, fontSize: 12 } : { fontSize: 12 }} onClick={() => setProcessName(p)}>{p}</button>
        ))}
      </div>
      <div className="row-actions" style={{ marginBottom: 12 }}>
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void judge('pass')}>合格</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => void judge('fail')}>不合格</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待闭环</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {open.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.product_code} · {t.process_name}</strong>
              <span className="tag">{t.result === 'pass' ? '合格' : '不合格'}</span>
            </div>
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void close(t.id)}>闭环归档</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
''',
)

w(
    "packages/web-capability-inventory-count/src/InventoryCountWidget.tsx",
    r'''
import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  location: string
  sku_code: string
  qty: string
  note: string
  status: string
}

export function InventoryCountWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [location, setLocation] = useState('')
  const [sku, setSku] = useState('')
  const [qty, setQty] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#0369a1'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/inventory-count/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !sku.trim()) { setMsg('请填写 SKU'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/inventory-count/records', token, {
        method: 'POST',
        body: JSON.stringify({
          location: location.trim() || '默认货位',
          sku_code: sku.trim(),
          qty: qty.trim() || '0',
          note: '',
          app_public_id: appId || '',
        }),
      })
      setSku(''); setQty(''); setMsg('已录入盘点行')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const confirm = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/inventory-count/records/${id}/confirm`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const pending = items.filter((t) => t.status === 'pending')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>扫码盘点</h4>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="货位（可空）" value={location} onChange={(e) => setLocation(e.target.value)} />
        <input className="input" placeholder="SKU / 条码" value={sku} onChange={(e) => setSku(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit() }} />
        <input className="input" placeholder="实盘数量" value={qty} onChange={(e) => setQty(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit() }} />
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>录入本行</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待确认入库{pending.length ? ` · ${pending.length}` : ''}</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {pending.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.sku_code}</strong>
              <span className="tag">×{t.qty}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.location}</p>
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void confirm(t.id)}>确认入库</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
''',
)

# --- house_viewing booking ---
w(
    "packages/web-capability-house-viewing/src/HouseViewingWidget.tsx",
    r'''
import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  client_name: string
  property_addr: string
  schedule_at: string
  note: string
  status: string
}

const CATS = [
  { k: 'viewing', l: '约看' },
  { k: 'intent', l: '意向' },
  { k: 'sign', l: '签约' },
]

const STATUS_LABEL: Record<string, string> = {
  open: '待看房',
  following: '跟进中',
  done: '已完成',
}

export function HouseViewingWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState('viewing')
  const [client, setClient] = useState('')
  const [addr, setAddr] = useState('')
  const [when, setWhen] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#c2410c'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/house-viewing/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !client.trim() || !addr.trim()) { setMsg('请填写客户与房源地址'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/house-viewing/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category, client_name: client.trim(), property_addr: addr.trim(),
          schedule_at: when.trim(), note: '', app_public_id: appId || '',
        }),
      })
      setClient(''); setAddr(''); setWhen(''); setMsg('已预约')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/house-viewing/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const active = items.filter((t) => t.status !== 'done')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>预约看房</h4>
      <div className="row-actions" style={{ marginBottom: 8 }}>
        {CATS.map((c) => (
          <button key={c.k} type="button" className={category === c.k ? 'btn' : 'btn btn-ghost'} style={category === c.k ? { background: accent } : undefined} onClick={() => setCategory(c.k)}>{c.l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="客户姓名" value={client} onChange={(e) => setClient(e.target.value)} />
        <input className="input" placeholder="房源地址" value={addr} onChange={(e) => setAddr(e.target.value)} />
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>确认预约</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>日程</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {active.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.client_name} · {t.property_addr}</strong>
              <span className="tag">{STATUS_LABEL[t.status] || t.status}</span>
            </div>
            {t.schedule_at ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.schedule_at}</p> : null}
            <div className="row-actions" style={{ marginTop: 8 }}>
              {t.status === 'open' && <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'following')}>开始跟进</button>}
              {t.status !== 'done' && <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'done')}>完成</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
''',
)

w(
    "packages/web-capability-class-schedule/src/ClassScheduleWidget.tsx",
    r'''
import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  title: string
  schedule_date: string
  time_slot: string
  location: string
  category: string
  status: string
}

const SLOTS = ['08:00-09:40', '10:00-11:40', '14:00-15:40', '16:00-17:40', '19:00-20:40']

export function ClassScheduleWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [slot, setSlot] = useState(SLOTS[0])
  const [location, setLocation] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#4f46e5'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/class-schedule/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !title.trim()) { setMsg('请填写课程名'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/class-schedule/records', token, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), schedule_date: date.trim(), time_slot: slot,
          location: location.trim(), category: 'course', app_public_id: appId || '',
        }),
      })
      setTitle(''); setMsg('已排入课表')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const archive = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/class-schedule/records/${id}/archive`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const live = items.filter((t) => t.status === 'published')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>排课</h4>
      <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
        <input className="input" placeholder="课程 / 考试名称" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="input" placeholder="教室（可空）" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>
      <div className="row-actions" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
        {SLOTS.map((s) => (
          <button key={s} type="button" className={slot === s ? 'btn' : 'btn btn-ghost'} style={slot === s ? { background: accent, fontSize: 11 } : { fontSize: 11 }} onClick={() => setSlot(s)}>{s}</button>
        ))}
      </div>
      <button type="button" className="btn" style={{ background: accent, marginBottom: 12 }} disabled={busy} onClick={() => void submit()}>加入课表</button>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>本周课表</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {live.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.title}</strong>
              <span className="tag">{t.time_slot || '时段待定'}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{[t.schedule_date, t.location].filter(Boolean).join(' · ')}</p>
            <button type="button" className="btn btn-ghost" style={{ marginTop: 8, fontSize: 12 }} onClick={() => void archive(t.id)}>归档</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
''',
)

w(
    "packages/web-capability-nurse-shift/src/NurseShiftWidget.tsx",
    r'''
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  nurse_name: string
  shift_date: string
  from_shift: string
  to_shift: string
  reason: string
  status: string
  reporter_name?: string
}

const SHIFTS = ['白班', '小夜', '大夜']

export function NurseShiftWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({ from_shift: '白班', to_shift: '小夜' })
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#be185d'

  const steps: GtgtStep[] = useMemo(() => [
    { key: 'shift_date', label: '调班日期', placeholder: '2026-07-20' },
    {
      key: 'from_shift', label: '原班次',
      render: ({ value, setValue, accent: a }) => (
        <div className="row-actions">{SHIFTS.map((s) => (
          <button key={s} type="button" className={(value || '白班') === s ? 'btn' : 'btn btn-ghost'} style={(value || '白班') === s ? { background: a } : undefined} onClick={() => setValue(s)}>{s}</button>
        ))}</div>
      ),
    },
    {
      key: 'to_shift', label: '目标班次',
      render: ({ value, setValue, accent: a }) => (
        <div className="row-actions">{SHIFTS.map((s) => (
          <button key={s} type="button" className={(value || '小夜') === s ? 'btn' : 'btn btn-ghost'} style={(value || '小夜') === s ? { background: a } : undefined} onClick={() => setValue(s)}>{s}</button>
        ))}</div>
      ),
    },
    { key: 'reason', label: '事由（可空）', optional: true, placeholder: '家事 / 培训…' },
  ], [])

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/nurse-shift/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !values.shift_date?.trim()) return
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/nurse-shift/records', token, {
        method: 'POST',
        body: JSON.stringify({
          nurse_name: user?.display_name || '',
          shift_date: values.shift_date.trim(),
          from_shift: values.from_shift || '白班',
          to_shift: values.to_shift || '小夜',
          reason: (values.reason || '').trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({ from_shift: '白班', to_shift: '小夜' }); setResetKey((k) => k + 1); setMsg('已提交调班')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/nurse-shift/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const pending = items.filter((t) => t.status === 'pending')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px,1fr) minmax(260px,1fr)', gap: 16 }}>
      <GtgtStepComposer title="我要调班" meta={user?.display_name || '护士'} accent={accent} flowHint="日期 → 原班 → 目标班 → 审批" steps={steps} values={values} onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))} onComplete={submit} busy={busy} resetKey={resetKey} submitLabel="提交调班" />
      <div>
        <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>待审批{pending.length ? ` · ${pending.length}` : ''}</h4>
        {loading && <p className="muted">加载中…</p>}
        {msg && <p className="status-msg">{msg}</p>}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {pending.map((t) => (
            <li key={t.id} className="list-card">
              <strong>{t.nurse_name || t.reporter_name || '同事'} · {t.shift_date}</strong>
              <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t.from_shift} → {t.to_shift}</p>
              <div className="row-actions" style={{ marginTop: 8 }}>
                <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'approve')}>通过</button>
                <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'reject')}>驳回</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
''',
)

# --- Phase3 long-tail ---

def kanban_widget(export_name: str, api: str, accent_def: str, columns: list[tuple[str, str, str | None]], create_fields_js: str, create_body_js: str, card_body_js: str, title: str) -> str:
    cols_js = ",\n  ".join(
        "{" + f" key: '{k}', label: '{lab}'" + (f", action: '{act}'" if act else "") + "}"
        for k, lab, act in columns
    )
    return f'''
import {{ useCallback, useEffect, useState }} from 'react'
import type {{ SchemaNode }} from '@blockhub/web-core'
import {{ apiFetch, useRuntime }} from '@blockhub/web-core'

interface RecordItem {{
  id: string
  record_no: string
  status: string
  [key: string]: string | undefined
}}

const COLUMNS = [
  {cols_js}
]

export function {export_name}(_props: {{ node: SchemaNode }}) {{
  const {{ token, primaryColor, appId, user }} = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
{create_fields_js}
  const accent = primaryColor || '{accent_def}'

  const load = useCallback(async () => {{
    if (!token) {{ setItems([]); setLoading(false); return }}
    setLoading(true)
    try {{
      const q = appId ? `?app_id=${{encodeURIComponent(appId)}}` : ''
      const data = await apiFetch<{{ items: RecordItem[] }}>(`/api/v1/{api}/records${{q}}`, token)
      setItems(data.items || [])
    }} catch (e) {{ setMsg(String(e)); setItems([]) }}
    finally {{ setLoading(false) }}
  }}, [token, appId])

  useEffect(() => {{ void load() }}, [load])

  const submit = async () => {{
    if (!token) return
    setBusy(true); setMsg('')
    try {{
      await apiFetch('/api/v1/{api}/records', token, {{
        method: 'POST',
        body: JSON.stringify({{ {create_body_js}, app_public_id: appId || '' }}),
      }})
      setMsg('已加入看板')
      await load()
    }} catch (e) {{ setMsg(String(e)) }}
    finally {{ setBusy(false) }}
  }}

  const moveTo = async (id: string, action: string) => {{
    if (!token) return
    await apiFetch(`/api/v1/{api}/records/${{id}}/${{action}}`, token, {{ method: 'POST', body: '{{}}' }})
    await load()
  }}

  return (
    <div>
      <h4 style={{{{ margin: '0 0 8px', fontSize: 14 }}}}>{title}</h4>
{create_fields_js and '''      <div className="list-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
'''}
      <!-- form injected below -->
      <div />
      {{msg && <p className="status-msg">{{msg}}</p>}}
      {{loading && <p className="muted">加载中…</p>}}
      <div style={{{{ display: 'grid', gridTemplateColumns: `repeat(${{COLUMNS.length}}, minmax(130px, 1fr))`, gap: 8, overflowX: 'auto' }}}}>
        {{COLUMNS.map((col) => {{
          const colItems = items.filter((t) => t.status === col.key)
          return (
            <div key={{col.key}}>
              <div style={{{{ fontWeight: 600, fontSize: 13, marginBottom: 8, padding: '6px 8px', borderRadius: 6, background: col.key === COLUMNS[0].key ? accent : 'rgba(0,0,0,0.06)', color: col.key === COLUMNS[0].key ? '#fff' : 'inherit' }}}}>
                {{col.label}} · {{colItems.length}}
              </div>
              <ul style={{{{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}}}>
                {{colItems.map((t) => (
                  <li key={{t.id}} className="list-card" style={{{{ padding: 10 }}}}>
                    {card_body_js}
                    <div className="row-actions" style={{{{ marginTop: 6, flexWrap: 'wrap' }}}}>
                      {{COLUMNS.filter((c) => c.action && c.key !== t.status).map((c) => (
                        <button key={{c.key}} type="button" className="btn btn-ghost" style={{{{ fontSize: 11, padding: '2px 6px' }}}} onClick={{() => void moveTo(t.id, c.action!)}}>→{{c.label}}</button>
                      ))}}
                    </div>
                  </li>
                ))}}
              </ul>
            </div>
          )
        }})}}
      </div>
    </div>
  )
}}
'''


# hire_onboard kanban - write manually clean
w(
    "packages/web-capability-hire-onboard/src/HireOnboardWidget.tsx",
    r'''
import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  candidate: string
  stage: string
  owner: string
  note: string
  status: string
}

const COLUMNS = [
  { key: 'open', label: '候选人' },
  { key: 'interview', label: '面试', action: 'interview' },
  { key: 'offered', label: 'Offer', action: 'offered' },
  { key: 'joined', label: '已入职', action: 'joined' },
] as const

export function HireOnboardWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [candidate, setCandidate] = useState('')
  const [stage, setStage] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#a855f7'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/hire-onboard/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !candidate.trim()) return
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/hire-onboard/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: 'job', candidate: candidate.trim(), stage: stage.trim() || '初筛',
          owner: user?.display_name || '', note: '', app_public_id: appId || '',
        }),
      })
      setCandidate(''); setStage(''); setMsg('已加入招聘板')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const moveTo = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/hire-onboard/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  return (
    <div>
      <div className="list-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <input className="input" style={{ flex: '1 1 140px' }} placeholder="候选人 / 岗位" value={candidate} onChange={(e) => setCandidate(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void submit() }} />
        <input className="input" style={{ flex: '0 1 100px' }} placeholder="阶段" value={stage} onChange={(e) => setStage(e.target.value)} />
        <button type="button" className="btn" style={{ background: accent }} disabled={busy || !candidate.trim()} onClick={() => void submit()}>录入</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      {loading && <p className="muted">加载中…</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(130px, 1fr))', gap: 8, overflowX: 'auto' }}>
        {COLUMNS.map((col) => {
          const colItems = items.filter((t) => t.status === col.key)
          return (
            <div key={col.key}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, padding: '6px 8px', borderRadius: 6, background: col.key === 'open' ? accent : 'rgba(0,0,0,0.06)', color: col.key === 'open' ? '#fff' : 'inherit' }}>{col.label} · {colItems.length}</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {colItems.map((t) => (
                  <li key={t.id} className="list-card" style={{ padding: 10 }}>
                    <strong style={{ fontSize: 13 }}>{t.candidate}</strong>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>{t.stage || '—'}{t.owner ? ` · ${t.owner}` : ''}</p>
                    <div className="row-actions" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                      {COLUMNS.filter((c) => 'action' in c && c.action && c.key !== t.status).map((c) => (
                        <button key={c.key} type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => void moveTo(t.id, (c as { action: string }).action)}>→{c.label}</button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
''',
)

w(
    "packages/web-capability-quote-contract/src/QuoteContractWidget.tsx",
    r'''
import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  title: string
  customer: string
  amount: string
  note: string
  status: string
}

const COLUMNS = [
  { key: 'open', label: '报价' },
  { key: 'reviewing', label: '评审中', action: 'reviewing' },
  { key: 'approved', label: '已批准', action: 'approved' },
  { key: 'signed', label: '已签约', action: 'signed' },
] as const

export function QuoteContractWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [customer, setCustomer] = useState('')
  const [amount, setAmount] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#0284c7'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/quote-contract/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !title.trim()) return
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/quote-contract/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category: 'quote', title: title.trim(), customer: customer.trim(),
          amount: amount.trim(), note: '', app_public_id: appId || '',
        }),
      })
      setTitle(''); setCustomer(''); setAmount(''); setMsg('已进入报价板')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const moveTo = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/quote-contract/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  return (
    <div>
      <div className="list-card" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <input className="input" style={{ flex: '1 1 120px' }} placeholder="报价标题" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" style={{ flex: '1 1 100px' }} placeholder="客户" value={customer} onChange={(e) => setCustomer(e.target.value)} />
        <input className="input" style={{ flex: '0 1 80px' }} placeholder="金额" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <button type="button" className="btn" style={{ background: accent }} disabled={busy || !title.trim()} onClick={() => void submit()}>录入</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      {loading && <p className="muted">加载中…</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(130px, 1fr))', gap: 8, overflowX: 'auto' }}>
        {COLUMNS.map((col) => {
          const colItems = items.filter((t) => t.status === col.key)
          return (
            <div key={col.key}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, padding: '6px 8px', borderRadius: 6, background: col.key === 'open' ? accent : 'rgba(0,0,0,0.06)', color: col.key === 'open' ? '#fff' : 'inherit' }}>{col.label} · {colItems.length}</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
                {colItems.map((t) => (
                  <li key={t.id} className="list-card" style={{ padding: 10 }}>
                    <strong style={{ fontSize: 13 }}>{t.title}</strong>
                    <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>{t.customer || '客户待定'}{t.amount ? ` · ¥${t.amount}` : ''}</p>
                    <div className="row-actions" style={{ marginTop: 6, flexWrap: 'wrap' }}>
                      {COLUMNS.filter((c) => 'action' in c && c.action && c.key !== t.status).map((c) => (
                        <button key={c.key} type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: '2px 6px' }} onClick={() => void moveTo(t.id, (c as { action: string }).action)}>→{c.label}</button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}
''',
)

print("phase3 kanban ok")
