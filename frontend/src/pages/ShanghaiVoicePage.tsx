import { homePublicUrl } from '../data/brand'

export default function ShanghaiVoicePage() {
  const src = `${homePublicUrl().replace(/\/$/, '')}/agents/shanghai-voice`

  return (
    <>
      <div className="page-header">
        <h1>上海话语音</h1>
        <p>电信星辰 ASR/TTS 实时方言对话 · 登录后可在此直接使用</p>
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
