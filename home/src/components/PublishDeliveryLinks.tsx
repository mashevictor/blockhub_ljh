import type { PublishResult } from '../data/constants'
import { deliverLabel, normalizeDeliver, showAppDeliver, showWebDeliver } from '../data/deliverDisplay'
import { DynamicIcon } from './icons'

interface Props {
  result: PublishResult
}

export default function PublishDeliveryLinks({ result }: Props) {
  const showWeb = showWebDeliver(result)
  const showApp = showAppDeliver(result)
  const downloadUrl = result.downloadUrl || `${result.webUrl}/download`
  const mode = normalizeDeliver(result.deliver)

  return (
    <>
      <div className="publish-deliver-badges" aria-label="交付形式">
        <span className={`publish-deliver-badge mode-${mode}`}>{deliverLabel(mode)}</span>
      </div>

      <div className="publish-links publish-links-compact">
        {showWeb && (
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="web" size={14} />
              网页版
            </span>
            <code>{result.webUrl}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(result.webUrl)}>复制</button>
          </div>
        )}
        {showApp && (
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="android" size={14} />
              Android APK
            </span>
            <code>{downloadUrl}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(downloadUrl)}>复制</button>
          </div>
        )}
        {showApp && (
          <p className="publish-apk-hint">
            {result.apkReady
              ? 'APK 已就绪，可直接下载安装。'
              : '安装包正在后台生成，完成后此链接即可下载。'}
          </p>
        )}
      </div>
    </>
  )
}
