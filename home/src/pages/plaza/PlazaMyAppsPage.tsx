import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import PublishSuccessCard from '../../components/PublishSuccessCard'
import DeliveryProgress from '../../components/DeliveryProgress'
import PlazaModuleFlowPanel from '../../components/plaza/PlazaModuleFlowPanel'
import { IconGlobe, IconLayers } from '../../components/icons'
import AppIconAvatar from '../../components/AppIconAvatar'
import { showAppDeliver } from '../../data/deliverDisplay'
import { fetchMe, type AuthUser } from '../../auth/session'
import { getToken } from '../../auth/storage'
import { removeMyApp, type StoredMyApp } from '../../lib/myAppsStorage'
import { useMyApps } from '../../hooks/useMyApps'
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

type PlazaNavState = {
  justPublishedId?: string
  saveFailed?: boolean
}

export default function PlazaMyAppsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navState = (location.state as PlazaNavState | null) ?? {}
  const [justPublishedId, setJustPublishedId] = useState<string | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const apps = useMyApps()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const scrolledRef = useRef(false)

  useEffect(() => {
    if (navState.justPublishedId) {
      setJustPublishedId(navState.justPublishedId)
      setExpandedKey(navState.justPublishedId)
      setSaveFailed(Boolean(navState.saveFailed))
      scrolledRef.current = false
      navigate(ROUTES.plazaMyApps, { replace: true, state: {} })
    }
  }, [location.state, navigate, navState.justPublishedId, navState.saveFailed])

  useEffect(() => {
    if (!justPublishedId || scrolledRef.current) return
    const el = document.getElementById(`my-app-${justPublishedId}`)
    if (!el) return
    scrolledRef.current = true
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [justPublishedId, apps])

  useEffect(() => {
    if (!getToken()) {
      setUser(null)
      return
    }
    fetchMe().then(setUser).catch(() => setUser(null))
  }, [])

  const handleRemove = (app: StoredMyApp) => {
    const key = appKey(app)
    removeMyApp(key)
    if (expandedKey === key) setExpandedKey(null)
    if (justPublishedId === key) setJustPublishedId(null)
  }

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

      {saveFailed && (
        <p className="publish-save-warn" role="alert">
          应用已发布，但未能写入本机「我的应用」列表，请检查浏览器是否禁用本地存储
        </p>
      )}

      {justPublishedId && apps.some((a) => appKey(a) === justPublishedId) && (
        <p className="plaza-my-success-banner">🎉 发布成功，已保存到「我的应用」</p>
      )}

      {apps.length === 0 && (
        <div className="plaza-my-empty">
          <p>还没有发布过应用</p>
          <p className="plaza-my-empty-hint">在首页创建并发布后，会自动跳转到这里</p>
          <Link to={ROUTES.home} className="btn-primary plaza-my-empty-cta">去创建应用</Link>
        </div>
      )}

      {apps.length > 0 && (
        <section className="plaza-my-history">
          <h2>全部应用 <span className="plaza-my-count">{apps.length}</span></h2>
          <ul className="plaza-my-list">
            {apps.map((app) => {
              const key = appKey(app)
              const isNew = justPublishedId === key
              const expanded = expandedKey === key || isNew
              const showDelivery = showAppDeliver(app) || isNew

              return (
                <li
                  key={key}
                  id={`my-app-${key}`}
                  className={`plaza-my-item${expanded ? ' expanded' : ''}${isNew ? ' just-published' : ''}`}
                >
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
                        {isNew && <span className="plaza-my-new-badge">刚发布</span>}
                        <span className="plaza-creator-badge">创建者</span>
                        {app.plaza && (
                          <span className="plaza-my-at-badge">{app.plaza.label}</span>
                        )}
                        {showAppDeliver(app) && !app.apkReady && (
                          <span className="plaza-my-apk-pending">APK 构建中</span>
                        )}
                      </span>
                    </div>
                    <div className="plaza-my-item-actions">
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => setExpandedKey(expanded && !isNew ? null : key)}
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
                      {showDelivery && <DeliveryProgress app={app} compact />}
                      {renderAppFlow(app, true)}
                      <PublishSuccessCard
                        result={app}
                        showAdminLink={!!user}
                        compact
                        plazaMeta={app.plaza}
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
