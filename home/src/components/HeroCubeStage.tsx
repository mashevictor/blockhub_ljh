import type { RolePreset } from '../data/rolePresets'
import AgentSignLine from './AgentSignLine'
import HeroDanmakuCloud from './HeroDanmakuCloud'

interface Props {
  onRoleApply?: (role: RolePreset, generate?: boolean) => void
}

export default function HeroCubeStage({ onRoleApply }: Props) {
  return (
    <div className="hero-e-stage hero-e-stage-focus">
      <div className="hero-e-first-screen">
        <div className="hero-e-center">
          <AgentSignLine variant="hero" className="hero-e-headline" />

          <div className="hero-e-agent-sign" aria-label="用符号重新定义智能体新交互">
            <div className="hero-e-sign-glow" aria-hidden />
            <div className="hero-e-sign-inner">
              <div className="hero-e-sign-flow" aria-hidden>
                <span className="hero-e-sign-stream">&gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt;</span>
                <span className="hero-e-sign-stream">&gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt; &gt;&gt;</span>
              </div>
            </div>
            <div className="hero-e-sign-bridge" aria-hidden>
              <span className="hero-e-sign-bridge-line" />
              <span className="hero-e-sign-bridge-chev">&gt;&gt;</span>
              <span className="hero-e-sign-bridge-hint">身份 × 场景 · 点击弹幕生成应用</span>
            </div>
          </div>

          <HeroDanmakuCloud onRoleApply={onRoleApply} integrated />
        </div>
      </div>
    </div>
  )
}
