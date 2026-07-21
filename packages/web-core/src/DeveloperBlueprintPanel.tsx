import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import './developer-blueprint.css'

export interface BlueprintColumn {
  name: string
  type: string
  nullable: string
  primary_key?: string
}

export interface BlueprintApi {
  method: string
  path: string
  desc?: string
  auth?: string
}

export interface BlueprintModule {
  capability_key: string
  name: string
  category?: string
  table?: { name: string; label?: string; kind_filter?: string } | null
  columns?: BlueprintColumn[]
  apis?: BlueprintApi[]
  code_paths?: string[]
  client_snippet?: string
}

export interface DeveloperBlueprint {
  success?: boolean
  scope?: string
  note?: string
  capability_keys?: string[]
  modules?: BlueprintModule[]
  download?: { requires_role?: string; hint?: string }
  openapi_url?: string
  app?: { public_id?: string; name?: string }
}

export type DeveloperBlueprintMode = 'app' | 'preview'

export interface DeveloperBlueprintPanelProps {
  mode: DeveloperBlueprintMode
  /** 已发布应用 public_id */
  appId?: string
  /** 预览包，如 mfg */
  pack?: string
  token: string
  /** 当前用户角色：admin 直通下载；员工需申请 */
  role?: string
  accent?: string
  className?: string
  /** float=独立悬浮（旧）；embedded=嵌在 Composer「交付」Tab */
  variant?: 'float' | 'embedded'
  /** 面板内登录成功后回传（home 可写入 localStorage） */
  onAuth?: (auth: { token: string; role: string; display_name: string }) => void
}

async function fetchBlueprint(
  mode: DeveloperBlueprintMode,
  token: string,
  appId?: string,
  pack?: string,
): Promise<DeveloperBlueprint> {
  const url =
    mode === 'preview'
      ? `/api/v1/runtime/developer/preview?pack=${encodeURIComponent(pack || 'mfg')}`
      : `/api/v1/runtime/${encodeURIComponent(appId || '')}/developer`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 || res.status === 403) {
    throw new Error('需要登录后查看（员工或管理员账号）')
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(typeof body.detail === 'string' ? body.detail : `加载失败 ${res.status}`)
  }
  return res.json()
}

async function loginForBlueprint(email: string, password: string) {
  const res = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.detail === 'string' ? err.detail : `登录失败 ${res.status}`)
  }
  const data = (await res.json()) as {
    access_token: string
    user: { role: string; display_name: string; email: string }
  }
  return {
    token: data.access_token,
    role: data.user.role,
    display_name: data.user.display_name || data.user.email,
  }
}

