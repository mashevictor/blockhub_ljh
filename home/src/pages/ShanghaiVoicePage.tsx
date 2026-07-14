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
        <span>上海话语音 · 体验入口（选型交付请走首页勾选 shanghai_voice + 沉浸对话壳）</span>
        <Link to={ROUTES.plazaMyApps} className="shanghai-voice-back" style={{ marginLeft: 'auto' }}>
          我的应用 →
        </Link>
      </header>
      <main className="shanghai-voice-main">
        <p className="shanghai-voice-delivery-hint" style={{ padding: '8px 16px', fontSize: 12, opacity: 0.75 }}>
          正式双端交付：首页「模块组装 / 一句话」勾选上海话语音，App UI 选「沉浸对话」后发布；本页仅为语音链路预览。
        </p>
        <VoiceAgentPanel />
      </main>
    </div>
  )
}
