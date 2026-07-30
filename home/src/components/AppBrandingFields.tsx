import { useRef, useState } from 'react'
import { useT } from '@blockhub/i18n/react'
import { uploadAppIcon } from '../api/client'
import type { AppBrandingInput } from '../data/appBranding'
import { DEFAULT_PRIMARY_COLOR } from '../data/appBranding'

interface Props {
  value: AppBrandingInput
  onChange: (next: AppBrandingInput) => void
  namePlaceholder?: string
  compact?: boolean
}

export default function AppBrandingFields({
  value,
  onChange,
  namePlaceholder,
  compact = false,
}: Props) {
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const placeholder = namePlaceholder ?? t('home.branding.name_ph')

  const pickIcon = async (file: File) => {
    setUploadError(null)
    if (!file.type.startsWith('image/')) {
      setUploadError(t('home.branding.err_type'))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError(t('home.branding.err_size'))
      return
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('read failed'))
      reader.readAsDataURL(file)
    })
    setUploading(true)
    try {
      const iconUrl = await uploadAppIcon(dataUrl)
      onChange({ ...value, iconUrl })
    } catch {
      setUploadError(t('home.branding.err_upload'))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`app-branding-fields${compact ? ' compact' : ''}`}>
      <label className="app-branding-label">
        <span>{t('home.branding.name')}</span>
        <input
          className="input-field"
          value={value.appName}
          onChange={(e) => onChange({ ...value, appName: e.target.value })}
          placeholder={placeholder}
        />
      </label>

      <div className="app-branding-row">
        <div className="app-branding-icon-block">
          <span className="app-branding-label-text">{t('home.branding.icon')}</span>
          <div className="app-branding-icon-preview" style={{ background: value.primaryColor }}>
            {value.iconUrl ? (
              <img src={value.iconUrl} alt="" width={48} height={48} />
            ) : (
              <span>{(value.appName || 'A').slice(0, 1)}</span>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void pickIcon(f)
              e.target.value = ''
            }}
          />
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading
              ? t('home.branding.uploading')
              : value.iconUrl
                ? t('home.branding.replace')
                : t('home.branding.upload')}
          </button>
          {value.iconUrl && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => onChange({ ...value, iconUrl: '' })}
            >
              {t('home.branding.clear')}
            </button>
          )}
        </div>

        <label className="app-branding-color">
          <span className="app-branding-label-text">{t('home.branding.color')}</span>
          <div className="app-branding-color-row">
            <input
              type="color"
              value={value.primaryColor || DEFAULT_PRIMARY_COLOR}
              onChange={(e) => onChange({ ...value, primaryColor: e.target.value })}
              aria-label={t('home.branding.color')}
            />
            <input
              className="input-field"
              value={value.primaryColor}
              onChange={(e) => onChange({ ...value, primaryColor: e.target.value })}
              placeholder={DEFAULT_PRIMARY_COLOR}
            />
          </div>
        </label>
      </div>

      {uploadError && <p className="publish-error">{uploadError}</p>}
    </div>
  )
}
