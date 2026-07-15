# -*- coding: utf-8 -*-
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def w(rel, content):
    p = ROOT / rel
    p.write_text(content.lstrip("\n"), encoding="utf-8")
    print("wrote", rel)

# track pattern template factory
TRACKS = {
    "gov_service": {
        "file": "packages/web-capability-gov-service/src/GovServiceWidget.tsx",
        "export": "GovServiceWidget",
        "api": "gov-service",
        "accent": "#1d4ed8",
        "title": "政务事项",
        "track": [("open", "已受理"), ("processing", "办理中"), ("done", "办结")],
        "actions": {"open": ("processing", "开始办理"), "processing": ("done", "办结")},
        "fields": [("title", "事项名称"), ("dept", "窗口/部门"), ("ticket_no", "受理号")],
        "body_create": "category: 'guide', title: title.trim(), dept: dept.trim(), ticket_no: ticket.trim(), note: ''",
        "card": "t.title",
        "sub": "t.dept",
        "req": "title",
    },
    "legal_case": {
        "file": "packages/web-capability-legal-case/src/LegalCaseWidget.tsx",
        "export": "LegalCaseWidget",
        "api": "legal-case",
        "accent": "#7c3aed",
        "title": "法务案件",
        "track": [("open", "待审"), ("reviewing", "审查中"), ("done", "办结")],
        "actions": {"open": ("reviewing", "开始审查"), "reviewing": ("done", "办结")},
        "fields": [("title", "案件/合同标题"), ("party", "当事人"), ("deadline", "节点日期")],
        "body_create": "category: 'contract', title: title.trim(), party: party.trim(), deadline: deadline.trim(), note: ''",
        "card": "t.title",
        "sub": "t.party",
        "req": "title",
    },
    "campaign_ops": {
        "file": "packages/web-capability-campaign-ops/src/CampaignOpsWidget.tsx",
        "export": "CampaignOpsWidget",
        "api": "campaign-ops",
        "accent": "#db2777",
        "title": "活动运营",
        "track": [("open", "筹备"), ("running", "进行中"), ("closed", "已关闭")],
        "actions": {"open": ("running", "上线活动"), "running": ("closed", "关闭")},
        "fields": [("title", "活动名称"), ("channel", "渠道"), ("metric", "目标指标")],
        "body_create": "category: 'plan', title: title.trim(), channel: channel.trim(), metric: metric.trim(), note: ''",
        "card": "t.title",
        "sub": "t.channel",
        "req": "title",
    },
    "deco_material": {
        "file": "packages/web-capability-deco-material/src/DecoMaterialWidget.tsx",
        "export": "DecoMaterialWidget",
        "api": "deco-material",
        "accent": "#ca8a04",
        "title": "装修选材",
        "track": [("open", "待选"), ("accepted", "已验收"), ("done", "完成")],
        "actions": {"open": ("accepted", "验收通过"), "accepted": ("done", "完成")},
        "fields": [("material_name", "材料名称"), ("location", "使用位置"), ("budget", "预算")],
        "body_create": "category: 'material', material_name: material_name.trim(), location: location.trim(), budget: budget.trim(), note: ''",
        "card": "t.material_name",
        "sub": "t.location",
        "req": "material_name",
    },
    "travel_plan": {
        "file": "packages/web-capability-travel-plan/src/TravelPlanWidget.tsx",
        "export": "TravelPlanWidget",
        "api": "travel-plan",
        "accent": "#0891b2",
        "title": "旅行规划",
        "track": [("open", "草稿"), ("confirmed", "已确认"), ("done", "已出行")],
        "actions": {"open": ("confirmed", "确认行程"), "confirmed": ("done", "出行完成")},
        "fields": [("destination", "目的地"), ("days", "天数"), ("title", "行程标题")],
        "body_create": "category: 'trip', destination: destination.trim(), days: days.trim(), title: title.trim() || destination.trim(), note: ''",
        "card": "t.destination",
        "sub": "t.title",
        "req": "destination",
    },
    "wedding_plan": {
        "file": "packages/web-capability-wedding-plan/src/WeddingPlanWidget.tsx",
        "export": "WeddingPlanWidget",
        "api": "wedding-plan",
        "accent": "#e11d48",
        "title": "婚礼筹备清单",
        "track": [("open", "待办"), ("confirmed", "已确认"), ("done", "完成")],
        "actions": {"open": ("confirmed", "确认"), "confirmed": ("done", "完成")},
        "fields": [("title", "事项"), ("vendor", "供应商"), ("budget", "预算")],
        "body_create": "category: 'guest', title: title.trim(), vendor: vendor.trim(), budget: budget.trim(), note: ''",
        "card": "t.title",
        "sub": "t.vendor",
        "req": "title",
    },
}

