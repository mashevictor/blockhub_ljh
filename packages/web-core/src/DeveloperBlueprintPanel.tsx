import { useCallback, useEffect, useState, type CSSProperties } from 'react'

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
  /** 当前用户角色：admin 才能下载 zip */
  role?: string
  accent?: string
  className?: string
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
  onAuth,
}: DeveloperBlueprintPanelProps) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'tables' | 'apis' | 'code'>('tables')
  const [data, setData] = useState<DeveloperBlueprint | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dlBusy, setDlBusy] = useState(false)
  const [activeKey, setActiveKey] = useState('')
  const [token, setToken] = useState(tokenProp)
  const [role, setRole] = useState(roleProp || '')
  const [email, setEmail] = useState('admin@trackchat.local')
  const [password, setPassword] = useState('admin123')
  const [loginBusy, setLoginBusy] = useState(false)

  useEffect(() => {
    setToken(tokenProp)
  }, [tokenProp])

  useEffect(() => {
    if (roleProp) setRole(roleProp)
  }, [roleProp])

  const load = useCallback(async () => {
    if (!token) {
      setError('请先登录后再查看后端契约（查看需登录；下载 zip 需管理员）')
      setData(null)
      return
    }
    setBusy(true)
    setError('')
    try {
      const bp = await fetchBlueprint(mode, token, appId, pack)
      setData(bp)
      setActiveKey(bp.modules?.[0]?.capability_key || '')
    } catch (e) {
      setData(null)
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setBusy(false)
    }
  }, [mode, token, appId, pack])

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
    } catch (e) {
      setError(e instanceof Error ? e.message : '登录失败')
    } finally {
      setLoginBusy(false)
      setBusy(false)
    }
  }

  const downloadZip = async () => {
    if (!token) {
      setError('请先登录')
      return
    }
    if (role && role !== 'admin') {
      setError('下载源码包需要管理员权限（admin@trackchat.local / admin123）')
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
      if (res.status === 401 || res.status === 403) {
        throw new Error('无下载权限：请使用管理员账号登录（admin@trackchat.local）')
      }
      if (!res.ok) throw new Error(`下载失败 ${res.status}`)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download =
        mode === 'preview'
          ? `blockhub-${pack}-developer.zip`
          : `blockhub-${appId}-developer.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      setError(e instanceof Error ? e.message : '下载失败')
    } finally {
      setDlBusy(false)
    }
  }

  return (
    <div className={`dev-bp ${className}`} style={{ '--dev-bp-accent': accent } as CSSProperties}>
      <button type="button" className="dev-bp-toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '收起后端契约' : '库表 · 接口 · 代码'}
      </button>

      {open && (
        <div className="dev-bp-panel" role="dialog" aria-label="后端开发者契约">
          <header className="dev-bp-head">
            <div>
              <strong>后端契约</strong>
              <span>
                {mode === 'preview' ? `预览包 ${pack}` : `应用 ${appId}`}
                {data?.app?.name ? ` · ${data.app.name}` : ''}
                {role ? ` · ${role}` : ''}
              </span>
            </div>
            <div className="dev-bp-actions">
              <a href={data?.openapi_url || '/docs'} target="_blank" rel="noreferrer">
                OpenAPI
              </a>
              <button type="button" disabled={dlBusy || !token} onClick={() => void downloadZip()}>
                {dlBusy ? '打包中…' : '下载代码包'}
              </button>
            </div>
          </header>

          {!token && (
            <div className="dev-bp-login">
              <p>查看库表/接口需登录；下载 zip 需 <strong>admin</strong> 角色。</p>
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
              <p className="dev-bp-hint">演示：admin@trackchat.local / admin123 或 employee@… / emp123</p>
            </div>
          )}

          {busy && <p className="dev-bp-msg">加载中…</p>}
          {error && <p className="dev-bp-err">{error}</p>}
          {data?.download?.hint && token && <p className="dev-bp-hint">{data.download.hint}</p>}

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
                    <p className="dev-bp-msg">源码路径（完整仓库内）：</p>
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
