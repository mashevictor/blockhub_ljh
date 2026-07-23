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
  const shanghai = isShanghaiVoiceApp(app)
  const showDelivery = showAppDeliver(app)
  const deliverBrief = [
    '网页 ✓',
    showDelivery ? (app.apkReady ? 'APK ✓' : 'APK 打包中') : null,
    shanghai ? '语音 API' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="plaza-orch-cta-row" aria-label="体验与验收">
      <div className="plaza-orch-cta is-main">
        <h3 className="plaza-orch-cta-title">马上体验</h3>
        <p className="plaza-orch-cta-desc">
          {shanghai
            ? '网页已就绪。先试上海话助手；APK 打包不影响网页。'
            : '打开 Runtime 真页面，或先走一遍流程预览（本地动画，不改数据）。'}
        </p>
        <div className="plaza-orch-cta-actions">
          <a className="btn-primary" href={app.webUrl} target="_blank" rel="noreferrer">
            <IconGlobe size={14} />
            {shanghai ? '打开上海话网页' : '打开 Runtime'}
          </a>
          <button type="button" className="btn-ghost" onClick={onStartTrial}>
            ▶ 流程预览
          </button>
        </div>
      </div>

      <div className="plaza-orch-cta">
        <h3 className="plaza-orch-cta-title">交付摘要</h3>
        <p className="plaza-orch-cta-desc">{deliverBrief}</p>
        {showDelivery ? (
          <button type="button" className="btn-ghost" onClick={onToggleProgress}>
            {progressExpanded ? '收起进度' : '展开进度'}
          </button>
        ) : (
          <span className="plaza-orch-cta-muted">仅网页交付</span>
        )}
      </div>

      <div className="plaza-orch-cta">
        <h3 className="plaza-orch-cta-title">一键冒烟</h3>
        <p className="plaza-orch-cta-desc">
          {shanghai ? 'config + status + ASR 鉴权（全真链路）' : '检查网页是否可打开'}
        </p>
        <button type="button" className="btn-primary" onClick={onSmoke} disabled={smokeBusy}>
          {smokeBusy ? '检测中…' : shanghai ? '跑真链路冒烟' : '检查交付'}
        </button>
      </div>
    </div>
  )
}