export function DeveloperBlueprintPanel({
  mode,
  appId,
  pack = 'mfg',
  token: tokenProp,
  role: roleProp,
  accent = '#2563eb',
  className = '',
  variant = 'float',
  onAuth,
}: DeveloperBlueprintPanelProps) {
  const embedded = variant === 'embedded'
  const [open, setOpen] = useState(embedded)
  const [tab, setTab] = useState<'tables' | 'apis' | 'code'>('tables')
  const [data, setData] = useState<DeveloperBlueprint | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dlBusy, setDlBusy] = useState(false)
  const [activeKey, setActiveKey] = useState('')
  const [token, setToken] = useState(tokenProp)
  const [role, setRole] = useState(roleProp || '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [access, setAccess] = useState<{
    can_download?: boolean
    is_admin?: boolean
    my_request?: { status?: string } | null
    pending_requests?: Array<{ user_id: string; user_name?: string }>
    hint?: string
  } | null>(null)

  useEffect(() => {
    setToken(tokenProp)
  }, [tokenProp])

  useEffect(() => {
    if (roleProp) setRole(roleProp)
  }, [roleProp])

  useEffect(() => {
    if (embedded) setOpen(true)
  }, [embedded])

  const loadAccess = useCallback(async (tok: string) => {
    if (mode !== 'app' || !appId || !tok) {
      setAccess(null)
      return
    }
    try {
      const res = await fetch(`/api/v1/runtime/${encodeURIComponent(appId)}/developer/code-access`, {
        headers: { Authorization: `Bearer ${tok}` },
      })
      if (res.ok) setAccess(await res.json())
      else setAccess(null)
    } catch {
      setAccess(null)
    }
  }, [mode, appId])

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录后查看库表/接口说明')
      setData(null)
      return
    }
    setBusy(true)
    setError('')
    try {
      const bp = await fetchBlueprint(mode, token, appId, pack)
      setData(bp)
      setActiveKey(bp.modules?.[0]?.capability_key || '')
      await loadAccess(token)
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setBusy(false)
    }
  }, [mode, token, appId, pack, loadAccess])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const active = data?.modules?.find((m) => m.capability_key === activeKey) || data?.modules?.[0]

  const doLogin = async () => {
    setLoginBusy(true)
    setError('')
    try {
      const auth = await loginForBlueprint(email.trim(), password)
      setToken(auth.token)
      setRole(auth.role)
      onAuth?.(auth)
      setBusy(true)
      const bp = await fetchBlueprint(mode, auth.token, appId, pack)
      setData(bp)
      setActiveKey(bp.modules?.[0]?.capability_key || '')
      await loadAccess(auth.token)
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败')
    } finally {
      setLoginBusy(false)
      setBusy(false)
    }
  }

  const requestDownload = async () => {
    if (!token || !appId) return
    setDlBusy(true)
    setError('')
    try {
      const res = await fetch(`/api/v1/runtime/${encodeURIComponent(appId)}/developer/code-access/request`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error(`申请失败 ${res.status}`)
      setAccess(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '申请失败')
    } finally {
      setDlBusy(false)
    }
  }

  const approveDownload = async (uid: string) => {
    if (!token || !appId) return
    setDlBusy(true)
    setError('')
    try {
      const res = await fetch(
        `/api/v1/runtime/${encodeURIComponent(appId)}/developer/code-access/${encodeURIComponent(uid)}/approve`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
      )
      if (!res.ok) throw new Error(`批准失败 ${res.status}`)
      setAccess(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '批准失败')
    } finally {
      setDlBusy(false)
    }
  }

  const downloadZip = async () => {
    if (!token) {
      setError('请先登录')
      return
    }
    setDlBusy(true)
    setError('')
    try {
      const url =
        mode === 'preview'
          ? `/api/v1/runtime/developer/preview/code.zip?pack=${encodeURIComponent(pack)}`
          : `/api/v1/runtime/${encodeURIComponent(appId || '')}/developer/code.zip`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 403) {
        throw new Error('暂无下载权限：请先点「申请下载」，管理员批准后再试')
      }
      if (res.status === 401) throw new Error('请重新登录')
      if (!res.ok) throw new Error(`下载失败 ${res.status}`)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download =
        mode === 'preview'
          ? `blockhub-${pack}-contract.zip`
          : `blockhub-${appId}-contract.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      setError(e instanceof Error ? e.message : '下载失败')
    } finally {
      setDlBusy(false)
    }
  }

  const canDl = Boolean(access?.can_download || role === 'admin' || mode === 'preview')
  const pendingMine = access?.my_request?.status === 'pending'

  return (
    <div className={`dev-bp ${embedded ? 'is-embedded' : ''} ${className}`} style={{ '--dev-bp-accent': accent } as CSSProperties}>
      {!embedded ? (
        <button type="button" className="dev-bp-toggle" onClick={() => setOpen((v) => !v)}>
          {open ? '收起交付说明' : '本应用 · 库表/接口/代码'}
        </button>
      ) : null}

      {open && (
        <div className="dev-bp-panel" role={embedded ? 'region' : 'dialog'} aria-label="本应用交付说明">
          <header className="dev-bp-head">
            <div>
              <strong>{embedded ? '库表 · 接口 · 代码路径' : mode === 'preview' ? '行业 Runtime 预览契约' : '本应用交付说明'}</strong>
              <span>
                {mode === 'preview'
                  ? `预览包 ${pack}`
                  : `应用 ${appId || '—'}`}
                {data?.app?.name ? ` · ${data.app.name}` : ''}
                {data?.capability_keys?.length ? ` · ${data.capability_keys.length} 个能力` : ''}
              </span>
            </div>
            <div className="dev-bp-actions">
              <a href={data?.openapi_url || '/docs'} target="_blank" rel="noreferrer" title="平台全量接口文档（非单应用过滤）">
                OpenAPI
              </a>
              {canDl ? (
                <button type="button" disabled={dlBusy || !token} onClick={() => void downloadZip()}>
                  {dlBusy ? '打包中…' : '下载契约包'}
                </button>
              ) : pendingMine ? (
                <button type="button" disabled>
                  已申请 · 待批准
                </button>
              ) : (
                <button type="button" disabled={dlBusy || !token || mode !== 'app'} onClick={() => void requestDownload()}>
                  {dlBusy ? '…' : '申请下载'}
                </button>
              )}
            </div>
          </header>

          <p className="dev-bp-hint">
            与上方「草稿 / 版本」同一交付闭环：草稿管页面配置；此处说明当前正式能力对应的库表与接口。
            下载的是契约快照（说明 + 路径索引），不是完整仓库。OpenAPI 为平台文档。
          </p>

          {access?.is_admin && (access.pending_requests || []).length > 0 && (
            <div className="dev-bp-grants">
              <p className="dev-bp-msg">待批准下载申请</p>
              <ul>
                {(access.pending_requests || []).map((r) => (
                  <li key={r.user_id}>
                    <span>{r.user_name || r.user_id}</span>
                    <button type="button" disabled={dlBusy} onClick={() => void approveDownload(r.user_id)}>
                      批准
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!token && (
            <div className="dev-bp-login">
              <p>查看与申请需登录。下载需管理员批准（管理员可直接下载）。</p>
              <label>
                邮箱
                <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </label>
              <label>
                密码
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <button type="button" disabled={loginBusy} onClick={() => void doLogin()}>
                {loginBusy ? '登录中…' : '登录并加载'}
              </button>
            </div>
          )}

          {busy && <p className="dev-bp-msg">加载中…</p>}
          {error && <p className="dev-bp-err">{error}</p>}
          {access?.hint && token && <p className="dev-bp-hint">{access.hint}</p>}

          {data?.modules && data.modules.length > 0 && (
            <div className="dev-bp-body">
              <aside className="dev-bp-keys">
                {data.modules.map((m) => (
                  <button
                    key={m.capability_key}
                    type="button"
                    className={m.capability_key === active?.capability_key ? 'on' : undefined}
                    onClick={() => setActiveKey(m.capability_key)}
                  >
                    <em>{m.capability_key}</em>
                    <span>{m.name}</span>
                  </button>
                ))}
              </aside>
              <div className="dev-bp-main">
                <div className="dev-bp-tabs">
                  {(
                    [
                      ['tables', '库表字段'],
                      ['apis', '接口'],
                      ['code', '代码'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={tab === id ? 'on' : undefined}
                      onClick={() => setTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {active && tab === 'tables' && (
                  <div className="dev-bp-section">
                    {active.table ? (
                      <>
                        <p className="dev-bp-table-name">
                          <code>{active.table.name}</code>
                          {active.table.label ? ` · ${active.table.label}` : ''}
                          {active.table.kind_filter ? ` · kind=${active.table.kind_filter}` : ''}
                        </p>
                        <table>
                          <thead>
                            <tr>
                              <th>字段</th>
                              <th>类型</th>
                              <th>可空</th>
                              <th>主键</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(active.columns || []).map((c) => (
                              <tr key={c.name}>
                                <td>{c.name}</td>
                                <td>{c.type}</td>
                                <td>{c.nullable}</td>
                                <td>{c.primary_key || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    ) : (
                      <p className="dev-bp-msg">该能力暂无独立业务表（或走共享/ mock 接口）。</p>
                    )}
                  </div>
                )}

                {active && tab === 'apis' && (
                  <ul className="dev-bp-apis">
                    {(active.apis || []).map((api) => (
                      <li key={`${api.method}:${api.path}`}>
                        <code className={`m-${api.method.toLowerCase()}`}>{api.method}</code>
                        <code className="path">{api.path}</code>
                        <span>{api.desc}</span>
                        <em>{api.auth || 'JWT'}</em>
                      </li>
                    ))}
                  </ul>
                )}

                {active && tab === 'code' && (
                  <div className="dev-bp-section">
                    <p className="dev-bp-msg">仓库内路径索引：</p>
                    <ul className="dev-bp-paths">
                      {(active.code_paths || []).map((p) => (
                        <li key={p}>
                          <code>{p}</code>
                        </li>
                      ))}
                    </ul>
                    {active.client_snippet && (
                      <>
                        <p className="dev-bp-msg">调用样例：</p>
                        <pre>{active.client_snippet}</pre>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
