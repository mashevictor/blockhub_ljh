/**
 * 办公 Runtime 预览：真 API 提交 + 列表 + 状态推进（非静态假表单）。
 * 依赖 home 已登录 token（或自动 demo 登录）。
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
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
  fields: Array<{ key: string; label: string; placeholder?: string }>
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
        { key: 'start_at', label: overtime ? '开始时间' : '开始日期', placeholder: overtime ? '2026-07-20 18:00' : '2026-07-20' },
        { key: 'end_at', label: overtime ? '结束时间' : '结束日期', placeholder: overtime ? '2026-07-20 21:00' : '2026-07-22' },
        { key: 'note', label: '事由', placeholder: '可空' },
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
    const cat = loan ? 'loan' : pay ? 'payment' : name.includes('发票') ? 'office' : 'travel'
    return {
      listPath: '/api/v1/expense-claim/records',
      createPath: '/api/v1/expense-claim/records',
      fields: [
        { key: 'title', label: '标题', placeholder: name },
        { key: 'amount', label: '金额', placeholder: '1280' },
        { key: 'note', label: '说明', placeholder: '可空' },
      ],
      buildBody: (v) => ({
        category: cat,
        title: v.title?.trim() || name,
        amount: v.amount?.trim() || '0',
        invoice_no: '',
        note: v.note?.trim() || '',
        app_public_id: 'preview-office',
      }),
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
  if (cap === 'meeting_booking') {
    return {
      listPath: '/api/v1/meeting-booking/records',
      createPath: '/api/v1/meeting-booking/records',
      fields: [
        { key: 'room_name', label: '会议室', placeholder: 'A301' },
        { key: 'title', label: '会议主题', placeholder: '周会' },
        { key: 'start_at', label: '开始', placeholder: '2026-07-20 14:00' },
        { key: 'end_at', label: '结束', placeholder: '2026-07-20 15:00' },
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
  const cap = scene.capabilityHint.split(/\s*\+\s*/)[0].trim()
  const api = useMemo(() => apiFor(cap, scene), [cap, scene])
  const [vals, setVals] = useState<Record<string, string>>({})
  const [rows, setRows] = useState<Row[]>([])
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

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
    if (!token || busy) return
    const body = api.buildBody(vals, scene)
    // 简单必填：第一个字段
    const first = api.fields[0]?.key
    if (first && !String(body[first] ?? vals[first] ?? '').toString().trim()) {
      setMsg(`请填写「${api.fields[0].label}」`)
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiJson(api.createPath, token, { method: 'POST', body: JSON.stringify(body) })
      setVals({})
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
      <section className="irp-panel">
        <h3>{scene.name} · 提交</h3>
        <p className="irp-summary" style={{ marginBottom: 12 }}>
          真 API · {cap} · 提交后写入数据库，右侧可见；可点按钮推进状态
        </p>
        {api.fields.map((f) => (
          <label key={f.key}>
            {f.label}
            <input
              value={vals[f.key] || ''}
              placeholder={f.placeholder}
              onChange={(e) => setVals((p) => ({ ...p, [f.key]: e.target.value }))}
            />
          </label>
        ))}
        <button type="button" className="irp-btn" disabled={busy} onClick={() => void submit()}>
          {busy ? '提交中…' : '提交'}
        </button>
        {msg ? <p className="irp-summary" style={{ marginTop: 10 }}>{msg}</p> : null}
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

/** 表单/审批类能力走真流程；其余仍用静态预览 */
export function isLiveOfficeCap(capabilityHint: string): boolean {
  const cap = capabilityHint.split(/\s*\+\s*/)[0].trim()
  return [
    'leave_request',
    'expense_claim',
    'meeting_booking',
    'it_ticket',
    'asset_manage',
    'hire_onboard',
    'approval_flow',
    'seal_request',
    'approval_inbox',
  ].includes(cap)
}
