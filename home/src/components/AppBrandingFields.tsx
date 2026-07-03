import { useRef, useState } from 'react'
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
  namePlaceholder = '应用名称（将显示在手机桌面与员工端）',
  compact = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const pickIcon = async (file: File) => {
    setUploadError(null)
    if (!file.type.startsWith('image/')) {
      setUploadError('请选择 PNG / JPEG 图片')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('图片请小于 2MB')
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
      setUploadError('图标上传失败，请检查网络或稍后重试')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`app-branding-fields${compact ? ' compact' : ''}`}>
      <label className="app-branding-label">
        <span>应用名称</span>
        <input
          className="input-field"
          value={value.appName}
          onChange={(e) => onChange({ ...value, appName: e.target.value })}
          placeholder={namePlaceholder}
        />
      </label>

      <div className="app-branding-row">
        <div className="app-branding-icon-block">
          <span className="app-branding-label-text">应用图标</span>
          <div className="app-branding-icon-preview" style={{ background: value.primaryColor }}>
            {value.iconUrl ? (
              <img src={value.iconUrl} alt="" width={48} height={48} />
            ) : (
              <span>{(value.appName || '应').slice(0, 1)}</span>
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
            {uploading ? '上传中…' : value.iconUrl ? '更换图标' : '上传图标'}
          </button>
          {value.iconUrl && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => onChange({ ...value, iconUrl: '' })}
            >
              清除
            </button>
          )}
        </div>

        <label className="app-branding-color">
          <span className="app-branding-label-text">主题色</span>
          <div className="app-branding-color-row">
            <input
              type="color"
              value={value.primaryColor || DEFAULT_PRIMARY_COLOR}
              onChange={(e) => onChange({ ...value, primaryColor: e.target.value })}
              aria-label="主题色"
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
