import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import VoiceAgentPanel from '../components/voice/VoiceAgentPanel'
import { bootstrapShanghaiVoiceProject } from '../lib/shanghaiVoiceProject'
import { ROUTES } from '../routes/paths'

export default function ShanghaiVoicePage() {
  useEffect(() => {
    bootstrapShanghaiVoiceProject()
  }, [])

  return (
    <div
      className="shanghai-voice-page"
      style={{ minHeight: '100vh', background: '#0a0908', color: '#f5f0e8' }}
    >
      <header className="shanghai-voice-topbar">
        <Link to={ROUTES.home} className="shanghai-voice-back">← 返回首页</Link>
        <span>上海话语音助手 · 正式演示项目</span>
        <Link to={ROUTES.plazaMyApps} className="shanghai-voice-back" style={{ marginLeft: 'auto' }}>
          我的应用 →
        </Link>
      </header>
      <main className="shanghai-voice-main">
        <VoiceAgentPanel />
      </main>
    </div>
  )
}
