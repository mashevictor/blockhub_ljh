import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import {
  AUDIENCE_OPTIONS,
  DEPT_PRESETS,
  type AudienceSelection,
  type AudienceType,
  audienceAtLabel,
  audienceOptionCopy,
  audiencePreviewText,
} from '../data/plazaAudience'
import { ROUTES } from '../routes/paths'

interface Props {
  appName: string
  initial?: AudienceSelection | null
  onConfirm: (selection: AudienceSelection) => void
  onCancel: () => void
  busy?: boolean
}

export default function PlazaAudiencePicker({ appName, initial, onConfirm, onCancel, busy = false }: Props) {
  const t = useT()
  const [type, setType] = useState<AudienceType>(initial?.type ?? 'public')
  const [deptName, setDeptName] = useState(initial?.deptName ?? DEPT_PRESETS[0].value)

  const selection: AudienceSelection = {
    type,
    deptName: type === 'dept' ? deptName : undefined,
  }

  return (
    <div className="plaza-audience-picker" role="region" aria-label={t('home.plaza.aud.aria')}>
      <h4>{t('home.plaza.aud.title')}</h4>
      <p className="plaza-audience-picker-hint">{t('home.plaza.aud.hint')}</p>

      <div className="plaza-audience-options">
        {AUDIENCE_OPTIONS.map((opt) => {
          const copy = audienceOptionCopy(t, opt)
          return (
            <label
              key={opt.id}
              className={`plaza-audience-opt${type === opt.id ? ' selected' : ''}`}
            >
              <input
                type="radio"
                name="plaza-audience"
                value={opt.id}
                checked={type === opt.id}
                onChange={() => setType(opt.id)}
              />
              <div>
                <strong>
                  {copy.label}
                  {copy.badge && <span className="plaza-audience-badge">{copy.badge}</span>}
                </strong>
                <span>{copy.desc}</span>
              </div>
            </label>
          )
        })}
      </div>

      {type === 'dept' && (
        <div className="plaza-audience-dept">
          <span className="plaza-audience-dept-label">{t('home.plaza.aud.dept_label')}</span>
          <div className="plaza-audience-dept-chips">
            {DEPT_PRESETS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={deptName === d.value ? 'on' : ''}
                onClick={() => setDeptName(d.value)}
              >
                @{t(d.key)}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="plaza-audience-preview">{audiencePreviewText(selection, appName, t)}</p>

      <div className="plaza-audience-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
          {t('home.plaza.aud.cancel')}
        </button>
        <button
          type="button"
          className="btn-primary plaza-audience-submit"
          onClick={() => onConfirm(selection)}
          disabled={busy}
        >
          {busy
            ? t('home.plaza.aud.publishing')
            : t('home.plaza.aud.publish_to', { label: audienceAtLabel(selection, t) })}
        </button>
      </div>
      <p className="plaza-audience-footnote">
        {t('home.plaza.aud.footnote_before')}{' '}
        <Link to={ROUTES.plazaFeed}>{t('home.plaza.aud.footnote_link')}</Link>
        {' '}{t('home.plaza.aud.footnote_after')}
      </p>
    </div>
  )
}
