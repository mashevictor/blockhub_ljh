import { useEffect, useState } from 'react'
import type { SchemaNode } from '@blockhub/web-core'
import { useRuntime } from '@blockhub/web-core'

interface RepairTicket {
  id: string
  assetCode: string
  location: string
  fault: string
  status: 'pending' | 'dispatched' | 'done'
  createdAt: string
}

const STORAGE_KEY = 'blockhub_device_repair_tickets'

function loadTickets(): RepairTicket[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return demoSeed()
    const parsed = JSON.parse(raw) as RepairTicket[]
    return Array.isArray(parsed) && parsed.length ? parsed : demoSeed()
  } catch {
    return demoSeed()
  }
}

function demoSeed(): RepairTicket[] {
  return [
    {
      id: 'WO-1001',
      assetCode: 'CNC-A12',
      location: '一车间·3号线',
      fault: '主轴异响，需停机检修',
      status: 'dispatched',
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
    },
  ]
}

function saveTickets(items: RepairTicket[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

const STATUS_LABEL: Record<RepairTicket['status'], string> = {
  pending: '待派工',
  dispatched: '维修中',
  done: '已完工',
}

export function DeviceRepairWidget(_props: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const [items, setItems] = useState<RepairTicket[]>([])
  const [assetCode, setAssetCode] = useState('')
  const [location, setLocation] = useState('')
  const [fault, setFault] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setItems(loadTickets())
  }, [])

  const submit = () => {
    if (!assetCode.trim() || !fault.trim()) {
      setMsg('请填写设备编号与故障描述')
      return
    }
    const next: RepairTicket = {
      id: `WO-${Date.now().toString().slice(-6)}`,
      assetCode: assetCode.trim(),
      location: location.trim() || '未填写工位',
      fault: fault.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    const list = [next, ...items]
    setItems(list)
    saveTickets(list)
    setAssetCode('')
    setLocation('')
    setFault('')
    setMsg('报修单已提交（CapShip 能力包演示：本地台账）')
  }

  const advance = (id: string) => {
    const list = items.map((t) => {
      if (t.id !== id) return t
      if (t.status === 'pending') return { ...t, status: 'dispatched' as const }
      if (t.status === 'dispatched') return { ...t, status: 'done' as const }
      return t
    })
    setItems(list)
    saveTickets(list)
  }

  return (
    <div className="widget device-repair-widget">
      <h3>设备报修工单</h3>
      <p className="muted">弹幕场景「设备报修」· CapShip 路径 A · 扫码/编号提单 → 派工 → 跟踪</p>

      <div className="device-repair-form" style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
        <label>
          设备编号
          <input
            className="input"
            value={assetCode}
            onChange={(e) => setAssetCode(e.target.value)}
            placeholder="扫码或输入 CNC-A12"
          />
        </label>
        <label>
          位置 / 工位
          <input
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="一车间·3号线"
          />
        </label>
        <label>
          故障描述
          <textarea
            className="input"
            rows={3}
            value={fault}
            onChange={(e) => setFault(e.target.value)}
            placeholder="现象、影响产线…"
          />
        </label>
        <button
          type="button"
          className="btn"
          style={{ background: primaryColor || '#0d47a1', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8, cursor: 'pointer' }}
          onClick={submit}
        >
          提交报修
        </button>
        {msg && <p className="status-msg">{msg}</p>}
      </div>

      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>工单列表</h4>
      {items.length === 0 && <p className="muted">暂无工单</p>}
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
        {items.map((t) => (
          <li
            key={t.id}
            className="list-card"
            style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, background: '#fff' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <strong>{t.id} · {t.assetCode}</strong>
              <span style={{ fontSize: 12, color: primaryColor || '#0d47a1', fontWeight: 600 }}>
                {STATUS_LABEL[t.status]}
              </span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#64748b' }}>{t.location}</p>
            <p style={{ margin: '4px 0 0', fontSize: 13 }}>{t.fault}</p>
            {t.status !== 'done' && (
              <button
                type="button"
                className="btn"
                style={{ marginTop: 8, fontSize: 12, padding: '6px 10px', cursor: 'pointer' }}
                onClick={() => advance(t.id)}
              >
                {t.status === 'pending' ? '派工' : '完工确认'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
