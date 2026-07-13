import { useState } from 'react'
import { useRuntime, type SchemaNode } from '@blockhub/web-core'

const PROVIDERS = [
  { id: 'wecom', name: '企业微信', desc: 'OAuth2 + 应用消息' },
  { id: 'dingtalk', name: '钉钉', desc: '扫码登录 + 通讯录同步' },
  { id: 'ldap', name: 'LDAP / AD', desc: '域账号统一认证' },
]

export default function SSOWidget(_props: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const [active, setActive] = useState('wecom')
  const [status, setStatus] = useState('')

  const provider = PROVIDERS.find((p) => p.id === active) ?? PROVIDERS[0]

  return (
    <div className="widget sso-widget">
      <h3>SSO 单点登录</h3>
      <p className="muted">选择身份源并测试登录跳转</p>
      <div className="agent-picker">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`agent-chip${active === p.id ? ' active' : ''}`}
            style={active === p.id ? { borderColor: primaryColor, color: primaryColor } : undefined}
            onClick={() => setActive(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <p className="agent-desc">{provider.desc}</p>
      <div className="row-actions">
        <button
          type="button"
          className="btn"
          style={{ background: primaryColor }}
          onClick={() => setStatus(`${provider.name} 连接测试通过（演示）`)}
        >
          测试连接
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => setStatus(`${provider.name} 登录页已生成（演示）`)}>
          预览登录页
        </button>
      </div>
      {status && <p className="status-msg">{status}</p>}
    </div>
  )
}
