import type { RolePreset } from '../data/rolePresets'
import AgentSignLine from './AgentSignLine'
import HeroDanmakuCloud from './HeroDanmakuCloud'

interface Props {
  onRoleApply?: (role: RolePreset, generate?: boolean) => void
  /** 标题与 Tab 由外层 CreateStudio 渲染时设为 false */
  showTitle?: boolean
}

export default function HeroCubeStage({ onRoleApply, showTitle = true }: Props) {
  return (
    <div className="hero-e-stage hero-e-stage-focus">
      <div className="hero-e-first-screen">
        <div className="hero-e-center">
          {showTitle ? <AgentSignLine variant="hero" className="hero-e-headline" /> : null}

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
