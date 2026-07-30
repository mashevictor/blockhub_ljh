import { useT } from '@blockhub/i18n/react'
import { homePublicUrl } from '../data/brand'

export default function ShanghaiVoicePage() {
  const t = useT()
  const src = `${homePublicUrl().replace(/\/$/, '')}/agents/shanghai-voice`

  return (
    <>
      <div className="page-header">
        <h1>{t('admin.page.voice.title')}</h1>
        <p>{t('admin.page.voice.desc')}</p>
      </div>
      <div className="card shanghai-voice-embed">
        <iframe
          title="上海话语音演示"
          src={src}
          className="shanghai-voice-frame"
        />
      </div>
    </>
  )
}
