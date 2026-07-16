import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type CSSProperties,
} from 'react'
import {
  DeveloperBlueprintPanel,
  RuntimeContext,
  WidgetHost,
  clearAuth,
  getStoredToken,
  getStoredUser,
  login,
  type BuildManifest,
  type PageSchema,
  type SchemaNode,
  type TenantRuntimeConfig,
} from '@blockhub/web-core'
import type { CapShipComposerDockProps } from '@capship/composer'
import '@capship/composer/styles.css'
import { bootWidgetsFromManifest } from './register-widgets'

const CapShipComposerDock = lazy(() =>
  import('@capship/composer').then((m) => ({
    default: m.CapShipComposerDock as ComponentType<CapShipComposerDockProps>,
  })),
)

function parseAppId(): string | null {
  const m = window.location.pathname.match(/^\/r\/([a-z0-9]+)/i)
  return m?.[1] ?? null
}

function parseEntrySource(): 'portal' | 'im' {
  const from = (new URLSearchParams(window.location.search).get('from') || '').toLowerCase()
  if (['wecom', 'im', 'dingtalk', 'feishu', 'lark'].includes(from)) return 'im'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('wxwork') || ua.includes('dingtalk') || ua.includes('lark/') || ua.includes('feishu')) {
    return 'im'
  }
  return 'portal'
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
  const qs = window.location.search || ''
  const next = `${target}${qs}`
  if (`${window.location.pathname}${window.location.search}` !== next) {
    window.history.pushState({}, '', next)
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

function layoutOf(schema: PageSchema): string {
  const fromRoot = String(schema.root?.props?.layout || '')
  const fromTheme = String(schema.theme?.templateId || '')
  if (fromRoot === 'sidebar' || fromTheme === 'sidebar_admin') return 'sidebar'
  if (fromRoot === 'landing' || fromTheme === 'landing_single') return 'landing'
  return 'tabs'
}

export default function App() {
  const appId = useMemo(parseAppId, [])
  const entrySource = useMemo(parseEntrySource, [])
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
    setError('')

    const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, reject) => {
          window.setTimeout(() => reject(new Error(`${label} 超时（${ms / 1000}s）`)), ms)
        }),
      ])

    // 关键路径：config + schema + manifest（并行）→ 能力包并行 boot
    // 不拉整包 GET /runtime/{id}（含重复巨型 schema，且会查 APK 状态，拖慢「加载应用」）
    withTimeout(
      Promise.all([
        fetch(`/api/v1/runtime/${appId}/config`).then((r) => {
          if (!r.ok) throw new Error(`config ${r.status}`)
          return r.json()
        }),
        fetch(`/api/v1/runtime/${appId}/schema`).then((r) => {
          if (!r.ok) throw new Error(`schema ${r.status}`)
          return r.json()
        }),
        fetch(`/api/v1/runtime/${appId}/manifest`).then((r) => {
          if (!r.ok) throw new Error(`manifest ${r.status}`)
          return r.json()
        }),
      ]),
      20000,
      '应用配置',
    )
      .then(async ([cfg, sch, man]) => {
        if (cancelled) return
        const bm = (man as { build_manifest: BuildManifest }).build_manifest
        const cfgObj = cfg as TenantRuntimeConfig & {
          deliver?: string
          apk_ready?: boolean
        }
        // 先写入壳数据，再并行 boot；能力包失败不应永久卡死
        setConfig(cfgObj)
        setSchema((sch as { page_schema: PageSchema }).page_schema)
        setManifest(bm)
        if (cfgObj.deliver) setDeliver(cfgObj.deliver)
        if (cfgObj.apk_ready) setApkReady(true)
        await withTimeout(bootWidgetsFromManifest(bm), 25000, '能力模块')
        if (cancelled) return
        setWidgetsReady(true)
      })
      .catch((e) => {
        if (!cancelled) setError(String(e))
      })
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
      <div className={`login-shell${entrySource === 'im' ? ' is-im-entry' : ''}`}>
        <p className="entry-chip">{entrySource === 'im' ? '企微 / 钉钉 / 飞书 · 消息入口' : '应用门户 · 生成链接'}</p>
        <h1>{entrySource === 'im' ? '登录后处理工单' : '员工端登录'}</h1>
        <p className="muted">
          {entrySource === 'im'
            ? '你从群消息打开了报修协作页，登录后可派工选人 / 完工确认。'
            : '从官网「生成应用」打开的工作台，可提单、配置通道与问答。'}
        </p>
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

  if (error && !widgetsReady) {
    return (
      <div className="login-shell">
        <p className="error-msg">加载失败：{error}</p>
        <button type="button" className="btn" onClick={() => window.location.reload()}>
          重试
        </button>
      </div>
    )
  }

  if (!config || !schema || !manifest || !widgetsReady) {
    return <p className="loading">加载应用…</p>
  }

  const primaryColor = config.primary_color || schema.theme?.primaryColor || '#4338ca'
  const menu = schema.menu?.length ? schema.menu : config.menu.map((m) => ({ ...m, route: m.route || `/${m.key}` }))
  const layout = layoutOf(schema)
  const activeKey = menu.find((m) => m.route === route)?.key || menu[0]?.key
  const children = schema.root.children || []
  const heroNodes = children.filter((c) => c.type === 'landing_hero')
  const contentNodes = children.filter((c) => c.type !== 'landing_hero')

  let activeNode: SchemaNode | undefined =
    contentNodes.find((c) => String(c.props?.route) === route) ||
    contentNodes.find((c) => c.id === activeKey) ||
    contentNodes[0]

  // 落地页：首屏展示全部内容块；有 route 时仍可点进单能力
  const landingAll = layout === 'landing' && (!route || route === '/')

  const ctx = {
    appId,
    config,
    schema,
    manifest,
    token,
    user,
    primaryColor,
    entrySource,
  }

  const showWeb = deliver === 'web' || deliver === 'both'
  const showApp = deliver === 'app' || deliver === 'both'
  const shellClass =
    layout === 'sidebar'
      ? 'runtime-shell is-sidebar'
      : layout === 'landing'
        ? 'runtime-shell is-landing'
        : 'runtime-shell'
  const shellExtra = entrySource === 'im' ? ' is-im-entry' : ' is-portal-entry'

  return (
    <RuntimeContext.Provider value={ctx}>
      <div className={`${shellClass}${shellExtra}`} style={{ '--accent': primaryColor } as CSSProperties}>
        <div className={`entry-banner ${entrySource === 'im' ? 'im' : 'portal'}`} role="status">
          {entrySource === 'im' ? (
            <>
              <strong>群消息协作入口</strong>
              <span>流程：提单 → 派工选人 → 维修 → 完工。当前请处理工单或确认状态。</span>
            </>
          ) : (
            <>
              <strong>应用工作台</strong>
              <span>官网生成链接打开 · 可提单、配置企微推送、智能问答。</span>
            </>
          )}
        </div>
        <header className="runtime-header">
          <div className="brand">
            {config.app_icon_url ? (
              <img src={config.app_icon_url} alt="" width={40} height={40} className="logo" />
            ) : (
              <div className="logo placeholder">{config.app_name.slice(0, 1)}</div>
            )}
            <div>
              <h1>{config.app_name}</h1>
              <p className="muted">
                {user.display_name} · {user.role}
                {entrySource === 'im' ? ' · 来自企微/钉钉/飞书' : ' · 应用门户'}
                {layout === 'sidebar' ? ' · 侧栏' : layout === 'landing' ? ' · 落地' : ''}
              </p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={handleLogout}>退出</button>
        </header>

        <div className="runtime-body">
          {layout === 'sidebar' ? (
            <aside className="runtime-sidebar">
              {menu.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`nav-btn sidebar-btn${item.route === route || item.key === activeKey ? ' active' : ''}`}
                  onClick={() => navigateRoute(appId, item.route || '/')}
                >
                  {item.label}
                </button>
              ))}
            </aside>
          ) : (
            <nav className="runtime-nav runtime-nav-mobile">
              {menu.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`nav-btn${item.route === route || item.key === activeKey ? ' active' : ''}`}
                  onClick={() => navigateRoute(appId, item.route || '/')}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}

          <main className="runtime-main">
            {showWeb ? (
              landingAll ? (
                <div className="landing-stack">
                  {heroNodes.map((n) => (
                    <WidgetHost key={n.id} node={n} ctx={ctx} />
                  ))}
                  {contentNodes.map((n) => (
                    <section key={n.id} className="landing-block">
                      <WidgetHost node={n} ctx={ctx} />
                    </section>
                  ))}
                </div>
              ) : activeNode ? (
                <WidgetHost node={activeNode} ctx={ctx} />
              ) : (
                <p className="muted">暂无页面</p>
              )
            ) : (
              <p className="muted">此应用未启用网页端</p>
            )}
          </main>
        </div>

        {showApp && (
          <footer className="runtime-footer">
            <a className="btn" href={`/api/v1/runtime/${appId}/download`} style={{ opacity: apkReady ? 1 : 0.5 }}>
              下载 Android APK
            </a>
            <span className="muted">已加载包：{manifest.web_pkgs.join(', ')}</span>
          </footer>
        )}

        <DeveloperBlueprintPanel
          mode="app"
          appId={appId}
          token={token}
          role={user.role}
          accent={primaryColor}
        />

        <Suspense fallback={null}>
          <CapShipComposerDock
            storageKey="capship-runtime-dock-v3"
            defaultOpen
            appId={appId}
            token={token}
            capability_keys={schema.capability_keys}
            page_schema={schema as never}
            build_manifest={manifest}
            defaultMode={"live_edit" as const}
            onSchemaPatch={(next: unknown) => setSchema(next as PageSchema)}
            onSaved={(result: { page_schema?: unknown; capability_keys?: string[] }) => {
              if (result.page_schema) setSchema(result.page_schema as PageSchema)
              if (result.capability_keys?.length) {
                setManifest((prev) =>
                  prev ? { ...prev, capability_keys: result.capability_keys as string[] } : prev,
                )
              }
              void fetch(`/api/v1/runtime/${appId}/manifest`)
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => {
                  if (!data?.build_manifest) return
                  setManifest(data.build_manifest)
                  return bootWidgetsFromManifest(data.build_manifest)
                })
                .catch(() => undefined)
            }}
          />
        </Suspense>
      </div>
    </RuntimeContext.Provider>
  )
}
