import { useT } from '@blockhub/i18n/react'
import { IconGlobe } from '../icons'
import type { StoredMyApp } from '../../lib/myAppsStorage'
import { showAppDeliver } from '../../data/deliverDisplay'
import { isShanghaiVoiceApp } from '../../lib/shanghaiVoiceProject'

interface Props {
  app: StoredMyApp
  progressExpanded: boolean
  onToggleProgress: () => void
  onStartTrial: () => void
  onSmoke: () => void
  smokeBusy?: boolean
}

/** 全屏编排 B 方案 · 顶部用户感知区（马上体验 / 交付 / 冒烟） */
export default function PlazaOrchExperienceBar({
  app,
  progressExpanded,
  onToggleProgress,
  onStartTrial,
  onSmoke,
  smokeBusy,
}: Props) {
  const t = useT()
  const shanghai = isShanghaiVoiceApp(app)
  const showDelivery = showAppDeliver(app)
  const deliverBrief = [
    t('home.plaza.exp.web_ok'),
    showDelivery ? (app.apkReady ? t('home.plaza.exp.apk_ok') : t('home.plaza.exp.apk_building')) : null,
    shanghai ? t('home.plaza.exp.voice_api') : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="plaza-orch-cta-row" aria-label={t('home.plaza.exp.aria')}>
      <div className="plaza-orch-cta is-main">
        <h3 className="plaza-orch-cta-title">{t('home.plaza.exp.try_title')}</h3>
        <p className="plaza-orch-cta-desc">
          {shanghai ? t('home.plaza.exp.try_desc_shanghai') : t('home.plaza.exp.try_desc')}
        </p>
        <div className="plaza-orch-cta-actions">
          <a className="btn-primary" href={app.webUrl} target="_blank" rel="noreferrer">
            <IconGlobe size={14} />
            {shanghai ? t('home.plaza.exp.open_shanghai') : t('home.plaza.exp.open_runtime')}
          </a>
          <button type="button" className="btn-ghost" onClick={onStartTrial}>
            {t('home.plaza.exp.flow_preview')}
          </button>
        </div>
      </div>

      <div className="plaza-orch-cta">
        <h3 className="plaza-orch-cta-title">{t('home.plaza.exp.deliver_title')}</h3>
        <p className="plaza-orch-cta-desc">{deliverBrief}</p>
        {showDelivery ? (
          <button type="button" className="btn-ghost" onClick={onToggleProgress}>
            {progressExpanded ? t('home.plaza.exp.collapse_progress') : t('home.plaza.exp.expand_progress')}
          </button>
        ) : (
          <span className="plaza-orch-cta-muted">{t('home.plaza.exp.web_only')}</span>
        )}
      </div>

      <div className="plaza-orch-cta">
        <h3 className="plaza-orch-cta-title">{t('home.plaza.exp.smoke_title')}</h3>
        <p className="plaza-orch-cta-desc">
          {shanghai ? t('home.plaza.exp.smoke_desc_shanghai') : t('home.plaza.exp.smoke_desc')}
        </p>
        <button type="button" className="btn-primary" onClick={onSmoke} disabled={smokeBusy}>
          {smokeBusy
            ? t('home.plaza.exp.smoke_busy')
            : shanghai
              ? t('home.plaza.exp.smoke_run_shanghai')
              : t('home.plaza.exp.smoke_run')}
        </button>
      </div>
    </div>
  )
}
