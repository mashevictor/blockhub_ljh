import { useEffect, useMemo, useState } from 'react'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'
import type { SchemaNode } from '@blockhub/web-core'

interface ApprovalItem {
  id: string
  title: string
  applicant: string
  department: string
  status: string
  summary: string
  submitted_at: string
}

type FormCopy = {
  headline: string
  hint: string
  titleLabel: string
  titlePlaceholder: string
  deptLabel: string
  deptPlaceholder: string
  summaryLabel: string
  summaryPlaceholder: string
  submitLabel: string
  successMsg: string
}

function resolveFormCopy(node: SchemaNode): FormCopy {
  const key = String(node.props?.capability_key || 'approval_flow')
  const type = String(node.props?.approval_type || key)
  const fromProps = node.props || {}

  const base: FormCopy = {
    headline: String(fromProps.form_headline || '发起审批'),
    hint: String(fromProps.form_hint || '>> 单字段推进，提交后进入待办'),
    titleLabel: '事项标题',
    titlePlaceholder: String(fromProps.title_placeholder || '简要说明要办的事'),
    deptLabel: '所属部门',
    deptPlaceholder: String(fromProps.dept_placeholder || '如：生产部 / 行政部'),
    summaryLabel: '说明',
    summaryPlaceholder: String(fromProps.summary_placeholder || '补充原因、起止时间或附件说明'),
    submitLabel: '提交申请',
    successMsg: '申请已提交，等待审批',
  }

  if (type.includes('leave') || /请假|年假|调休/.test(key + String(fromProps.form_headline || ''))) {
    return {
      ...base,
      headline: '请假申请',
      hint: '填写假种与时段，提交后主管审批',
      titlePlaceholder: '如：年假 3 天（4/1–4/3）',
      summaryPlaceholder: '事由、代理人、是否出国…',
      submitLabel: '提交请假',
    }
  }
  if (type.includes('expense') || /报销/.test(String(fromProps.form_headline || ''))) {
    return {
      ...base,
      headline: '费用报销',
      hint: '填写金额与用途，提交财务审批',
      titlePlaceholder: '如：差旅报销 ¥1280',
      summaryPlaceholder: '行程、发票张数、是否已垫付…',
      submitLabel: '提交报销',
    }
  }
  if (type.includes('seal') || key.includes('seal') || /用印|盖章/.test(String(fromProps.form_headline || ''))) {
    return {
      ...base,
      headline: '用印申请',
      hint: '说明印章类型与文件用途',
      titlePlaceholder: '如：合同章 · 《采购协议》',
      summaryPlaceholder: '份数、是否外带、法务是否已审…',
      submitLabel: '提交用印',
    }
  }
  if (key === 'approval_flow') {
    return {
      ...base,
      headline: '发起审批',
      titlePlaceholder: '如：请假、报销、用印、合同会签…',
    }
  }
  return base
}

export function FormWidget({ node }: { node: SchemaNode }) {
  const { token, primaryColor, user } = useRuntime()
  const copy = useMemo(() => resolveFormCopy(node), [node])
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [resetKey, setResetKey] = useState(0)
  const accent = primaryColor || '#4338ca'

  const steps: GtgtStep[] = useMemo(
    () => [
      { key: 'title', label: copy.titleLabel, placeholder: copy.titlePlaceholder },
      { key: 'department', label: copy.deptLabel, placeholder: copy.deptPlaceholder, optional: true },
      { key: 'summary', label: copy.summaryLabel, placeholder: copy.summaryPlaceholder, optional: true },
    ],
    [copy],
  )

  const handleSubmit = async () => {
    if (!token || !values.title?.trim()) return
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/approvals', token, {
        method: 'POST',
        body: JSON.stringify({
          title: values.title.trim(),
          type: String(node.props?.approval_type || (String(node.props?.capability_key || '').includes('seal') ? 'seal' : 'general')),
          department: (values.department || '').trim() || '未填写',
          summary: (values.summary || '').trim() || values.title.trim(),
        }),
      })
      setMsg(copy.successMsg)
      setValues({})
      setResetKey((k) => k + 1)
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="widget form-widget">
      <GtgtStepComposer
        title={copy.headline}
        meta="审批录入"
        accent={accent}
        flowHint={`${copy.hint}${user?.display_name ? ` · ${user.display_name}` : ''}`}
        steps={steps}
        values={values}
        onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
        onComplete={handleSubmit}
        busy={busy}
        resetKey={resetKey}
        submitLabel={copy.submitLabel}
      >
        {msg ? <p className="status-msg">{msg}</p> : null}
      </GtgtStepComposer>
    </div>
  )
}

export function ApprovalInboxWidget(_props: { node: SchemaNode }) {
  const { token, primaryColor, user } = useRuntime()
  const [items, setItems] = useState<ApprovalItem[]>([])
  const isAdmin = user.role === 'admin'

  const load = () => {
    apiFetch<{ items: ApprovalItem[] }>('/api/v1/approvals?status=pending', token)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
  }

  useEffect(() => { load() }, [token])

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    await apiFetch(`/api/v1/approvals/${id}/action`, token, {
      method: 'POST',
      body: JSON.stringify({ action }),
    })
    load()
  }

  return (
    <div className="widget inbox-widget">
      <h3>待办中心</h3>
      {!isAdmin && <p className="muted">管理员账号可在此审批；员工账号可查看自己的待办。</p>}
      {items.length === 0 && <p className="muted">暂无待审批项</p>}
      {items.map((a) => (
        <div key={a.id} className="list-card">
          <div className="list-card-head">
            <strong>{a.title}</strong>
            <span className="tag">{a.status}</span>
          </div>
          <p>{a.applicant} · {a.department}</p>
          <p className="muted">{a.summary}</p>
          {isAdmin && a.status === 'pending' && (
            <div className="row-actions">
              <button type="button" className="btn" style={{ background: primaryColor }} onClick={() => void handleAction(a.id, 'approve')}>通过</button>
              <button type="button" className="btn btn-ghost" onClick={() => void handleAction(a.id, 'reject')}>拒绝</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export function ListWidget({ node }: { node: SchemaNode }) {
  if (node.props?.capability_key === 'approval_inbox') {
    return <ApprovalInboxWidget node={node} />
  }
  const { token } = useRuntime()
  const [items, setItems] = useState<ApprovalItem[]>([])

  useEffect(() => {
    apiFetch<{ items: ApprovalItem[] }>('/api/v1/approvals', token)
      .then((d) => setItems(d.items))
      .catch(() => setItems([]))
  }, [token])

  return (
    <div className="widget list-widget">
      <h3>我的申请</h3>
      {items.length === 0 && <p className="muted">暂无申请记录</p>}
      {items.map((a) => (
        <div key={a.id} className="list-card">
          <strong>{a.title}</strong>
          <span className="muted"> · {a.status} · {a.submitted_at}</span>
        </div>
      ))}
    </div>
  )
}
