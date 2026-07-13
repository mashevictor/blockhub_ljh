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

          <HeroDanmakuCloud onRoleApply={onRoleApply} integrated />
        </div>
      </div>
    </div>
  )
}
