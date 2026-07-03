import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublishResult } from '../data/constants'
import { ADMIN_URL } from '../data/constants'
import { LOGO } from '../data/brand'
import type { AudienceSelection } from '../data/plazaAudience'
import { audienceAtLabel } from '../data/plazaAudience'
import { pickPhonePreviewModules, widgetTint } from '../data/publishDisplay'
import { getPlazaPostForApp, publishToPlazaFeed } from '../lib/plazaFeedStorage'
import type { PlazaAudienceMeta } from '../lib/myAppsStorage'
import { ROUTES } from '../routes/paths'
import PlazaAudiencePicker from './PlazaAudiencePicker'
import { DynamicIcon } from './icons'

interface Props {
  result: PublishResult
  showAdminLink?: boolean
  compact?: boolean
  plazaMeta?: PlazaAudienceMeta | null
  onPlazaPublished?: (meta: PlazaAudienceMeta) => void
}

const MAX_CHIPS = 8

function qrImageUrl(data: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(data)}`
}

function appKey(result: Pick<PublishResult, 'appId' | 'webUrl'>) {
  return result.appId || result.webUrl
}

export default function PublishSuccessCard({
  result,
  showAdminLink = false,
  compact = false,
  plazaMeta: plazaMetaProp,
  onPlazaPublished,
}: Props) {
  const [showPicker, setShowPicker] = useState(false)
  const [plazaMeta, setPlazaMeta] = useState<PlazaAudienceMeta | null>(() => {
    if (plazaMetaProp) return plazaMetaProp
    const stored = getPlazaPostForApp(appKey(result))
    return stored ? {
      type: stored.audienceType,
      label: stored.atLabel,
      deptName: stored.atLabel.startsWith('@') && stored.audienceType === 'dept'
        ? stored.atLabel.slice(1)
        : undefined,
      publishedAt: stored.savedAt,
      onPlazaFeed: stored.audienceType === 'public' || stored.audienceType === 'dept',
    } : null
  })

  const phoneWidgets = useMemo(
    () => pickPhonePreviewModules(result.modules).slice(0, 3),
    [result.modules],
  )

  const chipModules = useMemo(() => {
    if (result.modules.length > 0) return result.modules
    return (result.scenarios ?? []).map((name) => ({
      key: `scene:${name}`,
      label: name,
      iconKey: 'workflow',
      kind: 'scenario' as const,
      source: 'user' as const,
    }))
  }, [result.modules, result.scenarios])

  const visibleChips = chipModules.slice(0, MAX_CHIPS)
  const extraChipCount = chipModules.length - visibleChips.length
  const downloadUrl = result.downloadUrl || `${result.webUrl}/download`

  const handlePlazaConfirm = (selection: AudienceSelection) => {
    publishToPlazaFeed(result, selection)
    const meta: PlazaAudienceMeta = {
      type: selection.type,
      label: audienceAtLabel(selection),
      deptName: selection.deptName,
      publishedAt: new Date().toISOString(),
      onPlazaFeed: selection.type === 'public' || selection.type === 'dept',
    }
    setPlazaMeta(meta)
    setShowPicker(false)
    onPlazaPublished?.(meta)
  }

  return (
    <article className={`publish-success-card${compact ? ' compact' : ''}`}>
      <header className="publish-result-head">
        <img src={LOGO.mark} alt="" width={36} height={36} className="publish-result-logo" />
        <div>
          <h3>{compact ? result.appName : '发布成功'}</h3>
          <p className="modal-sub publish-result-sub">
            {result.appName} · {result.moduleCount} 项功能
          </p>
        </div>
      </header>

      {plazaMeta && (
        <div className="plaza-published-strip" role="status">
          <DynamicIcon name="layers" size={14} />
          <span>
            已发布到广场 · <strong>{plazaMeta.label}</strong>
            {plazaMeta.onPlazaFeed && (
              <> · <Link to={ROUTES.plazaFeed}>去广场查看 →</Link></>
            )}
          </span>
        </div>
      )}

      <div className="publish-result-scroll">
        {visibleChips.length > 0 && (
          <ul className="publish-module-list" aria-label="已包含模块与能力">
            {visibleChips.map((m) => (
              <li
                key={`${m.kind}:${m.key}`}
                className={`publish-module-chip${m.source === 'auto' ? ' auto' : ''}${m.source === 'user' ? ' user' : ''}${m.source === 'suggest' ? ' suggest' : ''}`}
              >
                <DynamicIcon name={m.iconKey} size={11} />
                <span>{m.label}</span>
              </li>
            ))}
            {extraChipCount > 0 && (
              <li className="publish-module-chip more">+{extraChipCount}</li>
            )}
          </ul>
        )}

        <div className="publish-result-preview-row">
          <div className="phone-preview phone-preview-compact">
            <div className="phone-screen">
              <div className="phone-title">{result.appName}</div>
              {phoneWidgets.length > 0 ? (
                phoneWidgets.map((m, i) => (
                  <div
                    key={`${m.kind}:${m.key}`}
                    className="phone-widget"
                    style={{ '--widget-bg': widgetTint(i) } as React.CSSProperties}
                  >
                    <DynamicIcon name={m.iconKey} size={12} />
                    {m.label}
                  </div>
                ))
              ) : (
                <>
                  <div className="phone-bar" />
                  <div className="phone-bar short" />
                </>
              )}
            </div>
          </div>
          <div className="publish-qr-block">
            <img className="publish-qr-img" src={qrImageUrl(result.webUrl)} alt={`${result.appName} 二维码`} width={88} height={88} />
            <span>扫码访问</span>
          </div>
        </div>

        <div className="publish-links publish-links-compact">
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="web" size={14} />
              网页
            </span>
            <code>{result.webUrl}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(result.webUrl)}>复制</button>
          </div>
          <div className="link-row">
            <span className="link-row-label">
              <DynamicIcon name="android" size={14} />
              下载
            </span>
            <code>{downloadUrl}</code>
            <button type="button" onClick={() => navigator.clipboard.writeText(downloadUrl)}>复制</button>
          </div>
        </div>
      </div>

      {showPicker && (
        <PlazaAudiencePicker
          appName={result.appName}
          onConfirm={handlePlazaConfirm}
          onCancel={() => setShowPicker(false)}
        />
      )}

      <footer className="publish-success-foot">
        <a className="btn-ghost" href={result.webUrl} target="_blank" rel="noreferrer">
          打开应用 →
        </a>
        {!plazaMeta && !showPicker && (
          <button
            type="button"
            className="btn-ghost btn-plaza-publish"
            onClick={() => setShowPicker(true)}
          >
            📡 发布到广场
          </button>
        )}
        {plazaMeta && !showPicker && (
          <button
            type="button"
            className="btn-ghost btn-plaza-publish secondary"
            onClick={() => setShowPicker(true)}
          >
            修改 @ 范围
          </button>
        )}
        {showAdminLink && (
          <a className="btn-ghost" href={ADMIN_URL} target="_blank" rel="noreferrer">
            管理后台
          </a>
        )}
      </footer>
    </article>
  )
}