for cfg in TRACKS.values():
    fields = cfg["fields"]
    state_decls = "\n".join(
        f"  const [{f[0]}, set{f[0][0].upper()+f[0][1:]}] = useState('')" for f in fields
    )
    # fix camelCase for setters - simpler use Map
    state_decls = "\n".join(f"  const [{name}, set{name.title().replace('_','')}] = useState('')" for name, _ in fields)
    # Actually use a values object approach instead in generated code

    inputs = "\n".join(
        f'        <input className="input" placeholder="{lab}" value={{{name}}} onChange={{(e) => set{name.title().replace("_", "")}(e.target.value)}} />'
        for name, lab in fields
    )
    # Better: values map
    pass

# Rewrite cleanly with values Record
for key, cfg in TRACKS.items():
    fields = cfg["fields"]
    track_js = ", ".join(f"'{s}'" for s, _ in cfg["track"])
    track_labels = ", ".join(f"'{s}': '{lab}'" for s, lab in cfg["track"])
    field_names = [f[0] for f in fields]
    inputs = "\n".join(
        f'        <input className="input" placeholder="{lab}" value={{values.{name} || \'\'}} onChange={{(e) => setValues((p) => ({{ ...p, {name}: e.target.value }}))}} />'
        for name, lab in fields
    )
    actions_js = "\n".join(
        f"""              {{t.status === '{st}' && (
                <button type="button" className="btn" style={{{{ background: accent, marginTop: 8 }}}} onClick={{() => void advance(t.id, '{act}')}}>{lab}</button>
              )}}"""
        for st, (act, lab) in cfg["actions"].items()
    )
    req = cfg["req"]
    body = cfg["body_create"]
    # replace field refs in body to use values.
    for n in field_names:
        body = body.replace(f"{n}.trim()", f"(values.{n} || '').trim()")
        body = body.replace(f"{n}.trim()", f"(values.{n} || '').trim()")  # noop
    # Fix: body uses bare names - convert
    body_fixed = cfg["body_create"]
    for n in field_names:
        body_fixed = body_fixed.replace(f"{n}.trim()", f"(values.{n} || '').trim()")
        body_fixed = body_fixed.replace(f"|| {n}.trim()", f"|| (values.{n} || '').trim()")
        body_fixed = body_fixed.replace(f"title.trim() || destination.trim()", "(values.title || '').trim() || (values.destination || '').trim()")

    content = f'''
import {{ useCallback, useEffect, useState }} from 'react'
import type {{ SchemaNode }} from '@blockhub/web-core'
import {{ apiFetch, useRuntime }} from '@blockhub/web-core'

interface RecordItem {{
  id: string
  record_no: string
  status: string
  {chr(10).join(f"  {n}: string" for n in field_names)}
  [key: string]: string | undefined
}}

const TRACK = [{track_js}] as const
const LABEL: Record<string, string> = {{{track_labels}}}

export function {cfg["export"]}(_props: {{ node: SchemaNode }}) {{
  const {{ token, primaryColor, appId }} = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({{}})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '{cfg["accent"]}'

  const load = useCallback(async () => {{
    if (!token) {{ setItems([]); setLoading(false); return }}
    setLoading(true)
    try {{
      const q = appId ? `?app_id=${{encodeURIComponent(appId)}}` : ''
      const data = await apiFetch<{{ items: RecordItem[] }}>(`/api/v1/{cfg["api"]}/records${{q}}`, token)
      setItems(data.items || [])
    }} catch (e) {{ setMsg(String(e)); setItems([]) }}
    finally {{ setLoading(false) }}
  }}, [token, appId])

  useEffect(() => {{ void load() }}, [load])

  const submit = async () => {{
    if (!token || !(values.{req} || '').trim()) {{ setMsg('请填写必填项'); return }}
    setBusy(true); setMsg('')
    try {{
      await apiFetch('/api/v1/{cfg["api"]}/records', token, {{
        method: 'POST',
        body: JSON.stringify({{ {body_fixed}, app_public_id: appId || '' }}),
      }})
      setValues({{}}); setMsg('已创建')
      await load()
    }} catch (e) {{ setMsg(String(e)) }}
    finally {{ setBusy(false) }}
  }}

  const advance = async (id: string, action: string) => {{
    if (!token) return
    await apiFetch(`/api/v1/{cfg["api"]}/records/${{id}}/${{action}}`, token, {{ method: 'POST', body: '{{}}' }})
    await load()
  }}

  const active = items.filter((t) => t.status !== TRACK[TRACK.length - 1])

  return (
    <div>
      <h4 style={{{{ margin: '0 0 8px', fontSize: 14 }}}}>{cfg["title"]}</h4>
      <div style={{{{ display: 'grid', gap: 8, marginBottom: 12 }}}}>
{inputs}
        <button type="button" className="btn" style={{{{ background: accent }}}} disabled={{busy}} onClick={{() => void submit()}}>添加</button>
      </div>
      {{msg && <p className="status-msg">{{msg}}</p>}}
      <h4 style={{{{ margin: '16px 0 8px', fontSize: 14 }}}}>进度</h4>
      {{loading && <p className="muted">加载中…</p>}}
      <ul style={{{{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}}}>
        {{active.map((t) => {{
          const idx = TRACK.indexOf(t.status as typeof TRACK[number])
          return (
            <li key={{t.id}} className="list-card">
              <div className="list-card-head">
                <strong>{{{cfg["card"]}}}</strong>
                <span className="tag">{{LABEL[t.status] || t.status}}</span>
              </div>
              <p className="muted" style={{{{ margin: '6px 0 0' }}}}>{{{cfg["sub"]}}}</p>
              <div style={{{{ display: 'flex', gap: 4, marginTop: 8 }}}}>
                {{TRACK.map((s, i) => (
                  <div key={{s}} style={{{{ flex: 1, height: 6, borderRadius: 3, background: i <= idx ? accent : 'rgba(0,0,0,0.12)' }}}} />
                ))}}
              </div>
{actions_js}
            </li>
          )
        }})}}
      </ul>
    </div>
  )
}}
'''
    w(cfg["file"], content)

