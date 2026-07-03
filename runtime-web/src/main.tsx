import { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { TenantRuntimeConfig } from './schema-renderer/types'

function parseAppId(): string | null {
  const m = window.location.pathname.match(/^\/r\/([a-z0-9]+)/i)
  return m?.[1] ?? null
}

function RuntimeShell() {
  const appId = useMemo(parseAppId, [])
  const [config, setConfig] = useState<TenantRuntimeConfig | null>(null)
  const [deliver, setDeliver] = useState<string>('both')
  const [apkReady, setApkReady] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!appId) {
      setError('无效的应用链接，请使用 /r/{appId} 访问')
      return
    }

    const qs = new URLSearchParams({ tenant: 'demo', app_id: appId })
    Promise.all([
      fetch(`/api/v1/tenant/config?${qs}`).then((r) => {
        if (!r.ok) throw new Error(`配置加载失败 HTTP ${r.status}`)
        return r.json()
      }),
      fetch(`/api/v1/runtime/${appId}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([cfg, meta]) => {
        setConfig(cfg as TenantRuntimeConfig)
        if (meta?.deliver) setDeliver(meta.deliver)
        if (meta?.apk_ready) setApkReady(true)
      })
      .catch((e) => setError(String(e)))
  }, [appId])

  if (error) return <p style={{ color: 'crimson', padding: 24 }}>加载失败: {error}</p>
  if (!config) return <p style={{ padding: 24 }}>加载应用…</p>

  const showWeb = deliver === 'web' || deliver === 'both'
  const showApp = deliver === 'app' || deliver === 'both'
  const downloadUrl = appId ? `/api/v1/runtime/${appId}/download` : ''

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24, maxWidth: 640, margin: '0 auto' }}>
      <header style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {config.app_icon_url ? (
          <img src={config.app_icon_url} alt="" width={48} height={48} style={{ borderRadius: 12 }} />
        ) : (
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: config.primary_color,
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700,
            }}
          >
            {config.app_name.slice(0, 1)}
          </div>
        )}
        <div>
          <h1 style={{ margin: 0 }}>{config.app_name}</h1>
          <p style={{ margin: 0, color: '#666' }}>{config.tenant_name}</p>
        </div>
      </header>

      <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {showWeb && <span style={{ padding: '4px 10px', borderRadius: 8, background: '#eef2ff', color: '#4338ca' }}>网页版</span>}
        {showApp && <span style={{ padding: '4px 10px', borderRadius: 8, background: '#ecfdf5', color: '#059669' }}>Android App</span>}
      </div>

      <nav style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {config.menu.map((item) => (
          <button
            key={item.key}
            type="button"
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${config.primary_color}`,
              background: '#fff',
              color: config.primary_color,
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {showApp && (
        <div style={{ marginTop: 24, padding: 16, borderRadius: 12, border: '1px solid #e5e7eb' }}>
          <strong>下载 Android 应用</strong>
          <p style={{ fontSize: 13, color: '#666' }}>
            {apkReady ? '安装包已就绪，点击下方按钮下载。' : 'APK 构建中或未上传，请联系管理员执行 CI 打包。'}
          </p>
          <a
            href={downloadUrl}
            style={{
              display: 'inline-block',
              marginTop: 8,
              padding: '10px 16px',
              borderRadius: 8,
              background: apkReady ? config.primary_color : '#9ca3af',
              color: '#fff',
              textDecoration: 'none',
              pointerEvents: apkReady ? 'auto' : 'none',
            }}
          >
            下载 APK
          </a>
        </div>
      )}

      <p style={{ marginTop: 24, color: '#888', fontSize: 13 }}>
        Web 员工端运行时 · 与 Flutter App 共用 tenant/config 与 page_schema（W5 接入完整渲染）
      </p>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<RuntimeShell />)
