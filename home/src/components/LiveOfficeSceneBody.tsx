/**
 * 办公 Runtime 预览：真 API 提交 + 列表 + 状态推进（非静态假表单）。
 * 填表走 >> GtgtStepComposer（与正式 Runtime / 预约演示同构）。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { GtgtStepComposer } from '@blockhub/web-core/gtgt'
import { resolveFormSteps } from '@blockhub/web-core/resolveFormSteps'
import type { IndustryRuntimeScene } from '../data/industryRuntimeScenes'

type Row = {
  id: string
  title: string
  status: string
  raw?: Record<string, unknown>
}

type CapApi = {
  listPath: string
  createPath: string
  buildBody: (vals: Record<string, string>, scene: IndustryRuntimeScene) => Record<string, unknown>
  fields: Array<{ key: string; label: string; placeholder?: string; type?: string; optional?: boolean }>
  advances?: Array<{ action: string; label: string }>
  mapItem: (raw: Record<string, unknown>) => Row
  itemsKey?: string
}

function statusLabel(s: string): string {
  const m: Record<string, string> = {
    open: '待审批',
    approved: '已通过',
    rejected: '已驳回',
    done: '已归档',
    reviewing: '审核中',
    paid: '已付款',
    pending: '待处理',
    dispatched: '已派工',
    booked: '已预约',
    cancelled: '已取消',
    interview: '面试中',
    offered: '已发 offer',
    joined: '已入职',
  }
  return m[s] || s || '—'
}

function apiFor(cap: string, scene: IndustryRuntimeScene): CapApi | null {
  const name = scene.name
  if (cap === 'leave_request') {
    const overtime = name.includes('加班')
    const trip = name.includes('出差')
    const cat = overtime ? 'overtime' : trip ? 'trip' : 'annual'
    return {
      listPath: '/api/v1/leave-request/records',
      createPath: '/api/v1/leave-request/records',
      fields: [
        {
          key: 'start_at',
          label: overtime ? '开始时间' : '开始日期',
          placeholder: overtime ? '选择开始时间' : '选择开始日期',
          type: overtime ? 'datetime-local' : 'date',
        },
        {
          key: 'end_at',
          label: overtime ? '结束时间' : '结束日期',
          placeholder: overtime ? '选择结束时间' : '选择结束日期',
          type: overtime ? 'datetime-local' : 'date',
        },
        { key: 'note', label: '事由', placeholder: '可空', optional: true },
      ],
      buildBody: (v) => ({
        category: cat,
        applicant: '',
        start_at: v.start_at?.trim() || '',
        end_at: v.end_at?.trim() || '',
        note: v.note?.trim() || '',
        app_public_id: 'preview-office',
      }),
      advances: [
        { action: 'approved', label: '通过' },
        { action: 'rejected', label: '驳回' },
        { action: 'done', label: '归档' },
      ],
      mapItem: (r) => ({
        id: String(r.id || ''),
        title: `${String(r.category || cat)} · ${String(r.start_at || '')}–${String(r.end_at || '')}`,
        status: String(r.status || ''),
        raw: r,
      }),
    }
  }
  if (cap === 'expense_claim') {
    const loan = name.includes('借款')
    const pay = name.includes('付款')
    const team = name.includes('团建') || name.includes('经费')
    const cat = loan ? 'loan' : pay ? 'payment' : team || name.includes('发票') ? 'office' : 'travel'
    return {
      listPath: '/api/v1/expense-claim/records',
      createPath: '/api/v1/expense-claim/records',
      fields: [
        { key: 'title', label: team ? '活动名称' : '标题', placeholder: name },
        { key: 'amount', label: team ? '预算金额' : '金额', placeholder: '1280', type: 'number' },
        { key: 'note', label: '说明', placeholder: '可空', optional: true },
      ],
      buildBody: (v, scene) => {
        const vals = Object.fromEntries(
          Object.entries(v).map(([k, val]) => [k, String(val ?? '').trim()]),
        )
        const labeled = [
          ...(scene.formFields || []),
          ...((scene.pageMock?.fields || []).map((f, i) => ({
            key: f.key || `f_${i}`,
            label: f.label,
          })) || []),
        ]
        const byHints = (hints: string[]) => {
          for (const f of labeled) {
            if (hints.some((h) => (f.label || '').includes(h) || (f.key || '').includes(h))) {
              const x = vals[f.key]
              if (x) return x
            }
          }
          for (const [k, val] of Object.entries(vals)) {
            if (val && hints.some((h) => k.includes(h))) return val
          }
          return ''
        }
        const title =
          vals.title || byHints(['活动', '标题', '事项', '名称', '费用类型']) || name
        const amount = vals.amount || byHints(['金额', '预算', '费用']) || '0'
        const note = vals.note || byHints(['说明', '事由', '用途', '部门', '日期']) || ''
        return {
          category: cat,
          title,
          amount,
          invoice_no: '',
          note,
          app_public_id: 'preview-office',
        }
      },
      advances: [
        { action: 'reviewing', label: '审核中' },
        { action: 'paid', label: '已付款' },
        { action: 'rejected', label: '驳回' },
      ],
      mapItem: (r) => ({
        id: String(r.id || ''),
        title: `${String(r.title || '')} · ¥${String(r.amount || '')}`,
        status: String(r.status || ''),
        raw: r,
      }),
    }
  }
  if (cap === 'device_repair') {
    return {
      listPath: '/api/v1/device-repair/tickets',
      createPath: '/api/v1/device-repair/tickets',
      fields: [
        { key: 'asset_code', label: '设备 / 产线', placeholder: 'A3 冲压线 · 工位 07' },
        { key: 'location', label: '位置', placeholder: '可空', optional: true },
        { key: 'fault', label: '故障现象', placeholder: '描述异响、停机等', type: 'textarea' },
      ],
      buildBody: (v) => ({
        asset_code: v.asset_code?.trim() || name,
        location: v.location?.trim() || '',
        fault: v.fault?.trim() || '',
        app_public_id: 'preview-office',
      }),
      advances: [
        { action: 'next', label: '推进' },
        { action: 'complete', label: '完工' },
      ],
      mapItem: (r) => ({
        id: String(r.id || ''),
        title: `${String(r.asset_code || '')} · ${String(r.fault || '').slice(0, 40)}`,
        status: String(r.status || ''),
        raw: r,
      }),
      itemsKey: 'items',
    }
  }
  if (cap === 'meeting_booking') {
    return {
      listPath: '/api/v1/meeting-booking/records',
      createPath: '/api/v1/meeting-booking/records',
      fields: [
        { key: 'room_name', label: '会议室', placeholder: 'A301' },
        { key: 'title', label: '会议主题', placeholder: '周会' },
        { key: 'start_at', label: '开始', placeholder: '选择开始时间', type: 'datetime-local' },
        { key: 'end_at', label: '结束', placeholder: '选择结束时间', type: 'datetime-local' },
      ],
      buildBody: (v) => ({
        room_name: v.room_name?.trim() || '会议室',
        title: v.title?.trim() || name,
        start_at: v.start_at?.trim() || '',
        end_at: v.end_at?.trim() || '',
        attendees: '',
        note: '',
        app_public_id: 'preview-office',
      }),
      advances: [
        { action: 'confirmed', label: '确认' },
        { action: 'cancelled', label: '取消' },
        { action: 'done', label: '完成' },
      ],
      mapItem: (r) => ({
        id: String(r.id || ''),
        title: `${String(r.room_name || '')} · ${String(r.title || '')}`,
        status: String(r.status || ''),
        raw: r,
      }),
    }
  }
  if (cap === 'it_ticket') {
    return {
      listPath: '/api/v1/it-ticket/tickets',
      createPath: '/api/v1/it-ticket/tickets',
      fields: [
        { key: 'title', label: '故障现象', placeholder: '无法上网' },
        { key: 'detail', label: '影响范围', placeholder: '可空' },
        { key: 'urgency', label: '紧急程度', placeholder: 'medium / high / low' },
      ],
      buildBody: (v) => ({
        category: 'hardware',
        title: v.title?.trim() || name,
        detail: v.detail?.trim() || '',
        urgency: v.urgency?.trim() || 'medium',
        app_public_id: 'preview-office',
      }),
      advances: [
        { action: 'processing', label: '处理中' },
        { action: 'done', label: '完成' },
        { action: 'closed', label: '关闭' },
      ],
      mapItem: (r) => ({
        id: String(r.id || ''),
        title: String(r.title || r.record_no || ''),
        status: String(r.status || ''),
        raw: r,
      }),
      itemsKey: 'items',
    }
  }
  if (cap === 'asset_manage') {
    return {
      listPath: '/api/v1/asset-manage/records',
      createPath: '/api/v1/asset-manage/records',
      fields: [
        { key: 'asset_name', label: '资产名称', placeholder: '笔记本电脑' },
        { key: 'quantity', label: '数量', placeholder: '1' },
        { key: 'note', label: '说明', placeholder: '可空' },
      ],
      buildBody: (v) => ({
        category: name.includes('盘点') ? 'inventory' : 'borrow',
        asset_name: v.asset_name?.trim() || name,
        quantity: v.quantity?.trim() || '1',
        note: v.note?.trim() || '',
        app_public_id: 'preview-office',
      }),
      advances: [
        { action: 'approved', label: '通过' },
        { action: 'returned', label: '已归还' },
        { action: 'rejected', label: '驳回' },
      ],
      mapItem: (r) => ({
        id: String(r.id || ''),
        title: `${String(r.asset_name || r.title || '')} ×${String(r.quantity || '1')}`,
        status: String(r.status || ''),
        raw: r,
      }),
    }
  }
  if (cap === 'hire_onboard') {
    return {
      listPath: '/api/v1/hire-onboard/records',
      createPath: '/api/v1/hire-onboard/records',
      fields: [
        { key: 'candidate', label: '候选人', placeholder: '张三' },
        { key: 'stage', label: '阶段/岗位', placeholder: '初试 · 产品经理' },
        { key: 'note', label: '说明', placeholder: '可空' },
      ],
      buildBody: (v) => ({
        candidate: v.candidate?.trim() || '',
        stage: v.stage?.trim() || '',
        owner: '',
        note: v.note?.trim() || '',
        app_public_id: 'preview-office',
      }),
      advances: [
        { action: 'interview', label: '面试' },
        { action: 'offered', label: '发 offer' },
        { action: 'joined', label: '入职' },
      ],
      mapItem: (r) => ({
        id: String(r.id || ''),
        title: `${String(r.candidate || '')} · ${String(r.stage || '')}`,
        status: String(r.status || ''),
        raw: r,
      }),
    }
  }
  if (cap === 'approval_flow' || cap === 'seal_request' || cap === 'approval_inbox') {
    const type =
      cap === 'seal_request'
        ? 'seal'
        : name.includes('会签')
          ? 'countersign'
          : name.includes('VPN') || name.includes('网络')
            ? 'vpn'
            : name.includes('软件')
              ? 'software_install'
              : name.includes('账号')
                ? 'account_access'
                : 'general'
    return {
      listPath: '/api/v1/approvals',
      createPath: '/api/v1/approvals',
      fields: [
        { key: 'title', label: '事项标题', placeholder: name },
        { key: 'department', label: '部门', placeholder: '行政部' },
        { key: 'summary', label: '说明', placeholder: '可空' },
      ],
      buildBody: (v) => ({
        title: v.title?.trim() || name,
        type,
        department: v.department?.trim() || '未填写',
        summary: v.summary?.trim() || v.title?.trim() || name,
      }),
      advances: [
        { action: 'approve', label: '通过' },
        { action: 'reject', label: '驳回' },
      ],
      mapItem: (r) => ({
        id: String(r.id || ''),
        title: String(r.title || ''),
        status: String(r.status || ''),
        raw: r,
      }),
      itemsKey: 'items',
    }
  }
  return null
}

async function apiJson<T>(
  path: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(t || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export function LiveOfficeSceneBody({
  scene,
  token,
}: {
  scene: IndustryRuntimeScene
  token: string
}) {
  const cap = resolveLiveCap(scene) || scene.capabilityHint.split(/\s*\+\s*/)[0].trim()
  const api = useMemo(() => apiFor(cap, scene), [cap, scene])
  const steps = useMemo(() => {
    if (!api) return []
    return resolveFormSteps({
      defaults: api.fields,
      formFields: scene.formFields,
      pageMockFields: scene.pageMock?.fields,
    })
  }, [api, scene.formFields, scene.pageMock])
  const [vals, setVals] = useState<Record<string, string>>({})
  const [rows, setRows] = useState<Row[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [resetKey, setResetKey] = useState(0)

  const load = useCallback(async () => {
    if (!api || !token) {
      setRows([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await apiJson<Record<string, unknown>>(api.listPath, token)
      const key = api.itemsKey || 'items'
      const list = (data[key] || data.items || data.approvals || []) as Record<string, unknown>[]
      setRows(Array.isArray(list) ? list.map(api.mapItem) : [])
      setMsg('')
    } catch (e) {
      setMsg(`加载失败：${String(e)}`)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [api, token])

  useEffect(() => {
    void load()
  }, [load, scene.id])

  if (!api) {
    return (
      <div className="irp-panel">
        <p className="irp-summary">
          「{scene.name}」挂接能力 <code>{cap}</code>。问答/看板/通知类请在正式 Runtime（发布后的 /r/应用）中使用对应 Widget；本预览对表单审批类能力已接真 API。
        </p>
      </div>
    )
  }

  const submit = async () => {
    if (!token || busy || !api) return
    const first = steps[0]
    if (first && !first.optional && !String(vals[first.key] ?? '').trim()) {
      setMsg(`请填写「${first.label}」`)
      return
    }
    const body = api.buildBody(vals, scene)
    setBusy(true)
    setMsg('')
    try {
      await apiJson(api.createPath, token, { method: 'POST', body: JSON.stringify(body) })
      setVals({})
      setResetKey((k) => k + 1)
      setMsg('已提交 · 右侧列表已刷新（真库）')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const advance = async (id: string, action: string) => {
    if (!token) return
    setBusy(true)
    try {
      if (cap === 'approval_flow' || cap === 'seal_request' || cap === 'approval_inbox') {
        await apiJson(`/api/v1/approvals/${id}/action`, token, {
          method: 'POST',
          body: JSON.stringify({ action, comment: '' }),
        })
      } else if (cap === 'leave_request') {
        await apiJson(`/api/v1/leave-request/records/${id}/${action}`, token, {
          method: 'POST',
          body: '{}',
        })
      } else if (cap === 'expense_claim') {
        await apiJson(`/api/v1/expense-claim/records/${id}/${action}`, token, {
          method: 'POST',
          body: '{}',
        })
      } else if (cap === 'meeting_booking') {
        await apiJson(`/api/v1/meeting-booking/records/${id}/${action}`, token, {
          method: 'POST',
          body: '{}',
        })
      } else if (cap === 'it_ticket') {
        await apiJson(`/api/v1/it-ticket/tickets/${id}/${action}`, token, {
          method: 'POST',
          body: '{}',
        })
      } else if (cap === 'asset_manage') {
        await apiJson(`/api/v1/asset-manage/records/${id}/${action}`, token, {
          method: 'POST',
          body: '{}',
        })
      } else if (cap === 'hire_onboard') {
        await apiJson(`/api/v1/hire-onboard/records/${id}/${action}`, token, {
          method: 'POST',
          body: '{}',
        })
      } else if (cap === 'device_repair') {
        await apiJson(`/api/v1/device-repair/tickets/${id}/action`, token, {
          method: 'POST',
          body: JSON.stringify({ action, comment: '' }),
        })
      }
      setMsg(`已${action} · 流程已更新`)
      await load()
    } catch (e) {
      setMsg(`推进失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="irp-grid-2">
      <section className="irp-panel irp-gtgt-panel">
        <p className="irp-summary" style={{ marginBottom: 12 }}>
          真 API · {cap} · {'>>'} 单字段推进 · 提交写入数据库
        </p>
        {steps.length > 0 ? (
          <GtgtStepComposer
            title={`${scene.name} · 提交`}
            accent="#8b5cf6"
            flowHint="填写 → 确认 → 提交真库"
            steps={steps}
            values={vals}
            onChange={(k: string, v: string) => setVals((p) => ({ ...p, [k]: v }))}
            onComplete={submit}
            busy={busy}
            resetKey={resetKey}
            submitLabel="提交"
          >
            {msg ? <p className="irp-summary" style={{ marginTop: 10 }}>{msg}</p> : null}
          </GtgtStepComposer>
        ) : null}
      </section>
      <section className="irp-panel">
        <h3>
          {scene.name}记录 {loading ? '…' : `(${rows.length})`}
        </h3>
        {rows.length === 0 && !loading ? (
          <p className="irp-summary">空库无数据 — 左侧提交后会出现在这里</p>
        ) : null}
        {rows.map((row) => (
          <div key={row.id} className="irp-row" style={{ flexWrap: 'wrap', gap: 8 }}>
            <strong>{row.id.slice(0, 8)}</strong>
            <span style={{ flex: 1 }}>{row.title}</span>
            <em>{statusLabel(row.status)}</em>
            {(api.advances || []).map((a) => (
              <button
                key={a.action}
                type="button"
                className="irp-btn"
                style={{ padding: '4px 10px', fontSize: 12 }}
                disabled={busy}
                onClick={() => void advance(row.id, a.action)}
              >
                {a.label}
              </button>
            ))}
          </div>
        ))}
      </section>
    </div>
  )
}

const LIVE_OFFICE_CAPS = [
  'leave_request',
  'expense_claim',
  'meeting_booking',
  'it_ticket',
  'asset_manage',
  'hire_onboard',
  'approval_flow',
  'seal_request',
  'approval_inbox',
  'device_repair',
] as const

/** 口语 / gen_* 场景名 → 可真提交的正式能力 */
export function resolveLiveCap(scene: {
  capabilityHint: string
  name?: string
  summary?: string
}): string | null {
  const raw = scene.capabilityHint.split(/\s*\+\s*/)[0].trim()
  if ((LIVE_OFFICE_CAPS as readonly string[]).includes(raw)) return raw
  // 已挂正式非表单能力（质检/OEE 等）勿按名称误映射
  if (raw && !raw.startsWith('gen_') && raw !== 'chat_qa' && /^[a-z][a-z0-9_]*$/.test(raw)) {
    return null
  }
  const blob = `${scene.name || ''} ${scene.summary || ''}`
  const rules: Array<{ words: string[]; cap: (typeof LIVE_OFFICE_CAPS)[number] }> = [
    { words: ['团建', '经费', '报销', '借款', '付款', '预算', '发票', '费用'], cap: 'expense_claim' },
    { words: ['请假', '加班', '出差', '年假', '调休'], cap: 'leave_request' },
    { words: ['报修', '故障', '维修工单', '产线坏'], cap: 'device_repair' },
    { words: ['会议室', '预约会议'], cap: 'meeting_booking' },
    { words: ['用印', '盖章'], cap: 'seal_request' },
    { words: ['入职', '招聘', '候选人'], cap: 'hire_onboard' },
    { words: ['IT报障', 'IT 报障', '电脑坏', '网络不通'], cap: 'it_ticket' },
    { words: ['资产领用', '固定资产'], cap: 'asset_manage' },
    { words: ['团建经费', '通用审批', '会签', '经费审批'], cap: 'approval_flow' },
  ]
  for (const r of rules) {
    if (r.words.some((w) => blob.includes(w))) return r.cap
  }
  // 纯「审批/申请」且无更具体能力时 → 通用审批
  if (/审批|申请/.test(blob)) return 'approval_flow'
  return null
}

/** 表单/审批类能力走真流程；其余仍用静态预览 */
export function isLiveOfficeCap(capabilityHint: string): boolean {
  const cap = capabilityHint.split(/\s*\+\s*/)[0].trim()
  return (LIVE_OFFICE_CAPS as readonly string[]).includes(cap)
}

export function isLiveOfficeScene(scene: {
  capabilityHint: string
  name?: string
  summary?: string
}): boolean {
  return Boolean(resolveLiveCap(scene))
}