# pet + fitness booking style
w("packages/web-capability-pet-clinic/src/PetClinicWidget.tsx", r'''
import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  pet_name: string
  symptom: string
  schedule_at: string
  note: string
  status: string
}

const CATS = [
  { k: 'consult', l: '问诊' },
  { k: 'visit', l: '就诊' },
  { k: 'vaccine', l: '疫苗' },
]

export function PetClinicWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState('consult')
  const [pet, setPet] = useState('')
  const [symptom, setSymptom] = useState('')
  const [when, setWhen] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#ea580c'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/pet-clinic/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !pet.trim() || !symptom.trim()) { setMsg('请填写宠物名与症状'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/pet-clinic/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category, pet_name: pet.trim(), symptom: symptom.trim(),
          schedule_at: when.trim(), note: '', app_public_id: appId || '',
        }),
      })
      setPet(''); setSymptom(''); setWhen(''); setMsg('已预约')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    await apiFetch(`/api/v1/pet-clinic/records/${id}/${action}`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const active = items.filter((t) => t.status !== 'done')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>宠物就诊预约</h4>
      <div className="row-actions" style={{ marginBottom: 8 }}>
        {CATS.map((c) => (
          <button key={c.k} type="button" className={category === c.k ? 'btn' : 'btn btn-ghost'} style={category === c.k ? { background: accent } : undefined} onClick={() => setCategory(c.k)}>{c.l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="宠物名" value={pet} onChange={(e) => setPet(e.target.value)} />
        <input className="input" placeholder="症状 / 诉求" value={symptom} onChange={(e) => setSymptom(e.target.value)} />
        <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>预约</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {active.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.pet_name} · {t.symptom}</strong>
              <span className="tag">{t.status === 'open' ? '待约' : t.status === 'scheduled' ? '已预约' : t.status}</span>
            </div>
            {t.schedule_at ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.schedule_at}</p> : null}
            <div className="row-actions" style={{ marginTop: 8 }}>
              {t.status === 'open' && <button type="button" className="btn" style={{ background: accent }} onClick={() => void advance(t.id, 'scheduled')}>确认预约</button>}
              {t.status !== 'done' && <button type="button" className="btn btn-ghost" onClick={() => void advance(t.id, 'done')}>完成就诊</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
''')

