import { useState } from 'react'
import { useRuntime, type SchemaNode } from '@blockhub/web-core'

const OA_SYSTEMS = [
  { id: 'weaver', name: '泛微 e-cology', status: '已连接' },
  { id: 'seeyon', name: '致远 A8', status: '待配置' },
  { id: 'landray', name: '蓝凌 MK', status: '待配置' },
]

export default function OAWidget(_props: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const [active, setActive] = useState('weaver')
  const [msg, setMsg] = useState('')

  const sys = OA_SYSTEMS.find((s) => s.id === active) ?? OA_SYSTEMS[0]

  return (
    <div className="widget oa-widget">
      <h3>OA 连接器</h3>
      <p className="muted">对接 OA 审批流与组织架构同步</p>
      <div className="agent-picker">
        {OA_SYSTEMS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`agent-chip${active === s.id ? ' active' : ''}`}
            style={active === s.id ? { borderColor: primaryColor, color: primaryColor } : undefined}
            onClick={() => setActive(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>
      <p className="agent-desc">状态：{sys.status}</p>
      <div className="row-actions">
        <button type="button" className="btn" style={{ background: primaryColor }} onClick={() => setMsg('流程映射测试通过（演示）')}>
          测试 Webhook
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setMsg('最近同步：2 分钟前（演示）')}>
          查看同步日志
        </button>
      </div>
      {msg && <p className="status-msg">{msg}</p>}
    </div>
  )
}
