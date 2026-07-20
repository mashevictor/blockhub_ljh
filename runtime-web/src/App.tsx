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
import { bootWidgetsFromManifest, ensurePkgsLoaded } from './register-widgets'
import {
  getMicrositeRuntimeSkin,
  isIndustrySiteEntry,
} from './micrositeRuntimeSkin'
import IndustrySiteHome from './IndustrySiteHome'
import './styles-microsite-skins.css'

const CapShipComposerDock = lazy(() =>
  import('@capship/composer').then(async (m) => {
    await import('@capship/composer/styles.css')
    return {
      default: m.CapShipComposerDock as ComponentType<CapShipComposerDockProps>,
    }
  }),
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

/** 仅本应用菜单/节点用到的能力，避免行业全量装配污染 boot / 契约 / 页脚 */
function scopedKeysFromSchema(schema: PageSchema | null | undefined): string[] {
  if (!schema) return []
  const ordered: string[] = []
  const seen = new Set<string>()
  const add = (raw: unknown) => {
    const k = String(raw || '').trim()
    if (!k || seen.has(k)) return
    seen.add(k)
    ordered.push(k)
  }
  for (const m of schema.menu || []) add((m as { capability_key?: string }).capability_key)
  for (const n of schema.root?.children || []) add(n.props?.capability_key)
  if (!ordered.length) {
    for (const k of schema.capability_keys || []) add(k)
  }
  return ordered
}

function scopeManifestToApp(manifest: BuildManifest, schema: PageSchema): BuildManifest {
  const keys = scopedKeysFromSchema(schema)
  if (!keys.length) return manifest
  // 后端 GET /manifest 已按 registry.web_pkg（含 chat/approval/integration 共享包）现算；
  // 勿按 slug≈key 过滤，否则 notify_im→integration 会被误删，导致「尚未接入」。
  const pkgs =
    (manifest.web_pkgs || []).length > 0
      ? [...manifest.web_pkgs]
      : keys.map((k) => `@blockhub/web-capability-${k.replace(/_/g, '-')}`)
  return {
    ...manifest,
    capability_keys: keys,
    web_pkgs: pkgs,
  }
}

function folderMatch(pkg: string, capabilityKey: string): boolean {
  const folder = pkg.split('/').pop() || pkg
  const slug = capabilityKey.replace(/_/g, '-')
  // 共享包：approval_flow → web-capability-approval
  if (folder === `web-capability-${slug}`) return true
  if (folder === `web-capability-${slug.split('-')[0]}`) return true
  if (capabilityKey.startsWith('approval') && folder === 'web-capability-approval') return true
  if (capabilityKey.startsWith('notify') && folder === 'web-capability-integration') return true
  if ((capabilityKey.startsWith('chat') || capabilityKey === 'kb_document') && folder === 'web-capability-chat') {
    return true
  }
  return folder.includes(slug)
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
  const [schemaView, setSchemaView] = useState<'formal' | 'personal_draft'>('formal')
  const [changeStatus, setChangeStatus] = useState('')
  const [error, setError] = useState('')
  const [loginEmail, setLoginEmail] = useState('employee@trackchat.local')
  const [loginPassword, setLoginPassword] = useState('emp123')
  const [loginBusy, setLoginBusy] = useState(false)
  /** 独立站：仅会话内换皮；初始以 schema 发布选择为准（勿被旧 localStorage 抢默认） */
  const [skinOverride, setSkinOverride] = useState<string | null>(null)

  useEffect(() => {
    if (!appId) return
    // 清理会覆盖「用户向导所选模板」的陈旧缓存
    try {
      localStorage.removeItem(`blockhub_rt_microsite_${appId}`)
    } catch {
      /* ignore */
    }
  }, [appId])

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

    const authHeaders: HeadersInit = {
      Authorization: `Bearer ${token}`,
    }

    // 关键路径：config + schema + manifest 并行 → 先出壳，能力包限并发/按需
    withTimeout(
      Promise.all([
        fetch(`/api/v1/runtime/${appId}/config`, { headers: authHeaders }).then((r) => {
          if (!r.ok) throw new Error(`config ${r.status}`)
          return r.json()
        }),
        fetch(`/api/v1/runtime/${appId}/schema`, { headers: authHeaders }).then((r) => {
          if (!r.ok) throw new Error(`schema ${r.status}`)
          return r.json()
        }),
        fetch(`/api/v1/runtime/${appId}/manifest`, { headers: authHeaders }).then((r) => {
          if (!r.ok) throw new Error(`manifest ${r.status}`)
          return r.json()
        }),
      ]),
      20000,
      '应用配置',
    )
      .then(async ([cfg, sch, man]) => {
        if (cancelled) return
        const pageSchema = (sch as { page_schema: PageSchema }).page_schema
        const view = (sch as { schema_view?: string }).schema_view === 'personal_draft'
          ? 'personal_draft'
          : 'formal'
        setSchemaView(view)
        setChangeStatus(String((sch as { change_status?: string }).change_status || ''))
        const rawBm = (man as { build_manifest: BuildManifest }).build_manifest
        const bm = scopeManifestToApp(rawBm, pageSchema)
        const cfgObj = cfg as TenantRuntimeConfig & {
          deliver?: string
          apk_ready?: boolean
        }
        setConfig(cfgObj)
        setSchema(pageSchema)
        setManifest(bm)
        if (cfgObj.deliver) setDeliver(cfgObj.deliver)
        if (cfgObj.apk_ready) setApkReady(true)

        const meta = (pageSchema.meta || {}) as Record<string, unknown>
        const industryHome =
          isIndustrySiteEntry(meta) && (!routeFromPath(appId) || routeFromPath(appId) === '/')

        // 独立站标题首页不依赖能力 Widget：立刻出壳，能力包后台预热
        if (industryHome) {
          setWidgetsReady(true)
          void bootWidgetsFromManifest(bm, { background: true, concurrency: 2 })
          return
        }

        // 非首页：先拉当前路由相关包，其余后台，避免 20+ 包抢带宽
        const routeNow = routeFromPath(appId)
        const active = (pageSchema.menu || []).find(
          (m) => String((m as { route?: string }).route || '') === routeNow,
        ) as { capability_key?: string; key?: string } | undefined
        const cap = String(active?.capability_key || active?.key || '').trim()
        const priorityPkgs = cap
          ? bm.web_pkgs.filter(
              (p) =>
                p.includes(cap.replace(/_/g, '-')) ||
                p.endsWith(`/${cap}`) ||
                folderMatch(p, cap),
            )
          : bm.web_pkgs.slice(0, 2)

        await withTimeout(
          bootWidgetsFromManifest(bm, { priorityPkgs, background: true, concurrency: 2 }),
          20000,
          '能力模块',
        )
        if (cancelled) return
        setWidgetsReady(true)
      })
      .catch((e) => {
        if (cancelled) return
        setError(e instanceof Error ? e.message : String(e))
        setWidgetsReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [appId, token])

  // 切场景时按需补齐能力包（不挡整壳，只挡该页 Widget）
  const [routePkgsReady, setRoutePkgsReady] = useState(true)
  useEffect(() => {
    if (!manifest || !schema || !widgetsReady) return
    const atHome = !route || route === '/'
    if (atHome) {
      setRoutePkgsReady(true)
      return
    }
    let cancelled = false
    setRoutePkgsReady(false)
    const item = (schema.menu || []).find((m) => String((m as { route?: string }).route || '') === route) as
      | { capability_key?: string; key?: string }
      | undefined
    const cap = String(item?.capability_key || item?.key || '').trim()
    const pkgs = cap
      ? manifest.web_pkgs.filter((p) => folderMatch(p, cap) || p.includes(cap.replace(/_/g, '-')))
      : manifest.web_pkgs.slice(0, 1)
    void ensurePkgsLoaded(pkgs.length ? pkgs : manifest.web_pkgs.slice(0, 1)).finally(() => {
      if (!cancelled) setRoutePkgsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [route, manifest, schema, widgetsReady])

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
  const layoutRaw = layoutOf(schema)
  const meta = (schema.meta || {}) as Record<string, unknown>
  const baseMicrositeId = String(
    meta.microsite_id || (schema.theme as { micrositeId?: string } | undefined)?.micrositeId || '',
  )
  const industryEntry = isIndustrySiteEntry(meta)
  const micrositeId = skinOverride || baseMicrositeId
  const skin = industryEntry ? getMicrositeRuntimeSkin(micrositeId) : null
  // 独立站：固定左侧父子导航（设计 01+02），禁止顶栏/底栏场景 Tab 墙
  const navMode = industryEntry ? 'left' : layoutRaw === 'sidebar' ? 'left' : 'top'
  const layout = industryEntry ? 'sidebar' : layoutRaw
  const layoutMode = industryEntry ? skin?.layout || 'sidebar' : layoutRaw
  const industryLabel =
    String(
      meta.industry_name ||
        meta.pack_name ||
        (schema.theme as { industryName?: string } | undefined)?.industryName ||
        '',
    ).trim() ||
    ({
      office: '通用办公',
      mfg: '传统制造',
      sales: '销售行业',
      med: '医疗健康',
      game: '游戏娱乐',
      retail: '零售电商',
      edu: '教育培训',
      finance: '金融服务',
      logistics: '物流仓储',
      realestate: '房地产',
      hotel: '酒店餐饮',
      energy: '能源电力',
      gov: '政务公用',
      legal: '法律服务',
      hr: '人力资源',
      marketing: '市场营销',
      construction: '建筑工程',
    } as Record<string, string>)[String(meta.industry_key || '')] ||
    config.app_name
  const activeKey = menu.find((m) => m.route === route)?.key || menu[0]?.key
  const children = schema.root.children || []
  const contentNodes = children.filter((c) => c.type !== 'landing_hero')
  const atHome = !route || route === '/'

  let activeNode: SchemaNode | undefined =
    contentNodes.find((c) => String(c.props?.route) === route) ||
    contentNodes.find((c) => c.id === activeKey) ||
    contentNodes[0]

  // 非独立站落地页：首屏可堆叠；独立站首页用标题页
  const landingAll = !industryEntry && layoutRaw === 'landing' && atHome

  const menuGroups = (() => {
    type MenuRow = (typeof menu)[number]
    const map = new Map<string, MenuRow[]>()
    for (const m of menu) {
      const cat = String((m as { category?: string }).category || '场景')
      const list = map.get(cat) ?? []
      list.push(m)
      map.set(cat, list)
    }
    return [...map.entries()]
  })()

  const persistSkin = (id: string) => {
    setSkinOverride(id)
    if (!appId) return
    try {
      localStorage.setItem(`blockhub_rt_microsite_${appId}`, id)
    } catch {
      /* ignore */
    }
    const nextSkin = getMicrositeRuntimeSkin(id)
    const nextSchema = {
      ...schema,
      theme: {
        ...(schema.theme || {}),
        primaryColor: nextSkin?.accent || schema.theme?.primaryColor,
        micrositeId: id,
        skin: id,
        layoutMode: nextSkin?.layout,
        navMode: 'left',
        industryName: industryLabel,
      },
      meta: {
        ...(schema.meta || {}),
        entry_source: 'industry_site',
        microsite_id: id,
        layout_mode: nextSkin?.layout,
        nav_mode: 'left',
        industry_name: industryLabel,
      },
    }
    setSchema(nextSchema as PageSchema)
    void fetch(`/api/v1/runtime/${appId}/schema/changes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        page_schema: nextSchema,
        summary: `切换独立站模板 → ${id}（导航保持左侧父子）`,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.change) setSchemaView('personal_draft')
      })
      .catch(() => undefined)
  }

  const renderNavButtons = (className: string) => (
    <>
      {industryEntry ? (
        <button
          type="button"
          className={`${className}${atHome ? ' active' : ''}`}
          onClick={() => navigateRoute(appId!, '/')}
        >
          标题首页
        </button>
      ) : null}
      {industryEntry
        ? menuGroups.map(([cat, items], gi) => {
            const childActive = items.some((item) => item.route === route || item.key === activeKey)
            return (
              <details
                key={cat}
                className="runtime-sidebar-tree"
                open={childActive || (atHome && gi === 0)}
              >
                <summary className="runtime-sidebar-cat">
                  <span>{cat}</span>
                  <span className="runtime-sidebar-count">{items.length}</span>
                </summary>
                {items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`${className}${item.route === route || item.key === activeKey ? ' active' : ''}`}
                    onClick={() => navigateRoute(appId!, item.route || '/')}
                  >
                    {item.label}
                  </button>
                ))}
              </details>
            )
          })
        : menu.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${className}${item.route === route || item.key === activeKey ? ' active' : ''}`}
              onClick={() => navigateRoute(appId!, item.route || '/')}
            >
              {item.label}
            </button>
          ))}
    </>
  )

  const ctx = {
    appId,
    config,
    schema,
    manifest,
    token,
    user,
    primaryColor: skin?.accent || primaryColor,
    entrySource,
  }

  const showWeb = deliver === 'web' || deliver === 'both'
  const showApp = deliver === 'app' || deliver === 'both'
  const shellClass =
    layout === 'sidebar'
      ? 'runtime-shell is-sidebar'
      : layoutRaw === 'landing' && !industryEntry
        ? 'runtime-shell is-landing'
        : 'runtime-shell'
  const shellExtra = entrySource === 'im' ? ' is-im-entry' : ' is-portal-entry'
  const entryShell = industryEntry ? ' is-industry-site' : ' is-capship-workbench'
  const skinShell = skin ? ` ${skin.shellClass}` : ''
  const layoutShell = industryEntry ? ` layout-${layoutMode} nav-${navMode}` : ''
  const homeGuideShell = industryEntry && atHome ? ' is-home-guide' : ''
  const shellStyle = {
    '--accent': skin?.accent || primaryColor,
    ...(skin
      ? {
          '--rt-page-bg': skin.pageBg,
          '--rt-surface': skin.surface,
          '--rt-header-bg': skin.headerBg,
          '--rt-header-fg': skin.headerFg,
          '--rt-radius': skin.radius,
        }
      : {}),
  } as CSSProperties

  return (
    <RuntimeContext.Provider value={ctx}>
      <div className={`${shellClass}${shellExtra}${entryShell}${skinShell}${layoutShell}${homeGuideShell}`} style={shellStyle}>
        <div className={`entry-banner ${entrySource === 'im' ? 'im' : 'portal'}`} role="status">
          {entrySource === 'im' ? (
            <>
              <strong>群消息协作入口</strong>
              <span>流程：提单 → 派工选人 → 维修 → 完工。当前请处理工单或确认状态。</span>
            </>
          ) : industryEntry ? (
            <>
              <strong>独立站方案工作台</strong>
              <span>
                {industryLabel}
                {skin ? ` · 模板 ${skin.styleLabel.split('·')[0].trim()}` : ''}
                {' · 左侧父子导航 · 首页行业封面'}
              </span>
            </>
          ) : (
            <>
              <strong>CapShip 能力工作台</strong>
              <span>弹幕 / 选模块 / 描述需求生成 · 标准 Tabs 门户壳</span>
            </>
          )}
        </div>
        {schemaView === 'personal_draft' ? (
          <div
            className="entry-banner"
            role="status"
            style={{
              background: changeStatus === 'pending' ? '#fffbeb' : '#eef2ff',
              borderBottom: '1px solid #c7d2fe',
              color: '#312e81',
            }}
          >
            <strong>{changeStatus === 'pending' ? '个人待审稿生效中' : '个人草稿生效中'}</strong>
            <span>
              当前菜单/页面仅你可见（后端已按你的草稿返回）。同事仍看正式版；管理员通过或直接发布后全员同步。
            </span>
          </div>
        ) : null}
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
                {industryEntry
                  ? ` · ${industryLabel}${skin ? ` · ${skin.style}` : ''}`
                  : entrySource === 'im'
                    ? ' · 来自企微/钉钉/飞书'
                    : ' · 应用门户'}
              </p>
            </div>
          </div>
          <div className="runtime-header-actions">
            {industryEntry && !atHome ? (
              <button type="button" className="btn btn-ghost" onClick={() => navigateRoute(appId, '/')}>
                标题页
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              退出
            </button>
          </div>
        </header>

        <div className="runtime-body">
          {navMode === 'left' || (!industryEntry && layout === 'sidebar') ? (
            <aside className="runtime-sidebar">{renderNavButtons('nav-btn sidebar-btn')}</aside>
          ) : null}

          {!industryEntry && layout !== 'sidebar' ? (
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
          ) : null}

          <main className="runtime-main">
            {showWeb ? (
              industryEntry && atHome ? (
                <IndustrySiteHome
                  appName={config.app_name}
                  industryLabel={industryLabel}
                  skin={skin}
                  micrositeId={micrositeId || 'consulting'}
                  menu={menu as never}
                  onEnterScene={(r) => navigateRoute(appId, r)}
                  onPickSkin={persistSkin}
                />
              ) : landingAll ? (
                <div className="landing-stack">
                  {children
                    .filter((c) => c.type === 'landing_hero')
                    .map((n) => (
                      <WidgetHost key={n.id} node={n} ctx={ctx} />
                    ))}
                  {contentNodes.map((n) => (
                    <section key={n.id} className="landing-block">
                      <WidgetHost node={n} ctx={ctx} />
                    </section>
                  ))}
                </div>
              ) : activeNode ? (
                routePkgsReady ? (
                  <WidgetHost node={activeNode} ctx={ctx} />
                ) : (
                  <p className="muted">加载场景模块…</p>
                )
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
            <span className="muted" title={manifest.web_pkgs.join(', ')}>
              本应用能力包 {manifest.web_pkgs.length} 个
              {manifest.web_pkgs.length <= 4
                ? `：${manifest.web_pkgs.map((p) => p.replace('@blockhub/web-capability-', '')).join(', ')}`
                : ''}
            </span>
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
            storageKey="capship-runtime-dock-v4"
            defaultOpen={false}
            defaultPlacement="top-right"
            appId={appId}
            token={token}
            capability_keys={scopedKeysFromSchema(schema)}
            page_schema={schema as never}
            build_manifest={manifest}
            defaultMode={"live_edit" as const}
            onSchemaPatch={(next: unknown) => setSchema(next as PageSchema)}
            onSaved={(result: {
              page_schema?: unknown
              capability_keys?: string[]
              change_status?: string
            }) => {
              const nextSchema = (result.page_schema as PageSchema | undefined) || schema
              if (result.page_schema) {
                setSchema(result.page_schema as PageSchema)
                setSchemaView('personal_draft')
              }
              if (result.change_status) setChangeStatus(result.change_status)
              else if (result.page_schema) setChangeStatus((s) => s || 'draft')
              void fetch(`/api/v1/runtime/${appId}/manifest`, {
                headers: { Authorization: `Bearer ${token}` },
              })
                .then((r) => (r.ok ? r.json() : null))
                .then((data) => {
                  if (!data?.build_manifest) return
                  const scoped = scopeManifestToApp(data.build_manifest, nextSchema!)
                  setManifest(scoped)
                  if (data.schema_view === 'personal_draft') setSchemaView('personal_draft')
                  return bootWidgetsFromManifest(scoped)
                })
                .catch(() => undefined)
            }}
          />
        </Suspense>
      </div>
    </RuntimeContext.Provider>
  )
}
