import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IconGlobe } from '../../components/icons'
import AppIconAvatar from '../../components/AppIconAvatar'
import PlazaOrchestrationOverlay from '../../components/plaza/PlazaOrchestrationOverlay'
import PlazaPublishButton from '../../components/plaza/PlazaPublishButton'
import PlazaAppStatusButton from '../../components/plaza/PlazaAppStatusButton'
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
      moduleLabels: focusApp.modules?.map((m) => m.label) ?? focusApp.scenarios,
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
          <p className="plaza-my-head-sub plaza-my-head-sub--full">
            点选应用，在底部工作台继续编排与试运营；需要完整视图时点「编排」
          </p>
          <p className="plaza-my-head-sub plaza-my-head-sub--short">
            点选应用，在底部工作台继续编排
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
        <p className="plaza-my-success-banner">🎉 发布成功 — 请确认交付进度与分享链接，模块编排可稍后展开</p>
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
                    <div className="plaza-my-card-title-row">
                      <strong>{app.appName}</strong>
                    </div>
                    <span className="plaza-my-card-meta">{statusLine(app, isNew)}</span>
                  </div>
                  <div className="plaza-my-card-actions" onClick={(e) => e.stopPropagation()}>
                    <PlazaAppStatusButton
                      app={app}
                      isNew={isNew}
                      inline
                      isFocused={Boolean(focusApp && appKey(focusApp) === key)}
                      onFocusApp={() => setFocusKey(key)}
                      onOpenDetail={() => openOrchestration(app)}
                    />
                    <button
                      type="button"
                      className="btn-primary plaza-my-orch-btn"
                      onClick={() => openOrchestration(app)}
                    >
                      <span className="plaza-mflow-chev">&gt;&gt;</span> 编排
                    </button>
                    <PlazaPublishButton app={app} />
                    <a className="btn-ghost plaza-my-card-icon-btn" href={app.webUrl} target="_blank" rel="noreferrer" title="打开网页">
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
          justPublished={justPublishedId === appKey(orchApp)}
          onClose={closeOrchestration}
          onRemove={() => handleRemove(orchApp)}
          onPlazaPublished={(meta) => setOrchApp((prev) => (prev ? { ...prev, plaza: meta } : null))}
        />
      )}
    </main>
  )
}
