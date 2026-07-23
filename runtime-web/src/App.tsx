import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
  storeAuth,
  type BuildManifest,
  type PageSchema,
  type SchemaNode,
  type TenantRuntimeConfig,
} from '@blockhub/web-core'
import { adminLoginUrlWithReturn } from '@shared/brand'
import type { CapShipComposerDockProps } from '@capship/composer'
import { bootWidgetsFromManifest, ensurePkgsLoaded } from './register-widgets'
import { webPkgForCapability } from './capabilityWebPkg'
import {
  getMicrositeRuntimeSkin,
  isIndustrySiteEntry,
} from './micrositeRuntimeSkin'
import IndustrySiteHome from './IndustrySiteHome'
import RuntimeNotifyBell from './RuntimeNotifyBell'
import './styles-microsite-skins.css'

const CapShipComposerDock = lazy(() =>
  import('@capship/composer').then(async (m) => {
    await import('@capship/composer/styles.css')
    return {
      default: m.CapShipComposerDock as ComponentType<CapShipComposerDockProps>,
    }
  }),
)

type SchemaApiPayload = {
  page_schema: PageSchema
  schema_rev?: number
  formal_schema_rev?: number
  schema_view?: string
  change_status?: string
  change_id?: string
  schema_updated_at?: string | null
}

function schemaFingerprint(sch: SchemaApiPayload): string {
  const ps = sch.page_schema
  const menu = (ps?.menu || []).map((m) => `${m.key}:${m.route}`).join(',')
  const caps = (ps?.capability_keys || []).join(',')
  const kids = (ps?.root?.children || [])
    .map((c) => {
      const p = (c.props || {}) as Record<string, unknown>
      const html = String(p.source_html || '')
      return `${c.id}:${p.codegen_pending ? 1 : 0}:${html.length}`
    })
    .join('|')
  return [
    sch.schema_rev ?? '',
    sch.formal_schema_rev ?? '',
    sch.schema_view || '',
    sch.change_status || '',
    sch.change_id || '',
    sch.schema_updated_at || '',
    caps,
    menu,
    kids,
  ].join('::')
}

function parseAppId(): string | null {
  const path = window.location.pathname
  if (/^\/r\/sso-callback\/?$/i.test(path)) return null
  const m = path.match(/^\/r\/([a-z0-9]+)(?:\/|$)/i)
  return m?.[1] ?? null
}

