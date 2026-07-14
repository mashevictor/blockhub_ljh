import { useState } from 'react'
import { useRuntime, type SchemaNode } from '@blockhub/web-core'

const PROVIDERS = [
  { id: 'wecom', name: '企业微信', desc: 'OAuth2 扫码 → JWT（P4-I2）' },
  { id: 'dingtalk', name: '钉钉', desc: '扫码登录（后续里程碑）' },
  { id: 'ldap', name: 'LDAP / AD', desc: '域账号（P4-I4）' },
]

export default function SSOWidget(_props: { node: SchemaNode }) {
  const { primaryColor } = useRuntime()
  const [active, setActive] = useState('wecom')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const provider = PROVIDERS.find((p) => p.id === active) ?? PROVIDERS[0]

  const startWecom = async () => {
    setBusy(true)
    setStatus('')
    try {
      const res = await fetch('/api/v1/auth/oauth/wecom/start')
      const data = (await res.json()) as { authorize_url?: string; detail?: string }
      if (!res.ok) {
        const detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail || data)
        if (res.status === 503) {
          setStatus('企微 SSO 未配置：请设置 WECOM_CORP_ID / WECOM_AGENT_ID / WECOM_SECRET 后重试')
        } else {
          setStatus(`启动失败：${detail}`)
        }
        return
      }
      if (data.authorize_url) {
        setStatus('正在跳转企业微信授权…')
        window.location.href = data.authorize_url
        return
      }
      setStatus('未返回授权地址')
    } catch (e) {
      setStatus(`启动失败：${String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const onPrimary = () => {
    if (active === 'wecom') {
      void startWecom()
      return
    }
    setStatus(`${provider.name} 尚未在本轮开放（见项目计划 P4-I4）`)
  }

  return (
    <div className="widget sso-widget">
      <h3>SSO 单点登录</h3>
      <p className="muted">选择身份源；企业微信已接真 OAuth 路由</p>
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
          disabled={busy}
          onClick={onPrimary}
        >
          {busy ? '跳转中…' : active === 'wecom' ? '企微扫码登录' : '查看状态'}
        </button>
      </div>
      {status && <p className="status-msg">{status}</p>}
    </div>
  )
}
