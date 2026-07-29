import { useEffect, useState } from 'react'
import { useI18n, useT } from '@blockhub/i18n/react'
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
import { runShanghaiVoiceSmoke } from '../../lib/shanghaiVoiceSmoke'
import { usePlazaFlowRun } from '../../context/PlazaFlowRunContext'

interface Props {
  app: StoredMyApp
  user: AuthUser | null
  justPublished?: boolean
  onClose: () => void
  onRemove: () => void
  onPlazaPublished?: (meta: PlazaAudienceMeta) => void
}

function formatWhen(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleString(locale === 'en-US' ? 'en-US' : 'zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
  const t = useT()
  const { locale } = useI18n()
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
    run.enterPreviewMode()
    run.start()
  }

  const runSmoke = async () => {
    setSmokeBusy(true)
    setSmokeLog(t('home.plaza.orch.smoke_checking'))
    try {
      if (shanghai) {
        const r = await runShanghaiVoiceSmoke()
        setSmokeLog(r.summary)
        setBodyTab('api')
      } else {
        setSmokeLog(t('home.plaza.orch.smoke_web', { url: app.webUrl }))
      }
    } catch (e) {
      setSmokeLog(t('home.plaza.orch.smoke_fail', {
        error: e instanceof Error ? e.message : String(e),
      }))
    } finally {
      setSmokeBusy(false)
    }
  }

  return (
    <div
      className={`plaza-orch-overlay is-plan-b${justPublished ? ' is-just-published' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={
        justPublished
          ? t('home.plaza.orch.aria_success', { name: app.appName })
          : t('home.plaza.orch.aria_overview', { name: app.appName })
      }
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
                <span className="plaza-orch-pill">{t('home.plaza.orch.modules_n', { n: app.moduleCount })}</span>
                <span className="plaza-orch-pill">{t('home.plaza.orch.creator')}</span>
                {shanghai && <span className="plaza-orch-pill ok">{t('home.plaza.orch.shanghai')}</span>}
                {showDelivery && !app.apkReady && (
                  <span className="plaza-orch-pill warn">{t('home.plaza.orch.apk_building')}</span>
                )}
                {app.apkReady && <span className="plaza-orch-pill ok">{t('home.plaza.orch.apk_ready')}</span>}
                {app.plaza && <span className="plaza-orch-pill">{app.plaza.label}</span>}
                <span className="plaza-orch-pill muted">{formatWhen(app.savedAt, locale)}</span>
              </div>
            </div>
          </div>
          <div className="plaza-orch-head-actions">
            <button type="button" className="btn-ghost" onClick={() => navigator.clipboard.writeText(app.webUrl)}>
              {t('home.plaza.orch.copy_link')}
            </button>
            <a className="btn-ghost" href={app.webUrl} target="_blank" rel="noreferrer">
              <IconGlobe size={14} /> {t('home.plaza.orch.open_web')}
            </a>
            {showDelivery && (
              <a
                className={app.apkReady ? 'btn-primary' : 'btn-ghost'}
                href={app.downloadUrl || `${app.webUrl}/download`}
                target="_blank"
                rel="noreferrer"
              >
                {app.apkReady ? t('home.plaza.orch.download_apk') : t('home.plaza.orch.apk_link')}
              </a>
            )}
            <button type="button" className="btn-ghost plaza-my-remove" onClick={onRemove}>
              {t('home.plaza.orch.remove')}
            </button>
            <button type="button" className="btn-primary plaza-orch-close" onClick={onClose}>
              {t('home.plaza.orch.close')}
            </button>
          </div>
        </header>

        <div className="plaza-orch-body">
          {justPublished && (
            <section className="plaza-orch-publish-primary" aria-label={t('home.plaza.orch.deliver_aria')}>
              <h3 className="plaza-orch-section-title">
                <span className="plaza-mflow-chev" aria-hidden>&gt;&gt;</span> {t('home.plaza.orch.deliver_share')}
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
              <strong>{t('home.plaza.orch.smoke_result')}</strong>
              <p>{smokeLog}</p>
            </div>
          )}

          <div className="plaza-orch-body-tabs" role="tablist" aria-label={t('home.plaza.orch.tabs_aria')}>
            <button
              type="button"
              role="tab"
              className={`plaza-orch-body-tab${bodyTab === 'flow' ? ' on' : ''}`}
              aria-selected={bodyTab === 'flow'}
              onClick={() => setBodyTab('flow')}
            >
              {t('home.plaza.orch.tab.flow')}
            </button>
            <button
              type="button"
              role="tab"
              className={`plaza-orch-body-tab${bodyTab === 'api' ? ' on' : ''}`}
              aria-selected={bodyTab === 'api'}
              onClick={() => setBodyTab('api')}
            >
              {t('home.plaza.orch.tab.api')}
            </button>
          </div>

          <p className="plaza-orch-tab-hint">
            {bodyTab === 'flow'
              ? shanghai
                ? t('home.plaza.orch.hint.flow_shanghai')
                : t('home.plaza.orch.hint.flow')
              : shanghai
                ? t('home.plaza.orch.hint.api_shanghai')
                : t('home.plaza.orch.hint.api')}
          </p>

          {bodyTab === 'api' && shanghai && (
            <PlazaShanghaiVoiceApiChecks
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
            railMode={
              shanghai
                ? 'func'
                : bodyTab === 'flow'
                  ? 'func'
                  : 'data'
            }
            commandProfile={shanghai ? 'shanghai' : 'default'}
            webUrl={app.webUrl}
          />

          {!justPublished && (
            <details className="plaza-orch-share">
              <summary>
                <span className="plaza-mflow-chev">&gt;&gt;</span> {t('home.plaza.orch.share')}
                <span className="plaza-orch-share-hint">{t('home.plaza.orch.share_hint')}</span>
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