w("packages/web-capability-fitness-checkin/src/FitnessCheckinWidget.tsx", r'''
import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  category: string
  member_name: string
  class_name: string
  schedule_at: string
  note: string
  status: string
}

const CATS = [
  { k: 'book', l: '预约课' },
  { k: 'checkin', l: '到店打卡' },
  { k: 'coach', l: '私教' },
]

export function FitnessCheckinWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [category, setCategory] = useState('checkin')
  const [className, setClassName] = useState('')
  const [when, setWhen] = useState('')
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#16a34a'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/fitness-checkin/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !className.trim()) { setMsg('请填写课程名'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/fitness-checkin/records', token, {
        method: 'POST',
        body: JSON.stringify({
          category, member_name: user?.display_name || '', class_name: className.trim(),
          schedule_at: when.trim(), note: '', app_public_id: appId || '',
        }),
      })
      setClassName(''); setWhen(''); setMsg(category === 'checkin' ? '打卡成功' : '已预约')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const done = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/fitness-checkin/records/${id}/done`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>健身预约 / 打卡</h4>
      <div className="row-actions" style={{ marginBottom: 8 }}>
        {CATS.map((c) => (
          <button key={c.k} type="button" className={category === c.k ? 'btn' : 'btn btn-ghost'} style={category === c.k ? { background: accent } : undefined} onClick={() => setCategory(c.k)}>{c.l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <input className="input" placeholder="课程名" value={className} onChange={(e) => setClassName(e.target.value)} />
        {category !== 'checkin' && <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />}
        <button type="button" className="btn" style={{ background: accent }} disabled={busy} onClick={() => void submit()}>{category === 'checkin' ? '立即打卡' : '预约课程'}</button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {open.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.class_name}</strong>
              <span className="tag">{t.member_name || '会员'}</span>
            </div>
            {t.schedule_at ? <p className="muted" style={{ margin: '6px 0 0' }}>{t.schedule_at}</p> : null}
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void done(t.id)}>完成</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
''')

w("packages/web-capability-homework-qa/src/HomeworkQaWidget.tsx", r'''
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  title: string
  content: string
  student_name: string
  subject: string
  category: string
  status: string
}

export function HomeworkQaWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId, user } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#6366f1'

  const steps: GtgtStep[] = useMemo(() => [
    { key: 'title', label: '作业 / 问题', placeholder: '例如：数学练习册 P12 第3题' },
    { key: 'content', label: '补充说明（可空）', optional: true, placeholder: '哪里不懂…' },
    { key: 'subject', label: '科目（可空）', optional: true, placeholder: '数学' },
  ], [])

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/homework-qa/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const submit = async () => {
    if (!token || !values.title?.trim()) return
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/homework-qa/records', token, {
        method: 'POST',
        body: JSON.stringify({
          title: values.title.trim(), content: (values.content || '').trim(),
          student_name: user?.display_name || '', subject: (values.subject || '').trim(),
          category: 'homework', app_public_id: appId || '',
        }),
      })
      setValues({}); setResetKey((k) => k + 1); setMsg('已提问，等待批改')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const review = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/homework-qa/records/${id}/review`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const open = items.filter((t) => t.status === 'open')

  return (
    <div>
      <GtgtStepComposer title="作业答疑" meta="学生提问 · 老师批改" accent={accent} flowHint="提出问题 → 待批改" steps={steps} values={values} onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))} onComplete={submit} busy={busy} resetKey={resetKey} submitLabel="提交问题" />
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待批改{open.length ? ` · ${open.length}` : ''}</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {open.map((t) => (
          <li key={t.id} className="list-card">
            <strong>{t.title}</strong>
            {t.content ? <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t.content}</p> : null}
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 12 }}>{[t.student_name, t.subject].filter(Boolean).join(' · ')}</p>
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void review(t.id)}>标记已批改</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
''')

