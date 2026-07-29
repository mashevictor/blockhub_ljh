import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import type { AudienceSelection } from '../../data/plazaAudience'
import { audienceAtLabel } from '../../data/plazaAudience'
import PlazaAudiencePicker from '../PlazaAudiencePicker'
import { publishToPlazaFeed } from '../../lib/plazaFeedStorage'
import {
  setMyAppPlazaAudience,
  type PlazaAudienceMeta,
  type StoredMyApp,
} from '../../lib/myAppsStorage'
import { ROUTES } from '../../routes/paths'

interface Props {
  app: StoredMyApp
  className?: string
  onPublished?: (meta: PlazaAudienceMeta) => void
}

function appKey(app: StoredMyApp) {
  return app.appId || app.webUrl
}

export default function PlazaPublishButton({ app, className = '', onPublished }: Props) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flash, setFlash] = useState<PlazaAudienceMeta | null>(null)
  const published = Boolean(app.plaza?.onPlazaFeed)

  useEffect(() => {
    if (!flash) return
    const timer = window.setTimeout(() => setFlash(null), 8000)
    return () => window.clearTimeout(timer)
  }, [flash])

  const initialSelection: AudienceSelection | null = app.plaza
    ? {
        type: app.plaza.type,
        deptName: app.plaza.deptName,
      }
    : { type: 'public' }

  const handleConfirm = async (selection: AudienceSelection) => {
    setBusy(true)
    setError(null)
    try {
      await publishToPlazaFeed(app, selection)
      const meta: PlazaAudienceMeta = {
        type: selection.type,
        label: audienceAtLabel(selection, t),
        deptName: selection.deptName,
        publishedAt: new Date().toISOString(),
        onPlazaFeed: selection.type === 'public' || selection.type === 'dept',
      }
      setMyAppPlazaAudience(appKey(app), meta)
      onPublished?.(meta)
      setFlash(meta)
      setOpen(false)
    } catch (e) {
      const detail = e instanceof Error && e.message ? e.message : ''
      setError(
        detail && !detail.startsWith('HTTP')
          ? t('home.plaza.publish.err_detail', { detail })
          : t('home.plaza.publish.err_generic'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`btn-ghost btn-plaza-publish plaza-my-plaza-btn${published ? ' secondary' : ''}${className ? ` ${className}` : ''}`}
        title={published ? t('home.plaza.publish.title_edit') : t('home.plaza.publish.title_new')}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
          setError(null)
        }}
      >
        {published ? (
          <>
            <span className="plaza-my-plaza-dot" aria-hidden />
            {app.plaza!.label}
          </>
        ) : (
          t('home.plaza.publish.btn')
        )}
      </button>

      {flash ? (
        <span className="plaza-publish-inline-ok" role="status">
          {t('home.plaza.publish.flash', { label: flash.label })}
          {flash.onPlazaFeed ? (
            <>
              {' · '}
              <Link to={ROUTES.plazaFeed} onClick={(e) => e.stopPropagation()}>
                {t('home.plaza.publish.goto')}
              </Link>
            </>
          ) : null}
        </span>
      ) : null}

      {open && createPortal(
        <div
          className="plaza-publish-modal-backdrop"
          role="presentation"
          onClick={() => {
            if (!busy) setOpen(false)
          }}
        >
          <div
            className="plaza-publish-modal"
            role="dialog"
            aria-modal="true"
            aria-label={t('home.plaza.publish.dialog', { name: app.appName })}
            onClick={(e) => e.stopPropagation()}
          >
            <PlazaAudiencePicker
              appName={app.appName}
              initial={initialSelection}
              onConfirm={(sel) => { void handleConfirm(sel) }}
              onCancel={() => { if (!busy) setOpen(false) }}
              busy={busy}
            />
            {error && <p className="publish-save-warn" role="alert">{error}</p>}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
