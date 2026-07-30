import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '@blockhub/i18n/react'
import VoiceAgentPanel from '../components/voice/VoiceAgentPanel'
import { bootstrapShanghaiVoiceProject } from '../lib/shanghaiVoiceProject'
import { ROUTES } from '../routes/paths'

export default function ShanghaiVoicePage() {
  const t = useT()

  useEffect(() => {
    bootstrapShanghaiVoiceProject()
  }, [])

  return (
    <div
      className="shanghai-voice-page"
      style={{ minHeight: '100vh', background: '#0a0908', color: '#f5f0e8' }}
    >
      <header className="shanghai-voice-topbar">
        <Link to={ROUTES.home} className="shanghai-voice-back">{t('home.plaza.shanghai_page.back')}</Link>
        <span>{t('home.plaza.shanghai_page.title')}</span>
        <Link to={ROUTES.plazaMyApps} className="shanghai-voice-back" style={{ marginLeft: 'auto' }}>
          {t('home.plaza.shanghai_page.my_apps')}
        </Link>
      </header>
      <main className="shanghai-voice-main">
        <p className="shanghai-voice-delivery-hint" style={{ padding: '8px 16px', fontSize: 12, opacity: 0.75 }}>
          {t('home.plaza.shanghai_page.hint')}
        </p>
        <VoiceAgentPanel />
      </main>
    </div>
  )
}
