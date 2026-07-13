import { useState } from 'react'
import { createPortal } from 'react-dom'
import type { AudienceSelection } from '../../data/plazaAudience'
import { audienceAtLabel } from '../../data/plazaAudience'
import PlazaAudiencePicker from '../PlazaAudiencePicker'
import { publishToPlazaFeed } from '../../lib/plazaFeedStorage'
import {
  setMyAppPlazaAudience,
  type PlazaAudienceMeta,
  type StoredMyApp,
} from '../../lib/myAppsStorage'

interface Props {
  app: StoredMyApp
  className?: string
  onPublished?: (meta: PlazaAudienceMeta) => void
}

function appKey(app: StoredMyApp) {
  return app.appId || app.webUrl
}

export default function PlazaPublishButton({ app, className = '', onPublished }: Props) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const published = Boolean(app.plaza?.onPlazaFeed)

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
        label: audienceAtLabel(selection),
        deptName: selection.deptName,
        publishedAt: new Date().toISOString(),
        onPlazaFeed: selection.type === 'public' || selection.type === 'dept',
      }
      setMyAppPlazaAudience(appKey(app), meta)
      onPublished?.(meta)
      setOpen(false)
    } catch {
      setError('发布到广场失败，请稍后重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`btn-ghost btn-plaza-publish plaza-my-plaza-btn${published ? ' secondary' : ''}${className ? ` ${className}` : ''}`}
        title={published ? '修改广场发布范围' : '发布到应用广场'}
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
          setError(null)
        }}
      >
        {published ? app.plaza!.label : '📡 发布到广场'}
      </button>

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
            aria-label={`发布 ${app.appName} 到应用广场`}
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
