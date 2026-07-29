import { useT } from '@blockhub/i18n/react'
import type { PublishResult } from '../data/constants'
import { deliverLabel, normalizeDeliver, showAppDeliver, showWebDeliver } from '../data/deliverDisplay'
import { DynamicIcon } from './icons'

interface Props {
  result: PublishResult
  /** 突出二维码与下载按钮（编排页 / 发布成功主视觉） */
  emphasize?: boolean
}

function qrImageUrl(data: string, size = 140) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`
}

export default function PublishDeliveryLinks({ result, emphasize = false }: Props) {
  const t = useT()
  const showWeb = showWebDeliver(result)
  const showApp = showAppDeliver(result)
  const downloadUrl = result.downloadUrl || `${result.webUrl}/download`
  const mode = normalizeDeliver(result.deliver)
  const qrTarget = showWeb ? result.webUrl : downloadUrl
  const qrLabel = showWeb ? t('home.delivery.qr_web') : t('home.delivery.qr_app')
  const qrSize = emphasize ? 140 : 88

  return (
    <div className={`publish-delivery${emphasize ? ' emphasize' : ''}`}>
      <div className="publish-deliver-badges" aria-label={t('home.delivery.aria')}>
        <span className={`publish-deliver-badge mode-${mode}`}>{deliverLabel(mode, t)}</span>
        {showApp && (
          <span className={`publish-deliver-badge ${result.apkReady ? 'mode-app' : 'mode-pending'}`}>
            {result.apkReady ? t('home.delivery.apk_ready') : t('home.delivery.apk_pending')}
          </span>
        )}
      </div>

      <div className="publish-delivery-hero">
        <div className="publish-qr-block">
          <img
            className="publish-qr-img"
            src={qrImageUrl(qrTarget, qrSize)}
            alt={t('home.delivery.qr_alt', { name: result.appName })}
            width={qrSize}
            height={qrSize}
          />
          <span>{qrLabel}</span>
        </div>

        <div className="publish-delivery-ctas">
          {showWeb && (
            <a className="btn-primary publish-delivery-cta" href={result.webUrl} target="_blank" rel="noreferrer">
              <DynamicIcon name="web" size={16} />
              {t('home.delivery.open_web')}
            </a>
          )}
          {showApp && (
            <a
              className={`publish-delivery-cta ${result.apkReady ? 'btn-primary' : 'btn-ghost'}`}
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              <DynamicIcon name="android" size={16} />
              {result.apkReady ? t('home.delivery.download_apk') : t('home.delivery.download_pending')}
            </a>
          )}
          {showApp && (
            <button
              type="button"
              className="btn-ghost publish-delivery-cta"
              onClick={() => navigator.clipboard.writeText(downloadUrl)}
            >
              {t('home.delivery.copy_download')}
            </button>
          )}
          {showWeb && !showApp && (
            <button
              type="button"
              className="btn-ghost publish-delivery-cta"
              onClick={() => navigator.clipboard.writeText(result.webUrl)}
            >
              {t('home.delivery.copy_web')}
            </button>
          )}
        </div>
      </div>

      <div className="publish-links publish-links-compact">
        {showWeb && (
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="web" size={14} />
              {t('home.delivery.link_web')}
            </span>
            <code>{result.webUrl}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(result.webUrl)}>{t('home.delivery.copy')}</button>
          </div>
        )}
        {showApp && (
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="android" size={14} />
              {t('home.delivery.link_download')}
            </span>
            <code>{downloadUrl}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(downloadUrl)}>{t('home.delivery.copy')}</button>
          </div>
        )}
        {showApp && result.androidAppId && (
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="android" size={14} />
              {t('home.delivery.link_pkg')}
            </span>
            <code>{result.androidAppId}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(result.androidAppId!)}>{t('home.delivery.copy')}</button>
          </div>
        )}
        {showApp && (
          <p className="publish-apk-hint">
            {result.apkReady
              ? t('home.delivery.apk_hint_ready')
              : t('home.delivery.apk_hint_pending')}
          </p>
        )}
      </div>
    </div>
  )
}