w("packages/web-capability-school-notice/src/SchoolNoticeWidget.tsx", r'''
import { useCallback, useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, useRuntime } from '@blockhub/web-core'

interface RecordItem {
  id: string
  record_no: string
  title: string
  content: string
  audience: string
  category: string
  status: string
}

const AUDIENCE = ['全体家长', '本班家长', '老师']

export function SchoolNoticeWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, appId } = useRuntime()
  const [items, setItems] = useState<RecordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [audience, setAudience] = useState(AUDIENCE[0])
  const [msg, setMsg] = useState('')
  const accent = primaryColor || '#2563eb'

  const load = useCallback(async () => {
    if (!token) { setItems([]); setLoading(false); return }
    setLoading(true)
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RecordItem[] }>(`/api/v1/school-notice/records${q}`, token)
      setItems(data.items || [])
    } catch (e) { setMsg(String(e)); setItems([]) }
    finally { setLoading(false) }
  }, [token, appId])

  useEffect(() => { void load() }, [load])

  const publish = async () => {
    if (!token || !title.trim()) { setMsg('请填写通知标题'); return }
    setBusy(true); setMsg('')
    try {
      await apiFetch('/api/v1/school-notice/records', token, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(), content: content.trim(), audience,
          category: 'notice', app_public_id: appId || '',
        }),
      })
      setTitle(''); setContent(''); setMsg('已发布')
      await load()
    } catch (e) { setMsg(String(e)) }
    finally { setBusy(false) }
  }

  const ack = async (id: string) => {
    if (!token) return
    await apiFetch(`/api/v1/school-notice/records/${id}/ack`, token, { method: 'POST', body: '{}' })
    await load()
  }

  const published = items.filter((t) => t.status === 'published')

  return (
    <div>
      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>发布家校通知</h4>
      <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
        <input className="input" placeholder="通知标题" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="input" rows={3} placeholder="通知内容" value={content} onChange={(e) => setContent(e.target.value)} style={{ resize: 'vertical' }} />
      </div>
      <div className="row-actions" style={{ marginBottom: 8 }}>
        {AUDIENCE.map((a) => (
          <button key={a} type="button" className={audience === a ? 'btn' : 'btn btn-ghost'} style={audience === a ? { background: accent, fontSize: 12 } : { fontSize: 12 }} onClick={() => setAudience(a)}>{a}</button>
        ))}
      </div>
      <button type="button" className="btn" style={{ background: accent, marginBottom: 12 }} disabled={busy} onClick={() => void publish()}>发布</button>
      {msg && <p className="status-msg">{msg}</p>}
      <h4 style={{ margin: '16px 0 8px', fontSize: 14 }}>待回执{published.length ? ` · ${published.length}` : ''}</h4>
      {loading && <p className="muted">加载中…</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {published.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.title}</strong>
              <span className="tag">{t.audience || '全员'}</span>
            </div>
            {t.content ? <p style={{ margin: '6px 0 0', fontSize: 13 }}>{t.content}</p> : null}
            <button type="button" className="btn" style={{ background: accent, marginTop: 8 }} onClick={() => void ack(t.id)}>我已知晓</button>
          </li>
        ))}
      </ul>
    </div>
  )
}
''')

print("phase3 rest ok")
