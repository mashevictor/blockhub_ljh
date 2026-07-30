import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTf } from '@blockhub/i18n/react'
import type { SchemaNode } from '@blockhub/web-core'
import { apiFetch, GtgtStepComposer, useRuntime, type GtgtStep } from '@blockhub/web-core'

interface RepairTicket {
  id: string
  ticket_no: string
  asset_code: string
  location: string
  fault: string
  status: 'pending' | 'dispatched' | 'done' | string
  created_at: string
  reporter_name?: string
  assignee_id?: string | null
  assignee_name?: string
}

interface AssigneeCandidate {
  id: string
  name: string
  email: string
  role: string
}

export function DeviceRepairWidget(_props: { node: SchemaNode }) {
  const tf = useTf()
  const { token, primaryColor, appId, user, entrySource } = useRuntime()
  const statusLabel = useCallback(
    (key: string) => tf(`cap.device_repair.status.${key}`, key),
    [tf],
  )
  const [items, setItems] = useState<RepairTicket[]>([])
  const [candidates, setCandidates] = useState<AssigneeCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(entrySource !== 'im')

  const [dispatchId, setDispatchId] = useState<string | null>(null)
  const [pickId, setPickId] = useState('')
  const [pickName, setPickName] = useState('')

  const steps: GtgtStep[] = useMemo(
    () => [
      {
        key: 'asset_code',
        label: tf('cap.device_repair.field.asset_code', '设备编号'),
        placeholder: tf('cap.device_repair.ph.asset_code', '扫码或输入，如 CNC-A12'),
      },
      {
        key: 'location',
        label: tf('cap.device_repair.field.location', '位置/工位'),
        placeholder: tf('cap.device_repair.ph.location', '一车间·3号线（可留空）'),
        optional: true,
      },
      {
        key: 'fault',
        label: tf('cap.device_repair.field.fault', '故障描述'),
        placeholder: tf('cap.device_repair.ph.fault', '现象、是否停机、影响产线…'),
      },
    ],
    [tf],
  )

  const load = useCallback(async () => {
    if (!token) {
      setItems([])
      setLoading(false)
      setError('请先登录后查看工单')
      return
    }
    setLoading(true)
    setError('')
    try {
      const q = appId ? `?app_id=${encodeURIComponent(appId)}` : ''
      const data = await apiFetch<{ items: RepairTicket[] }>(`/api/v1/device-repair/tickets${q}`, token)
      setItems(data.items || [])
    } catch (e) {
      setItems([])
      setError(`加载失败：${String(e)}`)
    } finally {
      setLoading(false)
    }
  }, [token, appId])

  const loadCandidates = useCallback(async () => {
    if (!token) return
    try {
      const data = await apiFetch<{ items: AssigneeCandidate[] }>('/api/v1/device-repair/assignees', token)
      setCandidates(data.items || [])
    } catch {
      setCandidates([])
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadCandidates()
  }, [loadCandidates])

  const submit = async () => {
    if (!values.asset_code?.trim() || !values.fault?.trim()) {
      setMsg('请填写设备编号与故障描述')
      return
    }
    if (!token) {
      setMsg('请先登录')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch('/api/v1/device-repair/tickets', token, {
        method: 'POST',
        body: JSON.stringify({
          asset_code: values.asset_code.trim(),
          location: (values.location || '').trim(),
          fault: values.fault.trim(),
          app_public_id: appId || '',
        }),
      })
      setValues({})
      setResetKey((k) => k + 1)
      setMsg('报修已提交并通知群；同事可用同一 Runtime 链接登录后派工')
      await load()
    } catch (e) {
      setMsg(`提交失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const openDispatch = (id: string) => {
    setDispatchId(id)
    setPickId('')
    setPickName('')
    setMsg('')
    void loadCandidates()
  }

  const confirmDispatch = async () => {
    if (!token || !dispatchId) return
    const name = pickName.trim()
    if (!pickId && !name) {
      setMsg('请选择维修工或手填姓名')
      return
    }
    setBusy(true)
    setMsg('')
    try {
      await apiFetch(`/api/v1/device-repair/tickets/${dispatchId}/action`, token, {
        method: 'POST',
        body: JSON.stringify({
          action: 'dispatch',
          assignee_id: pickId || '',
          assignee_name: name,
        }),
      })
      setDispatchId(null)
      setMsg('已派工，群消息会带上维修工姓名')
      await load()
    } catch (e) {
      setMsg(`派工失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const complete = async (id: string) => {
    if (!token) return
    try {
      await apiFetch(`/api/v1/device-repair/tickets/${id}/action`, token, {
        method: 'POST',
        body: JSON.stringify({ action: 'complete' }),
      })
      setMsg('已完工确认')
      await load()
    } catch (e) {
      setMsg(`操作失败：${String(e)}`)
    }
  }

  const accent = primaryColor || '#0d47a1'
  const pendingCount = items.filter((t) => t.status === 'pending').length
  const busyCount = items.filter((t) => t.status === 'dispatched').length
  const processActive =
    pendingCount > 0 ? 1 : busyCount > 0 ? 2 : items.some((t) => t.status === 'done') ? 3 : 0

  return (
    <div className="widget device-repair-widget" style={{ ['--accent' as string]: accent }}>
      <p className="muted">
        {entrySource === 'im'
          ? '你从企微/钉钉/飞书打开 · 优先处理下方待派工/维修中工单'
          : '工作台提单 · 同事可从群消息深链登录同一应用协作'}
        {user?.display_name ? ` · ${user.display_name}` : ''}
      </p>

      <p className="muted" style={{ marginBottom: 4 }}>业务流程图 · 当前位置高亮</p>
      <ol className="bh-process-flow" aria-label="报修业务全流程">
        <li className={processActive === 0 && showForm ? 'is-active' : processActive > 0 ? 'is-done' : ''}>① 提单</li>
        <span className="arrow" aria-hidden>→</span>
        <li className={processActive === 1 ? 'is-active' : processActive > 1 ? 'is-done' : ''}>
          ② 派工选人{pendingCount ? `（${pendingCount}）` : ''}
        </li>
        <span className="arrow" aria-hidden>→</span>
        <li className={processActive === 2 ? 'is-active' : processActive > 2 ? 'is-done' : ''}>
          ③ 维修中{busyCount ? `（${busyCount}）` : ''}
        </li>
        <span className="arrow" aria-hidden>→</span>
        <li className={processActive === 3 ? 'is-done' : ''}>④ 完工</li>
      </ol>

      {!showForm ? (
        <div className="bh-flow-actions" style={{ marginBottom: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={() => setShowForm(true)}>
            我也要提单报修
          </button>
        </div>
      ) : (
        <GtgtStepComposer
          title={tf('cap.device_repair.title', '设备报修')}
          meta={entrySource === 'im' ? '群消息入口' : '应用工作台'}
          accent={accent}
          flowHint={`提单 → 派工 → 维修 → 完工${user?.display_name ? ` · ${user.display_name}` : ''}`}
          steps={steps}
          values={values}
          onChange={(k, v) => setValues((p) => ({ ...p, [k]: v }))}
          onComplete={submit}
          busy={busy}
          resetKey={resetKey}
          submitLabel={tf('cap.device_repair.submit', '提交报修')}
        />
      )}
      {msg && <p className="status-msg">{msg}</p>}
      {error && <p className="status-msg" style={{ color: '#b91c1c' }}>{error}</p>}

      {dispatchId && (
        <div className="list-card" style={{ marginTop: 16, borderColor: accent }}>
          <strong>派工 · 选择维修工</strong>
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 10px' }}>
            从本租户账号选人，或手填外部师傅姓名（企微群里其他人登录同一链接也能看到并操作）
          </p>
          <div style={{ display: 'grid', gap: 8 }}>
            {candidates.map((c) => (
              <button
                key={c.id}
                type="button"
                className={pickId === c.id ? 'btn' : 'btn btn-ghost'}
                style={pickId === c.id ? { background: accent, textAlign: 'left' } : { textAlign: 'left' }}
                onClick={() => {
                  setPickId(c.id)
                  setPickName(c.name)
                }}
              >
                {c.name}
                {c.role ? ` · ${c.role}` : ''}
                {c.email ? ` · ${c.email}` : ''}
              </button>
            ))}
            {candidates.length === 0 && <p className="muted">暂无候选人列表，可直接手填姓名</p>}
            <label>
              或手填维修工姓名
              <input
                className="input"
                value={pickName}
                onChange={(e) => {
                  setPickName(e.target.value)
                  setPickId('')
                }}
                placeholder="如：张三（外协）"
              />
            </label>
          </div>
          <div className="bh-flow-actions" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setDispatchId(null)}>
              取消
            </button>
            <button
              type="button"
              className="btn"
              style={{ background: accent }}
              disabled={busy || (!pickId && !pickName.trim())}
              onClick={() => void confirmDispatch()}
            >
              {busy
                ? tf('cap.device_repair.dispatching', '派工中…')
                : tf('cap.device_repair.dispatch', '确认派工')}
            </button>
          </div>
        </div>
      )}

      <h4 style={{ margin: '20px 0 8px', fontSize: 14 }}>本应用工单（同租户可见）</h4>
      {loading && <p className="muted">加载中…</p>}
      {!loading && items.length === 0 && <p className="muted">暂无工单，按步骤提交后写入数据库</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li key={t.id} className="list-card">
            <div className="list-card-head">
              <strong>{t.ticket_no || t.id} · {t.asset_code}</strong>
              <span className="tag" style={{ color: accent }}>{statusLabel(t.status)}</span>
            </div>
            <p className="muted" style={{ margin: '6px 0 0' }}>{t.location}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.fault}</p>
            <p className="muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
              报修：{t.reporter_name || '—'}
              {t.assignee_name ? ` · 维修：${t.assignee_name}` : ''}
            </p>
            {t.status === 'pending' && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginTop: 8, fontSize: 12 }}
                onClick={() => openDispatch(t.id)}
              >
                派工选人
              </button>
            )}
            {t.status === 'dispatched' && (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ marginTop: 8, fontSize: 12 }}
                onClick={() => void complete(t.id)}
              >
                完工确认
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
