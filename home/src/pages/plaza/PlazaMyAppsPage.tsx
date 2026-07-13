import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconGlobe } from '../../components/icons'
import AppIconAvatar from '../../components/AppIconAvatar'
import PlazaOrchestrationOverlay from '../../components/plaza/PlazaOrchestrationOverlay'
import { showAppDeliver } from '../../data/deliverDisplay'
import { fetchMe, type AuthUser } from '../../auth/session'
import { getToken } from '../../auth/storage'
import { removeMyApp, type StoredMyApp } from '../../lib/myAppsStorage'
import { useMyApps } from '../../hooks/useMyApps'
import { ROUTES } from '../../routes/paths'
import { usePlazaFocus } from '../../context/PlazaFocusContext'
import {
  appDomId,
  clearJustPublished,
  readJustPublished,
} from '../../lib/publishFlow'

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function appKey(app: StoredMyApp) {
  return app.appId || app.webUrl
}

function statusLine(app: StoredMyApp, isNew: boolean): string {
  const parts: string[] = [`${app.moduleCount} 项`]
  if (isNew) parts.push('刚发布')
  if (showAppDeliver(app) && !app.apkReady) parts.push('APK 构建中')
  else if (app.apkReady) parts.push('APK 就绪')
  if (app.plaza) parts.push(app.plaza.label)
  parts.push(formatWhen(app.savedAt))
  return parts.join(' · ')
}

export default function PlazaMyAppsPage() {
  const publishHint = readJustPublished()
  const [justPublishedId, setJustPublishedId] = useState<string | null>(
    () => publishHint?.appKey ?? null,
  )
  const saveFailed = Boolean(publishHint?.saveFailed)
  const apps = useMyApps()
  const [orchApp, setOrchApp] = useState<StoredMyApp | null>(null)
  const [focusKey, setFocusKey] = useState<string | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const scrolledRef = useRef(false)
  const orchDismissedRef = useRef(false)
  const { setFocus, registerOrchestrationHandler } = usePlazaFocus()

  useEffect(() => {
    if (!justPublishedId) return
    const found = apps.some((a) => appKey(a) === justPublishedId)
    if (found) {
      clearJustPublished()
    }
  }, [justPublishedId, apps])

  useEffect(() => {
    if (!justPublishedId || scrolledRef.current) return
    const domId = appDomId(justPublishedId)
    const el = document.getElementById(domId)
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

  useEffect(() => {
    if (!justPublishedId || orchApp || orchDismissedRef.current) return
    const app = apps.find((a) => appKey(a) === justPublishedId)
    if (app) setOrchApp(app)
  }, [justPublishedId, apps, orchApp])

  const focusApp = orchApp
    ?? (focusKey ? apps.find((a) => appKey(a) === focusKey) : null)
    ?? apps[0]
    ?? null

  useEffect(() => {
    if (!focusApp) {
      setFocus(null)
      return
    }
    const key = appKey(focusApp)
    setFocus({
      appKey: key,
      appName: focusApp.appName,
      webUrl: focusApp.webUrl,
      moduleCount: focusApp.moduleCount,
      plazaLabel: focusApp.plaza?.label,
      isCreator: true,
      source: 'my',
      inOrchestration: Boolean(orchApp && appKey(orchApp) === key),
    })
  }, [focusApp, orchApp, setFocus])

  const openOrchestration = useCallback((app: StoredMyApp) => {
    orchDismissedRef.current = false
    setFocusKey(appKey(app))
    setOrchApp(app)
  }, [])

  const closeOrchestration = useCallback(() => {
    orchDismissedRef.current = true
    setOrchApp(null)
    setJustPublishedId(null)
    clearJustPublished()
  }, [])

  useEffect(() => {
    registerOrchestrationHandler((key: string) => {
      const app = apps.find((a) => appKey(a) === key)
      if (app) openOrchestration(app)
    })
    return () => registerOrchestrationHandler(null)
  }, [apps, openOrchestration, registerOrchestrationHandler])

  const handleRemove = (app: StoredMyApp) => {
    const key = appKey(app)
    removeMyApp(key)
    if (orchApp && appKey(orchApp) === key) setOrchApp(null)
    if (justPublishedId === key) setJustPublishedId(null)
  }

  return (
    <main className="plaza-main plaza-my-main">
      <div className="plaza-main-head plaza-my-head-slim">
        <div>
          <h1><span className="plaza-mflow-chev chev-hero" aria-hidden>&gt;&gt;</span> 我的应用</h1>
          <p className="plaza-my-head-sub">
            点击 <strong>编排</strong> 进入完整数据流，在 <span className="plaza-mflow-chev">&gt;&gt;</span> 悬浮框中调整模块
          </p>
        </div>
        <Link to={ROUTES.home} className="plaza-my-create-btn">+ 继续创建</Link>
      </div>

      {saveFailed && (
        <p className="publish-save-warn" role="alert">
          应用已发布，但未能写入本机「我的应用」列表，请检查浏览器是否禁用本地存储
        </p>
      )}

      {justPublishedId && apps.some((a) => appKey(a) === justPublishedId) && (
        <p className="plaza-my-success-banner">🎉 发布成功 — 已为你打开编排层，可在数据流中拖动模块</p>
      )}

      {apps.length === 0 && (
        <div className="plaza-my-empty">
          <p>还没有发布过应用</p>
          <p className="plaza-my-empty-hint">在首页创建并发布后，会自动出现在这里</p>
          <Link to={ROUTES.home} className="btn-primary plaza-my-empty-cta">去生成应用</Link>
        </div>
      )}

      {apps.length > 0 && (
        <section className="plaza-my-history">
          <h2 className="plaza-my-history-label">
            全部应用 <span className="plaza-my-count">{apps.length}</span>
          </h2>
          <ul className="plaza-my-list plaza-my-list-d">
            {apps.map((app) => {
              const key = appKey(app)
              const isNew = justPublishedId === key

              return (
                <li
                  key={key}
                  id={appDomId(key)}
                  className={`plaza-my-card${isNew ? ' just-published' : ''}${focusApp && appKey(focusApp) === key ? ' focused' : ''}`}
                  onClick={() => setFocusKey(key)}
                >
                  <AppIconAvatar
                    name={app.appName}
                    iconUrl={app.iconUrl}
                    primaryColor={app.primaryColor}
                    size={44}
                  />
                  <div className="plaza-my-card-main">
                    <strong>{app.appName}</strong>
                    <span className="plaza-my-card-meta">{statusLine(app, isNew)}</span>
                  </div>
                  <div className="plaza-my-card-actions">
                    <button
                      type="button"
                      className="btn-primary plaza-my-orch-btn"
                      onClick={() => openOrchestration(app)}
                    >
                      <span className="plaza-mflow-chev">&gt;&gt;</span> 编排
                    </button>
                    <a className="btn-ghost plaza-my-card-icon-btn" href={app.webUrl} target="_blank" rel="noreferrer" title="打开">
                      <IconGlobe size={16} />
                    </a>
                    <button
                      type="button"
                      className="btn-ghost plaza-my-card-icon-btn"
                      title="复制链接"
                      onClick={() => navigator.clipboard.writeText(app.webUrl)}
                    >
                      链接
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {orchApp && (
        <PlazaOrchestrationOverlay
          app={orchApp}
          user={user}
          onClose={closeOrchestration}
          onRemove={() => handleRemove(orchApp)}
          onPlazaPublished={(meta) => setOrchApp((prev) => (prev ? { ...prev, plaza: meta } : null))}
        />
      )}
    </main>
  )
}
