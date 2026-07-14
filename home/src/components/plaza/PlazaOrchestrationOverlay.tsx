import { useEffect, useState } from 'react'
import { IconGlobe } from '../icons'
import AppIconAvatar from '../AppIconAvatar'
import DeliveryProgress from '../DeliveryProgress'
import PublishSuccessCard from '../PublishSuccessCard'
import PlazaDualRailFlowPanel from './PlazaDualRailFlowPanel'
import PlazaOrchExperienceBar from './PlazaOrchExperienceBar'
import PlazaShanghaiVoiceApiChecks from './PlazaShanghaiVoiceApiChecks'
import type { AuthUser } from '../../auth/session'
import type { PlazaAudienceMeta, StoredMyApp } from '../../lib/myAppsStorage'
import { setMyAppPlazaAudience } from '../../lib/myAppsStorage'
import { showAppDeliver } from '../../data/deliverDisplay'
import { isShanghaiVoiceApp } from '../../lib/shanghaiVoiceProject'
import { runShanghaiVoiceSmoke, shanghaiIngressApi } from '../../lib/shanghaiVoiceSmoke'
import { testFlowApi } from '../../lib/flowModuleApis'
import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'

interface Props {
  app: StoredMyApp
  user: AuthUser | null
  justPublished?: boolean
  onClose: () => void
  onRemove: () => void
  onPlazaPublished?: (meta: PlazaAudienceMeta) => void
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function moduleLabels(app: StoredMyApp): string[] {
  if (app.modules?.length) return app.modules.map((m) => m.label)
  return app.scenarios?.slice(0, 6) ?? []
}

type BodyTab = 'flow' | 'api'

export default function PlazaOrchestrationOverlay({
  app,
  user,
  justPublished = false,
  onClose,
  onRemove,
  onPlazaPublished,
}: Props) {
  const appKey = app.appId || app.webUrl
  const showDelivery = showAppDeliver(app)
  const shanghai = isShanghaiVoiceApp(app)
  const run = usePlazaFlowRun()

  const [bodyTab, setBodyTab] = useState<BodyTab>('flow')
  const [progressOpen, setProgressOpen] = useState(justPublished && showDelivery)
  const [smokeBusy, setSmokeBusy] = useState(false)
  const [smokeLog, setSmokeLog] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    document.body.classList.add('plaza-orch-open')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      document.body.classList.remove('plaza-orch-open')
    }
  }, [onClose])

  const startTrial = () => {
    setBodyTab('flow')
    run.enterRunMode()
    run.start()
  }

  const runSmoke = async () => {
    setSmokeBusy(true)
    setSmokeLog('检测中…')
    try {
      if (shanghai) {
        const r = await runShanghaiVoiceSmoke(appKey)
        setSmokeLog(r.summary)
      } else {
        const r = await testFlowApi(shanghaiIngressApi(appKey))
        setSmokeLog(
          `【接口冒烟】HTTP ${r.status} · ${r.ms}ms\n` +
            `${r.ok ? '入口 mock 可通' : '入口失败'} · ${JSON.stringify(r.body).slice(0, 200)}`,
        )
      }
      setBodyTab('api')
    } catch (e) {
      setSmokeLog(`冒烟失败：${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSmokeBusy(false)
    }
  }

  return (
    <div
      className={`plaza-orch-overlay is-plan-b${justPublished ? ' is-just-published' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={justPublished ? `发布成功 ${app.appName}` : `编排 ${app.appName}`}
    >
      <div className="plaza-orch-backdrop" onClick={onClose} aria-hidden />
      <div className="plaza-orch-sheet">
        <header className="plaza-orch-head">
          <div className="plaza-orch-head-main">
            <AppIconAvatar
              name={app.appName}
              iconUrl={app.iconUrl}
              primaryColor={app.primaryColor}
              size={48}
            />
            <div>
              <h2 className="plaza-orch-title">
                <span className="plaza-mflow-chev chev-hero" aria-hidden>&gt;&gt;</span>
                {app.appName}
              </h2>
              <div className="plaza-orch-pills">
                <span className="plaza-orch-pill">{app.moduleCount} 项能力</span>
                <span className="plaza-orch-pill">创建者</span>
                {shanghai && <span className="plaza-orch-pill ok">上海话</span>}
                {showDelivery && !app.apkReady && (
                  <span className="plaza-orch-pill warn">APK 构建中</span>
                )}
                {app.apkReady && <span className="plaza-orch-pill ok">APK 就绪</span>}
                {app.plaza && <span className="plaza-orch-pill">{app.plaza.label}</span>}
                <span className="plaza-orch-pill muted">{formatWhen(app.savedAt)}</span>
              </div>
            </div>
          </div>
          <div className="plaza-orch-head-actions">
            <button type="button" className="btn-ghost" onClick={() => navigator.clipboard.writeText(app.webUrl)}>
              复制链接
            </button>
            <a className="btn-ghost" href={app.webUrl} target="_blank" rel="noreferrer">
              <IconGlobe size={14} /> 打开
            </a>
            <button type="button" className="btn-ghost plaza-my-remove" onClick={onRemove}>移除</button>
            <button type="button" className="btn-primary plaza-orch-close" onClick={onClose}>关闭</button>
          </div>
        </header>

        <div className="plaza-orch-body">
          {justPublished && (
            <section className="plaza-orch-publish-primary" aria-label="交付与分享">
              <h3 className="plaza-orch-section-title">
                <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span> 交付与分享
              </h3>
              <PublishSuccessCard
                result={app}
                showAdminLink={!!user}
                compact
                orchestration
                plazaMeta={app.plaza}
                onPlazaPublished={(meta) => {
                  setMyAppPlazaAudience(appKey, meta)
                  onPlazaPublished?.(meta)
                }}
              />
            </section>
          )}

          <PlazaOrchExperienceBar
            app={app}
            progressExpanded={progressOpen}
            onToggleProgress={() => setProgressOpen((v) => !v)}
            onStartTrial={startTrial}
            onSmoke={() => void runSmoke()}
            smokeBusy={smokeBusy}
          />

          {progressOpen && showDelivery && (
            <div className="plaza-orch-delivery">
              <DeliveryProgress app={app} compact />
            </div>
          )}

          {smokeLog && (
            <div className="plaza-orch-analysis" role="status">
              <strong>冒烟结果</strong>
              <p>{smokeLog}</p>
            </div>
          )}

          <div className="plaza-orch-body-tabs" role="tablist" aria-label="编排分区">
            <button
              type="button"
              role="tab"
              className={`plaza-orch-body-tab${bodyTab === 'flow' ? ' on' : ''}`}
              aria-selected={bodyTab === 'flow'}
              onClick={() => setBodyTab('flow')}
            >
              功能编排
            </button>
            <button
              type="button"
              role="tab"
              className={`plaza-orch-body-tab${bodyTab === 'api' ? ' on' : ''}`}
              aria-selected={bodyTab === 'api'}
              onClick={() => setBodyTab('api')}
            >
              数据接口与验证
            </button>
          </div>

          <p className="plaza-orch-tab-hint">
            {bodyTab === 'flow'
              ? shanghai
                ? '突出上海话等用户可感知能力；可拖序、试运营。接口请切右侧 Tab。'
                : '先看功能能力与试运营；数据路径与接口测试在「数据接口与验证」。'
              : shanghai
                ? '真链路与编排 mock 分开展示；下方节点 IN/OUT 可点测。'
                : '查看各节点 REST 契约，点测试验证是否可通。'}
          </p>

          {bodyTab === 'api' && shanghai && (
            <PlazaShanghaiVoiceApiChecks
              appKey={appKey}
              webUrl={app.webUrl}
              onReport={setSmokeLog}
            />
          )}

          <PlazaDualRailFlowPanel
            appKey={appKey}
            appName={app.appName}
            moduleLabels={moduleLabels(app)}
            isCreator
            embedded
            railMode={bodyTab === 'flow' ? 'func' : 'data'}
            commandProfile={shanghai ? 'shanghai' : 'default'}
            webUrl={app.webUrl}
          />

          {!justPublished && (
            <details className="plaza-orch-share">
              <summary>
                <span className="plaza-mflow-chev">&gt;&gt;</span> 分享与发布
                <span className="plaza-orch-share-hint">默认 @公开 · 全体可见</span>
              </summary>
              <PublishSuccessCard
                result={app}
                showAdminLink={!!user}
                compact
                orchestration
                plazaMeta={app.plaza}
                onPlazaPublished={(meta) => {
                  setMyAppPlazaAudience(appKey, meta)
                  onPlazaPublished?.(meta)
                }}
              />
            </details>
          )}
        </div>
      </div>
    </div>
  )
}
