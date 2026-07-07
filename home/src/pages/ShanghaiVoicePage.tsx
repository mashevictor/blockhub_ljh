import { Link } from 'react-router-dom'
import VoiceAgentPanel from '../components/voice/VoiceAgentPanel'
import { ROUTES } from '../routes/paths'

export default function ShanghaiVoicePage() {
  return (
    <div className="shanghai-voice-page">
      <header className="shanghai-voice-topbar">
        <Link to={ROUTES.home} className="shanghai-voice-back">← 返回首页</Link>
        <span>方案 B · 独立上海话语音 Agent</span>
      </header>
      <main className="shanghai-voice-main">
        <VoiceAgentPanel />
      </main>
    </div>
  )
}
