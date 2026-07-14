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
  const showWeb = showWebDeliver(result)
  const showApp = showAppDeliver(result)
  const downloadUrl = result.downloadUrl || `${result.webUrl}/download`
  const mode = normalizeDeliver(result.deliver)
  // App-only：扫码下载；含网页：扫码打开网页，APK 用大按钮下
  const qrTarget = showWeb ? result.webUrl : downloadUrl
  const qrLabel = showWeb ? '扫码打开网页版' : '扫码下载 App'
  const qrSize = emphasize ? 140 : 88

  return (
    <div className={`publish-delivery${emphasize ? ' emphasize' : ''}`}>
      <div className="publish-deliver-badges" aria-label="交付形式">
        <span className={`publish-deliver-badge mode-${mode}`}>{deliverLabel(mode)}</span>
        {showApp && (
          <span className={`publish-deliver-badge ${result.apkReady ? 'mode-app' : 'mode-pending'}`}>
            {result.apkReady ? 'APK 可下载' : 'APK 生成中'}
          </span>
        )}
      </div>

      <div className="publish-delivery-hero">
        <div className="publish-qr-block">
          <img
            className="publish-qr-img"
            src={qrImageUrl(qrTarget, qrSize)}
            alt={`${result.appName} 二维码`}
            width={qrSize}
            height={qrSize}
          />
          <span>{qrLabel}</span>
        </div>

        <div className="publish-delivery-ctas">
          {showWeb && (
            <a className="btn-primary publish-delivery-cta" href={result.webUrl} target="_blank" rel="noreferrer">
              <DynamicIcon name="web" size={16} />
              打开网页版
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
              {result.apkReady ? '下载 Android APK' : 'APK 链接（生成中也可收藏）'}
            </a>
          )}
          {showApp && (
            <button
              type="button"
              className="btn-ghost publish-delivery-cta"
              onClick={() => navigator.clipboard.writeText(downloadUrl)}
            >
              复制下载链接
            </button>
          )}
          {showWeb && !showApp && (
            <button
              type="button"
              className="btn-ghost publish-delivery-cta"
              onClick={() => navigator.clipboard.writeText(result.webUrl)}
            >
              复制网页链接
            </button>
          )}
        </div>
      </div>

      <div className="publish-links publish-links-compact">
        {showWeb && (
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="web" size={14} />
              网页链接
            </span>
            <code>{result.webUrl}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(result.webUrl)}>复制</button>
          </div>
        )}
        {showApp && (
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="android" size={14} />
              下载链接
            </span>
            <code>{downloadUrl}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(downloadUrl)}>复制</button>
          </div>
        )}
        {showApp && result.androidAppId && (
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="android" size={14} />
              应用包名
            </span>
            <code>{result.androidAppId}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(result.androidAppId!)}>复制</button>
          </div>
        )}
        {showApp && (
          <p className="publish-apk-hint">
            {result.apkReady
              ? '专属 APK 已就绪；手机浏览器打开下载链接或用上方按钮直接下载。独立包名可与其他积木仓应用并存安装。'
              : '专属安装包正在后台生成；上方「APK 可下载」亮起后点下载即可。'}
          </p>
        )}
      </div>
    </div>
  )
}
