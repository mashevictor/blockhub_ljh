import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
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
import { deliverLabel, normalizeDeliver, showAppDeliver, showWebDeliver } from '../data/deliverDisplay'
import DeliveryProgress from './DeliveryProgress'
import { useCodegenProgress } from '../hooks/useCodegenProgress'

interface Props {
  result: PublishResult
  showAdminLink?: boolean
  compact?: boolean
  orchestration?: boolean
  plazaMeta?: PlazaAudienceMeta | null
  onPlazaPublished?: (meta: PlazaAudienceMeta) => void
}

const MAX_CHIPS = 8

function appKey(result: Pick<PublishResult, 'appId' | 'webUrl'>) {
  return result.appId || result.webUrl
}

export default function PublishSuccessCard({
  result,
  showAdminLink = false,
  compact = false,
  orchestration = false,
  plazaMeta: plazaMetaProp,
  onPlazaPublished,
}: Props) {
  const t = useT()
  const [showPicker, setShowPicker] = useState(() => {
    if (!orchestration) return false
    if (plazaMetaProp) return false
    const stored = getPlazaPostForApp(appKey(result))
    return !stored
  })
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
  const codegen = useCodegenProgress(result.codegenJobId)

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
  const joiner = t('home.cap_split.joiner')

  const codegenStatusLabel =
    codegen.status === 'ready'
      ? t('home.publish.codegen.ready')
      : codegen.status === 'failed'
        ? t('home.publish.codegen.failed')
        : codegen.status === 'running'
          ? t('home.publish.codegen.running')
          : t('home.publish.codegen.queued')

  const handlePlazaConfirm = async (selection: AudienceSelection) => {
    setPlazaBusy(true)
    setPlazaError(null)
    try {
      await publishToPlazaFeed(result, selection)
      const meta: PlazaAudienceMeta = {
        type: selection.type,
        label: audienceAtLabel(selection, t),
        deptName: selection.deptName,
        publishedAt: new Date().toISOString(),
        onPlazaFeed: selection.type === 'public' || selection.type === 'dept',
      }
      setPlazaMeta(meta)
      setShowPicker(false)
      onPlazaPublished?.(meta)
    } catch {
      setPlazaError(t('home.publish.plaza_err'))
    } finally {
      setPlazaBusy(false)
    }
  }

  return (
    <article className={`publish-success-card${compact ? ' compact' : ''}${orchestration ? ' orchestration' : ''}`}>
      {!orchestration && (
        <header className="publish-result-head">
          <AppIconAvatar
            name={result.appName}
            iconUrl={result.iconUrl}
            primaryColor={result.primaryColor}
            size={36}
            className="publish-result-logo"
          />
          <div>
            <h3>{compact ? result.appName : t('home.publish.success.title')}</h3>
            <p className="modal-sub publish-result-sub">
              {t('home.publish.success.sub', {
                name: result.appName,
                n: result.moduleCount,
                deliver: deliverLabel(deliverMode, t),
              })}
            </p>
          </div>
        </header>
      )}

      {result.contactEmail && (
        <div className={`publish-email-strip${result.emailSent ? ' sent' : ''}`} role="status">
          <DynamicIcon name="web" size={14} />
          <span>
            {result.emailSent
              ? (result.deliver !== 'web'
                ? t('home.publish.email.sent_both', { email: result.contactEmail })
                : t('home.publish.email.sent_web', { email: result.contactEmail }))
              : result.emailConfigured === false
                ? t('home.publish.email.unconfigured')
                : t('home.publish.email.failed', { email: result.contactEmail })}
          </span>
        </div>
      )}

      {plazaMeta && (
        <div className="plaza-published-strip" role="status">
          <DynamicIcon name="layers" size={14} />
          <span>
            {t('home.publish.plaza.published', { label: plazaMeta.label })}
            {plazaMeta.onPlazaFeed && (
              <> · <Link to={ROUTES.plazaFeed}>{t('home.publish.plaza.goto')}</Link></>
            )}
          </span>
        </div>
      )}

      <div className="publish-result-scroll">
        {showAppDeliver(result) && !orchestration && (
          <DeliveryProgress app={result} compact />
        )}

        {result.codegenJobId && !orchestration && (
          <div className="codegen-progress" role="status">
            <div className="codegen-progress-head">
              <DynamicIcon name="creation" size={14} />
              <span>{t('home.publish.codegen.title')}</span>
              <span className={`codegen-progress-status is-${codegen.status}`}>
                {codegenStatusLabel}
              </span>
            </div>
            <p className="codegen-progress-msg">{codegen.detail || t('home.publish.codegen.detail_default')}</p>
            {codegen.status === 'ready' && showWebDeliver(result) && (
              <a className="btn btn-sm btn-ghost" href={result.webUrl} target="_blank" rel="noreferrer">
                {t('home.publish.codegen.open_web')}
              </a>
            )}
          </div>
        )}

        {!orchestration && result.buildManifest?.web_pkgs && result.buildManifest.web_pkgs.length > 0 && (
          <div className="publish-manifest-strip" role="status" style={{ marginBottom: 12, fontSize: 13, color: 'var(--muted)' }}>
            <DynamicIcon name="layers" size={14} />
            <span style={{ marginLeft: 6 }}>
              {t('home.publish.manifest.pkgs', { n: result.buildManifest.web_pkgs.length })}
              {result.buildManifest.web_pkgs.slice(0, 3).map((p) => p.replace('@blockhub/', '')).join(' · ')}
              {result.buildManifest.web_pkgs.length > 3 ? ` +${result.buildManifest.web_pkgs.length - 3}` : ''}
            </span>
          </div>
        )}

        {!orchestration && result.capabilityAssembly?.dropped_details && result.capabilityAssembly.dropped_details.length > 0 && (
          <div className="publish-save-warn" role="alert" style={{ marginBottom: 12 }}>
            <strong>
              {result.codegenJobId
                ? t('home.publish.dropped.async')
                : t('home.publish.dropped.pending')}
            </strong>
            {' '}
            {result.capabilityAssembly.dropped_details.map((d) => d.name || d.key).join(joiner)}
          </div>
        )}

        {!orchestration && result.capabilityAssembly?.resolved_keys && result.capabilityAssembly.resolved_keys.length > 0 && (
          <div className="publish-manifest-strip" role="status" style={{ marginBottom: 12, fontSize: 13, color: 'var(--muted)' }}>
            <DynamicIcon name="approval" size={14} />
            <span style={{ marginLeft: 6 }}>
              {t('home.publish.contract.confirmed', { n: result.capabilityAssembly.resolved_keys.length })}
              {result.capabilityAssembly.scenario_added_keys && result.capabilityAssembly.scenario_added_keys.length > 0
                ? t('home.publish.contract.scenario_extra', { n: result.capabilityAssembly.scenario_added_keys.length })
                : ''}
            </span>
          </div>
        )}

        {!orchestration && visibleChips.length > 0 && (
          <ul className="publish-module-list" aria-label={t('home.publish.modules_aria')}>
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

        {!orchestration && (
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
          </div>
        )}

        <PublishDeliveryLinks result={result} emphasize />
      </div>

      {plazaError && (
        <p className="publish-save-warn" role="alert">{plazaError}</p>
      )}

      {showPicker && (
        <PlazaAudiencePicker
          appName={result.appName}
          initial={{ type: 'public' }}
          onConfirm={(sel) => { void handlePlazaConfirm(sel) }}
          onCancel={() => setShowPicker(false)}
          busy={plazaBusy}
        />
      )}

      <footer className="publish-success-foot">
        {!orchestration && (
          <a className="btn-ghost" href={result.webUrl} target="_blank" rel="noreferrer">
            {t('home.publish.open_app')}
          </a>
        )}
        {!orchestration && !plazaMeta && !showPicker && (
          <button
            type="button"
            className="btn-ghost btn-plaza-publish"
            onClick={() => setShowPicker(true)}
          >
            {t('home.publish.to_plaza')}
          </button>
        )}
        {orchestration && !plazaMeta && !showPicker && (
          <button
            type="button"
            className="btn-ghost btn-plaza-publish"
            onClick={() => setShowPicker(true)}
          >
            {t('home.publish.to_public')}
          </button>
        )}
        {plazaMeta && !showPicker && (
          <button
            type="button"
            className="btn-ghost btn-plaza-publish secondary"
            onClick={() => setShowPicker(true)}
          >
            {t('home.publish.change_audience')}
          </button>
        )}
        {showAdminLink && (
          <a className="btn-ghost" href={getAdminUrl()} target="_blank" rel="noreferrer">
            {t('home.publish.admin')}
          </a>
        )}
      </footer>
    </article>
  )
}