/** 企微 SSO：后端 302 → /r/sso-callback#access_token=…&state=… */
function consumeSsoCallback(): { handled: boolean; redirectTo?: string } {
  if (!/^\/r\/sso-callback\/?$/i.test(window.location.pathname)) {
    return { handled: false }
  }
  const hash = (window.location.hash || '').replace(/^#/, '')
  const params = new URLSearchParams(hash)
  const token = params.get('access_token') || ''
  const state = (params.get('state') || '').trim()
  if (!token) {
    return { handled: true, redirectTo: '/' }
  }
  storeAuth(token, {
    email: 'sso@wecom.local',
    role: 'tenant_owner',
    display_name: '企微用户',
  })
  // state 可为 app public_id，或 app:<id> / /r/<id>
  let appId = ''
  if (/^[a-z0-9]+$/i.test(state) && state.toLowerCase() !== 'blockhub') {
    appId = state
  } else {
    const m = state.match(/(?:^app:|\/r\/)([a-z0-9]+)/i)
    if (m) appId = m[1]
  }
  // 用 /auth/me 补全用户信息（异步，不阻塞跳转）
  void fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    .then((r) => (r.ok ? r.json() : null))
    .then((u) => {
      if (!u) return
      storeAuth(token, {
        email: u.email || 'sso@wecom.local',
        role: u.role || 'tenant_owner',
        display_name: u.display_name || '企微用户',
      })
    })
    .catch(() => {})
  return { handled: true, redirectTo: appId ? `/r/${appId}` : '/' }
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
  const normalized = !route || route === '/' ? '/' : route.startsWith('/') ? route : `/${route}`
  const target = normalized === '/' ? base : `${base}${normalized}`
  const qs = window.location.search || ''
  const next = `${target}${qs}`
  if (`${window.location.pathname}${window.location.search}` !== next) {
    window.history.pushState({}, '', next)
  }
  window.dispatchEvent(new PopStateEvent('popstate'))
  return normalized
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
  const pkgs = [...(manifest.web_pkgs || [])]
  for (const k of keys) {
    // Path B 生成页走内置 GeneratedPageWidget，无需能力包
    if (k.startsWith('gen_')) continue
    const conv = conventionPkg(k)
    if (!conv) continue
    const has = pkgs.some((p) => folderMatch(p, k) || p === conv)
    if (!has) pkgs.push(conv)
  }
  return {
    ...manifest,
    capability_keys: keys,
    web_pkgs: pkgs,
  }
}

/** capability_key → 真实 web_pkg（含 vertical-ops / retail-ops 等共享包） */
function conventionPkg(capabilityKey: string): string {
  return webPkgForCapability(capabilityKey)
}

function folderMatch(pkg: string, capabilityKey: string): boolean {
  const folder = pkg.split('/').pop() || pkg
  const slug = capabilityKey.replace(/_/g, '-')
  const conv = conventionPkg(capabilityKey)
  if (conv && folder === (conv.split('/').pop() || conv)) return true
  // 共享包：approval_flow → web-capability-approval
  if (folder === `web-capability-${slug}`) return true
  if (folder === `web-capability-${slug.split('-')[0]}`) return true
  if (capabilityKey.startsWith('approval') && folder === 'web-capability-approval') return true
  if (capabilityKey.startsWith('notify') && folder === 'web-capability-integration') return true
  if (capabilityKey.startsWith('chat') && folder === 'web-capability-chat') return true
  // kb_document / kb_search → web-capability-kb（勿误绑 chat）
  if ((capabilityKey === 'kb_document' || capabilityKey === 'kb_search') && folder === 'web-capability-kb') {
    return true
  }
  return folder.includes(slug)
}

export default function App() {
  const sso = useMemo(consumeSsoCallback, [])
  useEffect(() => {
    if (sso.handled && sso.redirectTo) {
      window.location.replace(sso.redirectTo)
    }
  }, [sso])

  const appId = useMemo(parseAppId, [])
  const entrySource = useMemo(parseEntrySource, [])
  const [route, setRoute] = useState(() => (appId ? routeFromPath(appId) : '/'))
  const [token, setToken] = useState(getStoredToken)
  const [user, setUser] = useState(getStoredUser)
  const [authBootstrapping, setAuthBootstrapping] = useState(
    () => Boolean(getStoredToken() && !getStoredUser()),
  )

  // 管理后台 / 官网已登录：同域有 token 但缺 runtime user 时，用 /auth/me 补齐，避免再登一次
  useEffect(() => {
    const t = getStoredToken()
    if (!t) {
      setAuthBootstrapping(false)
      return
    }
    if (getStoredUser()) {
      setAuthBootstrapping(false)
      return
    }
    let cancelled = false
    setAuthBootstrapping(true)
    void fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${t}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`me ${res.status}`)
        return res.json() as Promise<{ email?: string; role?: string; display_name?: string }>
      })
      .then((u) => {
        if (cancelled) return
        const next = {
          email: u.email || '',
          role: u.role || 'employee',
          display_name: u.display_name || u.email || '用户',
        }
        storeAuth(t, next)
        setToken(t)
        setUser(next)
      })
      .catch(() => {
        if (cancelled) return
        clearAuth()
        setToken('')
        setUser(null)
      })
      .finally(() => {
        if (!cancelled) setAuthBootstrapping(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (sso.handled) {
    return (
      <div className="login-shell" style={{ padding: 48, textAlign: 'center' }}>
        <p>正在完成企微登录…</p>
      </div>
    )
  }
  const [config, setConfig] = useState<TenantRuntimeConfig | null>(null)
  const [schema, setSchema] = useState<PageSchema | null>(null)
  const [manifest, setManifest] = useState<BuildManifest | null>(null)
  const [widgetsReady, setWidgetsReady] = useState(false)
  const [deliver, setDeliver] = useState('both')
  const [apkReady, setApkReady] = useState(false)
  const [schemaView, setSchemaView] = useState<'formal' | 'personal_draft'>('formal')
  const [changeStatus, setChangeStatus] = useState('')
  const [schemaRev, setSchemaRev] = useState(1)
  const [previewEpoch, setPreviewEpoch] = useState(0)
  const [localPreviewDirty, setLocalPreviewDirty] = useState(false)
  const [refreshBusy, setRefreshBusy] = useState(false)
  const [refreshHint, setRefreshHint] = useState('')
  const schemaFpRef = useRef('')
  const localPreviewDirtyRef = useRef(false)
  const [error, setError] = useState('')
  /** 独立站：仅会话内换皮；初始以 schema 发布选择为准（勿被旧 localStorage 抢默认） */
  const [skinOverride, setSkinOverride] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState<Record<string, boolean>>({})

  // 未登录：跳转管理后台统一登录页（验证码 / 密码完全同一套）
  useEffect(() => {
    if (sso.handled || authBootstrapping) return
    if (token && user) return
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`
    window.location.replace(adminLoginUrlWithReturn(returnTo))
  }, [sso.handled, authBootstrapping, token, user])

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
        setChangeStatus(String((sch as SchemaApiPayload).change_status || ''))
        setSchemaRev(
          Number(
            (sch as SchemaApiPayload).schema_rev ||
              (sch as SchemaApiPayload).formal_schema_rev ||
              1,
          ),
        )
        schemaFpRef.current = schemaFingerprint(sch as SchemaApiPayload)
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

        // 独立站行业首页不依赖能力 Widget：立刻出壳，能力包后台预热
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

  const applySchemaPayload = useCallback(
    async (sch: SchemaApiPayload, man?: BuildManifest | null, opts?: { quiet?: boolean }) => {
      const pageSchema = sch.page_schema
      const view = sch.schema_view === 'personal_draft' ? 'personal_draft' : 'formal'
      setSchemaView(view)
      setChangeStatus(String(sch.change_status || ''))
      setSchemaRev(Number(sch.schema_rev || sch.formal_schema_rev || 1))
      setSchema(pageSchema)
      setPreviewEpoch((n) => n + 1)
      schemaFpRef.current = schemaFingerprint(sch)
      if (man) {
        const scoped = scopeManifestToApp(man, pageSchema)
        setManifest(scoped)
        await bootWidgetsFromManifest(scoped, { background: true, concurrency: 2 })
      } else {
        setManifest((prev) => (prev ? scopeManifestToApp(prev, pageSchema) : prev))
      }
      if (!opts?.quiet) {
        setRefreshHint(`已刷新 · v${Number(sch.schema_rev || sch.formal_schema_rev || 1)}`)
        window.setTimeout(() => setRefreshHint(''), 2400)
      }
    },
    [],
  )

  const refreshRuntime = useCallback(
    async (opts?: { quiet?: boolean; force?: boolean }) => {
      if (!appId || !token) return
      // 本地未保存预览：禁止被轮询/广播刷掉（智能出页刚出来又消失）
      if (localPreviewDirtyRef.current && !opts?.force) {
        if (!opts?.quiet) {
          setRefreshHint('有未保存改动，已跳过自动刷新（可点强制刷新）')
          window.setTimeout(() => setRefreshHint(''), 2800)
        }
        return
      }
      setRefreshBusy(true)
      try {
        const headers: HeadersInit = { Authorization: `Bearer ${token}` }
        const [schRes, manRes] = await Promise.all([
          fetch(`/api/v1/runtime/${appId}/schema`, { headers }),
          fetch(`/api/v1/runtime/${appId}/manifest`, { headers }),
        ])
        if (!schRes.ok) throw new Error(`schema ${schRes.status}`)
        const sch = (await schRes.json()) as SchemaApiPayload
        const manJson = manRes.ok ? await manRes.json() : null
        const bm = (manJson?.build_manifest as BuildManifest | undefined) || null
        const fp = schemaFingerprint(sch)
        if (fp === schemaFpRef.current && opts?.quiet) return
        await applySchemaPayload(sch, bm, opts)
        setLocalPreviewDirty(false)
        localPreviewDirtyRef.current = false
      } catch (e) {
        if (!opts?.quiet) {
          setRefreshHint(e instanceof Error ? e.message : '刷新失败')
          window.setTimeout(() => setRefreshHint(''), 3200)
        }
      } finally {
        setRefreshBusy(false)
      }
    },
    [appId, token, applySchemaPayload],
  )

  // 对话改页 / 智能出页：仅在已落库后广播才拉服务端；本地 dirty 忽略
  useEffect(() => {
    if (!appId || !token) return
    let unsub: () => void = () => undefined
    void import('@capship/composer').then((m) => {
      unsub = m.subscribeSchemaUpdated(appId, (msg) => {
        const reason = String(msg?.reason || '')
        // codegen / 本地预览广播：不要覆盖未保存左侧
        if (reason === 'codegen' || reason === 'local_save') return
        if (localPreviewDirtyRef.current) return
        void refreshRuntime({ quiet: reason !== 'approve' && reason !== 'direct_publish' })
      })
    })
    return () => {
      unsub()
    }
  }, [appId, token, refreshRuntime])

  // 可见时轮询：他人发布 / 审批通过后自动跟上
  useEffect(() => {
    if (!appId || !token || !widgetsReady) return
    const tick = () => {
      if (document.visibilityState !== 'visible') return
      void refreshRuntime({ quiet: true })
    }
    const timer = window.setInterval(tick, 12000)
    const onFocus = () => tick()
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [appId, token, widgetsReady, refreshRuntime])

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
    const node = (schema.root?.children || []).find(
      (c) => String(c.props?.route || '') === route || c.id === item?.key,
    )
    const cap = String(
      item?.capability_key || node?.props?.capability_key || item?.key || '',
    ).trim()
    const slug = cap.replace(/_/g, '-')
    // schema 节点上的 web_pkg（registry SSOT）优先，避免 media_* 等误解析成不存在的独立包
    const nodePkg = String(node?.props?.web_pkg || '').trim()
    const fromManifest = cap
      ? manifest.web_pkgs.filter((p) => folderMatch(p, cap) || p.includes(slug))
      : []
    // compose 新加能力时 manifest 可能尚未含包名：按约定补上，避免误报「尚未接入」
    const conv = cap ? conventionPkg(cap) : ''
    const convention = conv ? [conv] : []
    const pkgs = [
      ...new Set(
        [nodePkg, ...fromManifest, ...convention].filter(Boolean),
      ),
    ]
    void ensurePkgsLoaded(pkgs.length ? pkgs : manifest.web_pkgs.slice(0, 1)).finally(() => {
      if (!cancelled) setRoutePkgsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [route, manifest, schema, widgetsReady])

  // schema 草稿刚写入新能力时，后台预热新增包（避免点进菜单才开始拉）
  const warmedPkgsRef = useRef<string>('')
  useEffect(() => {
    if (!manifest?.web_pkgs?.length || !widgetsReady) return
    const key = manifest.web_pkgs.join('|')
    if (key === warmedPkgsRef.current) return
    const prev = new Set(warmedPkgsRef.current ? warmedPkgsRef.current.split('|') : [])
    const added = manifest.web_pkgs.filter((p) => !prev.has(p))
    warmedPkgsRef.current = key
    if (added.length) void ensurePkgsLoaded(added)
  }, [manifest?.web_pkgs?.join('|'), widgetsReady])

  const handleLogout = () => {
    clearAuth()
    setToken('')
    setUser(null)
    setConfig(null)
    setSchema(null)
    setManifest(null)
    setWidgetsReady(false)
    const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`
    window.location.replace(adminLoginUrlWithReturn(returnTo))
  }

  if (!appId) {
    return <p className="error-msg">无效的应用链接，请使用 /r/&#123;appId&#125; 访问</p>
  }

  if (authBootstrapping) {
    return (
      <div className="login-shell" style={{ padding: 48, textAlign: 'center' }}>
        <p>正在同步登录态…</p>
      </div>
    )
  }

  if (!token || !user) {
    return (
      <div className={`login-shell${entrySource === 'im' ? ' is-im-entry' : ''}`}>
        <p className="entry-chip">统一登录</p>
        <h1>正在前往登录…</h1>
        <p className="muted">与管理后台同一入口：验证码注册 / 密码登录</p>
        <p className="muted">应用 ID：{appId}</p>
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
  const atHome = !route || route === '/'
  // 独立站首页：不 fallback 到 menu[0]，避免与「行业首页」双高亮
  // 工作台（弹幕/选模块）：/ 无页面时 fallback 第一项主能力，禁止空白「暂无页面」
  const activeKey = menu.find((m) => m.route === route)?.key
  const children = schema.root.children || []
  const contentNodes = children.filter((c) => c.type !== 'landing_hero')

  let activeNode: SchemaNode | undefined =
    contentNodes.find((c) => String(c.props?.route) === route) ||
    (activeKey ? contentNodes.find((c) => c.id === activeKey) : undefined) ||
    (!atHome || !industryEntry ? contentNodes[0] : undefined)

  // 非独立站落地页：首屏可堆叠；独立站首页用行业封面
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

  const goRoute = (nextRoute: string) => {
    if (!appId) return
    const normalized = navigateRoute(appId, nextRoute)
    setRoute(normalized)
  }

  // 工作台打开 /r/{id} 落在 / 时，跳到第一项主能力 Tab（URL 与高亮一致）
  useEffect(() => {
    if (!appId || !widgetsReady || industryEntry) return
    if (!atHome) return
    const first = (menu || []).find((m) => {
      const r = String(m.route || '')
      return r && r !== '/'
    })
    const target = String(
      (meta as { default_route?: string }).default_route || first?.route || '',
    ).trim()
    if (!target || target === '/') return
    goRoute(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅在首页空白态纠偏一次
  }, [appId, widgetsReady, industryEntry, atHome, schemaRev])

  const renderNavButtons = (className: string) => (
    <>
      {industryEntry ? (
        <button
          type="button"
          className={`${className}${atHome ? ' active' : ''}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            goRoute('/')
          }}
        >
          行业首页
        </button>
      ) : null}
      {industryEntry
        ? menuGroups.map(([cat, items]) => {
            const childActive = items.some((item) => item.route === route || (activeKey != null && item.key === activeKey))
            // 默认可点场景全部展开，避免折叠后只剩灰色分类标题
            const isOpen = sidebarOpen[cat] !== undefined ? sidebarOpen[cat] : true
            return (
              <div
                key={cat}
                className={`runtime-sidebar-tree${isOpen ? ' is-open' : ''}${childActive ? ' has-active' : ''}`}
              >
                <button
                  type="button"
                  className="runtime-sidebar-cat"
                  aria-expanded={isOpen}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSidebarOpen((prev) => ({ ...prev, [cat]: !isOpen }))
                  }}
                >
                  <span>{cat}</span>
                  <span className="runtime-sidebar-count">{items.length}</span>
                </button>
                {isOpen
                  ? items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        className={`${className}${item.route === route || (activeKey != null && item.key === activeKey) ? ' active' : ''}`}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          goRoute(item.route || `/${item.key}`)
                        }}
                      >
                        {item.label}
                      </button>
                    ))
                  : null}
              </div>
            )
          })
        : menu.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`${className}${item.route === route || (activeKey != null && item.key === activeKey) ? ' active' : ''}`}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                goRoute(item.route || `/${item.key}`)
              }}
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
      ? industryEntry
        ? {
            /* 行业 CRM 工作台固定浅色；accent 仍随模板 */
            '--rt-page-bg': '#f1f5f9',
            '--rt-surface': '#ffffff',
            '--rt-header-bg': '#ffffff',
            '--rt-header-fg': '#0f172a',
            '--rt-radius': skin.radius,
          }
        : {
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
              <strong>独立站工作台</strong>
              <span>
                {industryLabel}
                {skin ? ` · ${skin.styleLabel.split('·')[0].trim()}` : ''}
                {' · 左侧导航进场景'}
              </span>
            </>
          ) : (
            <>
              <strong>CapShip 工作台</strong>
              <span>弹幕 / 选模块 / 描述需求 · Tabs 门户</span>
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
              <img src={config.app_icon_url} alt="" width={44} height={44} className="logo" />
            ) : (
              <div className="logo placeholder">{config.app_name.slice(0, 1)}</div>
            )}
            <div>
              <h1>{config.app_name}</h1>
              <div className="brand-meta">
                <span className="brand-chip brand-chip--rev" title="页面配置版本">
                  v{schemaRev}
                </span>
                {schemaView === 'personal_draft' ? (
                  <span className="brand-chip brand-chip--draft">
                    {changeStatus === 'pending' ? '待审稿' : '个人草稿'}
                  </span>
                ) : null}
            {localPreviewDirty ? (
              <span className="brand-chip brand-chip--draft" title="对话改页/智能出页预览尚未保存">
                未保存预览
              </span>
            ) : null}
                <span className="brand-chip">{user.display_name || '使用者'}</span>
                <span className="brand-chip">{user.role || 'member'}</span>
                {industryEntry ? (
                  <>
                    <span className="brand-chip">{industryLabel}</span>
                    {skin ? <span className="brand-chip">{skin.style}</span> : null}
                  </>
                ) : entrySource === 'im' ? (
                  <span className="brand-chip">企微 / 钉钉 / 飞书</span>
                ) : (
                  <span className="brand-chip">应用门户</span>
                )}
              </div>
            </div>
          </div>
          <div className="runtime-header-actions">
            <RuntimeNotifyBell />
            {refreshHint ? <span className="runtime-refresh-hint">{refreshHint}</span> : null}
            <button
              type="button"
              className="btn btn-ghost"
              disabled={refreshBusy}
              title={
                localPreviewDirty
                  ? '有未保存预览时自动刷新已关闭；点此强制从服务端拉取（会丢未保存预览）'
                  : '重新拉取已保存的页面配置'
              }
              onClick={() => {
                if (localPreviewDirty) {
                  const ok = window.confirm('当前有未保存的对话改页预览，强制刷新会丢弃预览。继续？')
                  if (!ok) return
                }
                void refreshRuntime({ quiet: false, force: true })
              }}
            >
              {refreshBusy ? '刷新中…' : localPreviewDirty ? '强制刷新' : '刷新页面'}
            </button>
            {industryEntry && !atHome ? (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={(e) => {
                  e.preventDefault()
                  goRoute('/')
                }}
              >
                行业首页
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
                  onEnterScene={(r) => goRoute(r)}
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
                  <WidgetHost
                    key={`${activeNode.id}-v${schemaRev}-e${previewEpoch}`}
                    node={activeNode}
                    ctx={ctx}
                  />
                ) : (
                  <div className="widget-loading" role="status">
                    <div className="widget-loading-spinner" aria-hidden />
                    <strong>正在加载场景模块…</strong>
                    <p className="muted">首次打开该能力需拉取前端包，请稍候</p>
                  </div>
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

        <Suspense fallback={null}>
          <CapShipComposerDock
            storageKey="capship-runtime-dock-v5"
            defaultOpen={false}
            defaultPlacement="top-right"
            appId={appId}
            token={token}
            capability_keys={scopedKeysFromSchema(schema)}
            page_schema={schema as never}
            build_manifest={manifest}
            defaultMode={"live_edit" as const}
            deliverPanel={
              <DeveloperBlueprintPanel
                variant="embedded"
                mode="app"
                appId={appId}
                token={token}
                role={user.role}
                accent={primaryColor}
              />
            }
            onSchemaPatch={(next: unknown) => {
              const s = next as PageSchema
              const prevRoutes = new Set((schema?.menu || []).map((m) => String(m.route || '')))
              setSchema(s)
              setPreviewEpoch((n) => n + 1)
              setLocalPreviewDirty(true)
              localPreviewDirtyRef.current = true
              setManifest((prev) => (prev ? scopeManifestToApp(prev, s) : prev))
              // 新增菜单：自动跳到新页，避免「加了但看不见」
              const added = (s.menu || []).find((m) => {
                const r = String(m.route || '')
                return r && !prevRoutes.has(r)
              })
              if (added?.route && appId) {
                goRoute(String(added.route))
              }
            }}
            onSaved={(result: {
              page_schema?: unknown
              capability_keys?: string[]
              change_status?: string
              schema_rev?: number
            }) => {
              const nextSchema = (result.page_schema as PageSchema | undefined) || schema
              if (result.page_schema) {
                setSchema(result.page_schema as PageSchema)
                setPreviewEpoch((n) => n + 1)
              }
              if (typeof result.schema_rev === 'number') setSchemaRev(result.schema_rev)
              setLocalPreviewDirty(false)
              localPreviewDirtyRef.current = false
              if (result.change_status === 'draft' || result.change_status === 'pending') {
                setSchemaView('personal_draft')
                setChangeStatus(result.change_status)
              } else if (result.change_status) {
                setChangeStatus(result.change_status)
              } else if (result.page_schema && !result.schema_rev) {
                setSchemaView('personal_draft')
                setChangeStatus((s) => s || 'draft')
              } else if (typeof result.schema_rev === 'number' && !result.change_status) {
                setSchemaView('formal')
                setChangeStatus('')
              }
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
