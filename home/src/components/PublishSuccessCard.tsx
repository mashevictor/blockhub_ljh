import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { PublishResult } from '../data/constants'
import { getAdminUrl } from '../data/constants'
import type { AudienceSelection } from '../data/plazaAudience'
import { audienceAtLabel } from '../data/plazaAudience'
import { pickPhonePreviewModules, widgetTint } from '../data/publishDisplay'
import AppIconAvatar from './AppIconAvatar'
import { getPlazaPostForApp, publishToPlazaFeed } from '../lib/plazaFeedStorage'
import type { PlazaAudienceMeta } from '../lib/myAppsStorage'
import { ROUTES } from '../routes/paths'
import PlazaAudiencePicker from './PlazaAudiencePicker'
import PublishDeliveryLinks from './PublishDeliveryLinks'
import { DynamicIcon } from './icons'
import { deliverLabel, normalizeDeliver, showWebDeliver } from '../data/deliverDisplay'

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
  const [plazaBusy, setPlazaBusy] = useState(false)
  const [plazaError, setPlazaError] = useState<string | null>(null)
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
  const deliverMode = normalizeDeliver(result.deliver)
  const qrTarget = showWebDeliver(result) ? result.webUrl : (result.downloadUrl || `${result.webUrl}/download`)

  const handlePlazaConfirm = async (selection: AudienceSelection) => {
    setPlazaBusy(true)
    setPlazaError(null)
    try {
      await publishToPlazaFeed(result, selection)
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
    } catch {
      setPlazaError('发布到广场失败，请确认应用已发布后重试')
    } finally {
      setPlazaBusy(false)
    }
  }

  return (
    <article className={`publish-success-card${compact ? ' compact' : ''}`}>
      <header className="publish-result-head">
        <AppIconAvatar
          name={result.appName}
          iconUrl={result.iconUrl}
          primaryColor={result.primaryColor}
          size={36}
          className="publish-result-logo"
        />
        <div>
          <h3>{compact ? result.appName : '发布成功'}</h3>
          <p className="modal-sub publish-result-sub">
            {result.appName} · {result.moduleCount} 项功能 · {deliverLabel(deliverMode)}
          </p>
        </div>
      </header>

      {result.contactEmail && (
        <div className={`publish-email-strip${result.emailSent ? ' sent' : ''}`} role="status">
          <DynamicIcon name="web" size={14} />
          <span>
            {result.emailSent
              ? <>访问链接已发送至 <strong>{result.contactEmail}</strong>（含网页{result.deliver !== 'web' ? '与 APK 附件' : ''}）</>
              : result.emailConfigured === false
                ? <>邮件服务未配置，链接未发送。请复制下方地址手动分享。</>
                : <>邮件发送失败，请复制下方链接手动分享给 <strong>{result.contactEmail}</strong></>}
          </span>
        </div>
      )}

      {plazaMeta && (
        <div className="plaza-published-strip" role="status">
          <DynamicIcon name="layers" size={14} />
          <span>
            已发布到应用广场 · <strong>{plazaMeta.label}</strong>
            {plazaMeta.onPlazaFeed && (
              <> · <Link to={ROUTES.plazaFeed}>去应用广场查看 →</Link></>
            )}
          </span>
        </div>
      )}

      <div className="publish-result-scroll">
        {result.buildManifest?.web_pkgs && result.buildManifest.web_pkgs.length > 0 && (
          <div className="publish-manifest-strip" role="status" style={{ marginBottom: 12, fontSize: 13, color: 'var(--muted)' }}>
            <DynamicIcon name="layers" size={14} />
            <span style={{ marginLeft: 6 }}>
              组装 {result.buildManifest.web_pkgs.length} 个 Web 包：
              {result.buildManifest.web_pkgs.slice(0, 3).map((p) => p.replace('@blockhub/', '')).join(' · ')}
              {result.buildManifest.web_pkgs.length > 3 ? ` +${result.buildManifest.web_pkgs.length - 3}` : ''}
            </span>
          </div>
        )}

        {result.capabilityAssembly?.dropped_details && result.capabilityAssembly.dropped_details.length > 0 && (
          <div className="publish-save-warn" role="alert" style={{ marginBottom: 12 }}>
            <strong>以下能力未纳入发布契约（已跳过）：</strong>
            {' '}
            {result.capabilityAssembly.dropped_details.map((d) => d.name || d.key).join('、')}
          </div>
        )}

        {result.capabilityAssembly?.resolved_keys && result.capabilityAssembly.resolved_keys.length > 0 && (
          <div className="publish-manifest-strip" role="status" style={{ marginBottom: 12, fontSize: 13, color: 'var(--muted)' }}>
            <DynamicIcon name="approval" size={14} />
            <span style={{ marginLeft: 6 }}>
              契约已确认 {result.capabilityAssembly.resolved_keys.length} 项能力
              {result.capabilityAssembly.scenario_added_keys && result.capabilityAssembly.scenario_added_keys.length > 0
                ? `（含场景自动补充 ${result.capabilityAssembly.scenario_added_keys.length} 项）`
                : ''}
            </span>
          </div>
        )}

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
            <div className="phone-screen" style={{ '--phone-accent': result.primaryColor || '#4338ca' } as React.CSSProperties}>
              <div className="phone-title-row">
                <AppIconAvatar name={result.appName} iconUrl={result.iconUrl} primaryColor={result.primaryColor} size={22} />
                <div className="phone-title">{result.appName}</div>
              </div>
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
            <img className="publish-qr-img" src={qrImageUrl(qrTarget)} alt={`${result.appName} 二维码`} width={88} height={88} />
            <span>{showWebDeliver(result) ? '扫码打开网页' : '扫码下载 App'}</span>
          </div>
        </div>

        <PublishDeliveryLinks result={result} />
      </div>

      {plazaError && (
        <p className="publish-save-warn" role="alert">{plazaError}</p>
      )}

      {showPicker && (
        <PlazaAudiencePicker
          appName={result.appName}
          onConfirm={(sel) => { void handlePlazaConfirm(sel) }}
          onCancel={() => setShowPicker(false)}
          busy={plazaBusy}
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
            📡 发布到应用广场
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
          <a className="btn-ghost" href={getAdminUrl()} target="_blank" rel="noreferrer">
            管理后台
          </a>
        )}
      </footer>
    </article>
  )
}
