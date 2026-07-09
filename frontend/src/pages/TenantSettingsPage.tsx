import { useEffect, useState } from 'react'
import { fetchTenantConfig, updateTenantConfig } from '../api/client'

const MENU_PRESETS = [
  { key: 'chat_qa', label: '智能问答', icon: 'chat' },
  { key: 'approval_flow', label: '审批', icon: 'approval' },
  { key: 'shanghai_voice', label: '上海话语音', icon: 'mic' },
  { key: 'chart_dashboard', label: '数据看板', icon: 'chart' },
]

export default function TenantSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [appName, setAppName] = useState('TrackChat')
  const [primaryColor, setPrimaryColor] = useState('#4338ca')
  const [theme, setTheme] = useState('light')
  const [menuKeys, setMenuKeys] = useState<string[]>(['chat_qa', 'approval_flow'])

  useEffect(() => {
    fetchTenantConfig()
      .then((cfg) => {
        setAppName(cfg.app_name || 'TrackChat')
        setPrimaryColor(cfg.primary_color || '#4338ca')
        setTheme(cfg.theme || 'light')
        const keys = (cfg.menu || []).map((m) => m.key)
        if (keys.length) setMenuKeys(keys)
      })
      .finally(() => setLoading(false))
  }, [])

  const toggleMenu = (key: string) => {
    setMenuKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg('')
    try {
      const menu = MENU_PRESETS.filter((m) => menuKeys.includes(m.key)).map((m) => ({
        key: m.key,
        label: m.label,
        icon: m.icon,
      }))
      await updateTenantConfig({ app_name: appName, primary_color: primaryColor, theme, menu })
      setMsg('已保存 · runtime-web / Flutter 下次拉取 /tenant/config 时生效')
    } catch {
      setMsg('保存失败，请确认管理员权限')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="placeholder-page"><div className="icon">⏳</div><h2>加载租户配置…</h2></div>
  }

  return (
    <>
      <div className="page-header">
        <h1>租户配置</h1>
        <p>主题色、应用名与默认菜单 · 写入 PostgreSQL · W4 D23</p>
      </div>

      <div className="card">
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>应用名称</span>
          <input className="search-input" style={{ display: 'block', marginTop: 6, width: '100%' }} value={appName} onChange={(e) => setAppName(e.target.value)} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>主题色</span>
          <input className="search-input" type="color" style={{ display: 'block', marginTop: 6, width: 80, height: 36, padding: 2 }} value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>主题模式</span>
          <select className="search-input" style={{ display: 'block', marginTop: 6 }} value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="light">浅色</option>
            <option value="dark">深色</option>
          </select>
        </label>

        <h3 style={{ fontSize: 14, marginBottom: 8 }}>默认菜单（Flutter / 演示租户）</h3>
        <div className="scenario-check-grid">
          {MENU_PRESETS.map((m) => (
            <label key={m.key} className={`scenario-check${menuKeys.includes(m.key) ? ' checked' : ''}`}>
              <input type="checkbox" checked={menuKeys.includes(m.key)} onChange={() => toggleMenu(m.key)} />
              {m.label}
            </label>
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" className="btn btn-primary-dark" disabled={saving} onClick={() => void handleSave()}>
            {saving ? '保存中…' : '保存配置'}
          </button>
          {msg && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{msg}</span>}
        </div>
      </div>
    </>
  )
}
