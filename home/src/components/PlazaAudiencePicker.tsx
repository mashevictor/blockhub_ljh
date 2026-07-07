import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AUDIENCE_OPTIONS,
  DEPT_PRESETS,
  type AudienceSelection,
  type AudienceType,
  audienceAtLabel,
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
  const [type, setType] = useState<AudienceType>(initial?.type ?? 'public')
  const [deptName, setDeptName] = useState(initial?.deptName ?? DEPT_PRESETS[0])

  const selection: AudienceSelection = {
    type,
    deptName: type === 'dept' ? deptName : undefined,
  }

  return (
    <div className="plaza-audience-picker" role="region" aria-label="选择 @ 受众范围">
      <h4>📡 发布到应用广场 · 选择 @ 范围</h4>
      <p className="plaza-audience-picker-hint">
        <code>@</code> 表示应用交付给谁。选 <strong>@公开</strong> 会出现在应用广场列表。
      </p>

      <div className="plaza-audience-options">
        {AUDIENCE_OPTIONS.map((opt) => (
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
                {opt.label}
                {opt.badge && <span className="plaza-audience-badge">{opt.badge}</span>}
              </strong>
              <span>{opt.desc}</span>
            </div>
          </label>
        ))}
      </div>

      {type === 'dept' && (
        <div className="plaza-audience-dept">
          <span className="plaza-audience-dept-label">选择部门</span>
          <div className="plaza-audience-dept-chips">
            {DEPT_PRESETS.map((d) => (
              <button
                key={d}
                type="button"
                className={deptName === d ? 'on' : ''}
                onClick={() => setDeptName(d)}
              >
                @{d}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="plaza-audience-preview">{audiencePreviewText(selection, appName)}</p>

      <div className="plaza-audience-actions">
        <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>取消</button>
        <button
          type="button"
          className="btn-primary plaza-audience-submit"
          onClick={() => onConfirm(selection)}
          disabled={busy}
        >
          {busy ? '发布中…' : `发布到 ${audienceAtLabel(selection)}`}
        </button>
      </div>
      <p className="plaza-audience-footnote">
        @公开 应用可在 <Link to={ROUTES.plazaFeed}>应用广场</Link> 查看 · 已同步服务端
      </p>
    </div>
  )
}
