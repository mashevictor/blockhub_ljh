import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  RuntimeContext,
  WidgetHost,
  clearAuth,
  getStoredToken,
  getStoredUser,
  login,
  type BuildManifest,
  type PageSchema,
  type TenantRuntimeConfig,
} from '@blockhub/web-core'
import { bootWidgetsFromManifest } from './register-widgets'

function parseAppId(): string | null {
  const m = window.location.pathname.match(/^\/r\/([a-z0-9]+)/i)
  return m?.[1] ?? null
}

function routeFromPath(appId: string): string {
  const prefix = `/r/${appId}`
  const path = window.location.pathname
  if (!path.startsWith(prefix)) return '/'
  const rest = path.slice(prefix.length) || '/'
  return rest.endsWith('/') && rest.length > 1 ? rest.slice(0, -1) : rest
}

function navigateRoute(appId: string, route: string) {
  const base = `/r/${appId}`
  const target = route === '/' ? base : `${base}${route}`
  if (window.location.pathname !== target) {
    window.history.pushState({}, '', target)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

export default function App() {
  const appId = useMemo(parseAppId, [])
  const [route, setRoute] = useState(() => (appId ? routeFromPath(appId) : '/'))
  const [token, setToken] = useState(getStoredToken)
  const [user, setUser] = useState(getStoredUser)
  const [config, setConfig] = useState<TenantRuntimeConfig | null>(null)
  const [schema, setSchema] = useState<PageSchema | null>(null)
  const [manifest, setManifest] = useState<BuildManifest | null>(null)
  const [widgetsReady, setWidgetsReady] = useState(false)
  const [deliver, setDeliver] = useState('both')
  const [apkReady, setApkReady] = useState(false)
  const [error, setError] = useState('')
  const [loginEmail, setLoginEmail] = useState('employee@trackchat.local')
  const [loginPassword, setLoginPassword] = useState('emp123')
  const [loginBusy, setLoginBusy] = useState(false)

  useEffect(() => {
    if (!appId) return
    const onPop = () => setRoute(routeFromPath(appId))
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [appId])

  useEffect(() => {
    if (!appId || !token) return
    let cancelled = false
    setWidgetsReady(false)
    Promise.all([
      fetch(`/api/v1/runtime/${appId}/config`).then((r) => r.json()),
      fetch(`/api/v1/runtime/${appId}/schema`).then((r) => r.json()),
      fetch(`/api/v1/runtime/${appId}/manifest`).then((r) => r.json()),
      fetch(`/api/v1/runtime/${appId}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(async ([cfg, sch, man, meta]) => {
        if (cancelled) return
        const bm = (man as { build_manifest: BuildManifest }).build_manifest
        await bootWidgetsFromManifest(bm)
        if (cancelled) return
        setConfig(cfg as TenantRuntimeConfig)
        setSchema((sch as { page_schema: PageSchema }).page_schema)
        setManifest(bm)
        setWidgetsReady(true)
        if (meta?.deliver) setDeliver(meta.deliver)
        if (meta?.apk_ready) setApkReady(true)
      })
      .catch((e) => setError(String(e)))
    return () => {
      cancelled = true
    }
  }, [appId, token])

  const handleLogin = async () => {
    setLoginBusy(true)
    setError('')
    try {
      const res = await login(loginEmail, loginPassword)
      setToken(res.token)
      setUser(res.user)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoginBusy(false)
    }
  }

  const handleLogout = () => {
    clearAuth()
    setToken('')
    setUser(null)
    setConfig(null)
    setSchema(null)
    setManifest(null)
    setWidgetsReady(false)
  }

  if (!appId) {
    return <p className="error-msg">无效的应用链接，请使用 /r/&#123;appId&#125; 访问</p>
  }

  if (!token || !user) {
    return (
      <div className="login-shell">
        <h1>员工端登录</h1>
        <p className="muted">应用 ID：{appId}</p>
        <label>
          邮箱
          <input className="input" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
        </label>
        <label>
          密码
          <input className="input" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
        </label>
        <p className="muted">演示：员工 emp123 · 管理员 admin123</p>
        <button type="button" className="btn" disabled={loginBusy} onClick={() => void handleLogin()}>
          {loginBusy ? '登录中…' : '登录'}
        </button>
        {error && <p className="error-msg">{error}</p>}
      </div>
    )
  }

  if (error && !config) {
    return <p className="error-msg">加载失败：{error}</p>
  }

  if (!config || !schema || !manifest || !widgetsReady) {
    return <p className="loading">加载应用…</p>
  }

  const primaryColor = config.primary_color || schema.theme?.primaryColor || '#4338ca'
  const menu = schema.menu?.length ? schema.menu : config.menu.map((m) => ({ ...m, route: m.route || `/${m.key}` }))
  const activeKey = menu.find((m) => m.route === route)?.key || menu[0]?.key
  const activeNode =
    schema.root.children?.find((c) => String(c.props?.route) === route) ||
    schema.root.children?.find((c) => c.id === activeKey) ||
    schema.root.children?.[0]

  const ctx = {
    appId,
    config,
    schema,
    manifest,
    token,
    user,
    primaryColor,
  }

  const showWeb = deliver === 'web' || deliver === 'both'
  const showApp = deliver === 'app' || deliver === 'both'

  return (
    <RuntimeContext.Provider value={ctx}>
      <div className="runtime-shell" style={{ '--accent': primaryColor } as CSSProperties}>
        <header className="runtime-header">
          <div className="brand">
            {config.app_icon_url ? (
              <img src={config.app_icon_url} alt="" width={40} height={40} className="logo" />
            ) : (
              <div className="logo placeholder">{config.app_name.slice(0, 1)}</div>
            )}
            <div>
              <h1>{config.app_name}</h1>
              <p className="muted">{user.display_name} · {user.role}</p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>退出</button>
        </header>

        <nav className="runtime-nav">
          {menu.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-btn${item.route === route ? ' active' : ''}`}
              onClick={() => navigateRoute(appId, item.route || '/')}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <main className="runtime-main">
          {showWeb && activeNode ? (
            <WidgetHost node={activeNode} ctx={ctx} />
          ) : (
            <p className="muted">此应用未启用网页端</p>
          )}
        </main>

        {showApp && (
          <footer className="runtime-footer">
            <a className="btn" href={`/api/v1/runtime/${appId}/download`} style={{ opacity: apkReady ? 1 : 0.5 }}>
              下载 Android APK
            </a>
            <span className="muted">已加载包：{manifest.web_pkgs.join(', ')}</span>
          </footer>
        )}
      </div>
    </RuntimeContext.Provider>
  )
}
