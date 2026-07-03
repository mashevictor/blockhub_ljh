import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PublishSuccessCard from '../../components/PublishSuccessCard'
import PlazaModuleFlowPanel from '../../components/plaza/PlazaModuleFlowPanel'
import { IconGlobe, IconLayers } from '../../components/icons'
import AppIconAvatar from '../../components/AppIconAvatar'
import type { PublishResult } from '../../data/constants'
import { fetchMe, type AuthUser } from '../../auth/session'
import { getToken } from '../../auth/storage'
import { loadMyApps, removeMyApp, type StoredMyApp } from '../../lib/myAppsStorage'
import { ROUTES } from '../../routes/paths'

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN')
  } catch {
    return iso
  }
}

function appKey(app: StoredMyApp) {
  return app.appId || app.webUrl
}

function moduleLabels(app: StoredMyApp): string[] {
  if (app.modules?.length) return app.modules.map((m) => m.label)
  return app.scenarios?.slice(0, 6) ?? []
}

export default function PlazaMyAppsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [highlightApp, setHighlightApp] = useState<PublishResult | null>(null)
  const [apps, setApps] = useState<StoredMyApp[]>([])
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    setApps(loadMyApps())
  }, [location.pathname])

  useEffect(() => {
    const state = location.state as { justPublished?: PublishResult } | null
    if (state?.justPublished) {
      setHighlightApp(state.justPublished)
      navigate(ROUTES.plazaMyApps, { replace: true, state: {} })
    }
  }, [location.state, navigate])

  useEffect(() => {
    if (!getToken()) {
      setUser(null)
      return
    }
    fetchMe().then(setUser).catch(() => setUser(null))
  }, [])

  const handleRemove = (app: StoredMyApp) => {
    const key = appKey(app)
    setApps(removeMyApp(key))
    if (expandedKey === key) setExpandedKey(null)
    if (highlightApp && (highlightApp.appId || highlightApp.webUrl) === key) {
      setHighlightApp(null)
    }
  }

  const highlightKey = highlightApp ? (highlightApp.appId || highlightApp.webUrl) : null
  const otherApps = highlightKey
    ? apps.filter((a) => appKey(a) !== highlightKey)
    : apps

  const renderAppFlow = (app: StoredMyApp, compact?: boolean) => (
    <PlazaModuleFlowPanel
      appKey={appKey(app)}
      appName={app.appName}
      moduleLabels={moduleLabels(app)}
      isCreator
      compact={compact}
    />
  )

  return (
    <main className="plaza-main plaza-my-main">
      <div className="plaza-main-head">
        <h1><IconLayers size={20} /> 我的应用</h1>
        <Link to={ROUTES.home} className="plaza-my-create-btn">+ 继续创建</Link>
      </div>
      <p className="plaza-main-hint">
        你是这些应用的<strong>创建者</strong>，可编辑模块数据流、发布到广场 @ 受众。
        {user ? ` 已登录 ${user.email}` : ' 未登录时数据仅存本设备。'}
      </p>

      {highlightApp && (
        <section className="plaza-my-just-published" aria-label="刚发布的应用">
          <p className="plaza-my-success-banner">🎉 发布成功，已保存到「我的应用」</p>
          {renderAppFlow({ ...highlightApp, savedAt: new Date().toISOString() } as StoredMyApp)}
          <PublishSuccessCard
            result={highlightApp}
            showAdminLink={!!user}
            onPlazaPublished={() => setApps(loadMyApps())}
          />
        </section>
      )}

      {apps.length === 0 && !highlightApp && (
        <div className="plaza-my-empty">
          <p>还没有发布过应用</p>
          <p className="plaza-my-empty-hint">在首页创建并发布后，会自动跳转到这里</p>
          <Link to={ROUTES.home} className="btn-primary plaza-my-empty-cta">去创建应用</Link>
        </div>
      )}

      {otherApps.length > 0 && (
        <section className="plaza-my-history">
          <h2>{highlightApp ? '历史应用' : '全部应用'} <span className="plaza-my-count">{otherApps.length}</span></h2>
          <ul className="plaza-my-list">
            {otherApps.map((app) => {
              const key = appKey(app)
              const expanded = expandedKey === key
              return (
                <li key={key} className={`plaza-my-item${expanded ? ' expanded' : ''}`}>
                  <div className="plaza-my-item-row">
                    <AppIconAvatar
                      name={app.appName}
                      iconUrl={app.iconUrl}
                      primaryColor={app.primaryColor}
                      size={44}
                    />
                    <div className="plaza-my-item-main">
                      <strong>{app.appName}</strong>
                      <span className="plaza-my-meta">
                        {app.moduleCount} 项功能 · {formatWhen(app.savedAt)}
                        <span className="plaza-creator-badge">创建者</span>
                        {app.plaza && (
                          <span className="plaza-my-at-badge">{app.plaza.label}</span>
                        )}
                      </span>
                    </div>
                    <div className="plaza-my-item-actions">
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setExpandedKey(expanded ? null : key)}
                      >
                        {expanded ? '收起' : '模块流 / 详情'}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => navigator.clipboard.writeText(app.webUrl)}
                      >
                        复制链接
                      </button>
                      <a className="btn-ghost" href={app.webUrl} target="_blank" rel="noreferrer">
                        <IconGlobe size={14} /> 打开
                      </a>
                      <button type="button" className="btn-ghost plaza-my-remove" onClick={() => handleRemove(app)}>
                        移除
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="plaza-my-item-detail">
                      {renderAppFlow(app, true)}
                      <PublishSuccessCard
                        result={app}
                        showAdminLink={!!user}
                        compact
                        plazaMeta={app.plaza}
                        onPlazaPublished={() => setApps(loadMyApps())}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </main>
  )
}
