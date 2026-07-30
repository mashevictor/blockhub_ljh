import { useEffect, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import { fetchTenantConfig, updateTenantConfig } from '../api/client'

const MENU_PRESETS = [
  { key: 'chat_qa', icon: 'chat' },
  { key: 'approval_flow', icon: 'approval' },
  { key: 'shanghai_voice', icon: 'mic' },
  { key: 'chart_dashboard', icon: 'chart' },
] as const

export default function TenantSettingsPage() {
  const t = useT()
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
        label: t(`admin.menu.${m.key}`),
        icon: m.icon,
      }))
      await updateTenantConfig({ app_name: appName, primary_color: primaryColor, theme, menu })
      setMsg(t('admin.settings.saved'))
    } catch {
      setMsg(t('admin.err.save_failed'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="placeholder-page"><div className="icon">⏳</div><h2>{t('common.loading')}</h2></div>
  }

  return (
    <>
      <div className="page-header">
        <h1>{t('admin.page.settings.title')}</h1>
        <p>{t('admin.page.settings.desc')}</p>
      </div>

      <div className="card">
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.settings.app_name')}</span>
          <input className="search-input" style={{ display: 'block', marginTop: 6, width: '100%' }} value={appName} onChange={(e) => setAppName(e.target.value)} />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.settings.primary_color')}</span>
          <input className="search-input" type="color" style={{ display: 'block', marginTop: 6, width: 80, height: 36, padding: 2 }} value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} />
        </label>
        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{t('admin.settings.theme')}</span>
          <select className="search-input" style={{ display: 'block', marginTop: 6 }} value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="light">{t('admin.settings.theme_light')}</option>
            <option value="dark">{t('admin.settings.theme_dark')}</option>
          </select>
        </label>

        <h3 style={{ fontSize: 14, marginBottom: 8 }}>{t('admin.settings.menu')}</h3>
        <div className="scenario-check-grid">
          {MENU_PRESETS.map((m) => (
            <label key={m.key} className={`scenario-check${menuKeys.includes(m.key) ? ' checked' : ''}`}>
              <input type="checkbox" checked={menuKeys.includes(m.key)} onChange={() => toggleMenu(m.key)} />
              {t(`admin.menu.${m.key}`)}
            </label>
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
          <button type="button" className="btn btn-primary-dark" disabled={saving} onClick={() => void handleSave()}>
            {saving ? t('common.saving') : t('admin.settings.save')}
          </button>
          {msg && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{msg}</span>}
        </div>
      </div>
    </>
  )
}
